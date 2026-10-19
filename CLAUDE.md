# CLAUDE.md: Geolocation Privacy Policy Engine

This file is the standing context for the project. Read it fully at the start of every session, then read `STATUS.md` for where things stand right now. Detailed source documents are in `docs/`.

---

## 1. Quick facts

| Item | Value |
| :-- | :-- |
| Owner | Pratham Jangra, Graduate Research Assistant, MS Computer Science (thesis), Virginia Tech. Never call him "Parth". GitHub: heller1729 |
| Program | NSF funded CyberSMART project, Commonwealth Cyber Initiative (CCI), Virginia Tech |
| Goal | A geolocation privacy standard, aligned with NIST SP 800-226, that governs how a large global mobility dataset can be used without reidentifying people |
| This repo | Python prototype of the rule based privacy policy engine that enforces the standard |
| Data | Irys movement data (Android advertising IDs). Lives in Snowflake. No access yet, so the prototype uses synthetic data only |
| Stage | Prototype v0.1 working and shown at the IAB meeting (Oct 8, 2026). v0.2 in progress: API plus web UI on mock data, plan in `docs/UI_Plan.md`. Technique selection (advisor feedback) comes after |

---

## 2. People

| Person | Org | Role and what they contributed |
| :-- | :-- | :-- |
| Dr. Shin'ichiro Matsuo | Virginia Tech | Primary advisor. Sets direction. Moved Pratham to the technical side (design and code) in Sept 2026. Asked for the "who sees what" matrix. Wants the engine to support many privacy enhancing and encryption techniques. Presents at the IAB meeting in Washington D.C. |
| Dr. Eric Burger | Virginia Tech | Advisor, security side. Pointed to OGC related work; judged relevant at project level, no spreadsheet change needed |
| Riki Ota | LocationMind | Author of the official 7 level Privacy Impact framework (sheet 1 sensitivity levels, sheet 2 provision rules). His framework is the source of truth; everything maps onto it |
| Puneet Jeph | LocationMind | Data processing. Said subject control (Group C) is fixed at collection, so it is checked once at purchase. Proposed the Red / Yellow / Green grouping of sensitive locations (credit him for it). Gave k = 5 as LocationMind's real threshold. Possibly the "West Coast" contact for a weekly call (unconfirmed) |
| Deepanshu Agarwal | LocationMind | Raised temporal aggregation (hourly buckets, now E2). Shared the vendor contract terms (now F1 to F3). Asked for the Ad ID do's and don'ts for the dev team |
| Hiroyuki Watanabe | LocationMind | Raised cultural context: the same place is not equally sensitive for everyone (Mecca for a pilgrim vs a shrine for a tourist). Now factor B4 |
| Taro Asazuma | LocationMind | Organizes meetings. Contact for scheduling calls with the LocationMind team |
| Daizo Nagahashi | LocationMind | Attends the LocationMind privacy group meetings |
| Naoki Kiritani, Ryosuke Shibasaki | LocationMind | Representative and CTO (leadership, attend larger meetings) |
| Nikhil Gupta | Irys | Data team. Raised external matching (the Walmart example: a buyer joins our data with theirs) and purpose of use |
| Ariyo Noibi, Ken Ishida | Irys | Data team |

Tone with collaborators: frame contributions as building on their work, never as a competing framework. Riki's framework is the official one.

---

## 3. The data

### Source

* Irys movement data, December 2025, used in the **Global South Phase I** project (Saudi Arabia, UAE, Qatar). LocationMind also runs a **JICA Thailand** project on similar data.
* Device type is the Android Advertising ID (AAID). It is persistent and pseudonymous, not anonymous, even though the spec calls it "anonymized".
* The data license field is blank in the spec (v1.0 and v1.1). Still unresolved.

### Phase I tables and their classification

