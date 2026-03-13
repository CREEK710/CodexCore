import { andThen, createWorkflow } from "@voltagent/core";
import { z } from "zod";

export const repoAssistWorkflow = createWorkflow(
  {
    id: "repo-assist-workflow",
    name: "repoAssistWorkflow",
    purpose:
      "Inspect repository files, explain structure, and support safe development tasks.",
    input: z.object({
      task: z.string().optional(),
    }),
    result: z.object({
      acknowledgedTask: z.string().optional(),
    }),
  },
  andThen({
    id: "acknowledge-task",
    execute: async ({ data }: { data: { task?: string } }) => ({
      acknowledgedTask: data.task,
    }),
  })
);
