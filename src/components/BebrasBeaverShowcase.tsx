import type { CSSProperties } from "react";
import { Camera, ExternalLink, X } from "lucide-react";
import castorImage from "@/assets/castor.png";
import yaguareteImage from "@/assets/yaguarete.jpg";
import jukumariImage from "@/assets/jukumari.jpg";
import guacamayoImage from "@/assets/guacamayo.jpg";
import capibaraImage from "@/assets/capibara.jpg";
import titiImage from "@/assets/titi.jpg";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const orbitImages = [
  {
    id: "yaguarete",
    nombre: "Yaguarete",
    src: yaguareteImage.src,
    alt: "Jaguar en Bolivia",
    credito: "Foto: MauMirror (Wikimedia Commons)",
    fuente: "https://commons.wikimedia.org/wiki/File:Kubai_Jaguar_(Panthera_onca).jpg",
    fecha: "27 June 2019, 17:32:40",
    textoFuente: "Ver fuente",
    sizeClass: "size-[86px] sm:size-[104px]",
    startX: "-240px",
    startY: "-70px",
    driftX: "10px",
    driftY: "-10px",
    duration: "8.8s",
    delay: "-1.8s",
    hoverScale: "1.18",
    hoverRotate: "-4deg",
  },
  {
    id: "jucumari",
    nombre: "Jucumari",
    src: jukumariImage.src,
    alt: "Oso andino en Bolivia",
    credito: "Foto: Jonathan Candil Mendez / Wikimedia Commons",
    fuente: "https://commons.wikimedia.org/wiki/File:Tremarctos_ornatus_165975083.jpg",
    fecha: "9 October 2021",
    textoFuente: "Ver fuente",
    sizeClass: "size-[110px] sm:size-[132px]",
    startX: "0px",
    startY: "-250px",
    driftX: "-10px",
    driftY: "10px",
    duration: "10.2s",
    delay: "-3.6s",
    hoverScale: "1.16",
    hoverRotate: "5deg",
  },
  {
    id: "maracana-lomo-rojo",
    nombre: "Guacamayo",
    src: guacamayoImage.src,
    alt: "Maracana lomo rojo (Primolius maracana) en su habitat",
    credito: "Foto: Borochirebelde / Wikimedia Commons",
    fuente: "https://commons.wikimedia.org/wiki/File:Ara_ararauna_en_los_llanos_de_Moxos.jpg",
    fecha: "30 August 2025, 07:59:30",
    textoFuente: "Ver fuente",
    sizeClass: "size-[94px] sm:size-[112px]",
    startX: "250px",
    startY: "-20px",
    driftX: "-10px",
    driftY: "-8px",
    duration: "9.4s",
    delay: "-2.2s",
    hoverScale: "1.17",
    hoverRotate: "4deg",
  },
  {
    id: "capibara",
    nombre: "Capibara",
    src: capibaraImage.src,
    alt: "Capibara en Sudamerica",
    credito: "Foto: Ludwinsiles / Wikimedia Commons",
    fuente: "https://commons.wikimedia.org/wiki/File:Familia_de_capibaras_al_borde_del_rio_en_el_parque_Nacional_Madidi.jpg",
    fecha: "1 July 2024",
    textoFuente: "Ver fuente",
    sizeClass: "size-[108px] sm:size-[128px]",
    startX: "-220px",
    startY: "190px",
    driftX: "10px",
    driftY: "-10px",
    duration: "11.1s",
    delay: "-5.1s",
    hoverScale: "1.16",
    hoverRotate: "-5deg",
  },
  {
    id: "titi",
    nombre: "Titi",
    src: titiImage.src,
    alt: "Mono titi",
    credito: "Foto: Kozue Kawakami / Wikimedia Commons",
    fuente: "https://commons.wikimedia.org/wiki/File:Plecturocebus_donacophilus_143025465.jpg",
    fecha: "11 July 2021",
    textoFuente: "Ver fuente",
    sizeClass: "size-[90px] sm:size-[108px]",
    startX: "210px",
    startY: "170px",
    driftX: "-10px",
    driftY: "10px",
    duration: "8.3s",
    delay: "-0.9s",
    hoverScale: "1.18",
    hoverRotate: "6deg",
  },
];

export function BebrasBeaverShowcase() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-xl justify-center lg:justify-end ">
        <div className="relative beaver-entry w-[240px] sm:w-[320px] lg:w-[420px]">
          <div className="beaver-idle">
            <img
              src={castorImage.src}
              alt="Castor de Bebras Bolivia"
              className="h-auto w-full object-contain drop-shadow-xl transition duration-500 ease-out hover:scale-[1.03] hover:rotate-[1.2deg] hover:[filter:drop-shadow(0_18px_35px_hsl(var(--primary)/0.35))]"
            />
          </div>
          <div className="absolute inset-0 block origin-center translate-y-2 sm:translate-y-0 [perspective:900px] scale-[0.54] sm:scale-[0.8] lg:translate-y-0 lg:scale-100">
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
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Camera className="size-4 shrink-0" />
                        <span>{item.credito}</span>
                      </p>
                      <a
                        href={item.fuente}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        <span>{item.textoFuente}</span>
                        <ExternalLink className="size-4" />
                      </a>
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