| Table | What it holds | Riki level | Risk and handling |
| :-- | :-- | :-- | :-- |
| PROD_MOVEMENT_EVENTS (source) | Every event: start and end coordinates to about 1 m, centroid, dispersion radius, start time, duration, timezone, speed, provider, device ID | Lv 7 | Critical. Pipeline access only |
| DEVICE_VISIT_HISTORY_2025_12 | Device ID with countries visited, visit counts, hours per country, home country | Lv 4 to 5 | Critical. Behavioral fingerprint. No device level exposure |
| Mecca visitors (mislabelled ME_STAY_POPULATION_202512 in the spec) | Device ID, home country, date of visit to the Mecca region | Lv 6, touching 7 | Critical. Religion plus device plus date. Serve only aggregated counts above k |
| COUNTRY_OD_2025_12 | Daily country to country movement and unique device counts | Lv 1 to 2 | Low to moderate. Rare OD pairs give small counts |
| COUNTRY_HOD_2025_12 | Same plus home country | Lv 2 | Moderate. Extra dimension thins cells |
| DOMESTIC_OD_AGGREGATION_202512 | Admin area to admin area inside SAU, UAE, QAT, with home country | Lv 2 | Moderate. Small foreign device cells |
| ME_STAY_POPULATION_202512 | Hourly unique devices per H3 level 7 cell (about 500 m) by home country | Lv 2 to 3 | Moderate. One foreign device in one cell at one hour is a person |

Key point from the Phase I memo: a minimum count threshold is what keeps an aggregate table at its intended level. A count of one is a person.

---

## 4. Riki's 7 level Privacy Impact framework

| Level | Meaning |
| :-- | :-- |
| Lv 1 to 3 | Aggregated statistics, individuals not distinguishable (wide area, regional, behavioral trends). Non personal data, mostly outside GDPR |
| Lv 4 | Pseudonymous ID behavioral logs |
| Lv 5 | Continuous trajectory; home and workplace inferable. Likely personal data |
| Lv 6 | Sensitive attributes inferable (health, religion, children). GDPR Art 9 special category. Religious facility visits are his example |
| Lv 7 | Direct identifier joined to location. External sharing prohibited |

Sheet 2 (provision rules): each use is prohibited, allowed, or case by case. Proposes a 125 m mesh with small count suppression, k of 2 or less suppressed, under 10 unusable, and differential privacy "to be considered". LocationMind's working standard is **k = 5**, and that is what the project uses.

Riki's three application areas: tourism (mostly Lv 1 to 3, lowest risk), cybersecurity (Lv 3 to 6), advertising (Lv 4 to 7, highest risk because it is device level).

---

## 5. Privacy impact factor framework (v2)

Built in stages: a 26 factor inventory, then a dependency analysis, then a restructure approved at the Aug 10 meeting. Labels are A to F, one prefix per dimension. Factor IDs appear in the policy file and the audit log.

### Risk axes (inherited conditions)

| ID | Factor | Notes |
| :-- | :-- | :-- |
| A1 | Direct identifier present | Lv 7 trigger |
| A2 | Persistent device or ad ID | Stable across time; acts as an identifier once joined. One of the two busiest nodes |
| A3 | Rotating or short lived ID | Inherited control, set at collection |
| A4 | Quasi identifiers combined | Gender plus ZIP plus date of birth identifies most people |
| A5 | Internal reidentification key exists | Separates Lv 2 from Lv 3 |
| A6 | External matching possible | Nikhil's Walmart case. The other busiest node |
| B1 | Special category content | Health, religion, beliefs, biometrics |
| B2 | Sensitive attribute inferable | Hospital implies health, Mecca implies religion |
| B3 | Sensitive facility visit | The concrete location case |
| B4 | Cultural or contextual sensitivity | Watanabe. Treated as a risk unless documented otherwise |
| B5 | Home or workplace inferable | From continuous location |
| C1 | No consent | Lawful basis question |
| C2 | No transparency or notice | |
| C3 | Inference without the subject's knowledge | |
| C4 | No objection or withdrawal | Upgraded to mandatory |

Group C is fixed at collection by the vendor, so it is a due diligence check at purchase, not scored per output (Puneet).

### Disclosure

| ID | Factor | Notes |
| :-- | :-- | :-- |
| D1 | Third party disclosure | Enables A6 |
| D2 | Cross border transfer | Optional on paper, almost always evaluated |
| D3 | Purpose or context of use | Governing factor (was D9 in v1) |

### Controls

| ID | Factor | Notes |
| :-- | :-- | :-- |
| E1 | Spatial aggregation | Was D3 |
| E2 | Temporal aggregation | Deepanshu. Was D4 |
| E3 | k anonymity threshold | k = 5. Was D5 |
| E4 | Statistical aggregation | Was D6 |
| E5 | Differential privacy | Reference NIST SP 800-226. Was D7 |
| E6 | Unit of privacy (event vs user) | Governs E1 to E4. Was D8 |

