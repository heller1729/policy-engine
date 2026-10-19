# Geolocation Privacy Policy Engine: v0.2

A working prototype of the privacy policy engine described in `docs/Policy_Engine_Design.md` and the Whimsical architecture board. It takes a data request, checks it against the policy file, returns one decision with the reasons, and applies that decision to the data before anything is released. v0.2 adds a web app on top of the engine so the decisions can be explored and presented without reading code.

All data is synthetic. No real Irys or LocationMind data is used.

## Quick start

Needs Python 3.11 or newer and Node 20 or newer.

```
python -m venv policyengenv
policyengenv\Scripts\Activate.ps1      # PowerShell; cmd: policyengenv\Scripts\activate.bat; Git Bash: source policyengenv/Scripts/activate
pip install -r requirements.txt

cd web
npm install
npm run build
cd ..

python serve.py
```

Open http://localhost:8000. `python serve.py --city` starts the same app with a fuller synthetic dataset, which makes the maps easier to read; the numbers then differ from the scenario table in `CLAUDE.md`.

## The web app

| Page | What it shows |
| :-- | :-- |
| Request builder (`/`) | Pick the five request attributes and an area. The decision updates as the fields change, with every rule that fired, its factor ID and citation, and the techniques that will run. Run request shows the row funnel, input and released maps, the released rows and the audit record. A what if box can raise k or add noise for one request, never loosen the policy |
| Who sees what (`/matrix`) | The outcome for every tier and requester after all rules apply, for one jurisdiction, purpose and location group. Compare with another jurisdiction or with the audience matrix alone. Cells open the request builder |
| Policy (`/policy`) | Read only view of the policy file and place catalog, with search and factor filters |
| Techniques (`/techniques`) | Each technique applied to sample synthetic rows, before and after |
| Audit log (`/audit`) | Every request run since the server started, with a review tab and JSONL export |
| Present (`/present`) | A walkthrough of the 13 demo scenarios for meetings. Arrow keys or space to move |

Requests live in the URL, so a link such as `/?tier=5&requester=commercial&jurisdiction=thailand&purpose=advertising&group=G5&area=Bangkok` opens that exact case. Interactive API docs are at `/docs`.

## Command line

```
python demo.py              # the 13 scenarios, printed
python demo.py --noise      # same, with the Laplace noise module switched on
python demo.py --only 1     # one scenario
python ask.py --tier 6 --requester commercial --jurisdiction saudi_arabia --purpose advertising --group G1 --area Mecca
```

Add `--json` to `ask.py` to print the full audit record. The command line tools append to `out/audit.jsonl`; the web app appends to `out/api_audit.jsonl`.

## Tests

```
python -m pytest -q         # engine and API tests
cd web
npm run test:e2e            # builds the app, starts a server and walks it in Chrome
```

The browser tests use the installed Chrome through Playwright, so no browser download is needed. They step through all 13 scenarios in present mode and fail if any outcome differs from the expected one.

## Development

Run `python serve.py --reload` in one terminal and `npm run dev` inside `web` in another, then open http://localhost:5173 (it forwards `/api` to port 8000). After changing an API response model, run `npm run gen:api` inside `web` to regenerate the TypeScript types in `web/src/api/schema.d.ts`.

## How the code maps to the diagram

| Diagram | Code |
| :-- | :-- |
| Step 1, data request and its five attributes | `engine/models.py`, `Request` |
| Step 2, enforcement point (PEP) | `engine/pep.py`, `EnforcementPoint` |
| Step 3, decision point (PDP) reading the four rule sets | `engine/pdp.py`, `DecisionPoint` |
| Policy file and the four rule sets | `policy/policy.yaml` |
| Step 4, most restrictive wins | `DecisionPoint.decide`, step 5 in the code |
| Step 5, decision and audit log | `engine/models.py`, `engine/audit.py` |
| Step 6, transform steps | `EnforcementPoint._place_check`, then `engine/techniques.py` |
| Step 7, released output | return value of `EnforcementPoint.handle` |
| Web app and API | `api/` (FastAPI) and `web/` (React) |

## Decision logic

