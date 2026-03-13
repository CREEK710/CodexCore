import fs from "node:fs/promises";
import path from "node:path";
import { tool } from "@voltagent/core";
import { z } from "zod";

const ROOT = process.cwd();
const ROOT_PREFIX = `${ROOT}${path.sep}`;

export const writeFileTool = tool({
  name: "writeFile",
  description: "Write a UTF-8 text file inside the current workspace.",
  parameters: z.object({
    filePath: z.string().describe("Relative path from workspace root"),
    content: z.string().describe("UTF-8 text content to write"),
  }),
  execute: async ({ filePath, content }) => {
    const resolved = path.resolve(ROOT, filePath);

    if (resolved !== ROOT && !resolved.startsWith(ROOT_PREFIX)) {
      throw new Error("Access denied: path escapes workspace root");
    }

    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf8");

    return {
      filePath,
      bytesWritten: Buffer.byteLength(content, "utf8"),
    };
  },
});
