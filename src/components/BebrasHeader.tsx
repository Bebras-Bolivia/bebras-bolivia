import { useState, useEffect } from "react";
import MobileMenu from "@/components/MobileMenu";
import navData from "@/data/navigation.json";

interface Props {
  currentPath: string;
}

const { brand, links, cta } = navData;

export default function BebrasHeader({ currentPath: initialPath }: Props) {
  const [currentPath, setCurrentPath] = useState(initialPath);

  // Update currentPath on client-side navigation (Astro ClientRouter)
  useEffect(() => {
    function onPageLoad() {
      setCurrentPath(window.location.pathname);
    }
    document.addEventListener("astro:page-load", onPageLoad);
    return () => document.removeEventListener("astro:page-load", onPageLoad);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-4 md:px-6">
        <div className="flex flex-1 items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-3 shadow-sm">
          {/* Brand / Logo */}
          <a className="flex items-center gap-3" href={brand.href}>
            <div>
              <p
                className="text-3xl leading-tight text-primary lg:text-4xl"
                style={{ fontFamily: "'Pacifico', cursive" }}
              >
                {brand.name} {brand.suffix}
              </p>
            </div>
          </a>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 font-medium lg:flex">
            {links.map((link) => {
              const isActive =
                currentPath === link.href ||
                (link.href !== "/" && currentPath.startsWith(link.href));
              return (
                <a
                  key={link.href}
                  className={`rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/75 hover:text-foreground hover:bg-accent"
                  }`}
                  href={link.href}
                >
                  {link.label}
                </a>
              );
            })}
            <a
              href={cta.href}
              className="ml-2 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/10 hover:bg-primary/90 hover:-translate-y-px transition-all duration-200"
            >
              {cta.label}
            </a>
          </nav>

          {/* Mobile menu button */}
          <MobileMenu links={links} currentPath={currentPath} />
        </div>
      </div>
    </header>
  );
}
