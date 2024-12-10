import { register, runMain } from "node:module";
import path from "node:path";
import fs from "node:fs/promises";
import { getWorkDir } from "./common.mjs";

const exists = async (filepath) =>
  await fs
    .stat(filepath)
    .then(() => true)
    .catch(() => false);

// Patches web-side stuff
async function patch(filePath) {
  let orig = await fs.readFile(filePath, "utf8");
  let source = orig;

  if (filePath.includes("index-")) {
    source = source.replaceAll(`"Low Priority"`, `"greets"`);
  }

  if (orig !== source) await fs.writeFile(filePath, source);
}

// This is really slow, we should ideally mark when something's been patched to not copy it again
async function copyDir(src, dest) {
  if (!(await exists(dest))) {
    await fs.mkdir(dest, { recursive: true });
  }

  for (const file of await fs.readdir(src)) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const data = await fs.stat(srcFile);
    if (data.isFile()) {
      await fs.copyFile(srcFile, destFile);
      if (destFile.endsWith(".js") || destFile.endsWith(".mjs")) {
        try {
          await patch(destFile);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      if (!(await exists(destFile))) {
        await fs.mkdir(destFile, { recursive: true });
      }

      await copyDir(srcFile, destFile);
    }
  }
}

export async function inject(appInjector) {
  const hooks = path.resolve(import.meta.filename, "../hooks.mjs");
  register("file:" + hooks, import.meta.url);

  const appDir = path.resolve(appInjector, "..");
  const realMain = path.join(appDir, "build/main/index.mjs");
  const work = getWorkDir();

  // Copy everything into its own dir to patch it on-FS
  if (!(await exists(work))) {
    await fs.mkdir(work, { recursive: true });
  }
  for (const dir of ["build", "build-browser"]) {
    await copyDir(path.join(appDir, dir), path.join(work, dir));
  }

  runMain(realMain);
}
