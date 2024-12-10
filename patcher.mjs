import { register, runMain } from "node:module";
import path from "node:path";
import fs from "node:fs/promises";
import { getWorkDir } from "./common.mjs";

const exists = async (filepath) =>
  await fs
    .stat(filepath)
    .then(() => true)
    .catch(() => false);

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
    } else {
      if (!(await exists(destFile))) {
        await fs.mkdir(destFile, { recursive: true });
      }

      await copyDir(srcFile, destFile);
    }
  }
}

async function getFileTree(src) {
  let tree = [];

  for (const file of await fs.readdir(src)) {
    const fullPath = path.join(src, file);
    const data = await fs.stat(fullPath);
    if (data.isFile()) {
      tree.push(fullPath);
    } else {
      tree = tree.concat(await getFileTree(fullPath));
    }
  }

  return tree;
}

export async function inject(appInjector) {
  const hooks = path.resolve(import.meta.filename, "../hooks.mjs");
  register("file:" + hooks, import.meta.url);

  const appDir = path.resolve(appInjector, "..");
  const version = JSON.parse(
    await fs.readFile(path.join(appDir, "package.json"))
  ).version;
  const realMain = path.join(appDir, "build/main/index.mjs");

  // Copy everything into its own dir to patch it on-FS
  const work = getWorkDir();
  if (!(await exists(work))) {
    await fs.mkdir(work, { recursive: true });
  }

  const cacheFile = path.join(work, ".ver");
  let cachedVersion = (await exists(cacheFile))
    ? await fs.readFile(cacheFile, "utf8")
    : null;

  if (version != cachedVersion) {
    for (const dir of ["build", "build-browser"]) {
      await copyDir(path.join(appDir, dir), path.join(work, dir));
    }
    await fs.writeFile(cacheFile, version);
  }

  const tree = (await getFileTree(work)).map((p) =>
    path.relative(work, p).replaceAll("\\", "/")
  );
  async function modify(pathRegex, cb) {
    for (const entry of tree) {
      if (pathRegex.test(entry)) {
        try {
          const source = await fs.readFile(path.join(appDir, entry), "utf8");
          const modified = await cb(source);
          if (source !== modified) {
            await fs.writeFile(path.join(work, entry), modified);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  await modify(/build\/renderer\/index-.+?\.js/, (src) => {
    src = src.replaceAll(`"Low Priority"`, `"greets 2"`);

    return src;
  });

  runMain(realMain);
}
