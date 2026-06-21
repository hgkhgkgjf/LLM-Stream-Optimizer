import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const scriptSource = new URL("../scripts/build-worker.mjs", import.meta.url);

async function createFixture({ wranglerSource }) {
  const dir = await mkdtemp(join(tmpdir(), "llm-build-worker-"));
  await mkdir(join(dir, "scripts"), { recursive: true });
  await mkdir(join(dir, "src"), { recursive: true });
  await mkdir(join(dir, "node_modules", "wrangler", "bin"), { recursive: true });
  await writeFile(join(dir, "scripts", "build-worker.mjs"), await readFile(scriptSource, "utf8"));
  await writeFile(join(dir, "src", "worker.js"), "export default {};\n");
  await writeFile(join(dir, "wrangler.toml"), 'name = "fixture"\nmain = "worker.js"\n');
  await writeFile(join(dir, "node_modules", "wrangler", "bin", "wrangler.js"), wranglerSource);
  return dir;
}

function runBuildScript(cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(cwd, "scripts", "build-worker.mjs")], {
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, stdout, stderr }));
  });
}

test("build script copies Wrangler dry-run output to root worker.js", async () => {
  const fixture = await createFixture({
    wranglerSource: `
      import { mkdir, writeFile } from "node:fs/promises";
      import { join } from "node:path";
      const outdir = process.argv[process.argv.indexOf("--outdir") + 1];
      await mkdir(outdir, { recursive: true });
      await writeFile(join(outdir, "worker.js"), "fresh bundle\\n");
    `,
  });

  try {
    const result = await runBuildScript(fixture);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(await readFile(join(fixture, "worker.js"), "utf8"), "fresh bundle\n");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("build script removes source map comments from the copy-and-paste artifact", async () => {
  const fixture = await createFixture({
    wranglerSource: `
      import { mkdir, writeFile } from "node:fs/promises";
      import { join } from "node:path";
      const outdir = process.argv[process.argv.indexOf("--outdir") + 1];
      await mkdir(outdir, { recursive: true });
      await writeFile(join(outdir, "worker.js"), "export default {};\\n//# sourceMappingURL=worker.js.map\\n");
    `,
  });

  try {
    const result = await runBuildScript(fixture);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(await readFile(join(fixture, "worker.js"), "utf8"), "export default {};\n");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("build script refuses to copy a stale bundle when Wrangler emits no worker", async () => {
  const fixture = await createFixture({
    wranglerSource: 'console.log("dry-run without bundle");\n',
  });
  await mkdir(join(fixture, ".wrangler", "bundle-output"), { recursive: true });
  await writeFile(join(fixture, ".wrangler", "bundle-output", "worker.js"), "stale bundle\n");

  try {
    const result = await runBuildScript(fixture);

    assert.notEqual(result.code, 0);
    await assert.rejects(() => readFile(join(fixture, "worker.js"), "utf8"), {
      code: "ENOENT",
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("package scripts keep src as build source and generated worker as deploy target", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const wranglerToml = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");

  assert.equal(packageJson.scripts.build, "node scripts/build-worker.mjs");
  assert.equal(packageJson.scripts.dev, "wrangler dev src/worker.js --config wrangler.toml");
  assert.equal(
    packageJson.scripts.check,
    "npm run build && wrangler deploy --dry-run --config wrangler.toml",
  );
  assert.equal(packageJson.scripts.deploy, "npm run build && wrangler deploy --config wrangler.toml");
  assert.match(wranglerToml, /^main = "worker\.js"$/m);
});
