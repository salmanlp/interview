# Interview Assessment — UI/UX Designer

A local-first web application for conducting, scoring, storing, reviewing and
comparing UI/UX designer interviews.

It ships with a structured **31-question, 30-minute UI/UX interview**, a
question bank of 45 questions across 19 categories, weighted scoring, automatic
recommendations, candidate comparison, interview-quality analytics and a
printable assessment report.

Every candidate record lives in **IndexedDB in your own browser**. There is no
backend, no telemetry and no network request that carries candidate data.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run build:single  # one self-contained index.html, for static hosts
```

Requires Node 20+.

`build:single` inlines all CSS and JS into a single `dist/index.html` and
switches to hash routing, so the app runs from a file:// path or any host that
serves one static file with no URL rewriting.

On first run the question bank and the default template are installed
automatically. **Settings → Data & privacy → Load demo data** adds seven
realistic candidates (including one interview left in progress) so every screen
has something to show.

### Deploying

The app is fully static — the `dist/` build output is the whole deployment.

`netlify.toml` is committed and configures the build, the single-page-app
redirect (without it, reloading a deep link like `/candidates/abc123` returns a
404), asset caching, and security headers. `connect-src 'self'` in the
Content-Security-Policy enforces the privacy promise at the browser level: no
candidate data can leave the device even if a dependency later tried to send it.

**Create the site and deploy in one command.** `--site-name` creates the project
if it does not already exist, so there is no setup step in the Netlify UI:

```bash
npx netlify-cli login                      # once, opens a browser
npm run build
npx netlify-cli deploy --prod --no-build --dir dist \
  --site-name uiux-interview-assessment
```

The site is then live at `https://uiux-interview-assessment.netlify.app`.

**Deploy automatically on every push.** `.github/workflows/deploy.yml` builds
the app and deploys it: production from the repository's default branch, and a
preview URL for every other branch and pull request. It needs two repository
secrets (*Settings → Secrets and variables → Actions*):

| Secret | Where to get it |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → New access token |
| `NETLIFY_SITE_ID` | Site configuration → Site details → Project ID, or `netlify status` |

Without them the workflow still builds and type-checks on every push, and skips
the deploy with a notice rather than failing.

The same `dist/` works on any static host; on one that cannot rewrite URLs, use
`npm run build:single` instead.

---

## What it does

**Run an interview.** Pick a candidate and a template, choose a duration
(15/30/45/60 or custom) and a mode, then work through the questions. Each one
shows its evaluation criteria, follow-up prompts and ideal-answer guidance
beside a 1–5 score selector and a notes field. The timer counts up, warns at the
configured thresholds and keeps counting into overtime rather than stopping.

**Never lose an interview.** Everything autosaves to IndexedDB continuously and
on tab hide. Closing the browser mid-interview and reopening the app surfaces a
persistent *Interview in progress* banner with progress, elapsed time and a
**Resume** action — the clock picks up where it left off and the resume is
recorded in the audit trail.

**Score it fairly.** Questions carry a weight (1×, 2×, 3×), so a practical Figma
task or a real-world scenario counts for more than a definition. Percentages are
computed over the questions that were actually scored, so an interview that ran
short is not penalised for questions never asked. Both the raw score and the
weighted score are always reported side by side.

**Decide.** At completion the app calculates section scores, a skill breakdown,
strengths and development areas (rule-based, no AI), and a recommendation from
configurable thresholds. The interviewer can override that recommendation — an
override requires a written reason and is written to the candidate's audit
trail.

**Review and compare.** Completed interviews become read-only; reopening one for
editing marks it as modified and logs the change. Two to five candidates can be
compared across every skill with the highest value in each row highlighted.
Reports export as PDF (via print), CSV and JSON.

**Improve the interview itself.** *Reports → Interview question analytics* shows
each question's average score, score distribution, skip rate and
differentiation (the standard deviation of candidate scores) — so you can find
the questions that are too easy, too hard, or not telling you anything.

---

## Architecture

```
src/
├── lib/                     # Framework-free domain logic
│   ├── types.ts             # The whole data model
│   ├── scoring.ts           # Pure scoring engine — one definition of "the score"
│   ├── interview.ts         # Template → interview, question state, timer state
│   ├── selectors.ts         # Derived data: summaries, pipeline, analytics
│   ├── exporters.ts         # CSV / JSON / backup serialisation
│   ├── utils.ts             # Formatting, validation, small helpers
│   └── seed/                # Default questions, template, demo data
├── data/
│   ├── repository.ts        # Storage contract the UI talks to
│   └── indexedDb.ts         # IndexedDB implementation of that contract
├── store/
│   ├── AppStore.tsx         # Loads entities once, exposes CRUD + audit + theme
│   └── ToastProvider.tsx
├── components/
│   ├── ui/                  # Button, Card, Field, Modal, Toaster, badges, …
│   ├── layout/              # AppShell, Sidebar, TopBar, GlobalSearch, shortcuts
│   ├── charts/              # Hand-drawn SVG: radar, bars, distribution, pipeline
│   ├── interview/           # Timer, navigator, score selector, notes, breakdown
│   └── candidates/          # Candidate form
└── pages/                   # One file per route
```

