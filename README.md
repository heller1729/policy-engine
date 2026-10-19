# Privacy Policy Engine: Prototype v0.1

A working prototype of the privacy policy engine described in `Policy_Engine_Design.md` and the Whimsical architecture board. It takes a data request, checks it against the policy file, returns one decision with the reason, and applies that decision to the data before anything is released.

All data is synthetic. No real Irys or LocationMind data is used.

## Run it

```
python -m venv policyengenv
policyengenv\Scripts\Activate.ps1      # PowerShell; cmd: policyengenv\Scripts\activate.bat; Git Bash: source policyengenv/Scripts/activate
pip install -r requirements.txt
python demo.py              # seven scenarios, including the Mecca case
python demo.py --noise      # same, with the differential privacy module switched on
python -m pytest -q         # tests
python serve.py             # API on http://localhost:8000, interactive docs at /docs
python serve.py --city      # fuller synthetic dataset for the map (numbers differ from the demo)
```

One request from the command line:

```
python ask.py --tier 6 --requester commercial --jurisdiction saudi_arabia \
              --purpose advertising --group G1 --area Mecca
```

Add `--json` to print the full audit record. Every request is also appended to `out/audit.jsonl`.

## Web app

Needs Node 20 or newer. Build once, then `python serve.py` serves the app at http://localhost:8000.

```
cd web
npm install
npm run build
cd ..
python serve.py
```

For development, run `python serve.py` in one terminal and `npm run dev` inside `web` in another, then open http://localhost:5173 (it forwards `/api` to port 8000). After changing an API response model, run `npm run gen:api` inside `web` to regenerate the TypeScript types.

The request builder keeps the request in the URL, so a link such as `/?tier=5&requester=commercial&jurisdiction=thailand&purpose=advertising&group=G5&area=Bangkok` opens that exact case.

## How the code maps to the diagram

| Diagram | Code |
| :-- | :-- |
| Step 1, data request and its five attributes | `engine/models.py`, `Request` |
| Step 2, enforcement point (PEP) | `engine/pep.py`, `EnforcementPoint` |
| Step 3, decision point (PDP) reading the four rule sets | `engine/pdp.py`, `DecisionPoint` |
| Policy file and the four rule sets | `policy/policy.yaml` |
| Step 4, most restrictive wins | `DecisionPoint.decide`, step 5 in the code |
| Step 5, decision and audit log | `engine/models.py`, `engine/audit.py` |
| Step 6, transform steps | `engine/techniques.py` |
| Step 7, released output | return value of `EnforcementPoint.handle` |

## Decision logic

1. Location group rule. G1 and G2 block device level data (Lv 4 and above). G3 and G4 allow aggregates only.
2. Audience matrix, taken from the Who sees what proposal.
3. Jurisdiction overrides, taken from the Regional overrides and Ad ID tabs.
4. Purpose rules. Purpose can only tighten a decision, never loosen it.
5. Most restrictive wins, in the order Full, Masked, Aggregate, Blocked.
6. Grey areas (rules marked `review: true`) never go out as Full or Masked. They are lowered to Aggregate and flagged for human review.

Unknown values (a country with no rules, an unknown requester type, a tier outside 1 to 7) are Blocked. The engine fails safe.

## Privacy techniques are swappable

Each decision maps to a plan of technique modules in the policy file:

```yaml
techniques:
  plans:
    Masked: [hash_ids, drop_sensitive_rows, coarsen_time]
    Aggregate: [aggregate_h3, suppress_small_cells]
```

Changing which techniques run, or their order, is a policy edit. No engine code changes.

Current modules:

| Module | Factor | What it does |
| :-- | :-- | :-- |
| `hash_ids` | A2 | Salted HMAC of the device or ad ID |
| `drop_sensitive_rows` | B2, B3 | Removes device level rows at G1 and G2 places |
| `coarsen_time` | E2 | Keeps the date, drops the hour |
| `aggregate_h3` | E1, E4 | Unique device counts per H3 cell, date, home country |
| `suppress_small_cells` | E3 | Removes cells under k |
| `laplace_noise` | E5 | Laplace noise on counts, off by default, experimental |

To add a new technique (secure aggregation, encryption, synthetic data, and so on), write a class in `engine/techniques.py` with the `@register` decorator, then name it in a plan in `policy.yaml`. If a plan names a technique that is not registered, the engine raises an error instead of silently skipping it.

## Where the rule values come from

| Rule set | Source |
| :-- | :-- |
| Location groups G1 to G5 | Sensitive locations tab |
| Audience matrix | Who sees what proposal, first cut |
| Jurisdiction overrides | Regional overrides tab, Ad ID do's and don'ts tab |
| Purpose rules | Application areas tab, Ad ID tab |
| k = 5 | LocationMind standard, Regional overrides row E3 |

Each rule in the YAML carries a factor ID and a citation, and both are written to the audit log.

## Simplifications in v0.1

* The policy file is written by hand from the spreadsheet. The spreadsheet is written for people (prose cells), so generating the YAML automatically needs a machine readable version of the overrides tab first.
* Cross border transfer is folded into the Saudi localization rule. A separate destination attribute would let the engine handle transfers properly.
* Each row's location group is looked up from `policy/place_catalog.yaml` by distance to a sensitive place (600 m buffer). Rows whose own group would get a stricter decision are withheld before any technique runs. The catalog is synthetic; real use needs LocationMind's place list. `drop_sensitive_rows` still removes G1 to G4 rows by label as a backup.
* `laplace_noise` runs after suppression, so a noisy count can come out under k. The right order and the privacy budget need their own design against NIST SP 800-226.
* The data subject audience (own data via a rights request) is not modelled yet.

## Open questions

1. Is most restrictive wins the right conflict rule, or should some rules carry explicit priority?
2. Can purpose ever loosen a decision?
3. Which additional privacy and encryption techniques should be supported first?
4. What format should the audit record use for reporting to regulators or partners?
