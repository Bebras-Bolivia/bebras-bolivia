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

const GenericTextBlockSchema = z.object({
  type: z.literal("text"),
  sectionTag: z.string().optional(),
  heading: z.string(),
  paragraphs: z.array(z.string()),
});

const GenericCardsBlockSchema = z.object({
  type: z.literal("cardsGrid"),
  sectionTag: z.string().optional(),
  heading: z.string(),
  columns: z.number().int().min(1).max(4),
  cards: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    })
  ),
});

const GenericTipBlockSchema = z.object({
  type: z.literal("tip"),
  sectionTag: z.string().optional(),
  heading: z.string().optional(),
  text: z.string(),
});

const GenericCtaBlockSchema = z.object({
  type: z.literal("cta"),
  accent: BrandColorSchema.optional(),
  sectionTag: z.string().optional(),
  heading: z.string(),
  text: z.string().optional(),
  variant: z.enum(["button", "link"]),
  action: LinkSchema,
});

const GenericPageBlockSchema = z.discriminatedUnion("type", [
  GenericTextBlockSchema,
  GenericCardsBlockSchema,
  GenericTipBlockSchema,
  GenericCtaBlockSchema,
]);

const StatSchema = z.object({
  value: z.string(),
  label: z.string(),
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
    type: z.literal("contactInfoCards"),
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
  z.object({
    type: z.literal("contactInternational"),
    tag: z.string(),
    links: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        description: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal("contactForm"),
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
    type: z.literal("faqQuestions"),
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
    type: z.literal("sponsorsCards"),
    tag: z.string(),
    columns: z.number().int().min(1).max(4),
    cards: z.array(
      z.object({
        name: z.string(),
        desc: z.string(),
        image: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal("docentesRegistro"),
    tag: z.string(),
    heading: z.string(),
    intro: z.string(),
    columns: z.number().int().min(1).max(4).optional(),
    steps: z.array(
      z.object({
        num: z.string(),
        title: z.string(),
        desc: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal("docentesRequisitos"),
    tag: z.string(),
    heading: z.string(),
    columns: z.number().int().min(1).max(4).optional(),
    requirements: z.array(
      z.object({
        icon: z.string(),
        title: z.string(),
        desc: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal("docentesAlcance"),
    tag: z.string(),
    heading: z.string(),
    content: z.array(z.string()),
    tip: z.string(),
  }),
  z.object({
    type: z.literal("teacherInstructionsTabs"),
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
    type: z.literal("cta"),
    accent: BrandColorSchema.optional(),
    tag: z.string().optional(),
    heading: z.string(),
    text: z.string(),
    buttonLabel: z.string(),
    buttonHref: z.string(),
  }),
]);

// ── 1. site.json ──────────────────────────────────────────

export const siteSchema = z.object({
  siteName: z.string(),
  siteUrl: z.string(),
  defaultDescription: z.string(),
  locale: z.string(),
  lang: z.string(),
  skipLinkText: z.string(),
  copyrightText: z.string(),
  trademarkNote: z.string(),
  trademarkUrl: z.string(),
  email: z.string(),
  brandDescription: z.string(),
  defaultAuthor: z.string(),
});

// ── 2. navigation.json ───────────────────────────────────

export const navigationSchema = z.object({
  brand: z.object({
    name: z.string(),
    suffix: z.string(),
    href: z.string(),
  }),
  links: z.array(LinkSchema),
  cta: LinkSchema,
  footerColumns: z.array(
    z.object({
      title: z.string(),
      links: z.array(LinkSchema),
    })
  ),
  socialLinks: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
      icon: z.string(),
    })
  ),
  internationalLinks: z.array(LinkSchema),
});

// ── 3. hero.json ─────────────────────────────────────────

export const heroSchema = z.object({
  badge: z.string(),
  headline: z.object({
    line1: z.string(),
    line2: z.string(),
    line3: z.string(),
  }),
  subtitle: z.string(),
  ctaPrimary: LinkSchema,
  ctaSecondary: LinkSchema,
  mascot: z.object({
    src: z.string(),
    alt: z.string(),
  }),
  stats: z.array(StatSchema),
});

// ── Home page ─────────────────────────────────────────────

const HomeEditorialSectionSchema = z.object({
  type: z.literal("introEditorial"),
  accent: BrandColorSchema.optional(),
  number: z.string(),
  kicker: z.string(),
  asideText: z.string(),
  headingPrefix: z.string(),
  headingEmphasis: z.string(),
  paragraphs: z.array(z.string()),
});

const HomeAgeCategoriesSectionSchema = z.object({
  type: z.literal("homeAgeCategories"),
  accent: BrandColorSchema.optional(),
  number: z.string(),
  kicker: z.string(),
  asideText: z.string(),
  headingPrefix: z.string(),
  headingEmphasis: z.string(),
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
  headingPrefix: z.string(),
  headingEmphasis: z.string(),
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
    welcomeText: z.string(),
    title: z.string(),
    subtitlePrimary: z.string(),
    subtitleSecondary: z.string(),
    buttonLabel: z.string(),
    buttonHref: z.string(),
  }),
  sections: z.array(HomeSectionSchema),
  components: z.array(SharedPageComponentSchema).optional(),
});

// ── 4. about.json ────────────────────────────────────────

export const aboutSchema = z.object({
  sectionTag: z.string(),
  heading: z.string(),
  headingHighlight: z.string(),
  subtitle: z.string(),
  cards: z.array(
    z.object({
      number: z.string(),
      title: z.string(),
      body: z.string(),
      icon: z.string(),
      link: LinkSchema.optional(),
    })
  ),
});

// ── 5. categories.json ───────────────────────────────────

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

// ── 6. scoring.json ──────────────────────────────────────

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

// ── 7. news.json ─────────────────────────────────────────

export const newsSchema = z.object({
  slides: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      link: z.string(),
      linkText: z.string(),
      tag: z.string(),
    })
  ),
});

// ── 8. faq.json ──────────────────────────────────────────

export const faqSchema = z.object({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 9. teacher-instructions.json ─────────────────────────

export const teacherInstructionsSchema = z.object({
  header: z.object({
    sectionTag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 10. sponsors.json ────────────────────────────────────

export const sponsorsSchema = z.object({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 11. contact.json ─────────────────────────────────────

export const contactSchema = z.object({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 12. registro.json ────────────────────────────────────

export const registroSchema = z.object({
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

// ── 13. estudiantes.json ─────────────────────────────────

export const estudiantesSchema = z.object({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 14. docentes.json ────────────────────────────────────
// Polymorphic sections discriminated by `id`

const docentesRegistro = z.object({
  id: z.literal("registro"),
  tag: z.string(),
  heading: z.string(),
  intro: z.string(),
  columns: z.number().int().min(1).max(4).optional(),
  steps: z.array(
    z.object({
      num: z.string(),
      title: z.string(),
      desc: z.string(),
    })
  ),
});

const docentesRequisitos = z.object({
  id: z.literal("requisitos"),
  tag: z.string(),
  heading: z.string(),
  columns: z.number().int().min(1).max(4).optional(),
  requirements: z.array(
    z.object({
      icon: z.string(),
      title: z.string(),
      desc: z.string(),
    })
  ),
});

const docentesAlcance = z.object({
  id: z.literal("alcance"),
  tag: z.string(),
  heading: z.string(),
  content: z.array(z.string()),
  tip: z.string(),
});

const docentesCta = z.object({
  id: z.literal("cta"),
  heading: z.string(),
  content: z.array(z.string()),
  cta: LinkSchema,
});

const docentesSectionSchema = z.discriminatedUnion("id", [
  docentesRegistro,
  docentesRequisitos,
  docentesAlcance,
  docentesCta,
]);

export const docentesSchema = z.object({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 15. blog-ui.json ─────────────────────────────────────

export const blogUiSchema = z.object({
  header: z.object({
    tag: z.string(),
    heading: z.string(),
    headingHighlight: z.string(),
    subtitle: z.string(),
  }),
  components: z.array(SharedPageComponentSchema),
});

// ── 16. custom-pages.json ─────────────────────────────────

export const customPagesSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      description: z.string(),
      navLabel: z.string(),
      showInHeader: z.boolean(),
      blocks: z.array(GenericPageBlockSchema),
    })
  ),
});

// ── 17. page-composition.json ─────────────────────────────

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
  "site.json": siteSchema,
  "navigation.json": navigationSchema,
  "hero.json": heroSchema,
  "about.json": aboutSchema,
  "categories.json": categoriesSchema,
  "scoring.json": scoringSchema,
  "news.json": newsSchema,
  "faq.json": faqSchema,
  "teacher-instructions.json": teacherInstructionsSchema,
  "sponsors.json": sponsorsSchema,
  "contact.json": contactSchema,
  "registro.json": registroSchema,
  "estudiantes.json": estudiantesSchema,
  "docentes.json": docentesSchema,
  "blog-ui.json": blogUiSchema,
  "custom-pages.json": customPagesSchema,
  "page-composition.json": pageCompositionSchema,
};

/** All valid content file names */
export const CONTENT_FILES = Object.keys(contentSchemas);
