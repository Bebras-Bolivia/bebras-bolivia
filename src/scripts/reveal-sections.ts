// Animación de entrada de las secciones `.reveal-section` (GSAP + ScrollTrigger).
//
// Script compartido por todas las páginas internas. Antes cada página tenía su
// propia copia inline: con el ClientRouter de Astro cada copia registraba un
// listener persistente de `astro:page-load`, y al navegar entre páginas se
// acumulaban inicializaciones sobre las mismas secciones (cada una re-ocultaba
// con `gsap.set(opacity: 0)` y creaba un ScrollTrigger duplicado). Además, con
// `toggleActions: "... reverse"`, el reseteo de scroll tras una navegación
// (p. ej. venir desde una sección baja de Inicio) revertía la animación y la
// página quedaba invisible.
//
// Aquí: una sola inicialización por elemento (guard con data-reveal-init),
// limpieza de triggers de páginas anteriores, y reveal de una sola vez —
// consistente con el comportamiento de `[data-animate]` del Layout.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function initRevealSections(): void {
  // Elimina triggers cuyos elementos ya no existen (swap de página anterior).
  ScrollTrigger.getAll().forEach((trigger) => {
    const el = trigger.vars.trigger;
    if (el instanceof Element && !document.contains(el)) {
      trigger.kill();
    }
  });

  gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
    if (section.dataset.revealInit === "true") return;
    section.dataset.revealInit = "true";

    gsap.set(section, { opacity: 0, y: 44, transformOrigin: "center center" });
    gsap.to(section, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: section,
        start: "top 85%",
        // Solo reproducir una vez: sin "reverse", el reseteo de scroll de una
        // navegación no puede volver a ocultar la sección.
        toggleActions: "play none none none",
      },
    });
  });
}

initRevealSections();
// Re-inicializar tras cada navegación cliente de Astro.
document.addEventListener("astro:page-load", initRevealSections);
