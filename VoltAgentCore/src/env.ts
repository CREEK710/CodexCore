const localhostHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export type DeploymentStage = "development" | "preview" | "production";
export type StorageMode = "memory" | "libsql";

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function vercelHostToOrigin(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return trimmed ? `https://${trimmed}` : null;
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getDeploymentStage(): DeploymentStage {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production" || vercelEnv === "preview") {
    return vercelEnv;
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function isVercelDeployment(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL
  );
}

export function getServerPort(): number {
  return Number(process.env.PORT || 3141);
}

export function getAllowedCorsOrigins(): string[] {
  const origins = new Set<string>();
  const stage = getDeploymentStage();

  if (stage === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3141");
    origins.add("http://localhost:4173");
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://127.0.0.1:3141");
    origins.add("http://127.0.0.1:4173");
    origins.add("http://127.0.0.1:5173");
  }

  for (const candidate of splitCsv(process.env.CORS_ALLOW_ORIGINS)) {
    const normalized = normalizeOrigin(candidate);
    if (normalized) origins.add(normalized);
  }

  const appUrl = normalizeOrigin(process.env.APP_URL ?? "");
  if (appUrl) origins.add(appUrl);

  for (const candidate of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    const normalized = vercelHostToOrigin(candidate);
    if (normalized) origins.add(normalized);
  }

  return [...origins];
}

export function resolveAllowedCorsOrigin(origin: string | undefined | null): string | null {
  if (!origin) return null;

  try {
    const parsed = new URL(origin);

    if (getDeploymentStage() === "development" && localhostHosts.has(parsed.hostname)) {
      return origin;
    }

    return getAllowedCorsOrigins().includes(parsed.origin) ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function getStorageMode(): StorageMode {
  const explicit = process.env.VOLTAGENT_STORAGE_MODE;
  if (explicit === "memory" || explicit === "libsql") {
    return explicit;
  }

  if (process.env.LIBSQL_URL) {
    return "libsql";
  }

  return isVercelDeployment() ? "memory" : "libsql";
}

export function getLibsqlConfig() {
  return {
    url: process.env.LIBSQL_URL?.trim() || "file:./voltagent/memory.db",
    authToken: process.env.LIBSQL_AUTH_TOKEN?.trim() || undefined,
    observabilityUrl:
      process.env.LIBSQL_OBSERVABILITY_URL?.trim() ||
      process.env.LIBSQL_URL?.trim() ||
      "file:./voltagent/observability.db",
    observabilityAuthToken:
      process.env.LIBSQL_OBSERVABILITY_AUTH_TOKEN?.trim() ||
      process.env.LIBSQL_AUTH_TOKEN?.trim() ||
      undefined,
  };
}

export function getVoltOpsConfig() {
  const publicKey = process.env.VOLTAGENT_PUBLIC_KEY?.trim();
  const secretKey = process.env.VOLTAGENT_SECRET_KEY?.trim();

  return publicKey && secretKey ? { publicKey, secretKey } : null;
}
