import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

export async function copyUtf8TextFile(sourcePath: string, targetPath: string): Promise<void> {
  const content = await readFile(sourcePath, "utf-8");
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf-8");
}
