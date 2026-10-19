# Policy Engine v0.2: Presentable Version Plan

Status: in progress, Oct 19, 2026. Steps 1 (API layer), 2 (web skeleton and request builder), 3 (run path with funnel, map, table, audit) and 4 (who sees what with compare, policy browser) done. Data stays synthetic.

## Goal

Turn prototype v0.1 into an application that can be shown live at the IAB meeting and to the LocationMind team, and that a partner can click through without reading code. The engine logic does not change. The new work is an API around the engine and a web interface on top of it.

What a viewer should be able to do in the app:

1. Build a data request from the five attributes and watch the decision update as the attributes change.
2. See why: every rule that fired, its factor ID, its citation, and which rules decided the outcome.
3. See what the decision does to the data: rows going through each technique, and a map of what is released compared with what came in.
4. See the whole audience matrix for a jurisdiction at once, and compare two jurisdictions.
5. Read the policy and the audit log without opening YAML or JSONL.

## Stack

| Layer | Choice | Reason |
| :-- | :-- | :-- |
| Engine | Existing `engine/` package, unchanged in behavior | Keeps the 22 tests and the invariants as they are |
| API | FastAPI, Pydantic models, uvicorn | Python, same process as the engine, typed request and response models, free OpenAPI page |
| Web | React, TypeScript 5.9, Vite, Tailwind, TanStack Query, openapi-fetch, lucide-react | Small hand written components on Tailwind instead of shadcn/ui, which kept the setup simple. TypeScript stays on 5.9 because 7 breaks `openapi-typescript` |
| Map | MapLibre GL and `h3-js`, no deck.gl | Cells are drawn as GeoJSON polygons from `cellToBoundary`, which is lighter than deck.gl. Carto Positron basemap, no key, plain background fallback |
| Charts | Recharts | Only needed for the row funnel and small summaries |
| Serving | FastAPI serves the built web app | One command to run the whole thing for a presentation |

Streamlit was considered. It is faster to build but looks generic, and the pipeline view and matrix explorer are hard to do well in it. React is the better fit for something shown to an advisory board.

## Repo layout after v0.2

```
engine/            unchanged core, small additions listed below
api/
  main.py          FastAPI app, mounts web/dist in production
  schemas.py       Pydantic request and response models
  routes/          decide.py, policy.py, matrix.py, audit.py, scenarios.py, data.py
  state.py         one Policy, one synthetic dataset, one AuditLog per server
web/
  src/pages/       RequestBuilder, Matrix, Policy, Audit, Techniques, Present
  src/components/  DecisionBadge, RuleCard, PipelineView, RowFunnel, HexMap, FactorChip
  src/api.ts       typed client generated from the OpenAPI schema
scenarios.py       the seven demo scenarios moved out of demo.py so CLI and API share them
serve.py           builds nothing, just starts uvicorn with the built web app
tests/
  test_engine.py   existing 22 tests
  test_api.py      new
```

`demo.py` and `ask.py` keep working.

## Engine changes (small, behavior preserving)

* `EnforcementPoint.handle(req, trace=False)`. With `trace=True` it also returns the rows after each technique, so the map can show which cells were suppressed. Default output and the audit record stay the same.
* Move the seven scenarios into `scenarios.py` with their expected outcomes. `demo.py`, the tests and the API all import from there.
* `Policy.with_overrides(...)` for the what if panel. Allowed overrides: switch `laplace_noise` on or off, change epsilon, raise k. Lowering k or loosening any cap raises `PolicyError`, so the invariant "a rule can only tighten" holds in the UI too.

## API

| Method and path | Returns |
| :-- | :-- |
| `GET /api/policy` | Requesters, purposes, jurisdictions with labels, location groups, tiers, audience matrix, all rules with factor and citation, technique plans |
| `GET /api/scenarios` | The seven demo scenarios with titles and expected outcomes |
| `POST /api/decide` | Decision only, no data touched. Used for live preview while the form changes |
| `POST /api/request` | Decision plus enforcement: steps with rows in and out, released rows (paged), cell list for the map, audit record |
| `POST /api/matrix` | Given jurisdiction, purpose, location group: the outcome for every tier and requester (35 calls to `decide`), with review flags and deciding rule IDs |
| `GET /api/audit` | Audit records for this server session, filter by outcome, review, jurisdiction. `GET /api/audit/export` returns JSONL |
| `GET /api/data/summary` | Synthetic dataset stats: rows per area, places and their groups, home country counts |
| `GET /api/techniques` | Registered techniques with name, factor, description, and where each is used in the policy |

Unknown attributes still come back as Blocked with `UNKNOWN_ATTRIBUTE`, not as an HTTP error, so the fail safe path is visible in the UI.

## Screens