1. Location group rule. G1 and G2 block device level data (Lv 4 and above). G3 and G4 allow aggregates only.
2. Audience matrix, taken from the Who sees what proposal.
3. Jurisdiction overrides, taken from the Regional overrides and Ad ID tabs.
4. Purpose rules. Purpose can only tighten a decision, never loosen it.
5. Most restrictive wins, in the order Full, Masked, Aggregate, Blocked.
6. Grey areas (rules marked `review: true`) never go out as Full or Masked. They are lowered to Aggregate and flagged for human review.
7. Place check. Before any technique runs, each row's own location group is looked up from `policy/place_catalog.yaml`. Rows whose group would get a stricter decision than the release are withheld, and the audit record says how many and why.

Unknown values (a country with no rules, an unknown requester type, a tier outside 1 to 7) are Blocked. The engine fails safe. Each jurisdiction's k is a plain number in `policy.yaml` (5 everywhere for now).

## Privacy techniques are swappable

Each decision maps to a plan of technique modules in the policy file:

```yaml
techniques:
  plans:
    Masked: [hash_ids, drop_sensitive_rows, coarsen_time]
    Aggregate: [aggregate_h3, suppress_small_cells]
```

Changing which techniques run, or their order, is a policy edit. No engine code changes.

| Module | Factor | What it does |
| :-- | :-- | :-- |
| `place_check` | B3 | Built into the enforcement point. Withholds rows by their own location group |
| `hash_ids` | A2 | Salted HMAC of the device or ad ID |
| `drop_sensitive_rows` | B2, B3 | Removes device level rows labelled G1 to G4, as a backup to the place check |
| `coarsen_time` | E2 | Keeps the date, drops the hour |
| `aggregate_h3` | E1, E4 | Unique device counts per H3 cell, date, home country |
| `suppress_small_cells` | E3 | Removes cells under k |
| `laplace_noise` | E5 | Laplace noise on counts, off by default, experimental |

To add a technique (secure aggregation, encryption, synthetic data, and so on), write a class in `engine/techniques.py` with the `@register` decorator, then name it in a plan in `policy.yaml`. If a plan names a technique that is not registered, the engine raises an error instead of silently skipping it.

## Synthetic data

Nine cities, one or more for every jurisdiction in the policy: Mecca and Riyadh (Saudi Arabia), Dubai (UAE), Doha (Qatar), Bangkok (Thailand), New York (US), London (UK), Paris (EU) and Tokyo (Japan). Each has everyday places and a mix of sensitive ones. Visits are generated with a fixed seed, so every run gives the same rows. Rare nationalities are included so suppression below k is visible.

## Where the rule values come from

| Rule set | Source |
| :-- | :-- |
| Location groups G1 to G5 | Sensitive locations tab |
| Audience matrix | Who sees what proposal, first cut |
| Jurisdiction overrides | Regional overrides tab, Ad ID do's and don'ts tab |
| Purpose rules | Application areas tab, Ad ID tab |
| k = 5 | LocationMind standard, Regional overrides row E3 |
| Place catalog | Synthetic stand in until LocationMind's place list is available |

Each rule in the YAML carries a factor ID and a citation, and both are written to the audit log.

## Known limits

* The policy file is written by hand from the spreadsheet. The spreadsheet is written for people (prose cells), so generating the YAML automatically needs a machine readable version of the overrides tab first.
* Cross border transfer is folded into the Saudi localization rule. A separate destination attribute would let the engine handle transfers properly.
* The place catalog is synthetic and matches rows by distance to a point with a 600 m buffer. Real use needs LocationMind's place list, real shapes and a buffer agreed with counsel.
* `laplace_noise` runs after suppression, so a noisy count can come out under k. The right order and the privacy budget need their own design against NIST SP 800-226.
* The data subject audience (own data via a rights request) is not modelled yet.
* The web app has no login and keeps its audit log in memory and in a local file. It is meant to run locally.

## Open questions

1. Is most restrictive wins the right conflict rule, or should some rules carry explicit priority?
2. Can purpose ever loosen a decision?
3. Which additional privacy and encryption techniques should be supported first, and how should the engine choose between them?
4. What format should the audit record use for reporting to regulators or partners?
