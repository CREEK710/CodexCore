import * as Sentry from "@sentry/node";
import { getDeploymentStage } from "./env.js";

declare global {
  var __codexCoreSentryInitialized: boolean | undefined;
}

function parseTracesSampleRate(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
    return parsed;
  }

  const stage = getDeploymentStage();
  if (stage === "production") return 0.1;
  if (stage === "preview") return 0.25;
  return 1;
}

export function getSentryEnvironment() {
  return process.env.SENTRY_ENVIRONMENT || getDeploymentStage();
}

export function getSentryRelease() {
  return (
    process.env.SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    undefined
  );
}

export function initSentry() {
  if (globalThis.__codexCoreSentryInitialized) {
    return Sentry;
  }

  const dsn = process.env.SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    integrations: [Sentry.honoIntegration()],
    tracesSampleRate: parseTracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    initialScope: {
      tags: {
        service: "VoltAgentCore",
        deployment_stage: getDeploymentStage(),
        runtime: process.env.VERCEL ? "vercel" : "node",
      },
    },
    sendDefaultPii: false,
  });

  globalThis.__codexCoreSentryInitialized = true;
  return Sentry;
}

export { Sentry };
