# Privacy Policy Engine: Design

The framework built so far answers three questions: how sensitive a piece of location data is, where it is being used, and who is allowed to see it. The policy engine turns those answers into a single decision for each data request, and records the reason for that decision.

Architecture diagram: https://whimsical.com/privacy-policy-engine-architecture-Bv4NgN4RPaeXwPgt8gqTsz

## Design basis

The engine follows the attribute based access control model in NIST SP 800-162. That model splits the work into two parts.

| Component | Role |
| :-- | :-- |
| Policy Decision Point (PDP) | Reads the policy, evaluates the request against it, and returns a decision |
| Policy Enforcement Point (PEP) | Intercepts the request and applies the decision to the data before anything is released |

Keeping these apart means the rules and the data pipeline can change independently. A new country override is a policy edit, not a code change.

## Inputs

Every request carries five attributes.

| Attribute | Values | Comes from |
| :-- | :-- | :-- |
| Data tier | Lv 1 to 7 | Riki's 7 level Privacy Impact framework |
| Requester | Public, commercial, internal, government, research | Who sees what proposal |
| Jurisdiction | Thailand, US, Saudi Arabia, UAE, Qatar, EU, UK, Japan | Regional overrides tab |
| Purpose | Tourism, cybersecurity, advertising | Application areas tab |
| Location group | G1 to G5 | Sensitive locations tab |

## Output

The engine returns one of four decisions.

| Decision | Meaning | Maps to |
| :-- | :-- | :-- |
| Full | Data released as requested | Safe |
| Aggregate | Counts only, and only cells above k | Safe or Mask |
| Masked | Identifiers hashed, sensitive rows removed | Mask |
| Blocked | Nothing released | Out |

Each decision comes with an audit record: the rule that fired, the factor ID behind it (for example A2, E3, G1), and the legal or research citation.

## Policy as data

Rules live in a YAML policy file, not in code. The regional adaptation spreadsheet stays the human readable view, and the policy file is generated from it, so the two never drift apart.

The policy file holds four rule sets:

1. Location group rules (what each of G1 to G5 allows)
2. Jurisdiction overrides (country specific tightening, such as data localization or a higher k)
3. Audience matrix (data tier against requester)
4. Thresholds (k = 5 by default, overridable per country)

## Decision logic

1. Check the location group first. G1 and G2 block any device level output.
2. Look up the audience matrix for the data tier and requester.
3. Apply the jurisdiction override.
4. Apply the thresholds.
5. If rules disagree, the most restrictive one wins.
6. Write the audit record.

Because the most restrictive rule always wins, a missing or unclear rule can only make the result stricter. The engine fails safe.

## Handling grey areas

When a request falls between rules, for example a place whose sensitivity depends on the visitor's home country, the engine returns Aggregate only and flags the request for human review. A grey area never results in Full by default.

## Enforcement pipeline

Once a decision is made, the enforcement point applies these steps in order.

| Step | Action | Factors |
| :-- | :-- | :-- |
| Hash | Replace advertising IDs with salted hashes | A2 |
| Drop | Remove device level rows at G1 and G2 locations | B2, B3 |
| Aggregate | Roll up to counts per H3 cell and time bucket | E1, E4 |
| Suppress | Remove any cell with fewer than k devices | E3 |

## Worked example: Mecca visitors

| Attribute | Value |
| :-- | :-- |
| Data tier | Lv 6 |
| Requester | Commercial |
| Jurisdiction | Saudi Arabia |
| Purpose | Advertising |
| Location group | G1 |

Decision: Blocked. The G1 rule fires first and blocks device level output. The audience matrix and the Saudi override both agree, so there is no conflict to resolve. The audit record cites GDPR Article 9 and the Saudi PDPL.

## Prototype plan

The next step is a small Python prototype that:

1. Reads the policy file
2. Generates synthetic data shaped like the Phase I tables (device ID, home country, H3 cell, date)
3. Runs requests through the decision logic and the enforcement pipeline
4. Shows the Mecca case being blocked, with the reason printed from the audit record

Synthetic data means the prototype can be built and demonstrated without database access.

## Out of scope for now

| Item | Why it waits |
| :-- | :-- |
| Differential privacy | Needs its own design, checked against NIST SP 800-226 |
| Real data | Needs Snowflake access |
| Triggered obligations | DPO appointment and breach notification rules are still open |

## Open questions

1. Is most restrictive wins the right conflict rule, or should some rules carry explicit priority?
2. Can purpose ever loosen a decision, or only tighten it?
3. What format should the audit record use for reporting to regulators or partners?
