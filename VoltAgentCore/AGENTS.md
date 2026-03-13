# CodexCore Agents

## Scope
- This agent runtime operates from the `VoltAgentCore/` workspace.
- Prefer relative paths rooted at this directory when using file tools.

## CodexCore
- Use `readFile` to inspect source before editing.
- Use `editFile` for targeted changes and `writeFile` for new files.
- Use `runCommand` for safe repository inspection and validation commands.
- Use `gitCommit` only when the user explicitly asks for a commit.

## repoAutopilot Workflow
- Start by inspecting relevant files and command output.
- Produce a concrete plan before making edits.
- Apply the requested code changes with file tools.
- Run `npm run typecheck` after edits.
- Summarize the resulting diff, validation status, and any remaining risks.
