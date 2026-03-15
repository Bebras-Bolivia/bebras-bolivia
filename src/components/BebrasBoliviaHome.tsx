import { ArrowRight, CalendarDays, MapPin, School, Users } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BebrasHeader } from "@/components/BebrasHeader";
import { ParticlesBackground } from "@/components/ParticlesBackground";

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
    <div className="relative min-h-screen overflow-hidden bg-primary text-foreground">
      <ParticlesBackground />
      <div className="relative z-10">
        <BebrasHeader />
      </div>
    </div>
  );
}
