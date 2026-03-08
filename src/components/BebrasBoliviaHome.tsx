import { ArrowRight, CalendarDays, MapPin, School, Users } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const categories = [
  {
    name: "Castores",
    ages: "8 a 10 años",
    level: "Primaria inicial",
    description: "Retos visuales para introducir lógica, patrones y secuencias.",
  },
  {
    name: "Benjamin",
    ages: "10 a 12 años",
    level: "Primaria alta",
    description: "Problemas cortos que fortalecen razonamiento y descomposición.",
  },
  {
    name: "Cadet",
    ages: "12 a 14 años",
    level: "Secundaria inicial",
    description: "Desafíos con tablas, decisiones y conceptos básicos de algoritmos.",
  },
  {
    name: "Junior",
    ages: "14 a 16 años",
    level: "Secundaria media",
    description: "Retos intermedios sobre eficiencia, datos y estrategia de solución.",
  },
  {
    name: "Senior",
    ages: "16 a 19 años",
    level: "Secundaria superior",
    description: "Problemas avanzados de pensamiento computacional aplicado.",
  },
];

const timeline = [
  { month: "Mayo - Junio", title: "Registro de colegios", detail: "Inscripción de unidades educativas y docentes coordinadores." },
  { month: "Agosto", title: "Capacitación docente", detail: "Sesiones breves para formato de prueba y acompañamiento pedagógico." },
  { month: "Septiembre", title: "Semana Bebras Bolivia", detail: "Aplicación del desafío en línea o presencial por categorías." },
  { month: "Octubre", title: "Resultados y reconocimiento", detail: "Publicación de resultados y entrega de certificados digitales." },
];

const faqs = [
  {
    question: "¿Bebras Bolivia requiere conocimientos de programación?",
    answer: "No. El desafío evalúa pensamiento computacional, lógica y resolución de problemas, sin necesidad de escribir código.",
  },
  {
    question: "¿Cómo se aplica en colegios con conectividad limitada?",
    answer: "Se puede coordinar modalidad mixta: versión en línea para sedes con internet y cuadernillos supervisados para zonas con baja conectividad.",
  },
  {
    question: "¿Quiénes pueden participar?",
    answer: "Estudiantes de primaria y secundaria de colegios públicos, privados y de convenio en todo el país.",
  },
];

export default function BebrasBoliviaHome() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-20%,rgba(219,39,119,0.12),transparent),radial-gradient(900px_500px_at_0%_0%,rgba(22,163,74,0.12),transparent),linear-gradient(#fcfcfb,#f6f7f3)] text-foreground">
      <header className="border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <a className="flex items-center gap-3" href="#inicio">
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">BB</div>
            <div>
              <p className="text-sm font-semibold leading-tight">Bebras Bolivia</p>
              <p className="text-xs text-muted-foreground">Computational Thinking Challenge</p>
            </div>
          </a>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            <a className="hover:text-red-700" href="#desafio">El desafío</a>
            <a className="hover:text-red-700" href="#categorias">Categorías</a>
            <a className="hover:text-red-700" href="#cronograma">Cronograma</a>
            <a className="hover:text-red-700" href="#faq">Preguntas</a>
          </nav>
          <Button asChild className="bg-red-600 hover:bg-red-700">
            <a href="#contacto">Registrar colegio</a>
          </Button>
        </div>
      </header>

      <main id="inicio" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-18">
        <section className="grid gap-8 rounded-3xl border bg-background/90 p-7 shadow-sm md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
              Inspirado en Bebras USA, adaptado para Bolivia
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
              Desafíos cortos para formar pensamiento computacional en todo el país
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              Bebras Bolivia conecta a estudiantes, docentes y colegios con una competencia internacional que promueve la lógica, la creatividad y la resolución de problemas desde primaria hasta secundaria.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <a href="#contacto">
                  Empezar inscripción
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="#desafio">Conocer el formato</a>
              </Button>
            </div>
          </div>
          <Card className="h-full bg-stone-50/95">
            <CardHeader>
              <CardTitle>Datos clave 2026</CardTitle>
              <CardDescription>Meta nacional del programa Bebras Bolivia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 size-5 text-red-600" />
                <p className="text-sm"><span className="font-semibold">15.000 estudiantes</span> en las 9 ciudades capitales y municipios aliados.</p>
              </div>
              <div className="flex items-start gap-3">
                <School className="mt-0.5 size-5 text-red-600" />
                <p className="text-sm"><span className="font-semibold">250 colegios</span> públicos y privados con docentes coordinadores.</p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-red-600" />
                <p className="text-sm"><span className="font-semibold">Cobertura nacional</span> con adaptación para contextos urbanos y rurales.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="desafio" className="mt-12 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>¿Qué es Bebras?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Es una iniciativa internacional de pensamiento computacional presente en más de 80 países.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Formato de prueba</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Retos de opción múltiple de 45 minutos, enfocados en lógica y resolución de problemas.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Beneficio para Bolivia</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Fortalece competencias STEM, pensamiento crítico y habilidades digitales en aula.</p>
            </CardContent>
          </Card>
        </section>

        <section id="categorias" className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Categorías oficiales</h2>
              <p className="text-sm text-muted-foreground">Distribución por edad y nivel educativo.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {category.name}
                    <Badge variant="outline">{category.ages}</Badge>
                  </CardTitle>
                  <CardDescription>{category.level}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="cronograma" className="mt-12 rounded-3xl border bg-background/80 p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <CalendarDays className="size-5 text-red-600" />
            <h2 className="text-2xl font-semibold tracking-tight">Cronograma nacional 2026</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {timeline.map((item) => (
              <Card key={item.title} size="sm">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wide text-red-700">{item.month}</CardTitle>
                  <CardDescription className="text-base text-foreground">{item.title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-12 grid gap-6 rounded-3xl border bg-background/90 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Preguntas frecuentes</h2>
            <p className="mt-2 text-sm text-muted-foreground">Información clave para directores, coordinadores y docentes.</p>
          </div>
          <Accordion type="single" collapsible>
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <footer id="contacto" className="border-t bg-stone-100/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-sm font-medium">Bebras Bolivia 2026</p>
            <p className="text-sm text-muted-foreground">Contacto: coordinacion@bebrasbolivia.org | +591 70000000</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <a href="#faq">Ver preguntas</a>
            </Button>
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <a href="mailto:coordinacion@bebrasbolivia.org">Solicitar información</a>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
