<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Strict Rules for Developers & Agents

Any automated developer agent or human coder working in this codebase **MUST** follow these instructions strictly:

1. **Keep Documentation Synced**:
   - Every time a change or edit is made to the codebase, the developer **must** update:
     - [project_memory.md](./project_memory.md): Add or revise descriptions of modified files, functions, or schemas.
     - [design.md](./design.md): Update theme properties or layouts if design variables change.
     - [changelogs.md](./changelogs.md): Log all changes with dates and description.
     - [README.md](./README.md): Update setup instructions if dependencies or configs change.

2. **Clean Up Agent Comments**:
   - **CRITICAL**: Before finishing work or committing files, the agent **MUST** remove all temporary notes, comment indicators, block explanations, or explanatory comments added inside source code files (`.ts`, `.tsx`, `.js`, `.css`). Clean code is mandatory.

3. **Check Documentation First**:
   - Before attempting any repository modification or code execution, the agent **must** read [project_memory.md](./project_memory.md) and [design.md](./design.md) to understand current schemas, configurations, and component behaviors.

4. **Remove All Comments After Work**:
   - **CRITICAL**: After completing any task, the agent **MUST** scan all modified source files (`.ts`, `.tsx`, `.js`, `.css`) and remove **every** comment — including file path headers (`// path/to/file`), inline explanatory comments (`// this does X`), JSX block comments (`{/* ... */}`), and CSS comments (`/* ... */`). The only exception is comments required by tooling (e.g., `next-env.d.ts`, ESLint directives). Zero comments in production source code is mandatory.
