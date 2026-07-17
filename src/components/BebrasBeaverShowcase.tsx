import type { CSSProperties } from "react";
import { Camera, ExternalLink, X } from "lucide-react";
import castorImage from "@/assets/castor.png";
import yaguareteImage from "@/assets/yaguarete.jpg";
import jukumariImage from "@/assets/jukumari.jpg";
import guacamayoImage from "@/assets/guacamayo.jpg";
import capibaraImage from "@/assets/capibara.jpg";
import titiImage from "@/assets/titi.jpg";
import { toSafeHref } from "@/lib/safe-url";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const bundledImages: Record<string, string> = {
  yaguarete: yaguareteImage.src,
  jucumari: jukumariImage.src,
  guacamayo: guacamayoImage.src,
  capibara: capibaraImage.src,
  titi: titiImage.src,
};

const orbitLayout = [
  { sizeClass: "size-[94px] sm:size-[112px]", startX: "250px", startY: "-30px", driftX: "-10px", driftY: "-8px", duration: "9.4s", delay: "-2.2s", hoverScale: "1.17", hoverRotate: "4deg" },
  { sizeClass: "size-[108px] sm:size-[128px]", startX: "-220px", startY: "190px", driftX: "10px", driftY: "-10px", duration: "11.1s", delay: "-5.1s", hoverScale: "1.16", hoverRotate: "-5deg" },
  { sizeClass: "size-[90px] sm:size-[108px]", startX: "230px", startY: "200px", driftX: "-10px", driftY: "10px", duration: "8.3s", delay: "-0.9s", hoverScale: "1.18", hoverRotate: "6deg" },
  { sizeClass: "size-[110px] sm:size-[132px]", startX: "-70px", startY: "-255px", driftX: "-10px", driftY: "10px", duration: "10.2s", delay: "-3.6s", hoverScale: "1.16", hoverRotate: "5deg" },
  { sizeClass: "size-[86px] sm:size-[104px]", startX: "-250px", startY: "-90px", driftX: "10px", driftY: "-10px", duration: "8.8s", delay: "-1.8s", hoverScale: "1.18", hoverRotate: "-4deg" },
  { sizeClass: "size-[96px] sm:size-[116px]", startX: "120px", startY: "-235px", driftX: "10px", driftY: "10px", duration: "9.9s", delay: "-4.3s", hoverScale: "1.17", hoverRotate: "-6deg" },
];

export interface ShowcaseCategory {
  name: string;
  imageKey?: string;
  imageUrl?: string;
  author?: string;
  authorUrl?: string;
}

interface ShowcaseProps {
  categories?: ShowcaseCategory[];
}

const defaultCategories: ShowcaseCategory[] = [
  { name: "Guacamayo", imageKey: "guacamayo", author: "Borochirebelde", authorUrl: "https://commons.wikimedia.org/wiki/File:Ara_ararauna_en_los_llanos_de_Moxos.jpg" },
  { name: "Capibara", imageKey: "capibara", author: "Ludwinsiles", authorUrl: "https://commons.wikimedia.org/wiki/File:Familia_de_capibaras_al_borde_del_rio_en_el_parque_Nacional_Madidi.jpg" },
  { name: "Titi", imageKey: "titi", author: "Kozue Kawakami", authorUrl: "https://commons.wikimedia.org/wiki/File:Plecturocebus_donacophilus_143025465.jpg" },
  { name: "Jucumari", imageKey: "jucumari", author: "Jonathan Candil Mendez", authorUrl: "https://commons.wikimedia.org/wiki/File:Tremarctos_ornatus_165975083.jpg" },
  { name: "Yaguarete", imageKey: "yaguarete", author: "MauMirror", authorUrl: "https://commons.wikimedia.org/wiki/File:Kubai_Jaguar_(Panthera_onca).jpg" },
];

export function BebrasBeaverShowcase({ categories }: ShowcaseProps = {}) {
  const source = categories && categories.length > 0 ? categories : defaultCategories;

  const orbitImages = source.slice(0, orbitLayout.length).map((cat, i) => {
    const src = cat.imageUrl?.trim()
      ? cat.imageUrl.trim()
      : bundledImages[cat.imageKey ?? ""] ?? bundledImages.guacamayo;
    return {
      id: `${cat.name}-${i}`,
      nombre: cat.name,
      src,
      alt: cat.name,
      credito: cat.author ? `Foto: ${cat.author}` : "",
      fuente: cat.authorUrl ?? "",
      textoFuente: "Ver fuente",
      ...orbitLayout[i],
    };
  });

  return (
    <>
      <div className="mx-auto flex w-full max-w-xl justify-center">
        <div className="relative beaver-entry w-[180px] sm:w-[260px] lg:w-[clamp(250px,24vw,320px)] xl:w-[330px]">
          <div className="beaver-idle">
            <img
              src={castorImage.src}
              alt="Castor de Bebras Bolivia"
              className="h-auto w-full object-contain drop-shadow-xl transition duration-500 ease-out hover:scale-[1.03] hover:rotate-[1.2deg] hover:[filter:drop-shadow(0_18px_35px_hsl(var(--primary)/0.35))]"
            />
          </div>
          <div className="absolute inset-0 block origin-center translate-y-2 sm:translate-y-0 [perspective:900px] scale-[0.54] sm:scale-[0.72] lg:translate-y-0 lg:scale-[0.74] xl:scale-[0.88] 2xl:scale-100">
            {orbitImages.map((item) => (
              <div
                key={item.id}
                className={`avatar-float pointer-events-auto absolute left-1/2 top-1/2 z-30 ${item.sizeClass}`}
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
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Abrir creditos de ${item.nombre}`}
                      className="h-full w-full overflow-hidden rounded-full border-2 border-card shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition duration-300 ease-out hover:scale-[var(--hover-scale)] hover:rotate-[var(--hover-rotate)] hover:border-primary hover:shadow-[0_18px_42px_hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      style={
                        {
                          "--hover-scale": item.hoverScale,
                          "--hover-rotate": item.hoverRotate,
                        } as CSSProperties
                      }
                    >
                      <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
                    </button>
                  </DialogTrigger>

                  <DialogContent
                    className="w-[calc(100%-2.75rem)] max-w-md overflow-hidden rounded-2xl border border-white/15 bg-card p-0 text-card-foreground shadow-2xl sm:w-full sm:max-w-xl"
                    showCloseButton={false}
                  >
                    <div className="relative h-64 w-full sm:h-80">
                      <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
                      <DialogClose asChild>
                        <button
                          type="button"
                          className="absolute right-3 top-3 inline-flex items-center justify-center rounded-2xl bg-black/60 p-2 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                          aria-label="Cerrar modal"
                        >
                          <X className="size-4" />
                        </button>
                      </DialogClose>
                    </div>

                    <div className="space-y-4 p-5 sm:p-6">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-foreground">{item.nombre}</DialogTitle>
                        <DialogDescription className="sr-only">{`Creditos de la imagen de ${item.nombre}`}</DialogDescription>
                      </DialogHeader>
                      {item.credito && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Camera className="size-4 shrink-0" />
                          <span>{item.credito}</span>
                        </p>
                      )}
                      {item.fuente && (
                        <a
                          href={toSafeHref(item.fuente)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                          <span>{item.textoFuente}</span>
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
