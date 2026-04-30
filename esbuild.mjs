import esbuild from "esbuild";
import { cp, rm } from "fs/promises";

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

async function copyAssets() {
  await Promise.all([
    cp("manifest.json", `${outdir}/manifest.json`),
    cp("src/popup.html", `${outdir}/popup.html`),
    cp("src/popup.css", `${outdir}/popup.css`),
  ]);
}

if (isWatch) {
  await copyAssets();
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes… (Ctrl-C to stop)");
} else {
  await rm(outdir, { recursive: true, force: true });
  await esbuild.build(buildOptions);
  await copyAssets();
}
