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
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      {categories.map((category, catIdx) => (
        <div key={catIdx} className={catIdx > 0 ? "mt-14" : ""}>
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex items-center justify-center size-9 rounded-2xl bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              {String(catIdx + 1).padStart(2, "0")}
            </span>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {category.title}
            </h2>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Accordion type="multiple">
            {category.items.map((item, itemIdx) => (
              <AccordionItem key={itemIdx} value={`cat${catIdx}-item${itemIdx}`} className="border-b border-border">
                <AccordionTrigger className="py-4 text-left text-foreground hover:no-underline font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground leading-relaxed pb-4">
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
