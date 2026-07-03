// Envío del formulario de contacto vía mailto: arma un borrador de correo
// con los datos del formulario hacia la dirección indicada en data-mailto.
// El sitio es estático (sin backend público), así que el envío se delega al
// cliente de correo del visitante.

function buildMailtoUrl(to: string, form: HTMLFormElement): string {
  const fd = new FormData(form);
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const role = String(fd.get("role") ?? "").trim();
  const message = String(fd.get("message") ?? "").trim();

  const subject = `Contacto Bebras Bolivia${name ? ` — ${name}` : ""}`;
  const bodyLines = [
    name && `Nombre: ${name}`,
    email && `Correo: ${email}`,
    role && `Rol: ${role}`,
    "",
    message,
  ].filter((line): line is string => line !== false);

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
}

function initContactMailtoForms(): void {
  const forms = document.querySelectorAll<HTMLFormElement>("form[data-mailto]");
  forms.forEach((form) => {
    if (form.dataset.mailtoBound === "true") return;
    form.dataset.mailtoBound = "true";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const to = form.dataset.mailto;
      if (!to) return;
      window.location.href = buildMailtoUrl(to, form);
    });
  });
}

initContactMailtoForms();
// Re-enlazar tras la navegación cliente de Astro.
document.addEventListener("astro:page-load", initContactMailtoForms);
