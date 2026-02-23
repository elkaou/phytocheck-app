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

  // Root analyzeLabel endpoint (for compatibility with label-scanner)
  analyzeLabel: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Call LLM directly with the Data URL
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Tu es un expert en analyse d'étiquettes de produits phytosanitaires français.

Ta mission : extraire EXACTEMENT les informations telles qu'elles apparaissent sur l'étiquette.

INFORMATIONS À EXTRAIRE :

1. **Nom commercial** (OBLIGATOIRE) :
   - C'est le nom de marque du produit, généralement en GROS caractères en haut de l'étiquette
   - Copie-le EXACTEMENT comme il est écrit (majuscules, minuscules, espaces, tirets, apostrophes)
   - Exemples : "ROUNDUP ULTRA", "Glyphos 360", "CALYPSO SC 480", "CINCH PRO"
   - ATTENTION : Ne confonds PAS les lettres similaires :
     * C et N sont différents
     * I et l (L minuscule) sont différents
     * O et 0 (zéro) sont différents
   - Vérifie lettre par lettre avant de répondre

2. **Numéro AMM** (OBLIGATOIRE) :
   - Format : EXACTEMENT 7 chiffres (exemple : 2150918, 8800006, 9800336)
   - Cherche "AMM" ou "N° AMM" ou "Autorisation de Mise sur le Marché" sur l'étiquette
   - Le numéro AMM est généralement près du bas de l'étiquette ou dans une section "Informations réglementaires"
   - Vérifie chaque chiffre individuellement (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B)
   - Si tu ne trouves pas de numéro à 7 chiffres, mets ""
   - IMPORTANT : Ne confonds PAS le numéro AMM avec d'autres numéros (lot, code-barres, etc.)

RÉPONSE ATTENDUE (JSON) :
{
  "productName": "NOM EXACT DU PRODUIT",
  "amm": "7 chiffres ou chaîne vide",
  "function": "Type de produit (herbicide, fongicide, insecticide, etc.) si visible"
}

ATTENTION :
- Ne modifie JAMAIS le nom commercial (pas de correction, pas de traduction)
- Si l'étiquette est floue ou illisible, mets "" pour les champs concernés
- Sois précis et exact
- Vérifie chaque lettre et chaque chiffre individuellement
- Pour les lettres : évite les confusions (C vs N, I vs l, O vs 0)
- Pour les chiffres de l'AMM : vérifie deux fois (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B, 9 vs g)
- Le numéro AMM doit être cohérent avec le nom du produit`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyse cette étiquette de produit phytosanitaire et extrait le nom commercial, le numéro AMM et la fonction.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: input.imageUrl,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        });

        const messageContent = response.choices?.[0]?.message?.content;
        let content = typeof messageContent === "string" ? messageContent : "";

        // Clean content: remove markdown code blocks and trim
        content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

        // CRITICAL: Clean JSON content BEFORE parsing to avoid parse errors
        // Remove problematic characters that break JSON.parse
        content = content
          .replace(/<[^>]*>/g, "") // Remove HTML/XML tags like <active>
          .replace(/[™®©]/g, "") // Remove trademark symbols
          .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes with regular quotes
          .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
          .replace(/[\u2013\u2014]/g, "-"); // Replace em/en dashes

        // Parse the JSON response
        try {
          const parsed = JSON.parse(content);
          // Clean productName: remove special characters except letters, numbers, spaces, and hyphens
          const cleanProductName = (parsed.productName || parsed.nom || "")
            .replace(/[^\w\s\-]/g, " ") // Remove special chars except word chars, spaces, hyphens
            .replace(/\s+/g, " ") // Normalize multiple spaces
            .trim();
          return {
            success: true,
            data: {
              productName: cleanProductName,
              amm: parsed.amm || "",
              function: parsed.function || "",
            },
            raw: content,
          };
        } catch (parseError: any) {
          console.error("[analyzeLabel] JSON parse error:", parseError.message, "Content:", content);
          // Try to extract JSON from the response
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              const cleanProductName = (parsed.productName || parsed.nom || "")
                .replace(/[^\w\s\-]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              return {
                success: true,
                data: {
                  productName: cleanProductName,
                  amm: parsed.amm || "",
                  function: parsed.function || "",
                },
                raw: content,
              };
            } catch {
              // Ignore nested parse error
            }
          }
          return {
            success: false,
            data: { productName: "", amm: "", function: "" },
            error: `Failed to parse response: ${parseError.message}`,
            raw: content,
          };
        }
      } catch (error: any) {
        console.error("[analyzeLabel] Error analyzing label:", error?.message || error);
        return {
          success: false,
          data: { productName: "", amm: "", function: "" },
          error: error?.message || "Unknown error",
          raw: error?.message || "Unknown error",
        };
      }
    }),

  // OCR route for scanning product labels
  ocr: router({
    analyzeLabel: publicProcedure
      .input(
        z.object({
          imageUrl: z.string().url(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Call LLM directly with the Data URL
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Tu es un expert en analyse d'étiquettes de produits phytosanitaires français.

Ta mission : extraire EXACTEMENT les informations telles qu'elles apparaissent sur l'étiquette.

INFORMATIONS À EXTRAIRE :

1. **Nom commercial** (OBLIGATOIRE) :
   - C'est le nom de marque du produit, généralement en GROS caractères en haut de l'étiquette
   - Copie-le EXACTEMENT comme il est écrit (majuscules, minuscules, espaces, tirets, apostrophes)
   - Exemples : "ROUNDUP ULTRA", "Glyphos 360", "CALYPSO SC 480", "CINCH PRO"
   - ATTENTION : Ne confonds PAS les lettres similaires :
     * C et N sont différents
     * I et l (L minuscule) sont différents
     * O et 0 (zéro) sont différents
   - Vérifie lettre par lettre avant de répondre

2. **Numéro AMM** (OBLIGATOIRE) :
   - Format : EXACTEMENT 7 chiffres (exemple : 2150918, 8800006, 9800336)
   - Cherche "AMM" ou "N° AMM" ou "Autorisation de Mise sur le Marché" sur l'étiquette
   - Le numéro AMM est généralement près du bas de l'étiquette ou dans une section "Informations réglementaires"
   - Vérifie chaque chiffre individuellement (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B)
   - Si tu ne trouves pas de numéro à 7 chiffres, mets ""
   - IMPORTANT : Ne confonds PAS le numéro AMM avec d'autres numéros (lot, code-barres, etc.)

RÉPONSE ATTENDUE (JSON) :
{
  "nom": "NOM EXACT DU PRODUIT",
  "amm": "7 chiffres ou chaîne vide"
}

ATTENTION :
- Ne modifie JAMAIS le nom commercial (pas de correction, pas de traduction)
- Si l'étiquette est floue ou illisible, mets "" pour les champs concernés
- Sois précis et exact
- Vérifie chaque lettre et chaque chiffre individuellement
- Pour les lettres : évite les confusions (C vs N, I vs l, O vs 0)
- Pour les chiffres de l'AMM : vérifie deux fois (0 vs O, 1 vs I, 2 vs Z, 5 vs S, 8 vs B, 9 vs g)
- Le numéro AMM doit être cohérent avec le nom du produit`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyse cette \u00e9tiquette de produit phytosanitaire et extrait le nom commercial et le num\u00e9ro AMM.",
                  },
                  {
                  type: "image_url",
                  image_url: {
                    url: input.imageUrl,
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