### Contractual constraints

| ID | Constraint |
| :-- | :-- |
| F1 | No identification of individuals (was L1) |
| F2 | No resale (was L2) |
| F3 | Deletion and subscription terms (was L3) |

### Main findings

* Privacy impact behaves like a product, not a sum: roughly identifiability times sensitivity times lack of subject control, reduced by controls and widened by disclosure. This is why a single 1 to 7 scale kept straining.
* Identifiability is the spine. Cut it (E3, E4, E5) and most downstream harm collapses.
* Disclosure is its own axis. Riki's sheet 1 maps to the risk axes; his sheet 2 maps to disclosure and controls.
* Mandatory vs optional tracks universal vs law specific. "Optional" means it depends on which law applies, not that it can be skipped.

Dependency graph v2 (Whimsical): https://whimsical.com/privacy-impact-factors-dependency-graph-v2-MLWLTewt62o3mjoyhZjDV8 . Node colors: red risk, green control, blue governing, yellow inherited, silver contractual and data utility. Lines: grey presupposition, orange amplification, red disclosure exposure, green dotted control cutting a risk, purple trade off with data utility, blue contractual binding.

---

## 6. Regional adaptation layer

File: `docs/Regional_Adaptation_Layer.xlsx`. Eight tabs: How to use, Sources and authorities, Country summary, Regional overrides, Thailand detail, Ad ID do's and don'ts, Application areas, Sensitive locations.

Approach: one general framework, each country records only where its law differs ("override on baseline"). An override can do only four things: reclassify a factor, flip mandatory and optional, tighten a control, restrict a disclosure. Blank cells were replaced with "follows baseline".

Confidence: Thailand is backed by a Tilleke & Gibbins legal review. All other columns are researched from public law and secondary sources, not verified by counsel. Not legal advice.

| Jurisdiction | Law | What matters for the engine |
| :-- | :-- | :-- |
| Thailand | PDPA B.E. 2562 (2019) | Ad and device IDs are personal data. Consent is the primary lawful basis. Extraterritorial via monitoring people in Thailand (answers the tourist question). No adequacy list, so SCCs, BCRs or consent for every transfer; strict intra group rules (Mar 2024). Criminal liability up to 1 year, admin fines up to THB 5M, civil damages up to 2x. DPO likely required. 72 hour breach notice. k to be set with counsel |
| United States | CCPA/CPRA plus 20+ state laws | Ad ID is personal information. Precise geolocation is sensitive. Several states ban geofencing near healthcare or selling precise location. No GDPR style transfer limits |
| Saudi Arabia | PDPL (enforced Sep 2024) | Explicitly covers visitors and tourists. Strictest on transfers: localization for sensitive and personal data, adequacy or SCCs plus risk assessment, national interest test |
| UAE | Federal Decree Law 45 of 2021 | Ad ID is personal data. Explicit consent. Adequacy plus safeguards, list unpublished. Free zones (DIFC, ADGM) have own rules |
| Qatar | PDPPL, Law 13 of 2016 | Oldest, lightest. No extraterritorial reach. Transfers not restricted |
| EU | GDPR | Online identifiers are personal data (Recital 30). Art 9 for religion and health; CJEU C-252/21 extends this to inferred data. Adequacy, SCCs or BCRs |
| UK | UK GDPR, DPA 2018, Data (Use and Access) Act 2025 | Same base as EU, diverging: IDTA instead of EU SCCs, "not materially lower" adequacy test, extra recognised legitimate interests. EU adequacy for the UK renewed Dec 2025 to 2031 |
| Japan | APPI | Ad ID counts once the recipient can link it ("personally referable"). Consent for special care data and third party provision. No localization; EEA and UK on the equivalent list. 2026 amendment cycle |

Open question from Thailand: DPO, breach notice and criminal exposure are triggered obligations, a different layer from sensitivity. Undecided whether the framework gets an "obligations triggered" layer.

### Sensitive location groups

Started as Puneet's Red / Yellow / Green idea, refined into five groups, each with its own reason and basis.

