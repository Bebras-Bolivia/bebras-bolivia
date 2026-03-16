import { readFile, writeFile, readdir, unlink } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import { z } from "zod";
import { config } from "../config.js";

// ── Blog frontmatter schema ──────────────────────────────

export const blogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.coerce.date(),
  image: z.string().optional(),
  author: z.string().default("Bebras Bolivia"),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  body: string;
}

export interface BlogPostSummary {
  slug: string;
  frontmatter: BlogFrontmatter;
}

/**
 * Resolve the blog directory — CMS working copy first, then landing source.
 */
function getBlogDir(): string {
  return config.currentBlogDir;
}

function getLandingBlogDir(): string {
  return config.landingBlogDir;
}

/**
 * List all blog posts (frontmatter only, sorted by date desc).
 */
export async function listPosts(): Promise<BlogPostSummary[]> {
  const dir = getBlogDir();
  const fallbackDir = getLandingBlogDir();

  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    try {
      files = (await readdir(fallbackDir)).filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }
  }

  const posts: BlogPostSummary[] = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    let raw: string;
    try {
      raw = await readFile(join(dir, file), "utf-8");
    } catch {
      try {
        raw = await readFile(join(fallbackDir, file), "utf-8");
      } catch {
        continue;
      }
    }

    const { data } = matter(raw);
    const parsed = blogFrontmatterSchema.safeParse(data);
    if (parsed.success) {
      posts.push({ slug, frontmatter: parsed.data });
    }
  }

  // Sort by date descending
  posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );

  return posts;
}

/**
 * Read a single blog post by slug.
 */
export async function getPost(slug: string): Promise<BlogPost> {
  const filename = `${slug}.md`;
  const cmsPath = join(getBlogDir(), filename);
  const landingPath = join(getLandingBlogDir(), filename);

  let raw: string;
  try {
    raw = await readFile(cmsPath, "utf-8");
  } catch {
    try {
      raw = await readFile(landingPath, "utf-8");
    } catch {
      throw new BlogError(`Post not found: ${slug}`, 404);
    }
  }

  const { data, content } = matter(raw);
  const parsed = blogFrontmatterSchema.safeParse(data);

  if (!parsed.success) {
    throw new BlogError(
      `Invalid frontmatter: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      400
    );
  }

  return { slug, frontmatter: parsed.data, body: content.trim() };
}

/**
 * Create a new blog post.
 */
export async function createPost(
  slug: string,
  frontmatter: BlogFrontmatter,
  body: string
): Promise<BlogPost> {
  // Validate slug
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new BlogError(
      "Slug must be lowercase alphanumeric with hyphens only",
      400
    );
  }

  const filePath = join(getBlogDir(), `${slug}.md`);

  // Check if already exists
  try {
    await readFile(filePath, "utf-8");
    throw new BlogError(`Post already exists: ${slug}`, 409);
  } catch (err) {
    if (err instanceof BlogError) throw err;
    // File doesn't exist — good, continue
  }

  const parsed = blogFrontmatterSchema.safeParse(frontmatter);
  if (!parsed.success) {
    throw new BlogError(
      `Invalid frontmatter: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      400
    );
  }

  const content = matter.stringify(body + "\n", formatFrontmatter(parsed.data));
  await writeFile(filePath, content, "utf-8");

  return { slug, frontmatter: parsed.data, body };
}

/**
 * Update an existing blog post.
 */
export async function updatePost(
  slug: string,
  frontmatter: BlogFrontmatter,
  body: string
): Promise<BlogPost> {
  const filePath = join(getBlogDir(), `${slug}.md`);

  // Check exists (in CMS dir or landing dir)
  try {
    await readFile(filePath, "utf-8");
  } catch {
    // Maybe it exists in landing dir — we'll write to CMS dir anyway
  }

  const parsed = blogFrontmatterSchema.safeParse(frontmatter);
  if (!parsed.success) {
    throw new BlogError(
      `Invalid frontmatter: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      400
    );
  }

  const content = matter.stringify(body + "\n", formatFrontmatter(parsed.data));
  await writeFile(filePath, content, "utf-8");

  return { slug, frontmatter: parsed.data, body };
}

/**
 * Delete a blog post.
 */
export async function deletePost(slug: string): Promise<void> {
  const filePath = join(getBlogDir(), `${slug}.md`);
  try {
    await unlink(filePath);
  } catch {
    throw new BlogError(`Post not found: ${slug}`, 404);
  }
}

/**
 * Format frontmatter for gray-matter output (date as YYYY-MM-DD string).
 */
function formatFrontmatter(fm: BlogFrontmatter): Record<string, unknown> {
  return {
    title: fm.title,
    description: fm.description,
    date: fm.date instanceof Date ? fm.date.toISOString().split("T")[0] : fm.date,
    ...(fm.image ? { image: fm.image } : {}),
    author: fm.author,
  };
}

/**
 * Custom error class with HTTP status code.
 */
export class BlogError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BlogError";
    this.status = status;
  }
}
