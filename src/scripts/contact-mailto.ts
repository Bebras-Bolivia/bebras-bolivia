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
  ].filter((line): line is string => typeof line === "string");

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
document.addEventListener("astro:page-load", initContactMailtoForms);
