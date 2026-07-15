import { Router, type Request, type Response } from "express";
import {
  listContentFiles,
  readContentFile,
  writeContentFile,
  ContentError,
  ContentValidationError,
} from "./service.js";
import { syncFileToLanding } from "../preview/service.js";
import { queueAutoPublish } from "../publish/service.js";
import { RESERVED_CUSTOM_PAGE_SLUGS } from "./schemas.js";

export const contentRouter = Router();

const reservedPageSlugs = new Set<string>(RESERVED_CUSTOM_PAGE_SLUGS);
let customPagesMutationQueue = Promise.resolve();

function mutateCustomPages<T>(mutation: () => Promise<T>): Promise<T> {
  const result = customPagesMutationQueue.then(mutation, mutation);
  customPagesMutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function slugifyPageTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    const title = String(req.body?.title || "").trim();
    const slug = slugifyPageTitle(title);
    if (!title || !slug) throw new ContentError("El nombre de la página no es válido", 400);
    if (reservedPageSlugs.has(slug)) throw new ContentError("Esa ruta está reservada por una página existente", 409);

    const { page } = await mutateCustomPages(async () => {
      const currentPages = (await readContentFile("custom-pages.json")) as {
        pages?: Array<{ id: string; title: string; slug: string }>;
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

    await mutateCustomPages(async () => {
      const currentPages = (await readContentFile("custom-pages.json")) as {
        pages?: Array<{ id: string; title: string; slug: string }>;
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

      const nextPages = { ...currentPages, pages: pages.map((item, index) => index === pageIndex ? page : item) };
      const hasNavigationLink = links.some((link) => link.href === `/${id}`);
      const nextNavigation = {
        ...navigation,
        links: hasNavigationLink
          ? links.map((link) => link.href === `/${id}` ? { ...link, label: page.title } : link)
          : [...links, { label: page.title, href: `/${id}` }],
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
      ? await mutateCustomPages(async () => {
          const customPages = (await readContentFile("custom-pages.json")) as {
            pages?: Array<{ title: string; slug: string }>;
          };
          const requestedNavigation = req.body as {
            links?: Array<{ label: string; href: string }>;
          };
          const customLinks = new Map(
            (customPages.pages || []).map((page) => [`/${page.slug}`, { label: page.title, href: `/${page.slug}` }]),
          );
          const requestedLinks = Array.isArray(requestedNavigation.links) ? requestedNavigation.links : [];
          const reconciledLinks = requestedLinks.map((link) => customLinks.get(link.href) || link);
          const includedPaths = new Set(reconciledLinks.map((link) => link.href));
          for (const link of customLinks.values()) {
            if (!includedPaths.has(link.href)) {
              reconciledLinks.push(link);
            }
          }
          return writeContentFile(filename, { ...requestedNavigation, links: reconciledLinks });
        })
      : await writeContentFile(filename, req.body);

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
