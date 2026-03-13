import {
  Agent,
  InMemoryObservabilityAdapter,
  InMemoryStorageAdapter,
  Memory,
  VoltAgent,
  VoltAgentObservability,
  VoltOpsClient,
} from "@voltagent/core";
import {
  LibSQLMemoryAdapter,
  LibSQLObservabilityAdapter,
} from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { serverlessHono } from "@voltagent/serverless-hono";
import { secureHeaders } from "hono/secure-headers";
import { Sentry } from "./sentry.js";
import {
  getAllowedCorsOrigins,
  getLibsqlConfig,
  getServerPort,
  getStorageMode,
  getVoltOpsConfig,
  resolveAllowedCorsOrigin,
} from "./env.js";
import {
  editFileTool,
  gitCommitTool,
  readFileTool,
  runCommandTool,
  writeFileTool,
} from "./tools/index.js";
import { repoAssistWorkflow, repoAutopilotWorkflow } from "./workflows/index.js";

declare global {
  var __codexCoreLocalVoltAgent: VoltAgent | undefined;
  var __codexCoreServerlessVoltAgent: VoltAgent | undefined;
}

type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

const allowedLogLevels = new Set<LogLevel>([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const);

function resolveLogLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  return configured && allowedLogLevels.has(configured as LogLevel)
    ? (configured as LogLevel)
    : "info";
}

const logger = createPinoLogger({
  name: "CodexCore",
  level: resolveLogLevel(),
});

function createMemory() {
  const storageMode = getStorageMode();

  if (storageMode === "memory") {
    return new Memory({
      storage: new InMemoryStorageAdapter(),
    });
  }

  const libsql = getLibsqlConfig();
  return new Memory({
    storage: new LibSQLMemoryAdapter({
      url: libsql.url,
      authToken: libsql.authToken,
      logger: logger.child({ component: "libsql-memory" }),
    }),
  });
}

function createObservability() {
  const storageMode = getStorageMode();

  if (storageMode === "memory") {
    return new VoltAgentObservability({
      storage: new InMemoryObservabilityAdapter(),
    });
  }

  const libsql = getLibsqlConfig();
  return new VoltAgentObservability({
    storage: new LibSQLObservabilityAdapter({
      url: libsql.observabilityUrl,
      authToken: libsql.observabilityAuthToken,
    }),
  });
}

function createVoltOpsClient() {
  const config = getVoltOpsConfig();
  return config
    ? new VoltOpsClient({
        publicKey: config.publicKey,
        secretKey: config.secretKey,
      })
    : undefined;
}

function createAgent() {
  return new Agent({
    name: "CodexCore",
    instructions:
      "You are CodexCore, a coding and systems assistant for this workspace. Use tools to inspect repository files, write and edit workspace files, create git commits when asked, explain code, and run safe development commands. Do not claim to execute commands or read, write, edit, or commit unless you actually used a tool.",
    model: "groq/llama-3.3-70b-versatile",
    tools: [
      readFileTool,
      writeFileTool,
      editFileTool,
      runCommandTool,
      gitCommitTool,
    ],
    memory: createMemory(),
  });
}

function createVoltAgentBase() {
  const voltOpsClient = createVoltOpsClient();

  return {
    agents: {
      agent: createAgent(),
    },
    workflows: {
      repoAssistWorkflow,
      repoAutopilotWorkflow,
    },
    logger,
    observability: createObservability(),
    ...(voltOpsClient ? { voltOpsClient } : {}),
  };
}

export function getLocalVoltAgent() {
  if (!globalThis.__codexCoreLocalVoltAgent) {
    globalThis.__codexCoreLocalVoltAgent = new VoltAgent({
      ...createVoltAgentBase(),
      server: honoServer({
        port: getServerPort(),
        cors: false,
        configureFullApp: ({ app, middlewares, routes }) => {
          app.use(
            "*",
            async (context, next) => {
              const origin = context.req.header("origin");
              const allowedOrigin = resolveAllowedCorsOrigin(origin);

              if (context.req.method === "OPTIONS" && origin && !allowedOrigin) {
                return context.body(null, 403);
              }

              if (context.req.method === "OPTIONS" && allowedOrigin) {
                context.header("Access-Control-Allow-Origin", allowedOrigin);
                context.header("Vary", "Origin");
                context.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
                context.header(
                  "Access-Control-Allow-Headers",
                  "Content-Type, Authorization"
                );
                context.header("Access-Control-Max-Age", "600");
                return context.body(null, 204);
              }

              await next();

              if (allowedOrigin) {
                context.header("Access-Control-Allow-Origin", allowedOrigin);
                context.header("Vary", "Origin");
                context.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
                context.header(
                  "Access-Control-Allow-Headers",
                  "Content-Type, Authorization"
                );
                context.header("Access-Control-Max-Age", "600");
              }
            }
          );
          app.use(
            "*",
            secureHeaders({
              strictTransportSecurity: false,
            })
          );
          middlewares.auth();
          middlewares.landingPage();
          routes.agents();
          routes.workflows();
          routes.tools();
          routes.logs();
          routes.updates();
          routes.observability();
          routes.memory();
          routes.triggers();
          routes.mcp();
          routes.a2a();
          routes.ui();
          routes.doc();
          Sentry.setupHonoErrorHandler(app);
        },
      }),
    });
  }

  return globalThis.__codexCoreLocalVoltAgent;
}

export function getServerlessVoltAgent() {
  if (!globalThis.__codexCoreServerlessVoltAgent) {
    globalThis.__codexCoreServerlessVoltAgent = new VoltAgent({
      ...createVoltAgentBase(),
      serverless: serverlessHono({
        corsOrigin: getAllowedCorsOrigins(),
        corsAllowMethods: ["GET", "POST", "OPTIONS"],
        corsAllowHeaders: ["Content-Type", "Authorization"],
        configureApp: (app) => {
          app.use(
            "*",
            secureHeaders({
              strictTransportSecurity: false,
            })
          );
          Sentry.setupHonoErrorHandler(app);
        },
      }),
    });
  }

  return globalThis.__codexCoreServerlessVoltAgent;
}
