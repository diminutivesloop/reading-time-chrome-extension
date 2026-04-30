import esbuild from "esbuild";
import { cp, mkdir, rm } from "fs/promises";

const isWatch = process.argv.includes("--watch");
const outdir = "dist";

/** @type {import("esbuild").BuildOptions} */
const buildOptions = {
  entryPoints: {
    content: "content.ts",
    "popup/popup": "popup/popup.ts",
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
  await mkdir(`${outdir}/popup`, { recursive: true });
  await Promise.all([
    cp("manifest.json", `${outdir}/manifest.json`),
    cp("popup/popup.html", `${outdir}/popup/popup.html`),
    cp("popup/popup.css", `${outdir}/popup/popup.css`),
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
