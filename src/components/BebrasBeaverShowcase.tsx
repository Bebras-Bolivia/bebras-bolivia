import type { CSSProperties } from "react";
import castorImage from "@/assets/castor.png";
import condorImage from "@/assets/condor.jpg";
import diabladaImage from "@/assets/diablada.jpg";
import salarImage from "@/assets/salar.jpg";
import aguayoImage from "@/assets/aguayo.jpg";
import quipuImage from "@/assets/quipu.jpg";
import llamasImage from "@/assets/llamas2.jpg";

const orbitImages = [
  {
    src: condorImage.src,
    alt: "Cóndor andino",
    sizeClass: "size-[52px] sm:size-[64px]",
    startX: "-238px",
    startY: "-132px",
    driftX: "14px",
    driftY: "-16px",
    duration: "8.8s",
    delay: "-1.8s",
    hoverScale: "1.18",
    hoverRotate: "-4deg",
  },
  {
    src: diabladaImage.src,
    alt: "Diablada boliviana",
    sizeClass: "size-[98px] sm:size-[118px]",
    startX: "14px",
    startY: "-286px",
    driftX: "-18px",
    driftY: "14px",
    duration: "10.2s",
    delay: "-3.6s",
    hoverScale: "1.16",
    hoverRotate: "5deg",
  },
  {
    src: salarImage.src,
    alt: "Salar de Uyuni",
    sizeClass: "size-[72px] sm:size-[86px]",
    startX: "252px",
    startY: "96px",
    driftX: "-14px",
    driftY: "-12px",
    duration: "9.4s",
    delay: "-2.2s",
    hoverScale: "1.17",
    hoverRotate: "4deg",
  },
  {
    src: aguayoImage.src,
    alt: "Aguayo boliviano",
    sizeClass: "size-[84px] sm:size-[100px]",
    startX: "-268px",
    startY: "64px",
    driftX: "16px",
    driftY: "-14px",
    duration: "11.1s",
    delay: "-5.1s",
    hoverScale: "1.16",
    hoverRotate: "-5deg",
  },
  {
    src: quipuImage.src,
    alt: "Quipu andino",
    sizeClass: "size-[56px] sm:size-[68px]",
    startX: "274px",
    startY: "-138px",
    driftX: "-12px",
    driftY: "10px",
    duration: "8.3s",
    delay: "-0.9s",
    hoverScale: "1.18",
    hoverRotate: "6deg",
  },
  {
    src: llamasImage.src,
    alt: "Llamas de Bolivia",
    sizeClass: "size-[64px] sm:size-[80px]",
    startX: "6px",
    startY: "246px",
    driftX: "10px",
    driftY: "-16px",
    duration: "9.8s",
    delay: "-4.2s",
    hoverScale: "1.15",
    hoverRotate: "-4deg",
  },
];

export function BebrasBeaverShowcase() {
  return (
    <div className="mx-auto flex w-full max-w-xl justify-center lg:justify-end">
      <div className="relative beaver-entry w-[280px] sm:w-[360px] lg:w-[420px]">
        <div className="beaver-idle">
          <img
            src={castorImage.src}
            alt="Castor de Bebras Bolivia"
            className="h-auto w-full object-contain drop-shadow-xl transition duration-500 ease-out hover:scale-[1.03] hover:rotate-[1.2deg] hover:[filter:drop-shadow(0_18px_35px_hsl(var(--primary)/0.35))]"
          />
        </div>
        <div className="absolute inset-0 [perspective:900px]">
          {orbitImages.map((item, index) => (
            <div
              key={item.alt}
              className={`avatar-float pointer-events-auto absolute left-1/2 top-1/2 z-30 cursor-pointer ${item.sizeClass}`}
              style={
                {
                  "--x": item.startX,
                  "--y": item.startY,
                  "--dx": item.driftX,
                  "--dy": item.driftY,
                  "--dur": item.duration,
                  "--delay": item.delay,
                } as CSSProperties
              }
            >
              <div
                className="h-full w-full overflow-hidden rounded-full border-2 border-card shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition duration-300 ease-out hover:scale-[var(--hover-scale)] hover:rotate-[var(--hover-rotate)] hover:border-primary hover:shadow-[0_18px_42px_hsl(var(--primary)/0.55)]"
                style={
                  {
                    "--hover-scale": item.hoverScale,
                    "--hover-rotate": item.hoverRotate,
                  } as CSSProperties
                }
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
