import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function initRevealSections(): void {
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
        toggleActions: "play none none none",
      },
    });
  });
}

initRevealSections();
document.addEventListener("astro:page-load", initRevealSections);
