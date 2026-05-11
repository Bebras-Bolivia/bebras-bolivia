import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

interface Props {
  categories: FAQCategory[];
}

export default function FAQAccordion({ categories }: Props) {
  const categoryColors = ["bg-bebras-blue", "bg-bebras-red", "bg-bebras-yellow", "bg-bebras-green"];

  return (
    <div className="mx-auto w-full max-w-6xl py-4 lg:py-6">
      {categories.map((category, catIdx) => (
        <div key={catIdx} className={catIdx > 0 ? "mt-10 lg:mt-12" : ""}>
          <div className="mb-5 flex items-center gap-4">
            <span className={`inline-flex size-11 items-center justify-center rounded-2xl text-sm font-bold uppercase tracking-wider text-white ${categoryColors[catIdx % categoryColors.length]}`}>
              {String(catIdx + 1).padStart(2, "0")}
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {category.title}
            </h2>
            <span className="h-px flex-1 bg-bebras-gray" />
          </div>
          <Accordion type="multiple" className="overflow-hidden rounded-3xl border border-bebras-gray bg-white/60">
            {category.items.map((item, itemIdx) => (
              <AccordionItem key={itemIdx} value={`cat${catIdx}-item${itemIdx}`} className="border-b border-bebras-gray px-5 last:border-b-0">
                <AccordionTrigger className="py-4 text-left text-lg font-bold text-foreground hover:no-underline sm:text-xl">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="max-w-3xl pb-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
