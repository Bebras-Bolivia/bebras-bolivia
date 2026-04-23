import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
}

export default function TeacherInstructions({ sectionTag, heading, subtitle, tabs }: Props) {
  return (
    <section className="bg-card py-16 lg:py-20 mx-4 sm:mx-6 lg:mx-auto max-w-5xl rounded-[2.5rem] shadow-xl border border-border/70">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.25em] font-semibold text-primary mb-3 text-center">
          {sectionTag}
        </p>
        <h2 className="text-3xl font-bold text-foreground mb-2 text-center tracking-tight">
          {heading}
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          {subtitle}
        </p>

        <Tabs defaultValue={tabs[0]?.id}>
          <TabsList className="w-full grid grid-cols-3 mb-8">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <div className="card-accent-left rounded-xl border border-border bg-card p-7 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-5">
                  {tab.heading}
                </h3>
                <ul className="space-y-5 text-muted-foreground">
                  {tab.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="flex items-center justify-center size-7 shrink-0 rounded-lg bg-primary/10 text-primary text-xs font-bold mt-0.5 font-mono">
                        {i + 1}
                      </span>
                      <span>
                        {item.title && (
                          <><strong className="text-foreground">{item.title}</strong>{" "}</>
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
