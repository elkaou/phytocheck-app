import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ephyRouter } from "./routers/ephy";
import { searchUsageRouter } from "./routers/search-usage";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  ephy: ephyRouter,
  searchUsage: searchUsageRouter,
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

  // Analyse d'étiquettes de produits phytosanitaires
  analyzeLabel: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      
      try {
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