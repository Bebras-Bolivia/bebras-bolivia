import { useEffect, useState, type SyntheticEvent } from "react";
import QRCode from "qrcode";

import { findCertificates, normalizeCode, type Certificate } from "@/lib/certificate-crypto";

type Sheet = { name: string; code: string; certificate: Certificate };

function ordinal(value: number) {
  return value === 1 || value === 3 ? `${value}.er` : `${value}.º`;
}

function issuedLabel(certificate: Certificate) {
  const date = certificate.issuedAt ? new Date(certificate.issuedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return `Otorgado por Bebras Bolivia en ${certificate.year}`;
  return `Otorgado por Bebras Bolivia el ${date.toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" })}`;
}

export default function CertificateLookup({ castorSrc }: { castorSrc: string }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "missing" | "error">("idle");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selected, setSelected] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  const downloadPdf = async (current: Sheet) => {
    const node = document.querySelector<HTMLElement>(".certificate-sheet");
    if (!node) return;
    setDownloading(true);
    setDownloadFailed(false);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const image = await toPng(node, { pixelRatio: 2800 / node.offsetWidth, cacheBust: true, style: { boxShadow: "none" } });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      pdf.addImage(image, "PNG", 0, 0, 297, 210);
      pdf.save(`Certificado Bebras - ${current.name}.pdf`);
    } catch {
      setDownloadFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  const search = async (value: string) => {
    const normalized = normalizeCode(value);
    if (normalized.length < 4) return;
    setStatus("searching");
    try {
      const found = await findCertificates(normalized);
      if (!found || found.length === 0) {
        setSheets([]);
        setStatus("missing");
        return;
      }
      setSheets(found.flatMap((certificate) => certificate.participants.map((name) => ({ name, code: normalized, certificate }))));
      setSelected(0);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("codigo");
    if (fromUrl) {
      setCode(normalizeCode(fromUrl));
      void search(fromUrl);
    }
  }, []);

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    void search(code);
  };

  const sheet = sheets[selected];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
      <form onSubmit={submit} className="certificate-no-print mx-auto flex w-full max-w-xl flex-col gap-3">
        <label htmlFor="certificate-code" className="text-sm font-semibold text-foreground">
          Tu código personal
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="certificate-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase().replace(/\s/g, ""));
              if (status === "missing" || status === "error") setStatus("idle");
            }}
            placeholder="Ej.: ABCD2345"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={16}
            className="h-14 flex-1 rounded-2xl border-2 border-border bg-white px-5 font-mono text-xl font-semibold tracking-[0.2em] text-foreground outline-none transition focus:border-primary dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={normalizeCode(code).length < 4 || status === "searching"}
            className="h-14 rounded-2xl bg-primary px-7 text-base font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {status === "searching" ? "Buscando..." : "Ver mi certificado"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground" role={status === "missing" || status === "error" ? "alert" : undefined}>
          {status === "missing"
            ? "No encontramos un certificado con ese código. Revisa que esté bien escrito; los certificados aparecen cuando se publican los resultados del desafío."
            : status === "error"
              ? "No se pudo buscar el certificado. Revisa tu conexión y vuelve a intentar."
              : "Es el código que recibiste al inscribirte y usaste para entrar al desafío. Si lo perdiste, pídeselo a tu maestro."}
        </p>
      </form>

      {sheet ? (
        <div className="flex flex-col items-center gap-6">
          {sheets.length > 1 ? (
            <div className="certificate-no-print flex flex-wrap justify-center gap-2">
              {sheets.map((item, index) => (
                <button
                  key={`${item.certificate.contest}-${item.name}`}
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-pressed={index === selected}
                  className="rounded-full border-2 border-border px-4 py-1.5 text-sm font-medium transition aria-pressed:border-primary aria-pressed:bg-primary/10"
                >
                  {item.name} · {item.certificate.contest}
                </button>
              ))}
            </div>
          ) : null}

          <CertificateSheet sheet={sheet} castorSrc={castorSrc} />

          <div className="certificate-no-print flex flex-col items-center gap-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void downloadPdf(sheet)}
                disabled={downloading}
                className="h-12 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
              >
                {downloading ? "Preparando PDF..." : "Descargar PDF"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-12 rounded-2xl border-2 border-foreground bg-white px-6 text-base font-semibold text-foreground transition hover:-translate-y-0.5 dark:bg-zinc-900"
              >
                Imprimir
              </button>
            </div>
            {downloadFailed ? (
              <p role="alert" className="text-sm text-muted-foreground">
                No se pudo crear el PDF. Usa «Imprimir» y elige «Guardar como PDF».
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const DEPARTMENTS: Record<string, string> = {
  "la-paz": "La Paz",
  cochabamba: "Cochabamba",
  "santa-cruz": "Santa Cruz",
  oruro: "Oruro",
  potosi: "Potosí",
  sucre: "Chuquisaca",
  tarija: "Tarija",
  beni: "Beni",
  pando: "Pando",
};

function verifyUrl(code: string) {
  return `${window.location.origin}/certificado?codigo=${encodeURIComponent(code)}`;
}

function verifyHost() {
  return window.location.host;
}

/** Lleva a esta misma página con el código: quien lo escanea ve el certificado original. */
function VerificationQr({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toString(verifyUrl(code), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#2B211C", light: "#FDFCFB" } }).then(
      (value) => {
        if (active) setSvg(value);
      }
    );
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <div
      className="size-[8.5cqi] shrink-0 bg-[#FDFCFB] [&_svg]:size-full"
      role="img"
      aria-label="Código QR para verificar el certificado"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

type Distinction =
  | { kind: "podium"; rank: number }
  | { kind: "merit" }
  | { kind: "participation" };

/**
 * El puesto solo se muestra a quien destacó: los tres primeros de su
 * categoría y el 10 % con mejor puntaje. A los demás no les sirve ver que
 * quedaron 55.º; su certificado es de participación.
 */
function distinctionOf(certificate: Certificate): Distinction {
  const { rank, rankOf } = certificate;
  if (rank && rank <= 3) return { kind: "podium", rank };
  if (rank && rankOf && rankOf >= 10 && rank <= Math.ceil(rankOf * 0.1)) return { kind: "merit" };
  return { kind: "participation" };
}

const SEAL_COLORS = {
  1: { fill: "#F8AE31", dark: "#C8861F" },
  2: { fill: "#B8BFC9", dark: "#7D8693" },
  3: { fill: "#D08A4E", dark: "#9A5A28" },
  merit: { fill: "#324C87", dark: "#233561" },
  participation: { fill: "#1B8F60", dark: "#146E48" },
} as const;

function rosettePoints(points: number, outer: number, inner: number) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / points - Math.PI / 2;
    return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

const ROSETTE = rosettePoints(24, 47, 42);

function sealColors(distinction: Distinction) {
  return distinction.kind === "podium" ? SEAL_COLORS[distinction.rank as 1 | 2 | 3] : SEAL_COLORS[distinction.kind];
}

function Seal({ distinction, year, category }: { distinction: Distinction; year: number; category: string }) {
  const colors = sealColors(distinction);
  const [top, main, bottom] =
    distinction.kind === "podium"
      ? [category, ordinal(distinction.rank), "lugar"]
      : distinction.kind === "merit"
        ? ["Mención", "de honor", category]
        : ["Participante", String(year), category];

  return (
    <div className="relative w-[15cqi]">
      <svg viewBox="0 0 100 130" className="w-full drop-shadow-[0_0.3cqi_0.4cqi_rgba(43,33,28,0.18)]" aria-hidden="true">
        <path d="M30 70 L18 128 L32 118 L42 130 L50 78 Z" fill={colors.dark} />
        <path d="M70 70 L82 128 L68 118 L58 130 L50 78 Z" fill={colors.dark} />
        <polygon points={ROSETTE} fill={colors.fill} />
        <circle cx="50" cy="50" r="36" fill="none" stroke="#FDFCFB" strokeWidth="1.2" strokeDasharray="2 2.4" />
        <circle cx="50" cy="50" r="31" fill={colors.dark} />
      </svg>
      <div className="absolute inset-x-0 top-0 flex aspect-square flex-col items-center justify-center text-center text-[#FDFCFB]">
        <span
          className={
            top.length > 9
              ? "text-[0.85cqi] font-semibold uppercase tracking-[0.06em] opacity-90"
              : "text-[1cqi] font-semibold uppercase tracking-[0.15em] opacity-90"
          }
        >
          {top}
        </span>
        <span className={distinction.kind === "merit" ? "text-[1.7cqi] leading-tight font-bold" : "text-[2.9cqi] leading-none font-bold"}>
          {main}
        </span>
        <span className="mt-[0.2cqi] max-w-[9cqi] truncate text-[1cqi] font-semibold uppercase tracking-[0.12em] opacity-90">{bottom}</span>
      </div>
    </div>
  );
}

function CertificateSheet({ sheet, castorSrc }: { sheet: Sheet; castorSrc: string }) {
  const { certificate, name } = sheet;
  const distinction = distinctionOf(certificate);
  const department = certificate.department && DEPARTMENTS[certificate.department] ? certificate.department : null;
  const course = [certificate.category ? `categoría ${certificate.category}` : null, certificate.grade].filter(Boolean).join(", ");
  const origin = [certificate.school, certificate.place].filter(Boolean).join(" · ");
  const kind = distinction.kind === "podium" ? "de excelencia" : distinction.kind === "merit" ? "de mérito" : "de participación";

  return (
    <article
      className="certificate-sheet relative aspect-[297/210] w-full overflow-hidden bg-[#FDFCFB] text-[#2B211C] shadow-xl"
      style={{ containerType: "inline-size" }}
    >
      <div className="absolute right-[-10cqi] bottom-[-14cqi] size-[50cqi] rounded-full bg-[#F8AE31]/15" />
      <div className="absolute top-[-24cqi] left-[70cqi] size-[40cqi] rounded-full bg-[#324C87]/[0.06]" />
      <div className="absolute top-[-17cqi] left-[-17cqi] size-[28cqi] rounded-full bg-[#1B8F60]/[0.08]" />
      <div className="absolute top-[53cqi] left-[-13cqi] size-[20cqi] rounded-full bg-[#E83B3B]/[0.06]" />
      <div className="absolute inset-x-0 top-0 h-[1.3cqi] bg-[linear-gradient(90deg,#E83B3B_0_33.3%,#F8AE31_33.3%_66.6%,#1B8F60_66.6%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[1.3cqi] bg-[linear-gradient(90deg,#E83B3B_0_33.3%,#F8AE31_33.3%_66.6%,#1B8F60_66.6%)]" />
      <div className="absolute inset-[3cqi] border-[0.35cqi] border-[#F8AE31]" />
      <div className="absolute inset-[3.9cqi] border-[0.12cqi] border-[#324C87]/60" />

      <div className="relative grid h-full grid-cols-[1fr_30cqi] gap-[2cqi] py-[7.5cqi] pr-[7cqi] pl-[9cqi]">
        <div className="flex flex-col items-start justify-center text-left">
          <div className="flex items-center gap-[1.6cqi]">
            <div className="flex items-center gap-[1.1cqi]">
              <img src={castorSrc} alt="" className="h-[6.6cqi] w-auto" />
              <p className="font-display text-[2.35cqi] leading-[0.9] font-bold uppercase text-[#1B8F60]">
                <span className="block">Bebras</span>
                <span className="block">Bolivia</span>
              </p>
            </div>
            <span className="h-[5.8cqi] w-[0.12cqi] bg-[#2B211C]/15" />
            <img src="/images/certificado/obi.webp" alt="Olimpiada Boliviana de Informática" className="h-[5.6cqi] w-auto shrink-0" />
            <img src="/images/certificado/umss.webp" alt="Universidad Mayor de San Simón" className="h-[5.6cqi] w-auto shrink-0" />
          </div>

          <h2 className="mt-[1.8cqi] font-display text-[5.4cqi] leading-none font-bold tracking-tight text-[#324C87]">Certificado</h2>
          <p className="mt-[0.5cqi] text-[2cqi] font-semibold" style={{ color: sealColors(distinction).dark }}>
            {kind}
          </p>

          <p className="mt-[2.4cqi] text-[1.6cqi] text-[#7B6A5D]">Se otorga a</p>
          <p
            className="mt-[0.4cqi] font-display leading-tight font-bold"
            style={{ fontSize: name.length > 28 ? "2.8cqi" : name.length > 18 ? "3.3cqi" : "4cqi" }}
          >
            {name}
          </p>
          <div className="mt-[0.8cqi] h-[0.3cqi] w-[22cqi] bg-[#F8AE31]" />

          <p className="mt-[2cqi] max-w-[52cqi] text-[1.8cqi] leading-relaxed">
            {distinction.kind === "podium" ? (
              <>
                por obtener el <strong>{ordinal(distinction.rank)} lugar</strong> en la categoría {certificate.category} del{" "}
                <strong>{certificate.contest}</strong>
                {certificate.grade ? <> ({certificate.grade})</> : null}.
              </>
            ) : distinction.kind === "merit" ? (
              <>
                por ubicarse entre los <strong>mejores puntajes</strong> de la categoría {certificate.category} en el{" "}
                <strong>{certificate.contest}</strong>
                {certificate.grade ? <> ({certificate.grade})</> : null}.
              </>
            ) : (
              <>
                por su participación en el <strong>{certificate.contest}</strong>
                {course ? <>, {course}</> : null}, resolviendo desafíos de pensamiento computacional.
              </>
            )}
          </p>
          {origin ? <p className="mt-[0.5cqi] text-[1.55cqi] text-[#7B6A5D]">{origin}</p> : null}

          <div className="mt-[2.4cqi] flex items-center gap-[1.4cqi]">
            <VerificationQr code={sheet.code} />
            <div className="flex flex-col gap-[0.3cqi] text-[1.25cqi] leading-snug text-[#7B6A5D]">
              <span>{issuedLabel(certificate)}</span>
              <span>
                Verifica este certificado escaneando el código
                <br />o en <strong className="text-[#2B211C]">{verifyHost()}/certificado</strong> con el código{" "}
                <strong className="font-mono tracking-wider text-[#2B211C]">{sheet.code}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col items-center justify-between">
          <Seal distinction={distinction} year={certificate.year} category={certificate.category} />
          <div className="flex flex-col items-center">
            <div className="relative flex items-end justify-center">
              <span className="absolute bottom-[0.6cqi] h-[2.2cqi] w-[70%] rounded-[50%] bg-[#2B211C]/10 blur-[0.3cqi]" />
              <img
                src={`/images/castores/${department ?? "estandar"}.webp`}
                alt=""
                className="relative max-h-[26cqi] w-auto object-contain"
              />
            </div>
            {department ? (
              <p className="mt-[0.8cqi] text-[1.4cqi] font-semibold uppercase tracking-[0.2em] text-[#C8861F]">
                {DEPARTMENTS[department]}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
