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

// Tailwind v4 JIT only sees classes written literally — keep every variant as a literal string.
type TabStyle = {
  triggerActive: string;
  triggerDot: string;
  panel: string;
};

const STYLES: Record<BrandColor, TabStyle> = {
  yellow: {
    triggerActive: "data-active:bg-bebras-yellow data-active:text-white data-active:border-bebras-yellow",
    triggerDot: "bg-bebras-yellow",
    panel: "brand-card brand-card-yellow",
  },
  red: {
    triggerActive: "data-active:bg-bebras-red data-active:text-white data-active:border-bebras-red",
    triggerDot: "bg-bebras-red",
    panel: "brand-card brand-card-red",
  },
  green: {
    triggerActive: "data-active:bg-bebras-green data-active:text-white data-active:border-bebras-green",
    triggerDot: "bg-bebras-green",
    panel: "brand-card brand-card-green",
  },
  blue: {
    triggerActive: "data-active:bg-bebras-blue data-active:text-white data-active:border-bebras-blue",
    triggerDot: "bg-bebras-blue",
    panel: "brand-card brand-card-blue",
  },
  gray: {
    triggerActive: "data-active:bg-bebras-gray data-active:text-bebras-ink data-active:border-bebras-gray",
    triggerDot: "bg-bebras-ink/60",
    panel: "brand-card brand-card-gray",
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
    <section className="reveal-section editorial-section mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-primary">
          {sectionTag}
        </p>
        <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {heading}
        </h2>
        <p className="mb-10 max-w-3xl text-xl leading-relaxed text-muted-foreground">
          {subtitle}
        </p>

        <Tabs defaultValue={tabs[0]?.id}>
          <TabsList className="mb-8 flex h-auto w-full flex-wrap justify-start gap-3 rounded-none bg-transparent p-0">
            {tabs.map((tab, index) => {
              const color = palette[index % palette.length] || "green";
              const s = STYLES[color];
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`group inline-flex h-auto items-center gap-3 rounded-2xl border-2 border-border bg-bebras-paper px-6 py-3.5 text-base font-bold text-bebras-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-bebras-ink/40 focus-visible:ring-0 focus-visible:outline-none data-active:translate-y-0 data-active:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.4)] ${s.triggerActive}`}
                >
                  <span
                    className={`size-2.5 rounded-full transition-transform duration-200 group-hover:scale-125 group-data-active:bg-white ${s.triggerDot}`}
                  />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab, tabIndex) => {
            const color = palette[tabIndex % palette.length] || "green";
            const s = STYLES[color];
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-300"
              >
                <div className={`${s.panel} p-7 sm:p-10`}>
                  <h3 className="mb-7 text-3xl font-bold tracking-tight sm:text-4xl">
                    {tab.heading}
                  </h3>
                  <ul className="grid gap-5 sm:gap-6">
                    {tab.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-4 sm:gap-5">
                        <span className="brand-card-icon mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl text-base font-bold tabular-nums">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1 text-lg leading-relaxed sm:text-xl">
                          {item.title && (
                            <strong className="mb-1 block text-xl font-bold sm:text-2xl">
                              {item.title}
                            </strong>
                          )}
                          <span className="brand-card-muted">
                            {item.desc || item.text || ""}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}