| Group | Meaning | Examples | Handling | Basis |
| :-- | :-- | :-- | :-- | :-- |
| G1 Directly revealing | Being there states a protected fact | Places of worship (Mecca), hospitals, clinics | No device level data | GDPR Art 9(1); PDPA; APPI; Saudi PDPL |
| G2 Revealing by inference | Lets you infer a protected fact with confidence | Addiction and reproductive clinics, religious schools, party or union offices, protest sites | Treat like G1 for device level | CJEU C-252/21 (2023), C-21/23 Lindenapotheke (2024) |
| G3 Vulnerable population | Who is there, mostly children | Schools, childcare, shelters, children's hospitals | Aggregate only, no targeting | GDPR Art 8, Recital 38; UK AADC; COPPA; UN CRC |
| G4 Security sensitive | State security, not personal privacy | Military bases, government and defence sites, critical infrastructure | Aggregate only or exclude | Strava heatmap 2018 |
| G5 Everyday | Normal case | Shops, malls, stations, airports, parks | General rules, k = 5 | None |

Country shift: in Saudi Arabia and Thailand, G2 religious cases are treated as G1. Exact place lists still need LocationMind's real location list and legal confirmation.

### Ad ID do's and don'ts (dev team)

* Never ship a raw ad ID outside. Hash with a salted hash and rotate the salt.
* Aggregate to counts with k = 5 is the safe default.
* Never link an ad ID to a religious or medical site (the Mecca case).
* Thailand: device level extraction and joining to home or work are No. Gulf: grey area, internal only.
* Respect contract deletion terms. Cross border transfer of ad ID linked data is a grey area everywhere.

---

## 7. Who sees what (audience matrix)

| Data tier | Public | Commercial | Internal | Government | Research |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Area statistics (Lv 1 to 2) | Full | Full | Full | Full | Full |
| Behavioral trends (Lv 3) | Aggregate | Aggregate | Full | Full | Aggregate |
| Device logs (Lv 4 to 5) | Blocked | Masked | Full | Masked | Masked |
| Sensitive inference (Lv 6) | Blocked | Blocked | Masked | Aggregate | Aggregate |
| Direct identifiers (Lv 7) | Blocked | Blocked | Full | Blocked | Blocked |

Full = as is. Masked = device rows with IDs hashed and sensitive rows removed. Aggregate = counts above k only. Blocked = nothing. Maps to the older Safe / Mask / Out logic. Internal access to the bottom two rows is need to know. The data subject audience (own data via a rights request) is listed but not modelled yet.

---

## 8. Architecture

Board: https://whimsical.com/privacy-policy-engine-architecture-Bv4NgN4RPaeXwPgt8gqTsz . Design doc: `docs/Policy_Engine_Design.md`.

Based on attribute based access control, NIST SP 800-162: a Policy Decision Point (PDP) evaluates rules; a Policy Enforcement Point (PEP) intercepts requests and applies the decision. Separating them lets rules and pipeline change independently.

