import { z } from "zod";

// ── Reusable sub-schemas ──────────────────────────────────

const LinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const BrandColorSchema = z.enum([
  "yellow",
  "red",
  "green",
  "blue",
  "gray",
  "blueDark",
  "rose",
  "amber",
  "emerald",
  "sky",
  "indigo",
  "violet",
]);
const BrandPaletteSchema = z.array(BrandColorSchema).optional();

const StatSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const PageMetaSchema = z.object({
  pageTitle: z.string(),
  pageDescription: z.string(),
});

const SharedPageComponentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("organizerInstitution"),
    accent: BrandColorSchema.optional(),
    tag: z.string(),
    name: z.string(),
    acronym: z.string(),
    location: z.string(),
    role: z.string(),
    description: z.string(),
    image: z.string(),
    linkLabel: z.string(),
    linkHref: z.string(),
  }),
  z.object({
    type: z.literal("sectionRichText"),
    accent: BrandColorSchema.optional(),
    tag: z.string().optional(),
    heading: z.string().optional(),
    paragraphs: z.array(z.string()).optional(),
    tip: z.string().optional(),
    linkLabel: z.string().optional(),
    linkHref: z.string().optional(),
  }),
  z.object({
    type: z.literal("itemsGrid"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema,
    tag: z.string().optional(),
    heading: z.string().optional(),
    intro: z.string().optional(),
    columns: z.number().int().min(1).max(4).optional(),
    mediaType: z.enum(["icon", "image", "number", "none"]).optional(),
    items: z.array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        image: z.string().optional(),
        number: z.string().optional(),
        linkLabel: z.string().optional(),
        linkHref: z.string().optional(),
        socialLinks: z
          .array(
            z.object({
              label: z.string(),
              href: z.string(),
            })
          )
          .optional(),
      })
    ),
  }),
  z.object({
    type: z.literal("linksList"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema,
    tag: z.string().optional(),
    heading: z.string().optional(),
    links: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        description: z.string().optional(),
      })
    ),
  }),
  z.object({
    type: z.literal("faqAccordion"),
    categories: z.array(
      z.object({
        title: z.string(),
        items: z.array(
          z.object({
            question: z.string(),
            answer: z.string(),
          })
        ),
      })
    ),
  }),
  z.object({
    type: z.literal("tabsGuide"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema.optional(),
    sectionTag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
    tabs: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        heading: z.string(),
        items: z.array(
          z.object({
            title: z.string(),
            desc: z.string(),
          })
        ),
      })
    ),
  }),
  z.object({
    type: z.literal("formContact"),
    accent: BrandColorSchema.optional(),
    tag: z.string(),
    heading: z.string(),
    fields: z.object({
      name: z.object({ label: z.string(), placeholder: z.string() }),
      email: z.object({ label: z.string(), placeholder: z.string() }),
      role: z.object({
        label: z.string(),
        placeholder: z.string(),
        options: z.array(z.string()),
      }),
      message: z.object({ label: z.string(), placeholder: z.string() }),
    }),
    submitLabel: z.string(),
    disclaimer: z.string(),
  }),
  z.object({
    type: z.literal("featureList"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema,
    tag: z.string().optional(),
    heading: z.string().optional(),
    intro: z.string().optional(),
    items: z.array(
      z.object({
        title: z.string(),
        desc: z.string(),
      })
    ),
    outro: z.string().optional(),
  }),
  z.object({
    type: z.literal("statsGrid"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema,
    tag: z.string().optional(),
    heading: z.string().optional(),
    columns: z.number().int().min(1).max(4).optional(),
    stats: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
    paragraphs: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("studentsAgeCategories"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema,
    sectionTag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
    categories: z.array(
      z.object({
        name: z.string(),
        age: z.string(),
        emoji: z.string(),
        color: z.string(),
        desc: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal("studentsScoringTable"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema,
    sectionTag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
    tableHeaders: z.array(z.string()),
    rows: z.array(
      z.object({
        label: z.string(),
        values: z.array(z.string()),
        status: z.string(),
      })
    ),
    summaryCards: z.array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    ),
    summaryColumns: z.number().int().min(1).max(4).optional(),
  }),
  z.object({
    type: z.literal("blogIndex"),
    emptyState: z.object({
      tag: z.string(),
      text: z.string(),
    }),
    readMoreLabel: z.string(),
  }),
  z.object({
    type: z.literal("blogPostUi"),
    backLabel: z.string(),
    ctaLabel: z.string(),
  }),
  z.object({
    type: z.literal("contactClassic"),
    accent: BrandColorSchema.optional(),
    cardPalette: BrandPaletteSchema,
    info: z.object({
      tag: z.string(),
      heading: z.string(),
      cards: z.array(
        z.object({
          icon: z.string(),
          title: z.string(),
          description: z.string(),
          linkLabel: z.string().optional(),
          linkHref: z.string().optional(),
          socialLinks: z
            .array(
              z.object({
                label: z.string(),
                href: z.string(),
              })
            )
            .optional(),
        })
      ),
    }),
    international: z.object({
      tag: z.string(),
      links: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
          description: z.string(),
        })
      ),
    }),
    form: z.object({
      tag: z.string(),
      heading: z.string(),
      fields: z.object({
        name: z.object({ label: z.string(), placeholder: z.string() }),
        email: z.object({ label: z.string(), placeholder: z.string() }),
        role: z.object({
          label: z.string(),
          placeholder: z.string(),
          options: z.array(z.string()),
        }),
        message: z.object({ label: z.string(), placeholder: z.string() }),
      }),
      submitLabel: z.string(),
      disclaimer: z.string(),
    }),
  }),
  z.object({
    type: z.literal("cta"),
    accent: BrandColorSchema.optional(),
    tag: z.string().optional(),
    heading: z.string(),
    text: z.string(),
    buttonLabel: z.string(),
    buttonHref: z.string(),
  }),
]);

// ── Home page ─────────────────────────────────────────────

const HomeEditorialSectionSchema = z.object({
  type: z.literal("introEditorial"),
  accent: BrandColorSchema.optional(),
  number: z.string(),
  kicker: z.string(),
  asideText: z.string(),
  heading: z.string(),
  paragraphs: z.array(z.string()),
});

const HomeAgeCategoriesSectionSchema = z.object({
  type: z.literal("homeAgeCategories"),
  accent: BrandColorSchema.optional(),
  number: z.string(),
  kicker: z.string(),
  asideText: z.string(),
  heading: z.string(),
  linkLabel: z.string(),
  linkHref: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      range: z.string(),
      color: BrandColorSchema,
      imageKey: z.string(),
      author: z.string(),
      authorUrl: z.string(),
    })
  ),
});

