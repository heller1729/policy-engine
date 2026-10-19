# STATUS

Last updated: Oct 6, 2026

Read `CLAUDE.md` first for standing context. This file is the running log. At the end of each session, add an entry under Session log, update the lists below, and commit.

---

## Where things stand

Prototype v0.1 is working and was shown at the IAB meeting on Oct 8. v0.2 (API plus web UI, mock data) is in progress; the API and the request builder with run results and map are done. 13 demo scenarios across nine cities and all eight jurisdictions, 58 passing tests, audit log, swappable technique modules, Laplace noise as an optional module. Architecture board has step labels and a legend. Next version is about supporting and selecting between many privacy and encryption techniques, per Dr. Matsuo's feedback.

---

## Next up (in priority order)

1. Read Dr. Matsuo's papers on privacy and encryption techniques when they arrive, and list which techniques to support first.
2. Design how the engine chooses a technique: per decision only today; consider per jurisdiction, requester, and purpose ("technique profiles"). Write it up before coding.
3. Add the first new technique modules with tests. Candidates to check against the papers: l diversity or t closeness on top of k, spatial cloaking or geo indistinguishability, user level differential privacy with a privacy budget, secure aggregation or secure multiparty computation, homomorphic encryption, synthetic data generation, salt rotation for hashed IDs.
4. Revise the Whimsical architecture board to show technique selection.
5. Fix the order of noise and suppression, and handle unit of privacy (E6, user level).
6. Fix the Saudi "agrees" line in `docs/Policy_Engine_Design.md`.
7. Add a destination attribute for cross border transfers (D2).
8. Replace the synthetic place catalog with LocationMind's real place list (polygons or H3 cells), and confirm the buffer size with counsel.
9. Make the Regional overrides tab machine readable and generate `policy.yaml` from it.
10. Connect to real data in Snowflake once access is granted.

---

## Waiting on others

| What | From | Notes |
| :-- | :-- | :-- |
| Papers on privacy and encryption techniques | Dr. Matsuo | Blocks items 1 to 4 |
| Weekly call with a West Coast contact | Dr. Matsuo to set up | Possibly Puneet; confirm |
| Feedback on the architecture board | LocationMind team | Shared on Slack with a note that it will be revised |
| Snowflake access to schemas and sample rows | Irys / LocationMind | Requested since June |
| Data license terms | Irys | Blank in the spec |
| Review of the restructured framework | Riki | Open since August |
| Legal confirmation for non Thailand columns | Counsel, if pursued | Gulf columns rest on public research |

---

## Open decisions

* Most restrictive wins vs explicit rule priorities.
* Can purpose ever loosen a decision, or only tighten (current behavior)?
* Audit record format for regulators and partners.
* Whether the framework gets an "obligations triggered" layer (DPO, breach notice, criminal liability) or a separate compliance checklist.
* Product of axes model vs a single ordered scale for practical use.
* Whether Group C stays a purchase time gate.
* Whether contractual constraints (F) stay their own set.
* Thailand k value, to be set with counsel.
* Exact place lists per location group and per country shifts.
* Place catalog buffer: 600 m for now. Needs a real number per group, and possibly per country.

---

## Action items from the Sept 28 meeting with Dr. Matsuo

* [ ] Share the architecture diagram with Watanabe san and the LocationMind team, noting it will be revised for more techniques. (Slack draft written; confirm posted.)
* [ ] Message Asazuma san to set up a call with Dr. Matsuo and LocationMind. Timing was unclear (this week Thu or Fri vs next week due to his trip); confirm.
* [x] Prepare the IAB section: regulation analysis across countries, the regional framework, the architecture. (Presented Oct 8.)
* [ ] Revise the diagram once the papers arrive.

---

## Timeline

| When | What |
| :-- | :-- |
| June 2026 | Phase I memo: classified the six output tables, flagged missing k, blank license, "anonymized" ad IDs |
| June 23 | 3rd CyberSMART meeting. Riki's 7 level framework introduced; memo mapped onto it |
| Summer | Factor inventory (26 factors), presented at a small LocationMind meeting; dependency analysis stage two |
| Aug 10 | Restructure approved: risk axes, disclosure, controls, contractual. Dependency graph v2 with A to F labels |
| Aug to Sept | Regional adaptation spreadsheet, five countries then eight; Thailand updated from Tilleke & Gibbins; feedback from Puneet and Deepanshu folded in (k = 5, location groups, Ad ID tab, application areas) |
| Sept | Who sees what proposal (audience matrix) at Dr. Matsuo's request |
| Sept 28 | Moved to technical side. Architecture board and design doc presented to Dr. Matsuo. Feedback: support many techniques |
| Oct 5 | Prototype v0.1 built: PDP, PEP, techniques, audit log, synthetic data, demo, tests. Demo speaking notes written |
| Oct 6 | CLAUDE.md, STATUS.md and docs folder added to move work into a repo and Claude Code |
| Oct 8 | IAB meeting in Washington D.C. Prototype v0.1 well received |
| Oct 19 | v0.2 plan written; API layer built |

