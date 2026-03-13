import "dotenv/config";
import "../src/sentry.js";
import { getServerlessVoltAgent } from "../src/app.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const voltAgent = getServerlessVoltAgent();

export default async function handler(request: Request) {
  return voltAgent.serverless().handleRequest(request);
}