const HomeDualCtaSectionSchema = z.object({
  type: z.literal("homeDualCta"),
  cards: z.array(
    z.object({
      audience: z.string(),
      style: z.enum(["primary", "secondary"]),
      icon: z.string(),
      headingPrefix: z.string(),
      headingEmphasis: z.string(),
      headingSuffix: z.string(),
      linkLabel: z.string(),
      href: z.string(),
    })
  ),
});

const HomeAboutSectionSchema = z.object({
  type: z.literal("aboutBebrasEditorial"),
  accent: BrandColorSchema.optional(),
  number: z.string(),
  kicker: z.string(),
  asideText: z.string(),
  heading: z.string(),
  paragraphs: z.array(z.string()),
});

const HomeSectionSchema = z.discriminatedUnion("type", [
  HomeEditorialSectionSchema,
  HomeAgeCategoriesSectionSchema,
  HomeDualCtaSectionSchema,
  HomeAboutSectionSchema,
]);

export const homeSchema = z.object({
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitlePrimary: z.string(),
    subtitleSecondary: z.string(),
    buttonLabel: z.string(),
    buttonHref: z.string(),
  }),
  sections: z.array(HomeSectionSchema),
  components: z.array(SharedPageComponentSchema).optional(),
});

// ── 2. categories.json ───────────────────────────────────

export const categoriesSchema = z.object({
  sectionTag: z.string(),
  heading: z.string(),
  subtitle: z.string(),
  categories: z.array(
    z.object({
      name: z.string(),
      age: z.string(),
      emoji: z.string(),
      color: z.string(),
      desc: z.string(),
    })
  ),
});

// ── 3. scoring.json ──────────────────────────────────────

export const scoringSchema = z.object({
  sectionTag: z.string(),
  heading: z.string(),
  subtitle: z.string(),
  tableHeaders: z.array(z.string()),
  rows: z.array(
    z.object({
      label: z.string(),
      values: z.array(z.string()),
      status: z.string(),
    })
  ),
  summaryCards: z.array(StatSchema),
  summaryColumns: z.number().int().min(1).max(4).optional(),
});

// ── 4. faq.json ──────────────────────────────────────────

export const faqSchema = z.object({
  header: PageMetaSchema.extend({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 5. teacher-instructions.json ─────────────────────────

export const teacherInstructionsSchema = z.object({
  header: z.object({
    sectionTag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 6. sponsors.json ────────────────────────────────────

export const sponsorsSchema = z.object({
  header: PageMetaSchema.extend({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 7. contact.json ─────────────────────────────────────

export const contactSchema = z.object({
  header: PageMetaSchema.extend({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 8. registro.json ────────────────────────────────────

export const registroSchema = PageMetaSchema.extend({
  tag: z.string(),
  heading: z.string(),
  paragraph: z.string(),
  disabledButton: z.string(),
  backButton: LinkSchema,
  notification: z.object({
    tag: z.string(),
    text: z.string(),
    instruction: z.string(),
    email: z.string(),
    suffix: z.string(),
  }),
  components: z.array(SharedPageComponentSchema).optional(),
});

// ── 9. estudiantes.json ─────────────────────────────────

export const estudiantesSchema = PageMetaSchema.extend({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 10. docentes.json ────────────────────────────────────

export const docentesSchema = PageMetaSchema.extend({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 11. blog-ui.json ─────────────────────────────────────

export const blogUiSchema = z.object({
  header: PageMetaSchema.extend({
    tag: z.string(),
    heading: z.string(),
    headingHighlight: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 12. page-composition.json ─────────────────────────────

const ChildPlacementSchema = z.object({
  enabled: z.boolean(),
  afterSectionId: z.string(),
});

export const pageCompositionSchema = z.object({
  docentes: z.object({
    teacherInstructions: ChildPlacementSchema,
  }),
  estudiantes: z.object({
    scoring: ChildPlacementSchema,
  }),
});

// ── Schema registry (filename → schema) ──────────────────

export const contentSchemas: Record<string, z.ZodType> = {
  "home.json": homeSchema,
  "categories.json": categoriesSchema,
  "scoring.json": scoringSchema,
  "faq.json": faqSchema,
  "teacher-instructions.json": teacherInstructionsSchema,
  "sponsors.json": sponsorsSchema,
  "contact.json": contactSchema,
  "registro.json": registroSchema,
  "estudiantes.json": estudiantesSchema,
  "docentes.json": docentesSchema,
  "blog-ui.json": blogUiSchema,
  "page-composition.json": pageCompositionSchema,
};

/** All valid content file names */
export const CONTENT_FILES = Object.keys(contentSchemas);
