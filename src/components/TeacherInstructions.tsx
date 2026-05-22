import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { normalizePalette, type BrandColor } from "@/lib/brand-styles";

interface InstructionItem {
  title?: string;
  desc?: string;
  text?: string;
}

interface Tab {
  id: string;
  label: string;
  heading: string;
  items: InstructionItem[];
}

interface Props {
  sectionTag: string;
  heading: string;
  subtitle: string;
  tabs: Tab[];
  cardPalette?: string[];
}

const triggerActiveText: Record<BrandColor, string> = {
  yellow: "data-active:text-bebras-yellow-dark",
  red: "data-active:text-bebras-red",
  green: "data-active:text-bebras-green",
  blue: "data-active:text-bebras-blue",
  gray: "data-active:text-bebras-ink",
};

const triggerUnderline: Record<BrandColor, string> = {
  yellow: "data-active:after:bg-bebras-yellow",
  red: "data-active:after:bg-bebras-red",
  green: "data-active:after:bg-bebras-green",
  blue: "data-active:after:bg-bebras-blue",
  gray: "data-active:after:bg-bebras-ink/60",
};

const dotClass: Record<BrandColor, string> = {
  yellow: "bg-bebras-yellow",
  red: "bg-bebras-red",
  green: "bg-bebras-green",
  blue: "bg-bebras-blue",
  gray: "bg-bebras-gray",
};

const panelAccent: Record<BrandColor, { ring: string; chip: string; chipText: string; bullet: string; heading: string }> = {
  yellow: {
    ring: "border-bebras-yellow/40 shadow-[0_30px_60px_-40px_rgba(248,174,49,0.55)]",
    chip: "bg-bebras-yellow text-white",
    chipText: "text-bebras-yellow-dark",
    bullet: "bg-bebras-yellow",
    heading: "text-bebras-ink",
  },
  red: {
    ring: "border-bebras-red/40 shadow-[0_30px_60px_-40px_rgba(232,59,59,0.55)]",
    chip: "bg-bebras-red text-white",
    chipText: "text-bebras-red",
    bullet: "bg-bebras-red",
    heading: "text-bebras-ink",
  },
  green: {
    ring: "border-bebras-green/40 shadow-[0_30px_60px_-40px_rgba(27,143,96,0.55)]",
    chip: "bg-bebras-green text-white",
    chipText: "text-bebras-green",
    bullet: "bg-bebras-green",
    heading: "text-bebras-ink",
  },
  blue: {
    ring: "border-bebras-blue/40 shadow-[0_30px_60px_-40px_rgba(50,76,135,0.55)]",
    chip: "bg-bebras-blue text-white",
    chipText: "text-bebras-blue",
    bullet: "bg-bebras-blue",
    heading: "text-bebras-ink",
  },
  gray: {
    ring: "border-bebras-gray shadow-[0_30px_60px_-40px_rgba(17,0,0,0.35)]",
    chip: "bg-bebras-gray text-bebras-ink",
    chipText: "text-bebras-ink",
    bullet: "bg-bebras-ink/60",
    heading: "text-bebras-ink",
  },
};

export default function TeacherInstructions({
  sectionTag,
  heading,
  subtitle,
  tabs,
  cardPalette,
}: Props) {
  const palette = normalizePalette(cardPalette);

  return (
    <section className="editorial-section mx-4 max-w-6xl sm:mx-6 lg:mx-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.25em] font-semibold text-primary mb-3 text-center">
          {sectionTag}
        </p>
        <h2 className="text-3xl font-bold text-foreground mb-2 text-center tracking-tight">
          {heading}
        </h2>
        <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
          {subtitle}
        </p>

        <Tabs defaultValue={tabs[0]?.id}>
          <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-center gap-1 rounded-none border-b border-border bg-transparent p-0">
            {tabs.map((tab, index) => {
              const color = palette[index % palette.length] || "green";
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={[
                    "group relative inline-flex h-auto items-center gap-2 rounded-none border-0 bg-transparent px-5 py-3",
                    "text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                    "transition-colors duration-200 hover:text-bebras-ink focus-visible:ring-0 focus-visible:outline-none",
                    "after:absolute after:inset-x-3 after:-bottom-px after:h-0.75 after:rounded-full after:bg-transparent after:transition-all after:duration-300",
                    "data-active:after:inset-x-2",
                    triggerActiveText[color],
                    `data-active:${triggerUnderline[color]}`,
                  ].join(" ")}
                >
                  <span
                    className={[
                      "size-2 rounded-full transition-all duration-200",
                      dotClass[color],
                      "opacity-60 group-hover:opacity-100 group-data-active:opacity-100 group-data-active:scale-125",
                    ].join(" ")}
                  />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab, tabIndex) => {
            const color = palette[tabIndex % palette.length] || "green";
            const accent = panelAccent[color];
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300"
              >
                <div
                  className={[
                    "rounded-3xl border-2 bg-bebras-paper",
                    "p-6 sm:p-9",
                    accent.ring,
                  ].join(" ")}
                >
                  <div className="mb-6 flex items-center gap-3">
                    <span className={`inline-flex h-1.5 w-10 rounded-full ${accent.bullet}`} aria-hidden />
                    <h3 className={`text-2xl font-bold sm:text-3xl ${accent.heading}`}>
                      {tab.heading}
                    </h3>
                  </div>
                  <ol className="grid gap-4 sm:gap-5">
                    {tab.items.map((item, i) => (
                      <li
                        key={i}
                        className="group/item flex items-start gap-4 rounded-2xl border border-transparent p-3 transition-colors duration-200 hover:border-border hover:bg-white sm:gap-5 sm:p-4"
                      >
                        <span
                          className={[
                            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                            accent.chip,
                          ].join(" ")}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          {item.title && (
                            <p className={`mb-1 font-semibold leading-snug ${accent.chipText}`}>
                              {item.title}
                            </p>
                          )}
                          <p className="text-base leading-relaxed text-bebras-ink/80 sm:text-[1.0625rem]">
                            {item.desc || item.text || ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}
