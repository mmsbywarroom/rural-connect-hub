import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, rename, stat } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

const DIST_DIR = "dist";
const TEMP_DIR = "dist_temp";

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function buildClient() {
  console.log("[build] Building client with Vite...");
  // Vite is configured to output to dist/public and will clear only that folder.
  await viteBuild();
  console.log("[build] Client build completed.");
}

async function buildServer() {
  console.log("[build] Building server with esbuild...");

  // Clean temp dir but DO NOT touch existing dist yet.
  await rm(TEMP_DIR, { recursive: true, force: true });
  await mkdir(TEMP_DIR, { recursive: true });

  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  const tempOutfile = `${TEMP_DIR}/index.cjs`;

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: tempOutfile,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Validate temp output exists
  if (!(await pathExists(tempOutfile))) {
    throw new Error(`[build] Server build succeeded but ${tempOutfile} is missing`);
  }

  // Now safely replace dist/index.cjs
  await mkdir(DIST_DIR, { recursive: true });
  const finalOutfile = `${DIST_DIR}/index.cjs`;

  // Remove previous index.cjs only after new one exists
  await rm(finalOutfile, { force: true });
  await rename(tempOutfile, finalOutfile);

  console.log("[build] Server build completed. Output:", finalOutfile);

  // Clean up temp dir
  await rm(TEMP_DIR, { recursive: true, force: true });
}

async function validateFinalArtifacts() {
  const serverExists = await pathExists(`${DIST_DIR}/index.cjs`);
  if (!serverExists) {
    throw new Error("[build] Validation failed: dist/index.cjs not found");
  }
  console.log("[build] Validation OK: dist/index.cjs present.");
}

async function buildAll() {
  console.log("[build] Starting full build...");

  await buildClient();
  await buildServer();
  await validateFinalArtifacts();

  console.log("[build] Full build finished successfully.");
}

buildAll().catch((err) => {
  console.error("[build] Build failed:", err);
  process.exit(1);
});
