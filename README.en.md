<div align="center">

<img src="docs/images/logos/logo-3-lettermark.svg" width="120" alt="Gaia" />

# Gaia

Visual AI Workflow Editor

Built on [flowgram.ai](https://github.com/bytedance/flowgram.ai) · React + Spring Boot + SQLite

[![Stars](https://img.shields.io/github/stars/boommanpro/gaia-workflow-engine?style=flat&color=orange)](https://github.com/boommanpro/gaia-workflow-engine/stargazers)
[![Release](https://img.shields.io/github/v/release/boommanpro/gaia-workflow-engine?style=flat)](https://github.com/boommanpro/gaia-workflow-engine/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat)](./LICENSE)
[![Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-green?style=flat)](https://boommanpro.github.io/gaia-workflow-engine/)

[简体中文](./README.md) · [Release Log](https://boommanpro.github.io/gaia-workflow-engine/#/releases) · [Issues](https://github.com/boommanpro/gaia-workflow-engine/issues) · [Discussions](https://github.com/boommanpro/gaia-workflow-engine/discussions)

</div>

Arrange AI workflows on an infinite canvas with drag and drop: LLM calls, conditional branches, loops, HTTP requests, code execution. Or describe what you need in the sidebar chat and let the AI plan the steps, create the nodes and edges, and run the workflow on the canvas right away.

The backend is a Spring Boot monolith with built-in SQLite storage and the AgentScope execution engine, packaged as a single executable jar.

## Demo

A 76-second end-to-end run: describe the task in chat, let the AI generate the workflow, unit-test nodes, then run the whole flow. Everything is recorded from real API calls.

https://github.com/user-attachments/assets/2530ba1e-3ac2-49c3-835f-87ed9f77b44c

<details>
<summary>Timeline</summary>

| Time | What happens |
|------|--------------|
| 0:00 | Canvas overview: Start → Condition → Copywriting → End |
| 0:18 | Sidebar chat: describe the task, the AI plans five steps |
| 0:46 | Auto orchestration: nodes created and wired, three unit tests pass (sped-up replay) |
| 0:55 | Trajectory: every tool call and execution step is traceable |
| 1:01 | Test run: input 85, the "pass" branch fires and returns the verdict |

</details>

Try it live: [Home](https://boommanpro.github.io/gaia-workflow-engine/) · [Admin Console](https://boommanpro.github.io/gaia-workflow-engine/#/admin/workflows) · [Release Log](https://boommanpro.github.io/gaia-workflow-engine/#/releases)

## Features

### Canvas & Nodes

- Infinite zoomable canvas with drag-and-drop editing; loops, branches, and conditional logic
- Multi-branch node with and/or condition groups and an else fallback
- Built-in nodes: LLM call, code execution, HTTP request, string formatting, variable management
- Per-node unit tests and full-workflow runs, with live input/output and execution history
- Canvas plugins: minimap, auto-layout, snap lines

### Chat Generation

- Generate workflows from the sidebar chat: CreatePlan step-by-step planning, Canvas tool creates nodes and edges
- HTTP / Query nodes can run lookups during the conversation
- Live preview of token usage and plan progress
- Sessions are renameable; every Trajectory is fully traceable

### Configuration & Operations

- Agent config center: model parameters, system prompt, knowledge base, tool definitions
- Switchable execution engine: built-in AgentScope, or Volcengine Ark Managed Agents
- Every save creates a version, with diff between versions and one-click switch
- Workflow templates: spin up new workflows from a template
- Observability API (`/api/agent/metrics/*`): tool calls, session runs, LLM call ledger, context usage stats

## Quick Start

### Prerequisites

| Dependency | Version |
|------------|---------|
| Node.js    | >= 18   |
| JDK        | >= 21 (code nodes are compiled at runtime with `-source 21`; run the service on JDK 21) |
| Maven      | 3.x     |

> The project itself builds for Java 17 (`maven.compiler.release=17`), but code nodes are compiled on the fly by the running service through the system JDK, so the **runtime** requires JDK 21 or above.

### Frontend

```bash
git clone https://github.com/boommanpro/gaia-workflow-engine.git
cd gaia-workflow-engine/apps/console
npm install
npm run dev
```

Then visit <http://localhost:3000>.

### Backend

```bash
cd apps/api/gaia-workflow
mvn install -DskipTests     # required on fresh clone: installs base/infra artifacts locally
cd gaia-workflow-app
mvn spring-boot:run         # dev mode, port 48080
```

> Multi-module note: running `gaia-workflow-app` alone resolves base/infra `SNAPSHOT` artifacts from the local Maven repository. After cloning (or whenever base/infra change), run `mvn install -DskipTests` from the aggregator directory `apps/api/gaia-workflow` first.

For production, package an executable jar:

```bash
cd apps/api/gaia-workflow
mvn package -DskipTests
java -jar gaia-workflow-app/target/gaia-workflow-app-0.0.1-SNAPSHOT.jar
```

The API server runs on port 48080. The SQLite database file `gaia_workflow.db` is created in the process working directory; first startup initializes the schema and seeds default configuration automatically.

### LLM Configuration (required)

Agent chat requires an OpenAI-compatible LLM endpoint (vLLM / Ollama / LM Studio / any gateway). After startup, open **Admin → Config → Model Settings** in the browser, fill in API Host / API Key / model name, and save. The config is stored in the `agent_config` table and takes effect immediately without restart.

- The default engine is the built-in AgentScope (Harness ReAct loop; depends on [io.agentscope:agentscope-harness](https://central.sonatype.com/artifact/io.agentscope/agentscope-harness), publicly available on Maven Central).
- Alternatively switch to the Volcengine Ark Managed Agents engine: fill in apiKey / environmentId / model ID in the "Ark Managed" section of the Model Settings page, then flip the default engine to Ark.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 · TypeScript · flowgram.ai 1.0.12 |
| Backend | Spring Boot · MyBatis Plus · Java 17 (build) / 21 (runtime) |
| Database | SQLite |
| Build | rsbuild (frontend) · Maven (backend) |

## Deployment Options

- Separate frontend/backend deployment, for environments with an existing gateway and service mesh
- Single-jar all-in-one deployment, for small to medium deployments
- Frontend on GitHub Pages with a configurable backend address
- Containers: no official image yet; build your own from the jar above

## Documentation

- Project docs: <https://boommanpro.github.io/gaia-workflow-engine/#docs>
- flowgram.ai framework docs: <https://flowgram.ai/guide/>

## Contributing

Issues and PRs are welcome. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

1. Fork the repo and create a feature branch
2. Commit your changes and open a Pull Request

## License

[MIT](./LICENSE)

## Star History

<a href="https://www.star-history.com/?repos=boommanpro%2Fgaia-workflow-engine&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
 </picture>
</a>
