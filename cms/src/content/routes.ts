import { Router, type Request, type Response } from "express";
import { existsSync } from "fs";
import { join } from "path";
import {
  listContentFiles,
  readContentFile,
  writeContentFile,
  ContentError,
  ContentValidationError,
} from "./service.js";
import { syncFileToLanding } from "../preview/service.js";
import { queueAutoPublish } from "../publish/service.js";
import { CONTENT_FILES } from "./schemas.js";
import { withContentMutation } from "./mutation-lock.js";
import { config } from "../config.js";

export const contentRouter = Router();

const deletedCustomPagePaths = new Set<string>();

function slugifyPageTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePageTitle(value: unknown): string {
  return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function siteRouteExists(slug: string): boolean {
  const pagesDir = join(config.landingDir, "src", "pages");
  return [
    join(pagesDir, `${slug}.astro`),
    join(pagesDir, slug, "index.astro"),
    join(config.landingPublicDir, slug),
  ].some((path) => existsSync(path));
}

function containsString(value: unknown, target: string): boolean {
  if (typeof value === "string") return value === target;
  if (Array.isArray(value)) return value.some((item) => containsString(item, target));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => containsString(item, target));
  }
  return false;
}

async function assertNoSecondaryPageReferences(
  pagePath: string,
  pageId: string,
  pages: unknown[],
  navigation: Record<string, unknown>,
): Promise<void> {
  if (pages.some((item) => (item as { id?: string }).id !== pageId && containsString(item, pagePath))) {
    throw new ContentError("Otra página personalizada todavía contiene un enlace hacia esta página", 409);
  }

  const navigationWithoutPrimaryLinks = { ...navigation, links: [], cta: undefined };
  if (containsString(navigationWithoutPrimaryLinks, pagePath)) {
    throw new ContentError("La configuración global todavía contiene un enlace hacia esta página", 409);
  }

  for (const filename of CONTENT_FILES) {
    if (filename === "custom-pages.json" || filename === "navigation.json") continue;
    try {
      if (containsString(await readContentFile(filename), pagePath)) {
        throw new ContentError(`El contenido de ${filename} todavía contiene un enlace hacia esta página`, 409);
      }
    } catch (error) {
      if (error instanceof ContentError && error.status === 409) throw error;
    }
  }
}

/**
 * GET /api/content
 * List all content file names.
 */
contentRouter.get("/", (_req: Request, res: Response) => {
  res.json({ files: listContentFiles() });
});

