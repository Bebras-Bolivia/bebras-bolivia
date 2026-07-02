import { Router, type Request, type Response } from "express";
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  BlogError,
} from "./service.js";
import { syncContentToLanding, isDevServerRunning } from "../preview/service.js";
import { queueAutoPublish } from "../publish/service.js";

export const blogRouter = Router();

/**
 * Helper: sync blog content to landing if the dev server is running.
 */
async function syncBlogIfDevRunning(): Promise<void> {
  if (isDevServerRunning()) {
    try {
      await syncContentToLanding();
    } catch (err) {
      console.error("Warning: failed to sync blog to landing for HMR:", err);
    }
  }
}

/**
 * GET /api/blog
 * List all blog posts (frontmatter only).
 */
blogRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const posts = await listPosts();
    res.json({ posts });
  } catch (err) {
    console.error("Error listing posts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/blog/:slug
 * Read a single blog post.
 */
blogRouter.get("/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const post = await getPost(slug);
    res.json(post);
  } catch (err) {
    if (err instanceof BlogError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error reading post:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * POST /api/blog
 * Create a new blog post.
 * Body: { slug: string, frontmatter: {...}, body: string }
 */
blogRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { slug, frontmatter, body } = req.body ?? {};

    if (!slug || !frontmatter || body === undefined) {
      res
        .status(400)
        .json({ error: "slug, frontmatter, and body are required" });
      return;
    }

    const post = await createPost(slug, frontmatter, body);
    await syncBlogIfDevRunning();
    res.status(201).json(post);
    queueAutoPublish((req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish");
  } catch (err) {
    if (err instanceof BlogError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error creating post:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * PUT /api/blog/:slug
 * Update a blog post.
 * Body: { frontmatter: {...}, body: string }
 */
blogRouter.put("/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const { frontmatter, body } = req.body ?? {};

    if (!frontmatter || body === undefined) {
      res.status(400).json({ error: "frontmatter and body are required" });
      return;
    }

    const post = await updatePost(slug, frontmatter, body);
    await syncBlogIfDevRunning();
    res.json(post);
    queueAutoPublish((req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish");
  } catch (err) {
    if (err instanceof BlogError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error updating post:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/**
 * DELETE /api/blog/:slug
 * Delete a blog post.
 */
blogRouter.delete("/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    await deletePost(slug);
    await syncBlogIfDevRunning();
    res.json({ ok: true });
    queueAutoPublish((req as Request & { user?: { name?: string } }).user?.name ?? "CMS auto-publish");
  } catch (err) {
    if (err instanceof BlogError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error("Error deleting post:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});