### Storage is swappable

Nothing above `data/` knows what IndexedDB is. The UI depends on the
`Repository` interface:

```ts
interface Repository {
  candidates: Collection<Candidate>;
  interviews: Collection<Interview>;
  templates: Collection<Template>;
  questions: Collection<Question>;
  audit: Collection<AuditEvent>;
  getSettings(): Promise<Settings | null>;
  saveSettings(s: Settings): Promise<Settings>;
  exportAll(): Promise<BackupFile>;
  importAll(b: BackupFile, mode: 'replace' | 'merge'): Promise<void>;
  clearAll(): Promise<void>;
  estimateUsage(): Promise<{ usage: number; quota: number } | null>;
}
```

Adding a Postgres/Supabase/Firebase backend means writing one class that
satisfies this interface and handing it to the store — no component changes. All
entities are plain JSON-serialisable objects with string ids, so they map onto
rows or documents directly.

### Interviews freeze their questions

When an interview starts, the template is flattened into a
`InterviewQuestion[]` stored **on the interview**. Editing a template or
deleting a bank question afterwards can never rewrite an assessment that has
already been recorded.

### Scoring in one place

`lib/scoring.ts` holds every calculation as a pure function. Two denominators
are tracked deliberately:

- `maxPossible` — every question × the scale maximum. Answers "how did they do
  against the whole interview?" and is what the finish dialog shows (128 / 155).
- `scoredMax` — only the questions that received a score. The percentage that
  drives the recommendation uses this basis.

Default recommendation thresholds (all configurable in Settings, and per
template): **90%+ Strong Hire · 75%+ Hire · 60%+ Further Review · below 60% No
Hire**.

---

## Design system

A restrained neutral palette defined as CSS custom properties in
`src/index.css`, mapped into Tailwind v4 via `@theme inline`. Colour is reserved
for score states, status, and primary/destructive actions — the rest of the
interface is surfaces, borders and type.

Light, dark and system themes share the same semantic tokens, so a component is
written once against `--surface` / `--ink` / `--s4` and is correct in both. The
theme is applied before first paint by a small inline script, so there is no
flash of the wrong theme.

Charts are hand-drawn SVG rather than a charting dependency: four simple forms
that must inherit the design tokens and respond to the theme. The candidate
comparison uses a categorical palette validated for colour-vision separation
and contrast in both themes; every value is also direct-labelled and repeated in
the table, so identity never depends on colour.

---

## Accessibility

- Full keyboard operation with visible focus rings on every control
- One `<h1>` per page, no skipped heading levels, `main`/`nav`/`header` landmarks
- Skip-to-content link, focus trapping and restoration in dialogs, `Esc` to close
- Every control has an accessible name; required fields announce as required
- Score buttons are a labelled radio group — the number and its label always
  appear together, so no meaning is carried by colour alone
- Timer thresholds and save state are announced via live regions
- `prefers-reduced-motion` honoured

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `⌘/Ctrl + K` | Global search |
| `?` | Shortcut help |
| `⌘/Ctrl + S` | Save now |
| `Esc` | Close dialog or search |
| `N` / `P` | Next / previous question |
| `1`–`5` | Score the current question |
| `F` | Flag question |
| `S` | Mark as skipped |
| `Space` | Pause / resume the timer |

Interview shortcuts are suppressed while the notes field has focus, so you can
type freely.

---

## Privacy

Candidate data is personal data, and this app treats it that way.

- Everything is stored in IndexedDB in the browser profile running the app
- No analytics, no error reporting, no candidate data in any network request
- The only outbound request is the Google Fonts stylesheet, which carries no
  application data — the app falls back to system fonts if it is blocked
- Full JSON export/import for backup and portability
- Per-candidate deletion, demo-data clearing, and a confirmed "delete all data"
- Storage usage is shown in Settings, and the storage location is stated in the
  UI rather than buried in documentation

Clearing your browser's site data deletes everything. Export a backup first.

---

## Tech

React 19 · TypeScript (strict) · Vite 6 · Tailwind CSS v4 · React Router 7 ·
IndexedDB. No UI kit, no chart library, no state-management library, no PDF
library — printing uses the browser's own print-to-PDF with a dedicated print
stylesheet.
