import fs from "node:fs/promises";
import { getWorkDir } from "./common.mjs";

// Patches electron-side stuff
async function patch(filePath, source) {
  // Load from our work dir instead of the build dir
  const work = getWorkDir();
  return source.replace(
    /path__default\.join\(__dirname, ?"\.\.\/\.\."\)/,
    JSON.stringify(work)
  );
}

export async function load(url, context, nextLoad) {
  try {
    if (context.format === "module") {
      const parsed = new URL(url);
      if (parsed.protocol === "file:") {
        let filePath = parsed.pathname;
        if (filePath.startsWith("/") && process.platform === "win32") {
          filePath = filePath.slice(1);
        }

        let source = await fs.readFile(filePath, "utf8");
        source = await patch(filePath, source);

        return {
          format: context.format,
          shortCircuit: true,
          source
        };
      }
    }
  } catch (e) {
    console.error(e);
  }

  return await nextLoad(url, context);
}
