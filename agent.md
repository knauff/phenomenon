# Anomalous Accounts — development and handoff guide

Updated September 25, 2026. These files update Adam’s static implementation; they do not replace or publish the separate ChatGPT-hosted site.

## Product direction agreed with Matt

Aggregate experiences, compile useful data, and help people explore patterns with curiosity and care. Cover UAP, psi, near-death experiences, entity encounters, altered states, and other unusual experiences. Categories may overlap; they do not imply one cause.

Use **Anomalous Accounts** everywhere as the brand. The approved thin constellation logo is embedded in index.html so it travels with this file. Do not substitute a heavier mark. Naming research was preliminary screening, not legal clearance or a promise of exclusive rights.

Homepage copy: “Share your experience, explore others’ accounts, and discover patterns across them.” Keep the heading and spaced category list. Prefer plain language and a clean mobile experience. Evidence is optional: use “Supporting material (optional)” and invite photos, recordings, or documents when available; avoid repeated no-proof promotion.

Combine Adam’s dashboard, broad categories, lasting-effects questions, and public exploration with the three-step submission flow, archive filters, explicit privacy choices, moderation, and controlled publication developed with Matt. Ask Adam for his judgment on the combined direction; preserve his ability to shape it.

## Current deliverable and limitations

- Static, single-file vanilla HTML/CSS/JavaScript; no build step or new dependencies. Google Fonts remain the only external UI dependency.
- Three-step form with optional supporting links, overlapping categories, and lasting-effects fields. Full-account publication is unchecked by default.
- Query aliases and hash routes supported. Navigation clears a stale `view` query before setting a new hash. Step buttons support keyboard use and validate prior required steps.
- Public cards use textContent, never untrusted HTML. Search/category filters also determine the pattern counts and downloadable CSV.
- Percentages show their denominator. Empty and failed-load states are distinct; small samples are labeled. Approval is never called verification.
- Submissions are deliberately paused. The supplied files do not include the Apps Script backend, moderation implementation, authenticated receipt/status service, concern handler, or withdrawal implementation. Do not present these as working.
- The old implementation treated an opaque fetch as proof of saving, generated a withdrawal code not saved on the server, and simulated concern/withdrawal success. Those behaviors have been removed. Do not restore them.
- No live site was changed. Integrate through a feature branch and PR against Adam’s repository when repository access and publication are authorized. This attachment-only workflow cannot create a repository PR.

## Architecture and public repository rules

Keep GitHub Pages, the single index.html, and the dark/mint design. Do not migrate this branch to React, Vinext, or the separate hosted database merely because the other implementation uses them. A database and Google Sheets can both support these requirements if the backend enforces them.

Never commit credentials, owner setup codes, private submission text, private spreadsheets, contact details, receipt secrets, or withdrawal hashes. All GitHub Pages files and Git history are public. Do not put the raw intake sheet/CSV in `data/` and then rely on JavaScript to hide it. Client filtering cannot protect downloaded bytes.

## Backend activation gate — required before accepting real reports

The existing deployment address is a public endpoint, not a credential:
`https://script.google.com/macros/s/AKfycbwipa5HLL_AjbESLvJVkS0IsR4uvP9Sy6_okxLNJ3K4BiTSF_c8caJ6Ut9m_zxUi5TWTw/exec`

Do not send test reports to it without coordinating with its owner. Obtain and inspect the Apps Script implementation before enabling it. Preserve its existing transport if it is reused:

```js
await fetch(GOOGLE_WEB_APP_URL, {
  method: 'POST',
  mode: 'no-cors',
  headers: {'Content-Type': 'text/plain;charset=utf-8'},
  body: JSON.stringify(payload)
});
```

A resolved no-cors fetch is opaque: it does NOT confirm the HTTP status, database write, moderation state, or receipt. Do not switch to application/json or cors blindly. Provide a separately readable, authenticated receipt/status path or an appropriate server proxy. Only a validated server acknowledgment may display “saved” or clear the form. On unknown delivery, preserve answers, explain uncertainty, and use idempotency to prevent duplicates on retry.

