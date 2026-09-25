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
  
* **DO NOT** change `mode` to `cors`.
* **DO NOT** change `Content-Type` to `application/json`. Apps Script reads the body payload via `e.postData.contents`.

### D. Canonical 12-Column Telemetry Schema
Any modifications to form fields or payload generation must strictly match this exact 12-column header sequence:
1. `Timestamp`
2. `Primary Category`
3. `Phenomenon Sub-Type`
4. `Title / Headline`
5. `Incident Date / Timeframe`
6. `Environmental Setting`
7. `Geographic Region`
8. `Witness Count`
9. `Physical Trace Corroboration`
10. `Sensate Signatures`
11. `Detailed Account`
12. `Aftermath & Ontological Impact`

### E. RFC 4180 CSV Ingestion & Patterns Computation
* Live incident cards and statistical percentages are driven by `./data/phenomenon_master_dataset.csv`.
* `parseCSV()` handles multiline records and escaped quotations (`""`). Do not replace it with a naive `.split(',')` implementation.
* `calculatePatternMetrics(records)` computes real-time percentages across sensate signatures and updates DOM counters dynamically. Keep this execution tied to `loadDatasetFeed()`.

---

## 3. UI, Styling & Accessibility Standards

* **Design Tokens (CSS Variables)**:
  * Background: `--bg: #071317;`
  * Card Surfaces: `--card-bg: #0d2026;`, `--card-alt: #0a191e;`
  * Borders: `--border-subtle: rgba(255, 255, 255, 0.08);`, `--border-card: #16363f;`
  * Accents: `--mint: #7ce3c3;`, `--mint-hover: #67d6b3;`
  * Typography: Serif headings in `Newsreader`, body and UI in `Inter`.
* **Form Structural Integrity**:
  * Every input element (`<input>`, `<select>`, `<textarea>`) **must** reside in its own `<div class="form-group">` container accompanied by an explicit `<label for="...">` element.
  * Required fields must feature a `<span class="req">*</span>` indicator.
* **Notification Pattern**:
  * User feedback must be routed through `showToast(type, title, message)` to maintain Sonner-style floating UI notifications. Avoid standard browser `alert()` popups.

---

## 4. Pull Request Checklist for AI Agents

Before committing or approving changes, verify:
1. Is the file completely self-contained from `<!DOCTYPE html>` to `</html>`?
2. Are all credentials, tokens, and personal emails absent from the code?
3. Does form submission still use `mode: 'no-cors'` with `text/plain` headers?
4. Are all 12 canonical telemetry columns intact and properly mapped?
5. Does the in-browser CSV parser correctly load and render records without breaking the Patterns calculations?
6. Has the existing sleek dark/mint visual aesthetic been preserved?