Flow (the board's Step 1 to Step 7):

1. Data request comes in with five attributes: data tier, requester, jurisdiction, purpose, location group.
2. PEP stops it and asks for a decision.
3. PDP reads the four rule sets from the policy file (location group rules, jurisdiction overrides, audience matrix, thresholds).
4. If rules disagree, the most restrictive wins.
5. One decision (Full, Masked, Aggregate, Blocked) goes back to the PEP; the audit log records rule, factor ID, citation.
6. PEP runs the techniques (hash, drop, aggregate, suppress).
7. What survives is released.

Board colors: blue input and output, gray policy, pink decide, orange enforcement point, mint transform steps, yellow planned later. The Whimsical account is on the free plan and hit its object limit once; do not run `auto_layout` on boards (it detaches nodes from containers).

### Advisor feedback (Sept 28, 2026 meeting)

Matsuo praised the architecture and asked that it be flexible enough to select among various privacy enhancing and encryption techniques, not only differential privacy. He will send papers on techniques. The diagram should be revised once those arrive. The prototype already makes techniques swappable; the next design step is how the engine chooses between them.

---

## 9. The prototype (this repo)

### Layout

| Path | What it is |
| :-- | :-- |
| `policy/policy.yaml` | All rules. Written by hand from the spreadsheet and proposal |
| `engine/models.py` | `Request`, `RuleHit`, `Decision` dataclasses |
| `engine/policy.py` | Loads and validates the policy. Rejects unknown decision names |
| `engine/pdp.py` | `DecisionPoint.decide()`. Steps commented to match the board |
| `engine/pep.py` | `EnforcementPoint.handle()`. Scopes data by area, runs the plan, logs rows in and out |
| `engine/techniques.py` | Technique classes plus `REGISTRY` and `@register` |
| `engine/audit.py` | Writes one JSON line per request to `out/audit.jsonl` |
| `synthetic.py` | Synthetic visit data |
| `scenarios.py` | The seven demo scenarios with expected outcomes, shared by demo, API and tests |
| `demo.py` | Runs the scenarios. `--noise` turns on Laplace noise, `--only N` runs one |
| `ask.py` | Single request from the command line, `--json` for the audit record |
| `api/` | FastAPI app (`main.py`, `schemas.py`, `state.py`, `routes/`). Serves `web/dist` when built |
| `serve.py` | Starts the API on http://localhost:8000 |
| `tests/test_engine.py` | 22 engine tests |
| `tests/test_api.py` | 22 API tests |
| `docs/` | Design doc, notes, proposal, spreadsheet, memo, inventory, legend |

Run (inside the `policyengenv` virtual environment, which is git ignored):

```
python -m venv policyengenv
policyengenv\Scripts\Activate.ps1      # PowerShell; cmd: policyengenv\Scripts\activate.bat; Git Bash: source policyengenv/Scripts/activate
pip install -r requirements.txt
python demo.py
python -m pytest -q
python serve.py              # API, docs at http://localhost:8000/docs
python ask.py --tier 6 --requester commercial --jurisdiction saudi_arabia --purpose advertising --group G1 --area Mecca
```

Stack: Python 3.11+, FastAPI, PyYAML, h3 (v4 API: `latlng_to_cell`, `cell_to_parent`, `get_resolution`), pytest. Rows are plain lists of dicts, no pandas.

### Decision logic (pdp.py)

* Strictness order: Full < Masked < Aggregate < Blocked. Masked is less strict than Aggregate because it still returns per device rows.
* Device level means tier 4 and above (`device_level_from_tier`).
* Validate first. Unknown jurisdiction, requester, purpose, location group, or tier outside 1 to 7 returns Blocked with reason `UNKNOWN_ATTRIBUTE`.
* Apply `group_shift` for the jurisdiction (Saudi and Thailand: G2 becomes G1).
* Step 1 location group: `device_level` cap if tier >= 4, else `aggregate` cap.
* Step 2 audience matrix band for the tier and requester.
* Step 3 jurisdiction rules whose `when` matches.
* Step 4 purpose rules whose `when` matches. Purpose only tightens.
* k from the jurisdiction (default 5). `k_review: true` flags review.
* Step 5 most restrictive cap wins. Every rule at that cap is a deciding rule.
* Grey area: if any hit has `review: true`, Full or Masked becomes Aggregate and the request is flagged for human review.
* Plan: Blocked runs nothing. Tiers 1 to 3 always run `aggregate_product_plan` (aggregate products are counts above k even when Full). Tier 4+ runs `techniques.plans[outcome]`. Enabled optional modules are appended when they apply to the effective decision.

### Rule format (policy.yaml)

```yaml
- id: TH_ADID_DEVICE_LEVEL          # unique, UPPER_SNAKE, prefixed by jurisdiction or purpose
  when: {tier_min: 4, requester_not: [internal]}
  cap: Aggregate                    # one of the four decisions
  review: true                      # optional, marks a grey area
  factor: A2                        # factor or group ID from section 5
  citation: "Law or source, short"
```

`when` keys: `tier_min`, `tier_max`, `requester_in`, `requester_not`, `purpose_in`, `group_in`. All listed keys must match. Rules can only tighten.

Current jurisdiction rules: `TH_ADID_DEVICE_LEVEL` (Aggregate, review), `US_SENSITIVE_GEOFENCE_ADS` (Blocked), `SA_LOCALIZATION` (Aggregate), `EU_ART9_DEVICE_LEVEL` and `UK_ART9_DEVICE_LEVEL` (Blocked), `JP_THIRD_PARTY_PROVISION` (Aggregate, review). UAE and Qatar have none. Purpose rules: `ADS_NO_VULNERABLE_TARGETING` (G3), `ADS_NO_SECURITY_SITES` (G4), `ADS_NO_RED_LOCATION_TARGETING` (G1, G2), all Blocked.

### Techniques (techniques.py)

| Name | Factor | Behavior |
| :-- | :-- | :-- |
| `hash_ids` | A2 | HMAC SHA256 of device_id with salt from env `POLICY_ENGINE_SALT` (fallback demo salt), output `h_` plus 16 hex chars |
| `drop_sensitive_rows` | B2, B3 | Removes rows whose place_group is in `sensitive_groups` (G1, G2) |
| `coarsen_time` | E2 | Drops `hour` |
| `aggregate_h3` | E1, E4 | Unique devices per (H3 cell at configured resolution, date, home_country) |
| `suppress_small_cells` | E3 | Removes cells with unique_devices < k |
| `laplace_noise` | E5 | Laplace noise on counts, epsilon from policy. Off by default |

Plans: Masked = hash_ids, drop_sensitive_rows, coarsen_time. Aggregate = aggregate_h3, suppress_small_cells.

To add a technique: subclass `Technique`, set `name`, `factor`, `description`, implement `apply(rows, ctx)` returning new rows (do not mutate input), decorate with `@register`, then name it in a plan or under `optional` in policy.yaml. Context `ctx` carries `k`, `h3_resolution`, `salt`, `seed`. A plan naming an unregistered technique raises `KeyError` on purpose; never skip silently.

### Synthetic data (synthetic.py)

Columns: `device_id` (UUID v4 format, like an AAID), `home_country` (ISO3), `area` (Mecca, Riyadh, Dubai, Doha, Bangkok), `place`, `place_group` (G1 to G5), `lat`, `lng`, `h3_cell` (resolution 9), `date` (2025-12-01 to 07), `hour`. Defaults: 3000 devices, seed 42, 1 to 5 visits each. Each area has at least one G5 place and most have a G1 place; Riyadh also has G3 and G4. Rare nationalities (ISL, FJI, NOR, CHL, EST, URY) exist so suppression is visible.

### Demo scenarios and expected results

| # | Request | Result | Why |
| :-- | :-- | :-- | :-- |
| 1 | Lv 6, commercial, saudi_arabia, advertising, G1, Mecca | Blocked | LOC_G1, audience matrix, ADS_NO_RED_LOCATION_TARGETING. SA_LOCALIZATION alone would be Aggregate |
| 2 | Lv 2, government, saudi_arabia, tourism, G1, Mecca | Aggregate | G1 allows counts. About 2373 rows to 65 cells to 56 after k |
| 3 | Lv 5, commercial, uae, advertising, G5, Dubai | Masked | Matrix. Drop step removes hospital rows (about 1702 to 854) |
| 4 | Lv 5, commercial, thailand, advertising, G5, Bangkok | Aggregate, review | TH_ADID_DEVICE_LEVEL |
| 5 | Lv 7, internal, saudi_arabia, cybersecurity, G4, Riyadh | Aggregate | G4 caps even internal |
| 6 | Lv 3, research, qatar, tourism, G5, Doha | Aggregate | Matrix |
| 7 | Lv 2, government, brazil, tourism, G5 | Blocked | Unknown jurisdiction, fail safe |

### Tests

22 tests: each scenario's decision, grey area handling, US and ads rules, Saudi group shift, unknown inputs, an exhaustive check over all 4,200 attribute combinations that the outcome is never looser than the strictest rule hit, suppression, masked output has no raw IDs or sensitive rows or hour, blocked releases nothing, audit record carries the reason, noise switches on from policy only, policy validation, unregistered technique error. Run tests before every commit. Keep the exhaustive test.

API tests (`test_api.py`): every scenario through `/api/request`, `/api/decide` does not write the audit log, unknown attributes come back as Blocked not an HTTP error, the Mecca funnel 2373 to 65 to 56, masked responses have no raw IDs, `/api/matrix` agrees with the engine, overrides can raise k or add noise but never loosen, audit filter and export, data summary has no device IDs.

Overrides (`Policy.with_overrides`): `noise`, `epsilon`, `k_min`. They only tighten and are recorded as `policy_overrides` in the audit record. `/api/decide` is for live preview and is not audited; `/api/request` is.

---

## 10. Invariants (do not break)

* Most restrictive wins. A rule can only tighten.
* Unknown or missing input fails safe to Blocked.
* Grey areas never release Full or Masked.
* Every rule has an id, a factor, and a citation, and they reach the audit log.
* Raw device IDs never leave in anything but Full for internal at device level.
* Techniques are chosen in policy, not hardcoded in the engine.
* No real data in this repo, in tests, or in any chat. Synthetic only until Snowflake access is formally granted, and then real data stays where access lives.

---

## 11. Known gaps

* policy.yaml is hand written; the spreadsheet cells are prose, so no generator yet.
* Cross border transfer is folded into the Saudi rule; there is no destination attribute.
* Location group is supplied by the request; there is no place catalog lookup.
* `laplace_noise` runs after suppression, so noisy counts can fall under k. Order and privacy budget need design against NIST SP 800-226. Unit of privacy (E6, user level) is not handled.
* Data subject audience not modelled.
* Technique choice is per decision only; not yet per jurisdiction, requester, or purpose.
* `docs/Policy_Engine_Design.md` says the Saudi override "agrees" with Blocked in the Mecca case; in code SA_LOCALIZATION alone caps at Aggregate. Fix the doc wording.

---

## 12. Conventions

### Code

* Small, readable modules. Minimal comments. No comments that read as AI generated.
* New rule: add to policy.yaml with id, factor, citation, then add a test.
* New technique: register it, add it to a plan, add a test for its output.
* Keep `demo.py` scenarios passing with the expected results above, or update this file if a result changes on purpose.
* After a work session: update `STATUS.md` (what was done, decided, next) and commit.

### Writing (docs, notes, messages)

* Never use em dashes or any dashes in prose. Write "device level", "cross border", "k anonymity".
* Plain, human, student sounding. No AI sounding phrasing, no author to reader notes ("be honest about these"), no tidy summarizing conclusions.
* Proposals, docs, spreadsheets: neutral third person. Speaking notes: natural first person, speakable as is, short sentences.
* Slack: short. Save as a draft for review before sending. Channel `C0B4LC8L007` (#location-privacy).
* Credit ideas to whoever raised them.
* Markdown for documents Pratham converts himself.

### Tools

* Whimsical workspace "CCI". Boards: dependency graph v2 (`MLWLTewt62o3mjoyhZjDV8`, clean copy `2J9JuNtNwFHQLWsTet38qL`), architecture (`Bv4NgN4RPaeXwPgt8gqTsz`). Create once; do not auto layout. Free plan object limit applies.
* Graphviz used for parallel renders of the dependency graph.

---

## 13. Docs index (`docs/`)

| File | What it is |
| :-- | :-- |
| Policy_Engine_Design.md | One page design doc |
| Policy_Engine_Design_Notes.md | Speaking notes for the design doc |
| Architecture_Diagram_Notes.md | Speaking notes walking the board Step 1 to 7 |
| Prototype_Demo_Notes.md | Speaking notes for a live code demo |
| Policy_Engine_Legend.png | Legend image for the board |
| Who_Sees_What_Proposal.md | Audience matrix proposal |
| Regional_Adaptation_Layer.xlsx | Eight jurisdiction spreadsheet |
| Phase1_Sensitivity_and_Reidentification_Memo.md | Phase I table classification memo |
| Privacy_Impact_Factors_Inventory.md | Original factor inventory (v1 labels) |

---

## 14. Glossary

| Term | Meaning |
| :-- | :-- |
| AAID | Android Advertising ID, persistent and pseudonymous |
| ABAC | Attribute based access control (NIST SP 800-162) |
| PDP / PEP | Policy Decision Point / Policy Enforcement Point |
| H3 | Uber's hexagonal grid. Level 7 cells are about 500 m |
| k | Minimum unique devices per released cell. 5 by default |
| OD / HOD | Origin destination / home country origin destination |
| SCCs, BCRs, IDTA | Transfer mechanisms (standard contractual clauses, binding corporate rules, UK international data transfer agreement) |
| DPO | Data Protection Officer |
| IAB | Industry Advisory Board meeting, Washington D.C. |
| Safe / Mask / Out | Earlier handling categories; map to Full or Aggregate / Masked / Blocked |
