import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, ".wrangler", "bundle-output");
const bundledWorker = resolve(outDir, "worker.js");
const rootWorker = resolve(root, "worker.js");
const wranglerBin = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");

await mkdir(resolve(root, ".wrangler", "logs"), { recursive: true });
await rm(outDir, { recursive: true, force: true });

const env = {
  ...process.env,
  WRANGLER_LOG_PATH:
    process.env.WRANGLER_LOG_PATH || resolve(root, ".wrangler", "logs", "wrangler.log"),
};

await new Promise((resolvePromise, reject) => {
  const child = spawn(
    process.execPath,
    [
      wranglerBin,
      "deploy",
      "src/worker.js",
      "--dry-run",
      "--outdir",
      outDir,
      "--config",
      "wrangler.toml",
    ],
    {
      cwd: root,
      env,
      stdio: "inherit",
      shell: false,
    },
  );
  child.on("error", reject);
  child.on("exit", (code) => {
    if (code === 0) resolvePromise();
    else reject(new Error(`wrangler exited with code ${code}`));
  });
});

const bundledSource = await readFile(bundledWorker, "utf8");
const copyPasteSource = bundledSource.replace(/\n\/\/# sourceMappingURL=worker\.js\.map\s*$/u, "\n");
await writeFile(rootWorker, copyPasteSource);
console.log(`Generated ${rootWorker}`);