Server responsibilities:
1. Validate sizes, fields, age confirmation, terms/privacy consent and policy version; reject invalid submissions.
2. Apply server-side rate limiting and human verification as appropriate. Browser checks alone are not bot protection. Store verifier secrets only in the private backend.
3. Persist reports privately as pending. Generate cryptographically strong IDs and withdrawal secrets; store only a hash of the withdrawal secret. Deliver the receipt through a secure response. Never log or publish secrets.
4. Authenticate reviewers server-side. A hidden static route is not owner authentication. Check privacy, quality/safety, possible duplicates, and sharing choices before approval. Approval is not factual verification.
5. Implement withdrawal and private privacy/copyright concerns with genuine server acknowledgment and clear retention/removal behavior. Avoid promises of instantaneous permanent deletion from all backups or third-party copies.
6. Produce a separate reviewed, consent-aware public export. Gate structured publication and full-account publication separately, including titles, aftermath, and links. Record these choices durably.
7. Reconcile actual privacy notices, operator contact, hosting/provider processing, retention, and concern procedures before launch. Do not invent legal protections or advertise licenses not actually adopted.

## Data contract and migration

Preserve these original twelve intake sheet columns in their original order for compatibility. Do not silently rename them or shift existing mappings:

1. Timestamp
2. Primary Category
3. Phenomenon Sub-Type
4. Title / Headline
5. Incident Date / Timeframe
6. Environmental Setting
7. Geographic Region
8. Witness Count
9. Physical Trace Corroboration
10. Sensate Signatures
11. Detailed Account
12. Aftermath & Ontological Impact

Coordinate additive private schema changes with Apps Script: report ID, pending/approved/rejected/withdrawn status, additional categories, lasting-effects selection, supporting-material URL, adult confirmation, structured publication consent, full-account publication consent, policy version, withdrawal hash, and retry/idempotency key. Map all form fields explicitly. Never discard a consent field simply to fit the old 12 columns. Legacy records without explicit sharing permission must not be automatically promoted to the new public export.

The browser reads **only** `./data/anomalous_accounts_public.csv`. This is a new, intentionally separate path; its file is not included in the supplied attachments and must be generated by the reviewed export process. Do not copy or rename the old raw master dataset into it.

Public headers (matching `PUBLIC_FIELDS` in index.html):

```text
Report ID
Status
Structured Publication Consent
Full Account Publication Consent
Primary Category
Additional Categories
Phenomenon Sub-Type
Title / Headline
Incident Date / Timeframe
Environmental Setting
Geographic Region
Witness Count
Physical Trace Corroboration
Sensate Signatures
Lasting Effects
Detailed Account
Aftermath & Ontological Impact
Supporting Material URL
```

Export approved rows only (`Status` exactly `approved`) with explicit structured sharing permission (`true` or `yes`). Additional Categories uses semicolons. Missing full-account permission means blank title, narrative, aftermath text, and supporting URL **in the exported file itself**. Never include private metadata. Review every other field for identifying details, including dates, location, and subtype.

Keep the quote-aware CSV parser; test commas, embedded newlines, and doubled quotation marks. The browser export uses only allowlisted projected fields and neutralizes formula-leading characters for spreadsheet opening. It is a copy of the current filtered public selection, not a private database backup.

Percentages divide by report count in the selected public dataset. An unchecked feature means “not selected,” not proof it did not happen. Multiple reports can describe one event, and categories can overlap. Do not infer prevalence, causation, or verified paranormal effects from these charts. Keep metric labels aligned to stored values, particularly the telepathy checkbox.

## UX and validation checklist

- Readable labels, visible focus, keyboard-operable stepper and navigation, responsive layout.
- Every input/select/textarea has an associated label in a form-group. Mark required fields; offer unknown/unsure where appropriate.
- Validate all previous steps when jumping forward; preserve answers on errors or uncertain delivery.
- Neutral observations before interpretations; optional supporting material and neutral lasting-effects choices.
- Full-account opt-in remains unchecked. Show all submitted answers before the eventual enabled submission.
- No fake successful receipt, withdrawal, concern, or owner-review operation.
- Confirm public redaction at the export source, not only in rendered cards.
- Confirm search/filter behavior, CSV parsing/escaping, correct metric numerator/denominator, and honest load errors.
- Before activation, test real private intake → pending owner review → consent-aware public export → withdrawal; test unauthorized review denial and bot controls against a test backend, never by polluting live research data.

## Suggested joint review with Adam and Matt

Review the homepage on a phone, complete the three steps without sending, examine whether field wording feels natural, and compare the dashboard to Adam’s original intent. Agree on the private backend and public-export contract before reopening submissions. Keep the useful simplicity of Sheets where it fits; do not claim either platform automatically provides privacy, scalability, or scientific validity.