### 1. Request builder (main screen)

* Left panel: tier (1 to 7 with Riki's level names), requester, jurisdiction, purpose, location group, area. A scenario dropdown fills the form with one of the seven demo cases.
* Top: a large decision badge (Full, Masked, Aggregate, Blocked, with a review flag) that updates as fields change through `/api/decide`.
* Center: the pipeline, laid out like the architecture board Steps 1 to 7. Request, PEP, PDP with one card per rule step (location group, audience matrix, jurisdiction, purpose). Each card shows the cap, a factor chip, and the citation. Deciding rules are highlighted. Notes such as the Saudi G2 to G1 shift and the grey area downgrade appear in line.
* Run button: calls `/api/request`. The technique steps fill in with a row funnel (for example 2373 rows, 65 cells, 56 cells after k).
* Output tabs:
  * Map. Input points on the left, released hexes on the right, suppressed cells shown hatched. Toggle between the two on small screens.
  * Table. Released rows. Masked output shows hashed IDs so the viewer sees that no raw ID leaves.
  * Audit record. The JSON for this request, with a copy button.

### 2. Who sees what

* Grid of tiers by requesters, colored by outcome, for a chosen jurisdiction, purpose and location group. This is the audience matrix after every rule has been applied, not the raw matrix.
* Compare mode: two jurisdictions side by side, cells that differ outlined. Thailand against UAE for advertising shows the effect of `TH_ADID_DEVICE_LEVEL` at a glance.
* Clicking a cell opens that request in the request builder.

### 3. Policy

Read only view of `policy.yaml`: location groups, audience matrix, jurisdiction rules, purpose rules, techniques and plans. Search by rule ID or factor ID. Factor chips open a short glossary of the A to F factors and G1 to G5 groups. Editing the policy in the UI is out of scope for v0.2.

### 4. Audit log

Table of every request in the session, filter by outcome and review flag, expand a row to see the full record, export JSONL. Requests flagged for review get their own tab. It is display only: approving a grey area request would release Masked data, which breaks the invariant, so there is no approve button.

### 5. Techniques

The registered technique modules with factor, description and a small before and after sample on synthetic rows. This page is where technique profiles will go once Dr. Matsuo's papers arrive and the selection design is done.

### 6. Present mode

A walkthrough of the seven scenarios, one per screen, with large type and keyboard navigation. Each screen shows the request, the deciding rules, the decision and the map. Built for the IAB slot so nothing has to be typed live.

## Mock data

`synthetic.py` stays as it is with seed 42 so the demo numbers and tests do not move. The API generates the dataset once at startup. The fuller dataset now exists behind `python serve.py --city` (more places per area, wider spread, 8000 devices). The default dataset is unchanged.

## Running it

```
pip install -r requirements.txt
cd web && npm install && npm run build && cd ..
python serve.py                  # http://localhost:8000
```

For development, `uvicorn api.main:app --reload` and `npm run dev` with a Vite proxy to the API.

The basemap needs internet. If the venue network fails, the map falls back to drawing hexes on a plain background, so the demo still works offline.

## Testing

* Existing 22 engine tests unchanged, including the exhaustive check.
* `tests/test_api.py`: every scenario through `/api/request` matches the expected outcome, unknown attributes return Blocked, `/api/matrix` agrees with calling `decide` directly, Masked responses contain no raw device IDs, overrides that try to loosen are rejected.
* One Playwright smoke test that runs the seven scenarios in present mode.

## Build order

1. API layer, `scenarios.py`, trace flag, overrides, API tests.
2. Web skeleton with routing and the typed client. Request builder with live decision and pipeline view.
3. Run path: row funnel, map, table, audit tab.
4. Who sees what grid and compare mode. Policy page.
5. Audit page, techniques page, present mode, single command serving, README update.

Each step ends with tests passing and a commit.

## Out of scope for v0.2

* Login and user accounts.
* Real data or a Snowflake connection.
* Editing `policy.yaml` from the UI.
* Choosing between techniques per jurisdiction, requester or purpose. That waits for the papers and its own design note. The techniques page and the plan section of the API are shaped so it can slot in.
* Hosting for partners. Local run only unless that changes.

## Decided

* The IAB meeting was Oct 8, 2026, and v0.1 was well received. There is no fixed deadline for v0.2; it is presented as work in progress.
* Build first. A Docker image comes later, once LocationMind wants to run it themselves.

* The flow steps in the app use the Whimsical board colors (blue input and output, orange enforcement point, gray policy, pink decide, mint transforms), so the app and the diagram read as one thing.
* The navigation only lists pages that exist. Pages are added as their build step lands.
* Request state lives in the URL so the matrix page can link a cell into the request builder.

## Open questions

* None right now.
