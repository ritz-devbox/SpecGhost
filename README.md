# SpecGhost

**SpecGhost** is a behavioral contract guard for APIs. It finds the promises hidden between an API specification's lines—especially the regressions status-code tests cannot see.

## The idea

An endpoint can return `200 OK` while breaking a customer workflow. SpecGhost translates an API contract into concrete behavioral promises, then frames a regression in terms of the affected people and products.

The included TaskFlow workspace is a complete judge-friendly demo. Toggle **Introduce regression** to see an optional `dueDate` accidentally become required; SpecGhost identifies the broken promise, estimates downstream impact, and suggests the patch.

## What you can do

- Paste a contract or endpoint description and identify the behavioral promises it creates.
- Simulate a regression and see release confidence, broken contract status, affected consumers, and a suggested patch update together.
- Use **Test Forge** to generate a runnable Playwright API contract test suite.
- Inspect an interactive change-impact map that links an API field to its downstream consumers.
- Save local contract snapshots and review the contract timeline. Browser-local state lets this work without a database or test account.
- Compare a baseline and proposed contract with a semantic release-risk report that flags optional-to-required changes, removed fields, and changed field behavior.
- Run the included behavioral suite against the built-in sandbox or send a safe HTTP reachability probe to a staging URL.
- Export a shareable Markdown release report containing the decision, risks, remediation steps, check outcomes, and suggested patch.
- Paste a Git diff into **PR Review Copilot** to trace contract-adjacent code changes to their broken promise, affected user journeys, and a copyable GitHub merge-gate comment.
- Copy a CI merge-gate YAML snippet to make behavioral contract checks visible in a GitHub Actions workflow.

## Run locally

**Supported platforms:** Windows, macOS, and Linux with Node.js 18+.

```bash
node server.js
```

Open `http://localhost:3000`. No dependencies and no API key are required for the complete interactive demo.

## Run the merge gate in CI

SpecGhost also ships as a zero-dependency CLI that exits with code `1` when it detects a high-confidence behavioral regression. Try the included example:

```bash
npm run demo:check
```

The expected result is `SpecGhost merge gate: BLOCK` because the proposed TaskFlow contract turns `dueDate` from optional to required. Copy [specghost-contract-gate.yml](.github/workflows/specghost-contract-gate.yml) into a project and point its `--baseline` and `--candidate` arguments at your contract files. The CLI writes a Markdown summary when it runs in GitHub Actions.

### Optional live GPT-5.6 analysis

Set `OPENAI_API_KEY` before starting the app. In PowerShell:

```powershell
$env:OPENAI_API_KEY = "your_api_key"
node server.js
```

Click **Analyze intent** after pasting a contract. The server sends the contract to the OpenAI Responses API using `gpt-5.6`, asking for three testable behavioral promises. Without a key, SpecGhost uses deterministic local demo analysis so the evaluator experience remains reliable.

## How we used Codex and GPT-5.6

Codex was the implementation collaborator: it helped define the product slice, designed the interaction model, generated the Node server and responsive UI, and iterated on a setup-free demo experience.

GPT-5.6 is the core analyst: it reasons over an API contract to identify behavioral promises that ordinary schema/status tests often miss, expressing each as a test and customer impact. The same experience has a deterministic fallback solely so judges can test it without credentials.

## Submission evidence

- Track: **Developer Tools**
- Platform: web application; local Node.js server
- Core Codex Session ID: add the `/feedback` Session ID here before submitting.
- Demo video: add public YouTube URL here before submitting.
