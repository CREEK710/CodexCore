import fs from "node:fs/promises";
import path from "node:path";
import { tool } from "@voltagent/core";
import { z } from "zod";

const ROOT = process.cwd();
const ROOT_PREFIX = `${ROOT}${path.sep}`;

export const readFileTool = tool({
  name: "readFile",
  description: "Read a UTF-8 text file from the current workspace.",
  parameters: z.object({
    filePath: z.string().describe("Relative path from workspace root"),
  }),
  execute: async ({ filePath }) => {
    const resolved = path.resolve(ROOT, filePath);

    if (resolved !== ROOT && !resolved.startsWith(ROOT_PREFIX)) {
      throw new Error("Access denied: path escapes workspace root");
    }

    const content = await fs.readFile(resolved, "utf8");
    return { filePath, content };
  },
});
