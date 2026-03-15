import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

export function ParticlesBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      background: { color: "transparent" },
      detectRetina: true,
      particles: {
        number: { value: 42, density: { enable: true, width: 1200, height: 800 } },
        color: { value: "#ffffff" },
        opacity: { value: 0.55 },
        size: { value: { min: 1, max: 3.5 } },
        links: {
          enable: true,
          distance: 150,
          color: "#ffffff",
          opacity: 0.28,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.4,
          direction: "none",
          outModes: { default: "out" },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
          onClick: { enable: false, mode: [] },
          resize: { enable: true },
        },
        modes: {
          grab: {
            distance: 140,
            links: { opacity: 0.4, color: "#ffffff" },
          },
        },
      },
    }),
    []
  );

  if (!ready) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Particles id="bebras-particles" options={options} className="h-full w-full" />
    </div>
  );
}
