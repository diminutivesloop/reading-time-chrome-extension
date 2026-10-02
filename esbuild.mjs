import esbuild from "esbuild";
import { cp, rm, stat } from "fs/promises";
import { watch } from "fs";

const isWatch = process.argv.includes("--watch");
const outdir = "dist";

/** @type {import("esbuild").BuildOptions} */
const buildOptions = {
  entryPoints: {
    content: "src/content.ts",
    popup: "src/popup.ts",
  },
  bundle: true,
  outdir,
  platform: "browser",
  target: "es2022",
  format: "iife",
  sourcemap: true,
  logLevel: "info",
};

const assetFiles = [
  { src: "manifest.json", dest: `${outdir}/manifest.json` },
  { src: "src/popup.html", dest: `${outdir}/popup.html` },
  { src: "src/popup.css", dest: `${outdir}/popup.css` },
];

async function copyAssets() {
  await Promise.all(assetFiles.map(({ src, dest }) => cp(src, dest)));
}

await rm(outdir, { recursive: true, force: true });

if (isWatch) {
  await copyAssets();
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();

  for (const { src, dest } of assetFiles) {
    let lastCopiedMtimeMs = (await stat(src)).mtimeMs;
    let copyQueue = Promise.resolve();

    watch(src, () => {
      copyQueue = copyQueue.then(async () => {
        try {
          const { mtimeMs } = await stat(src);
          if (mtimeMs === lastCopiedMtimeMs) return;

          await cp(src, dest);
          lastCopiedMtimeMs = mtimeMs;
          console.log(`Copied ${src} → ${dest}`);
        } catch (error) {
          console.error(`Failed to copy ${src} → ${dest}`, error);
        }
      });
    });
  }

  console.log("Watching for changes… (Ctrl-C to stop)");
} else {
  await copyAssets();
  await esbuild.build(buildOptions);
}
