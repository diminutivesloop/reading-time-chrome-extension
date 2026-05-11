import esbuild from "esbuild";
import { cp, rm } from "fs/promises";
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
    watch(src, async () => {
      await cp(src, dest);
      console.log(`Copied ${src} → ${dest}`);
    });
  }

  console.log("Watching for changes… (Ctrl-C to stop)");
} else {
  await copyAssets();
  await esbuild.build(buildOptions);
}
