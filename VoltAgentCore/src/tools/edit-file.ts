import fs from "node:fs/promises";
import path from "node:path";
import { tool } from "@voltagent/core";
import { z } from "zod";

const ROOT = process.cwd();
const ROOT_PREFIX = `${ROOT}${path.sep}`;

export const editFileTool = tool({
  name: "editFile",
  description:
    "Edit a UTF-8 text file in the workspace by replacing an exact string match.",
  parameters: z.object({
    filePath: z.string().describe("Relative path from workspace root"),
    oldText: z.string().describe("Exact text to replace"),
    newText: z.string().describe("Replacement text"),
    replaceAll: z
      .boolean()
      .default(false)
      .describe("Replace every occurrence instead of only the first"),
  }),
  execute: async ({ filePath, oldText, newText, replaceAll }) => {
    const resolved = path.resolve(ROOT, filePath);

    if (resolved !== ROOT && !resolved.startsWith(ROOT_PREFIX)) {
      throw new Error("Access denied: path escapes workspace root");
    }

    if (!oldText) {
      throw new Error("oldText must be a non-empty string");
    }

    const original = await fs.readFile(resolved, "utf8");
    const matches = original.split(oldText).length - 1;

    if (matches === 0) {
      throw new Error("oldText was not found in the target file");
    }

    const updated = replaceAll
      ? original.split(oldText).join(newText)
      : original.replace(oldText, newText);

    await fs.writeFile(resolved, updated, "utf8");

    return {
      filePath,
      replacements: replaceAll ? matches : 1,
    };
  },
});
