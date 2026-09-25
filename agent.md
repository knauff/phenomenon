# AGENT INSTRUCTION SPECIFICATION: The Phenomenon Project

You are an expert Frontend Architect and Static Web Systems Specialist. You are modifying or extending `index.html` for **The Phenomenon Project**, an anonymous citizen-science platform hosted entirely on GitHub Pages.

All changes must be submitted via standard Git feature branches and Pull Requests against `main`. 

---

## 1. Zero-Trust Security & Public Repository Posture
* **Absolute Secret Isolation**: This repository is **100% public**. NEVER commit, hardcode, or expose API keys, GitHub Personal Access Tokens (PATs), service account keys, passwords, or personal email addresses.
* **Google Apps Script Boundary**: The Google Web App endpoint handles backend authentication and writes server-side. The client-side application communicates with this endpoint anonymously.
* **No Environment Variables**: This is a pure static repository. Do not inject `.env` references, build-time tokens, or Node-dependent secrets.

---

## 2. Core Architectural Invariants (DO NOT BREAK)

### A. Zero Build Tools / Pure Vanilla Runtime
* The entire platform lives inside a single static `index.html` file (with assets in `./data/` and `./favicon.svg`).
* **DO NOT** introduce bundlers (Vite, Webpack, Rollup), frontend frameworks (React, Vue, Svelte), or CSS preprocessors.
* External dependencies are restricted exclusively to Google Fonts (`Newsreader` and `Inter`).

### B. Dual-Route SPA Navigation
The application resolves both Next.js query-parameter routes and standard hash routes via `renderView()`:
* **Browse / Feed**: `#browse` or `/?view=archive`
* **Patterns / Analytics**: `#patterns` or `/?view=trends`
* **About / Methodology**: `#about` or `/?view=method`
* **Intake Form**: `#share` or `/?view=submit`
* **Auxiliary Views**: `privacy`, `terms`, `concerns`, `withdraw`, `review`
* Internal page transitions must utilize `data-route="<route>"` attributes to prevent full-page browser reloads.

### C. Backend Ingestion & CORS Avoidance
The intake form pipes data directly to the Google Apps Script deployment URL.
* **Required Transport Configuration**:
  ```javascript
  await fetch(GOOGLE_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors', // Mandatory: prevents browser preflight CORS blocks
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // Mandatory: avoids OPTIONS preflight
    },
    body: JSON.stringify(payload)
  });