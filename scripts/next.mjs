// Runs the Next.js CLI from the project's real (symlink/junction-resolved) path, so a project
// opened through a junction on another drive doesn't make Next.js mix two drive paths.
//
// If dependencies aren't installed (e.g. on a drive with 2 MB clusters, where node_modules needs
// ~30 GB), `dev` and `start` serve the prebuilt static demo from out/ instead.
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = realpathSync.native(process.cwd());
const [command, ...rest] = process.argv.slice(2);

let nextBin = null;
try {
  nextBin = createRequire(join(cwd, "package.json")).resolve("next/dist/bin/next");
} catch {
  // next is not installed
}

let bin;
let args;
if (nextBin && command !== "start") {
  bin = nextBin;
  args = [command, ...rest];
} else if (command === "dev" || command === "start") {
  if (!nextBin)
    console.log("Next.js is not installed here, so the prebuilt static demo (out/) will be served. Code changes need a rebuild — see README.");
  bin = join(dirname(fileURLToPath(import.meta.url)), "serve.mjs");
  args = rest;
} else {
  console.error(`"next ${command}" needs dependencies installed (npm install). See README for drives with large clusters.`);
  process.exit(1);
}

const child = spawn(process.execPath, [bin, ...args], { cwd, stdio: "inherit" });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
