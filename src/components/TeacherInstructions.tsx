import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getBrandCardClass,
  normalizePalette,
  type BrandColor,
} from "@/lib/brand-styles";

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

const activeTabClass: Record<BrandColor, string> = {
  red: "data-active:bg-bebras-red data-active:text-white",
  yellow: "data-active:bg-bebras-yellow data-active:text-white",
  green: "data-active:bg-bebras-green data-active:text-white",
  blue: "data-active:bg-bebras-blue data-active:text-white",
  blueDark: "data-active:bg-bebras-blue-dark data-active:text-white",
};

const dotClass: Record<BrandColor, string> = {
  red: "bg-bebras-red",
  yellow: "bg-bebras-yellow",
  green: "bg-bebras-green",
  blue: "bg-bebras-blue",
  blueDark: "bg-bebras-blue-dark",
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
        <p className="text-center text-muted-foreground mb-6">
          {subtitle}
        </p>

        <Tabs defaultValue={tabs[0]?.id}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-1 gap-2 rounded-3xl bg-bebras-paper p-2 sm:grid-cols-3">
            {tabs.map((tab, index) => {
              const color = palette[index % palette.length] || "green";
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`group h-auto min-h-12 rounded-2xl border-0 bg-transparent px-4 py-3 text-base font-bold text-bebras-ink transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/70 focus-visible:ring-0 focus-visible:outline-none data-active:translate-y-0 data-active:shadow-none ${activeTabClass[color]}`}
                >
                  <span className={`mr-2 size-2.5 rounded-full transition-transform duration-200 group-hover:scale-125 ${dotClass[color]} group-data-active:bg-white`} />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab, tabIndex) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-300"
            >
              <div className={`${getBrandCardClass(tabIndex, cardPalette)} p-7 sm:p-9`}>
                <h3 className="mb-6 text-2xl font-bold text-white sm:text-3xl">
                  {tab.heading}
                </h3>
                <ul className="grid gap-5 text-base text-white/90 sm:text-lg">
                  {tab.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-4 sm:gap-5">
                      <span className="brand-card-icon mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">
                        {item.title && (
                          <><strong className="text-white">{item.title}</strong>{" "}</>
                        )}
                        {item.desc || item.text || ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
