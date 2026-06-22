import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    author: z.string().default("Bebras Bolivia"),
    ctaEnabled: z.boolean().default(false),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (!data.ctaEnabled) return;
    if (!data.ctaLabel?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ctaLabel"], message: "CTA label is required when CTA is enabled" });
    }
    if (!data.ctaHref?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ctaHref"], message: "CTA href is required when CTA is enabled" });
    }
  }),
});

export const collections = { blog };
