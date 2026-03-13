import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const sentryCli = path.join(cwd, "node_modules", ".bin", "sentry-cli");

const org = process.env.SENTRY_ORG;
const project = process.env.SENTRY_PROJECT;
const authToken = process.env.SENTRY_AUTH_TOKEN;
const release =
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID;

const uploadEnabled = process.env.SENTRY_UPLOAD_SOURCE_MAPS === "1";

if (!uploadEnabled) {
  console.log("Skipping Sentry sourcemap upload: SENTRY_UPLOAD_SOURCE_MAPS != 1");
  process.exit(0);
}

if (!org || !project || !authToken) {
  console.log(
    "Skipping Sentry sourcemap upload: SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN are required"
  );
  process.exit(0);
}

const candidateDirs = [
  path.join(cwd, ".vercel", "output", "functions"),
  path.join(cwd, "dist"),
].filter((dir) => existsSync(dir));

if (candidateDirs.length === 0) {
  console.log("Skipping Sentry sourcemap upload: no build output directory found");
  process.exit(0);
}

const baseArgs = ["--auth-token", authToken, "--org", org, "--project", project];

if (release) {
  baseArgs.push("--release", release);
}

for (const dir of candidateDirs) {
  console.log(`Uploading Sentry sourcemaps from ${dir}`);

  const inject = spawnSync(
    sentryCli,
    [...baseArgs, "sourcemaps", "inject", dir],
    {
      stdio: "inherit",
    }
  );

  if (inject.status !== 0) {
    process.exit(inject.status ?? 1);
  }

  const upload = spawnSync(
    sentryCli,
    [...baseArgs, "sourcemaps", "upload", dir, "--validate", "--strip-prefix", cwd],
    {
      stdio: "inherit",
    }
  );

  if (upload.status !== 0) {
    process.exit(upload.status ?? 1);
  }
}
