import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@voltagent/core";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const ALLOWLIST = new Set([
  "pwd",
  "ls",
  "cat",
  "find",
  "grep",
  "git",
  "node",
  "npm",
]);

export const runCommandTool = tool({
  name: "runCommand",
  description: "Run a safe allowlisted command in the workspace.",
  parameters: z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
  }),
  execute: async ({ command, args }) => {
    if (!ALLOWLIST.has(command)) {
      throw new Error(`Command not allowed: ${command}`);
    }

    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: process.cwd(),
      timeout: 20000,
      maxBuffer: 1024 * 1024,
    });

    return {
      command,
      args,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
    };
  },
});
