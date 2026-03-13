import "dotenv/config";
import "../src/sentry.js";
import { getServerlessVoltAgent } from "../src/app.js";

const voltAgent = getServerlessVoltAgent();

export const runtime = "nodejs";
export const maxDuration = 60;

const routePrefixes = ["/api/VoltAgent", "/api/voltagent"];

function normalizeRequest(request: Request) {
  const url = new URL(request.url);

  for (const prefix of routePrefixes) {
    if (url.pathname === prefix) {
      url.pathname = "/";
      break;
    }

    if (url.pathname.startsWith(`${prefix}/`)) {
      url.pathname = url.pathname.slice(prefix.length) || "/";
      break;
    }
  }

  return new Request(url, request);
}

export async function handleVoltAgentRequest(request: Request) {
  return voltAgent.serverless().handleRequest(normalizeRequest(request));
}