---

## Session log

### Oct 19, 2026
* Done: wrote `docs/UI_Plan.md` (v0.2: FastAPI around the engine, React web app, mock data). Built step 1: `api/` with policy, scenarios, decide, request, matrix, audit, data and techniques endpoints; `scenarios.py` shared by demo, API and tests; `EnforcementPoint.run(trace=True)`; `Policy.with_overrides` (tighten only); tier names in policy.yaml; `serve.py`. 44 tests passing (22 engine, 22 API). Demo output unchanged.
* Decided: React over Streamlit. No approve button for grey areas. IAB (Oct 8) went well; no deadline for v0.2, present as work in progress. Docker image later.
* Also: added the `policyengenv` virtual environment to setup docs; Pratham ran the tests (44 pass) and the server locally; API docs grouped by tag.
* Step 2 done: `web/` React app (Vite, TypeScript 5.9, Tailwind). Request builder with demo scenario picker, the five attributes plus area, a what if panel (k, noise, epsilon), live decision banner, flow steps in board colors, a strictness ladder (Full to Blocked) showing where each rule capped, rule cards grouped by step with factor chips and citations, and the technique plan. Typed API responses for policy, audit and data summary; OpenAPI types generated into the web app. FastAPI serves the built app with client side route fallback. Checked in Chrome: Mecca case, Thailand grey area, unknown jurisdiction with a rejected override.
* Step 3 done: Run request button, row funnel, two synced maps (input vs released, suppressed cells dashed), released rows table, audit record with copy. City dataset behind `python serve.py --city` for a fuller map; default data unchanged. 45 tests (22 engine, 23 API). Checked in Chrome: Mecca counts (city data 6,492 rows to 585 cells to 296), Dubai Masked (hashed IDs, no hour), Mecca advertiser Blocked.
* Found: Masked output for the Dubai advertiser request includes device rows at a G3 place (Children's hospital, city dataset). `drop_sensitive_rows` only drops G1 and G2. Needs a policy call, logged under open decisions and known gaps.
* Fixed (Pratham's call, both options): `sensitive_groups` now G1 to G4, and a place catalog (`policy/place_catalog.yaml`, `engine/catalog.py`) so each row's location group comes from its coordinates. The PEP runs a `place_check` step that withholds rows whose own group gets a stricter decision, with rules in the audit record. Decisions for all seven scenarios unchanged; released numbers changed for scenario 4 (68 to 30 cells, temple rows withheld from an advertiser) and 5 (117 to 89 cells, hospital rows withheld). `sample_demo_output.txt` regenerated. 50 tests (27 engine, 23 API). Checked in Chrome: Dubai advertiser on city data now withholds 1,082 G1 and 529 G3 rows.
* Asked: why only five cities. They mirror Phase I (Saudi Arabia, UAE, Qatar) and JICA Thailand. US, EU, UK and Japan exist as jurisdictions only; offered to add synthetic cities for them if wanted.
* Added one city per remaining jurisdiction (New York, London, Paris, Tokyo) with mixed G1 to G5 places, from a separate random stream so the original rows are unchanged (checked by hash and a test). Six new scenarios (8 to 13) covering the US, UK, EU and Japan rules, the place check, and the first Full release. Area dropdown shows the country and offers the usual jurisdiction. 58 tests (29 engine, 29 API). Scenarios 1 to 7 output unchanged.
* Step 4 done: Who sees what page (tier by requester grid after all rules, compare with another jurisdiction or with the audience matrix alone, differing cells outlined, cells open the request builder) and Policy page (location groups, audience matrix, jurisdiction overrides with conditions in plain words, purpose rules, techniques and plans, place catalog, factor glossary, search and factor chip filters). New `/api/catalog`. 59 tests (29 engine, 30 API). Checked in Chrome.
* Noticed: Thailand shows Aggregate with review for every cell, including Lv 1 public, because `k_review: true` flags every Thailand request. Correct per policy, but worth raising once counsel sets the Thailand k.
* Next: step 5, audit log page, techniques page, present mode, Playwright smoke test, README update.

### Oct 6, 2026
* Added CLAUDE.md (full project context), STATUS.md, docs folder, .gitignore.
* Decided: code moves to a GitHub repo and Claude Code; docs and notes stay in the claude.ai CCI project; one session per task.
* Created the private GitHub repo heller1729/policy-engine and pushed v0.1 (22 tests passing).

### Oct 5, 2026
* Built prototype v0.1. Policy file hand written from the spreadsheet and proposal.
* Made techniques swappable through plans in policy.yaml, in response to Dr. Matsuo's feedback.
* 22 tests passing, including the exhaustive most restrictive wins check.
* Wrote demo speaking notes for presenting with the code editor open.

### Template for new entries
```
### <date>
* Done:
* Decided:
* Next:
* Blocked on:
```
