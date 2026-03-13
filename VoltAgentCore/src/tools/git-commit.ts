import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "@voltagent/core";
import { z } from "zod";

const execFileAsync = promisify(execFile);

export const gitCommitTool = tool({
  name: "gitCommit",
  description:
    "Create a non-interactive git commit in the current repository with a required message.",
  parameters: z.object({
    message: z.string().min(1).describe("Commit message"),
    addAll: z
      .boolean()
      .default(false)
      .describe("Stage all tracked and untracked changes before committing"),
  }),
  execute: async ({ message, addAll }) => {
    const cwd = process.cwd();

    if (addAll) {
      await execFileAsync("git", ["add", "-A"], {
        cwd,
        timeout: 20000,
        maxBuffer: 1024 * 1024,
      });
    }

    const { stdout, stderr } = await execFileAsync(
      "git",
      ["commit", "-m", message],
      {
        cwd,
        timeout: 20000,
        maxBuffer: 1024 * 1024,
      }
    );

    return {
      message,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
    };
  },
});
