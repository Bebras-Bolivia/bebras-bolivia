import { useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";

const navItems = [
  { navId: "inicio", sectionId: "inicio", label: "Inicio", href: "#inicio" },
  { navId: "estudiantes", sectionId: "categorias", label: "Estudiantes", href: "#categorias" },
  { navId: "docentes", sectionId: "desafio", label: "Docentes", href: "#desafio" },
  { navId: "ejemplos", sectionId: "cronograma", label: "Ejemplos", href: "#cronograma" },
  { navId: "registro", sectionId: "contacto", label: "Registro", href: "#contacto" },
  { navId: "aliados", sectionId: "contacto", label: "Aliados", href: "#contacto" },
  { navId: "recursos", sectionId: "faq", label: "Recursos", href: "#faq" },
  { navId: "contacto", sectionId: "contacto", label: "Contacto", href: "#contacto" },
] as const;

const sectionToNavId: Record<string, string> = {
  inicio: "inicio",
  categorias: "estudiantes",
  desafio: "docentes",
  cronograma: "ejemplos",
  faq: "recursos",
  contacto: "contacto",
};

export function BebrasHeader() {
  const [activeNavId, setActiveNavId] = useState("inicio");
  const uniqueSectionIds = useMemo(
    () => [...new Set(navItems.map((item) => item.sectionId))],
    []
  );

  useEffect(() => {
    const sections = uniqueSectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) return;

    const updateFromHash = () => {
      const hashId = window.location.hash.replace("#", "");
      if (uniqueSectionIds.includes(hashId)) {
        setActiveNavId(sectionToNavId[hashId] ?? "inicio");
      }
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          const sectionId = visibleEntries[0].target.id;
          setActiveNavId(sectionToNavId[sectionId] ?? "inicio");
        }
      },
      {
        rootMargin: "-35% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener("hashchange", updateFromHash);
      observer.disconnect();
    };
  }, [uniqueSectionIds]);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex max-w-9/12 items-center justify-between gap-3 px-4 pt-4 md:px-6">
        <div className="flex flex-1 items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-3 ">
          <a className="flex items-center gap-3" href="#inicio">
        
            <div>
              <p className="text-4xl leading-tight text-primary" style={{ fontFamily: "'Pacifico', cursive" }}>Bebras Bolivia</p>
            </div>
          </a>

          <nav className="hidden items-center gap-6  font-medium text md:flex">
          {navItems.map((item, index) => {
            const isActive = activeNavId === item.navId;
            return (
              <a
                key={`${item.label}-${index}`}
                  className={
                    isActive
                      ? "text-foreground underline decoration-2 underline-offset-8"
                      : "text-foreground/75 transition-colors hover:text-foreground"
                  }
                  href={item.href}
                  onClick={() => setActiveNavId(item.navId)}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
        </div>

      </div>
    </header>
  );
}
