import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Agent, createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import {
  editFileTool,
  readFileTool,
  writeFileTool,
} from "../tools";

const execFileAsync = promisify(execFile);

async function runWorkspaceCommand(command: string, args: string[]) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: process.cwd(),
    timeout: 20000,
    maxBuffer: 1024 * 1024,
  });

  return {
    stdout: stdout ?? "",
    stderr: stderr ?? "",
  };
}

const repoAutopilotWorker = new Agent({
  name: "CodexCore Repo Autopilot",
  instructions: `You are an internal software engineering worker for the VoltAgent CodexCore workspace.

Operate only inside the current workspace. Prefer reading files and inspecting command output before proposing changes.
When asked to plan, inspect the repository and return a concrete implementation plan.
When asked to edit, apply the smallest correct code changes with the available file tools.
Always end implementation work by checking git diff and summarizing the resulting changes.
Never use gitCommit unless explicitly instructed.`,
  model: "groq/llama-3.3-70b-versatile",
  tools: [readFileTool, writeFileTool, editFileTool],
});

const inspectionSchema = z.object({
  repositorySummary: z.string(),
  relevantFiles: z.array(z.string()),
  implementationNotes: z.array(z.string()),
});

const planSchema = z.object({
  goal: z.string(),
  plan: z.array(z.string()).min(1),
  filesToEdit: z.array(z.string()),
  validationSteps: z.array(z.string()),
});

const editSchema = z.object({
  executionSummary: z.string(),
  changedFiles: z.array(z.string()),
  notableDecisions: z.array(z.string()),
});

const diffSummarySchema = z.object({
  diffSummary: z.string(),
  highlights: z.array(z.string()),
  remainingRisks: z.array(z.string()),
});

export const repoAutopilotWorkflow = createWorkflowChain({
  id: "repo-autopilot-workflow",
  name: "repoAutopilot",
  purpose:
    "Inspect files, propose an implementation plan, apply code edits, run typecheck, and summarize the resulting diff.",
  input: z.object({
    task: z.string().min(1),
  }),
  result: z.object({
    repositorySummary: z.string(),
    plan: z.array(z.string()),
    executionSummary: z.string(),
    changedFiles: z.array(z.string()),
    typecheckPassed: z.boolean(),
    typecheckOutput: z.string(),
    diffSummary: z.string(),
    highlights: z.array(z.string()),
    remainingRisks: z.array(z.string()),
  }),
})
  .andAgent(
    async ({ data }) => `Inspect the current workspace for this engineering request:

Task: ${data.task}

Use file and command tools as needed. Focus on the files and behavior most relevant to this task. Return a concise repository summary, the specific files you inspected, and implementation notes that matter for the change.`,
    repoAutopilotWorker,
    {
      schema: inspectionSchema,
    },
    (output, { data }) => ({
      task: data.task,
      ...output,
    })
  )
  .andAgent(
    async ({ data }) => `Create an implementation plan for this request.

Task: ${data.task}
Repository summary: ${data.repositorySummary}
Relevant files: ${data.relevantFiles.join(", ") || "none"}
Implementation notes:
${data.implementationNotes.map((note) => `- ${note}`).join("\n") || "- none"}

Return a concrete ordered plan, the files that need edits, and the validation steps. Do not apply changes in this step.`,
    repoAutopilotWorker,
    {
      schema: planSchema,
    },
    (output, { data }) => ({
      ...data,
      goal: output.goal,
      plan: output.plan,
      filesToEdit: output.filesToEdit,
      validationSteps: output.validationSteps,
    })
  )
  .andAgent(
    async ({ data }) => `Execute the requested code change in the current workspace.

Task: ${data.task}
Goal: ${data.goal}
Plan:
${data.plan.map((step, index) => `${index + 1}. ${step}`).join("\n")}
Target files:
${data.filesToEdit.map((file) => `- ${file}`).join("\n") || "- determine during execution"}

Use the available file tools to make the necessary edits now. After editing, inspect the local diff with git and return a concise execution summary, the files you changed, and any notable implementation decisions.`,
    repoAutopilotWorker,
    {
      schema: editSchema,
    },
    (output, { data }) => ({
      ...data,
      executionSummary: output.executionSummary,
      changedFiles: output.changedFiles,
      notableDecisions: output.notableDecisions,
    })
  )
  .andThen({
    id: "run-typecheck",
    execute: async ({ data }) => {
      try {
        const result = await runWorkspaceCommand("npm", ["run", "typecheck"]);

        const combinedOutput = [result.stdout, result.stderr]
          .filter(Boolean)
          .join("\n")
          .trim();

        return {
          ...data,
          typecheckPassed: true,
          typecheckOutput: combinedOutput || "Typecheck passed with no output.",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Typecheck failed with an unknown error.";

        return {
          ...data,
          typecheckPassed: false,
          typecheckOutput: message,
        };
      }
    },
  })
  .andThen({
    id: "collect-diff",
    execute: async ({ data }) => {
      const result = await runWorkspaceCommand("git", ["diff", "--", "."]);

      return {
        ...data,
        diffText: result.stdout.trim(),
      };
    },
  })
  .andAgent(
    async ({ data }) => `Summarize the resulting code diff for this completed task.

Task: ${data.task}
Execution summary: ${data.executionSummary}
Changed files: ${data.changedFiles.join(", ") || "none"}
Typecheck passed: ${data.typecheckPassed ? "yes" : "no"}
Typecheck output:
${data.typecheckOutput}

Git diff:
${data.diffText || "No diff output was available."}

Return a concise diff summary, the main highlights, and any remaining risks or follow-up items.`,
    repoAutopilotWorker,
    {
      schema: diffSummarySchema,
    },
    (output, { data }) => ({
      repositorySummary: data.repositorySummary,
      plan: data.plan,
      executionSummary: data.executionSummary,
      changedFiles: data.changedFiles,
      typecheckPassed: data.typecheckPassed,
      typecheckOutput: data.typecheckOutput,
      diffSummary: output.diffSummary,
      highlights: output.highlights,
      remainingRisks: output.remainingRisks,
    })
  );
