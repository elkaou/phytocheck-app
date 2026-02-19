import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // OCR route for scanning product labels
  ocr: router({
    analyzeLabel: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().min(1),
          mimeType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // 1. Upload image to S3 first (required for LLM image analysis)
          const randomSuffix = Math.random().toString(36).substring(2, 10);
          const ext = input.mimeType.includes("png") ? "png" : "jpg";
          const fileKey = `ocr-scans/scan-${Date.now()}-${randomSuffix}.${ext}`;

          const imageBuffer = Buffer.from(input.imageBase64, "base64");
          const { url: imageUrl } = await storagePut(
            fileKey,
            imageBuffer,
            input.mimeType
          );

          // 2. Call LLM with the S3 image URL
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "Tu es un assistant spécialisé dans la lecture d'étiquettes de produits phytosanitaires. Tu dois extraire le nom commercial du produit et/ou le numéro AMM (Autorisation de Mise sur le Marché) visible sur l'étiquette. Réponds UNIQUEMENT avec un JSON valide.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: 'Analyse cette image d\'étiquette de produit phytosanitaire. Extrais le nom commercial du produit et/ou le numéro AMM (Autorisation de Mise sur le Marché). Le numéro AMM est souvent au format "XXXXXXX" (7 chiffres). Réponds UNIQUEMENT avec un JSON au format: {"nom": "NOM_DU_PRODUIT", "amm": "NUMERO_AMM"}. Si tu ne trouves qu\'un seul des deux, laisse l\'autre comme chaîne vide. Si tu ne trouves rien, réponds {"nom": "", "amm": ""}.',
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageUrl,
                      detail: "high",
                    },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" },
          });

          const messageContent = response.choices?.[0]?.message?.content;
          const content = typeof messageContent === "string" ? messageContent : "";

          // Parse the JSON response
          try {
            const parsed = JSON.parse(content);
            return {
              success: true,
              nom: parsed.nom || "",
              amm: parsed.amm || "",
              raw: content,
            };
          } catch {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[^}]+\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                success: true,
                nom: parsed.nom || "",
                amm: parsed.amm || "",
                raw: content,
              };
            }
            return {
              success: false,
              nom: "",
              amm: "",
              raw: content,
            };
          }
        } catch (error: any) {
          console.error("[OCR] Error analyzing label:", error?.message || error);
          return {
            success: false,
            nom: "",
            amm: "",
            raw: error?.message || "Unknown error",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