contentRouter.post("/custom-pages/create", async (req: Request, res: Response) => {
  try {
    const title = normalizePageTitle(req.body?.title);
    const slug = slugifyPageTitle(title);
    if (!title || !slug) throw new ContentError("El nombre de la página no es válido", 400);
    if (title.length > 80) throw new ContentError("El nombre de la página no puede superar 80 caracteres", 400);
    if (/[\u0000-\u001f\u007f]/.test(title)) throw new ContentError("El nombre de la página contiene caracteres no válidos", 400);
    if (siteRouteExists(slug)) throw new ContentError("Esa ruta está reservada por una página existente", 409);

    const { page } = await withContentMutation(async () => {
      const currentPages = (await readContentFile("custom-pages.json")) as {
        pages?: Array<{ id: string; title: string; slug: string; active?: boolean }>;
      };
      const navigation = (await readContentFile("navigation.json")) as {
        links?: Array<{ label: string; href: string }>;
      };
      const pages = Array.isArray(currentPages.pages) ? currentPages.pages : [];
      const links = Array.isArray(navigation.links) ? navigation.links : [];
      const normalizedTitle = title.toLocaleLowerCase("es");
      if (
        pages.some((item) => item.slug === slug || item.title.trim().toLocaleLowerCase("es") === normalizedTitle)
        || links.some((link) => link.href === `/${slug}` || link.label.trim().toLocaleLowerCase("es") === normalizedTitle)
      ) {
        throw new ContentError("Ya existe una página con ese nombre", 409);
      }

      const page = {
        id: slug,
        title,
        slug,
        active: true,
        header: {
          tag: "Página",
          heading: title,
          subtitle: "Agrega una descripción para esta página.",
        },
        components: [],
      };
      const nextPages = { ...currentPages, pages: [...pages, page] };
      const nextNavigation = {
        ...navigation,
        links: [...links, { label: title, href: `/${slug}` }],
      };

      await writeContentFile("custom-pages.json", nextPages);
      try {
        await writeContentFile("navigation.json", nextNavigation);
      } catch (error) {
        await writeContentFile("custom-pages.json", currentPages);
        throw error;
      }
      deletedCustomPagePaths.delete(`/${slug}`);
      return { page };
    });

    try {
      await Promise.all([
        syncFileToLanding("custom-pages.json"),
        syncFileToLanding("navigation.json"),
      ]);
    } catch (syncError) {
      console.error("Warning: failed to sync new custom page to landing:", syncError);
    }
    res.status(201).json({ page });
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish";
    queueAutoPublish(author);
  } catch (err) {
    if (err instanceof ContentValidationError) {
      res.status(err.status).json({ error: err.message, details: err.details });
    } else if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error creating custom page:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

contentRouter.put("/navigation-links/status", async (req: Request, res: Response) => {
  try {
    const href = String(req.body?.href || "");
    if (typeof req.body?.active !== "boolean") {
      throw new ContentError("El enlace o estado de navegación no es válido", 400);
    }

    const navigation = await withContentMutation(async () => {
      const currentNavigation = (await readContentFile("navigation.json")) as {
        links?: Array<{ label: string; href: string; active?: boolean }>;
      };
      const links = Array.isArray(currentNavigation.links) ? currentNavigation.links : [];
      const customPages = (await readContentFile("custom-pages.json")) as { pages?: Array<{ slug: string }> };
      if ((customPages.pages || []).some((page) => `/${page.slug}` === href)) {
        throw new ContentError("Las páginas personalizadas administran su estado por separado", 400);
      }
      if (!links.some((link) => link.href === href)) {
        throw new ContentError("El enlace de navegación no existe", 404);
      }

      const navigation = {
        ...currentNavigation,
        links: links.map((link) => link.href === href ? { ...link, active: req.body.active } : link),
      };
      await writeContentFile("navigation.json", navigation);
      return navigation;
    });

    try {
      await syncFileToLanding("navigation.json");
    } catch (syncError) {
      console.error("Warning: failed to sync navigation link status to landing:", syncError);
    }
    res.json({ navigation, autoPublishQueued: true });
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish";
    queueAutoPublish(author);
  } catch (err) {
    if (err instanceof ContentValidationError) {
      res.status(err.status).json({ error: err.message, details: err.details });
    } else if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error changing navigation link status:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

contentRouter.put("/custom-pages/:id/status", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (typeof req.body?.active !== "boolean") {
      throw new ContentError("El estado de la página no es válido", 400);
    }

    const page = await withContentMutation(async () => {
      const currentPages = (await readContentFile("custom-pages.json")) as {
        pages?: Array<{ id: string; title: string; slug: string; active?: boolean }>;
      };
      const pages = Array.isArray(currentPages.pages) ? currentPages.pages : [];
      const pageIndex = pages.findIndex((item) => item.id === id);
      if (pageIndex < 0) throw new ContentError("La página solicitada no existe", 404);

      const page = { ...pages[pageIndex], active: req.body.active };
      if (!page.active) {
        const navigation = await readContentFile("navigation.json") as Record<string, unknown>;
        await assertNoSecondaryPageReferences(`/${page.slug}`, page.id, pages, navigation);
      }
      await writeContentFile("custom-pages.json", {
        ...currentPages,
        pages: pages.map((item, index) => index === pageIndex ? page : item),
      });
      return page;
    });

    try {
      await syncFileToLanding("custom-pages.json");
    } catch (syncError) {
      console.error("Warning: failed to sync custom page status to landing:", syncError);
    }
    res.json({ page, autoPublishQueued: true });
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish";
    queueAutoPublish(author);
  } catch (err) {
    if (err instanceof ContentValidationError) {
      res.status(err.status).json({ error: err.message, details: err.details });
    } else if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error changing custom page status:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

contentRouter.delete("/custom-pages/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const navigation = await withContentMutation(async () => {
      const currentPages = (await readContentFile("custom-pages.json")) as {
        pages?: Array<{ id: string; title: string; slug: string; active?: boolean }>;
      };
      const currentNavigation = (await readContentFile("navigation.json")) as {
        links?: Array<{ label: string; href: string }>;
      };
      const pages = Array.isArray(currentPages.pages) ? currentPages.pages : [];
      const page = pages.find((item) => item.id === id);
      if (!page) throw new ContentError("La página solicitada no existe", 404);
      const pagePath = `/${page.slug}`;
      await assertNoSecondaryPageReferences(pagePath, page.id, pages, currentNavigation as Record<string, unknown>);

      const navigation = {
        ...currentNavigation,
        links: (currentNavigation.links || []).filter((link) => link.href !== pagePath),
        cta: (currentNavigation as { cta?: { label: string; href: string } }).cta?.href === pagePath
          ? undefined
          : (currentNavigation as { cta?: { label: string; href: string } }).cta,
      };
      await writeContentFile("custom-pages.json", {
        ...currentPages,
        pages: pages.filter((item) => item.id !== id),
      });
      try {
        await writeContentFile("navigation.json", navigation);
      } catch (error) {
        await writeContentFile("custom-pages.json", currentPages);
        throw error;
      }
      deletedCustomPagePaths.add(pagePath);
      return navigation;
    });

    try {
      await Promise.all([
        syncFileToLanding("custom-pages.json"),
        syncFileToLanding("navigation.json"),
      ]);
    } catch (syncError) {
      console.error("Warning: failed to sync deleted custom page to landing:", syncError);
    }
    res.json({ ok: true, navigation, autoPublishQueued: true });
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish";
    queueAutoPublish(author);
  } catch (err) {
    if (err instanceof ContentValidationError) {
      res.status(err.status).json({ error: err.message, details: err.details });
    } else if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error deleting custom page:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

contentRouter.put("/custom-pages/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const page = {
      ...req.body,
      title: String(req.body?.title || "").trim(),
    } as { id?: string; title?: string; slug?: string };
    if (page.id !== id || page.slug !== id) {
      throw new ContentError("No se puede cambiar la ruta de una página existente", 400);
    }

    await withContentMutation(async () => {
      const currentPages = (await readContentFile("custom-pages.json")) as {
        pages?: Array<{ id: string; title: string; slug: string; active?: boolean }>;
      };
      const navigation = (await readContentFile("navigation.json")) as {
        links?: Array<{ label: string; href: string }>;
      };
      const pages = Array.isArray(currentPages.pages) ? currentPages.pages : [];
      const pageIndex = pages.findIndex((item) => item.id === id);
      if (pageIndex < 0) throw new ContentError("La página solicitada no existe", 404);

      const normalizedTitle = String(page.title || "").trim().toLocaleLowerCase("es");
      const links = Array.isArray(navigation.links) ? navigation.links : [];
      if (
        pages.some((item, index) => index !== pageIndex && item.title.trim().toLocaleLowerCase("es") === normalizedTitle)
        || links.some((link) => link.href !== `/${id}` && link.label.trim().toLocaleLowerCase("es") === normalizedTitle)
      ) {
        throw new ContentError("Ya existe una página con ese nombre", 409);
      }

      const nextPage = { ...page, active: pages[pageIndex].active !== false };
      const nextPages = { ...currentPages, pages: pages.map((item, index) => index === pageIndex ? nextPage : item) };
      const hasNavigationLink = links.some((link) => link.href === `/${id}`);
      const nextNavigation = {
        ...navigation,
        links: hasNavigationLink
          ? links.map((link) => link.href === `/${id}` ? { ...link, label: nextPage.title } : link)
          : [...links, { label: nextPage.title, href: `/${id}` }],
      };

      await writeContentFile("custom-pages.json", nextPages);
      try {
        await writeContentFile("navigation.json", nextNavigation);
      } catch (error) {
        await writeContentFile("custom-pages.json", currentPages);
        throw error;
      }
    });

    try {
      await Promise.all([
        syncFileToLanding("custom-pages.json"),
        syncFileToLanding("navigation.json"),
      ]);
    } catch (syncError) {
      console.error("Warning: failed to sync custom page to landing:", syncError);
    }
    res.json({ ok: true, autoPublishQueued: true });
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish";
    queueAutoPublish(author);
  } catch (err) {
    if (err instanceof ContentValidationError) {
      res.status(err.status).json({ error: err.message, details: err.details });
    } else if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error saving custom page:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * GET /api/content/:filename
 * Read a content JSON file.
 */
contentRouter.get("/:filename", async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename as string;
    const data = await readContentFile(filename);
    res.json(data);
  } catch (err) {
    if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error reading content:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * PUT /api/content/:filename
 * Write a content JSON file (validated against Zod schema).
 */
contentRouter.put("/:filename", async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename as string;
    if (filename === "custom-pages.json") {
      throw new ContentError("Las páginas deben guardarse individualmente", 400);
    }
    const result = filename === "navigation.json"
      ? await withContentMutation(async () => {
          const customPages = (await readContentFile("custom-pages.json")) as {
            pages?: Array<{ title: string; slug: string }>;
          };
          const currentNavigation = (await readContentFile("navigation.json")) as {
            links?: Array<{ label: string; href: string; active?: boolean }>;
          };
          const requestedNavigation = req.body as {
            links?: Array<{ label: string; href: string }>;
            cta?: { label: string; href: string };
          };
          const inactiveCustomPaths = (customPages.pages || [])
            .filter((page) => (page as { active?: boolean }).active === false)
            .map((page) => `/${page.slug}`);
          const secondaryNavigation = { ...requestedNavigation, links: [], cta: undefined };
          if (inactiveCustomPaths.some((path) => containsString(secondaryNavigation, path))) {
            throw new ContentError("La configuración global contiene un enlace hacia una página inactiva", 409);
          }
          if ([...deletedCustomPagePaths].some((path) => containsString(requestedNavigation, path))) {
            throw new ContentError("La configuración global contiene un enlace hacia una página eliminada", 409);
          }
          const customLinks = new Map(
            (customPages.pages || []).map((page) => [`/${page.slug}`, { label: page.title, href: `/${page.slug}` }]),
          );
          const requestedLinks = Array.isArray(requestedNavigation.links) ? requestedNavigation.links : [];
          const activeByPath = new Map((currentNavigation.links || []).map((link) => [link.href, link.active !== false]));
          const existingPaths = new Set((currentNavigation.links || []).map((link) => link.href));
          const reconciledLinks = requestedLinks
            .filter((link) => existingPaths.has(link.href) || customLinks.has(link.href))
            .map((link) => ({ ...(customLinks.get(link.href) || link), active: activeByPath.get(link.href) !== false }));
          const includedPaths = new Set(reconciledLinks.map((link) => link.href));
          for (const link of customLinks.values()) {
            if (!includedPaths.has(link.href)) {
              reconciledLinks.push({ ...link, active: activeByPath.get(link.href) !== false });
            }
          }
          return writeContentFile(filename, { ...requestedNavigation, links: reconciledLinks });
        })
      : await withContentMutation(() => writeContentFile(filename, req.body));

    try {
      await syncFileToLanding(filename);
    } catch (syncErr) {
      console.error("Warning: failed to sync saved content to landing:", syncErr);
      // Don't fail the save — content was already written to CMS.
    }

    res.json({ ...result, autoPublishQueued: true });
    const author = (req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish";
    queueAutoPublish(author);
  } catch (err) {
    if (err instanceof ContentValidationError) {
      res.status(err.status).json({ error: err.message, details: err.details });
    } else if (err instanceof ContentError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error writing content:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
