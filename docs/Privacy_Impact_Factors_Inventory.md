# Privacy Impact Factors: Inventory

**Author:** Pratham Jangra
**Purpose:** Stage one of the dependency analysis. This is the factor set, the nodes of the graph. Dependencies, trade-offs, and the mandatory versus optional split come next, once this list is agreed.
**Sources:** Riki Ota's 7 Privacy Impact Levels framework, both sheets (sheet 1, the sensitivity levels; sheet 2, the data-provision rules), plus a few factors raised in the June 23 meeting (marked).

## How to read this

Each factor is tagged three ways.

- **Direction:** whether it *raises* privacy impact (a risk factor, R) or *lowers* it (a control, C). This is what makes the trade-offs in stage two legible, since a trade-off is usually a control set against a risk or against data utility.
- **Mandatory or optional (draft):** a first pass at the mandatory versus optional split, meaning whether the factor must be evaluated for any data handling or only applies in some cases. These are starting positions for discussion, not conclusions.
- **Source:** where the factor came from, so any single one can be traced back. Most come from Riki's framework (a sensitivity level or the boundary slide in sheet 1, or a provision rule in sheet 2). Some were raised in the June 23 meeting, attributed to the person who raised them. The grouping and the risk versus control tagging are mine. Where my earlier memo and Riki's sheet 2 arrived at the same control independently, both are cited.

Factors are grouped by the axis they sit on. Riki named three evaluation axes. I have kept those three and added a fourth group for the handling and transformation controls, because several real factors (aggregation, threshold, persistence) are properties of how the data is processed rather than of the data itself, and they are the levers the standard actually pulls. This fourth group lines up with Riki's sheet 2, which is his provision-and-handling layer, so the two efforts meet here rather than duplicate.

---

## Group A: Identifiability
How strongly the data links to a specific individual.

| # | Factor | Direction | Mand/Opt (draft) | Source | Note |
| :-- | :-- | :-- | :-- | :-- | :-- |
| A1 | Direct identifier present (name, membership ID) | R | Mandatory | Riki, Level 7 | The Level 7 trigger. Strongest link. |
| A2 | Persistent device or advertising ID | R | Mandatory | My memo ("anonymized" AAID) | Pseudonymous but stable across time, so it behaves like an identifier once joined. |
| A3 | Rotating or short-lived ID | C | Optional | Derived (inverse of A2) | Weakens linkage over time. A control choice at collection. |
| A4 | Quasi-identifiers in combination | R | Mandatory | Riki, boundary slide | Gender plus ZIP plus date of birth uniquely identifies most people. The reason "no direct ID" is not enough. |
| A5 | Internal re-identification key exists | R | Mandatory | Riki, Levels 2 to 3 | Separates Level 2 from Level 3. Pseudonymized data that the holder can still re-link. |
| A6 | External matching / linkage possible | R | Mandatory | Riki, Levels 3 to 4 + Nikhil (meeting) | Recipient joins our data with other data to re-identify. Nikhil's Walmart example. |

## Group B: Sensitivity
How sensitive the content is, or what sensitive attribute can be inferred.

| # | Factor | Direction | Mand/Opt (draft) | Source | Note |
| :-- | :-- | :-- | :-- | :-- | :-- |
| B1 | Special-category content (health, religion, beliefs, biometrics) | R | Mandatory | Riki, Level 7 (GDPR Art. 9) | The Level 7 sensitivity trigger. |
| B2 | Sensitive attribute inferable from behavior | R | Mandatory | Riki, Level 6 | You do not hold the sensitive fact, you can deduce it (hospital visits imply health, Mecca implies religion). |
| B3 | Sensitive-facility visit (religious, medical, etc.) | R | Mandatory | Riki, Level 6 example | The concrete location case. But see B4. |
| B4 | Contextual / cultural sensitivity of a place | R or C | Optional | Watanabe (meeting) | The same place is not equally sensitive for everyone. Mecca for a pilgrim versus a shrine for a Japanese tourist. Sensitivity is conditional on the visitor's home country and culture, not fixed to the place. Conditions B3. |
| B5 | Home or workplace inferable | R | Mandatory | Riki, Level 5 | Continuous location reveals where someone lives and works. |

## Group C: Lack of subject control
How far the individual cannot engage, consent, or object.

| # | Factor | Direction | Mand/Opt (draft) | Source | Note |
| :-- | :-- | :-- | :-- | :-- | :-- |
| C1 | No consent obtained | R | Mandatory | Riki, "lack of subject control" axis | Foundational. Lawful basis question (GDPR Article 6). |
| C2 | No transparency or notice to the individual | R | Mandatory | Riki, Level 5 (Arts. 13/14) | The person does not know it is happening. |
| C3 | Inference without the subject's knowledge | R | Mandatory | Riki, Level 6 + subject-control axis | Profiling the person could not see or object to. Ties to B2 and to DPIA (Arts. 22, 35). |
| C4 | No mechanism to object or withdraw | R | Optional | Riki, subject-control axis | Whether rights (access, deletion, objection) can actually be exercised. |

## Group D: Exposure, disclosure, and handling controls
Properties of how the data is processed, transferred, and reached. These are the levers the standard pulls, and where most trade-offs live. Riki's sheet 2 (the data-provision rules) covers much of this same ground, so several of these factors are now backed by both my memo and his sheet.

| # | Factor | Direction | Mand/Opt (draft) | Source | Note |
| :-- | :-- | :-- | :-- | :-- | :-- |
| D1 | Third-party disclosure | R | Mandatory | Riki, Level 4 + sheet 2 (provision rules) | Data leaves the holder's control. Sheet 2 is organized entirely around provision (prohibited / allowed / case-by-case), which treats disclosure as its own axis, separate from the sensitivity ladder in sheet 1. |
| D2 | Cross-border transfer | R | Optional | Riki, Level 4 | Triggers SCC / adequacy / BCR. Law-specific, so likely optional in a universal model. |
| D3 | Spatial aggregation granularity | C | Mandatory | Riki, Levels 1 to 3 + sheet 2 (125m mesh rule) | Coarser mesh lowers impact. Sheet 2 gives a concrete rule (125m mesh with small-count suppression). |
| D4 | Temporal aggregation granularity | C | Mandatory | Deepanshu (meeting) | Hourly buckets instead of exact timestamps. You can say "in this area this hour" but not the precise minute. A real mitigation. |
| D5 | Minimum count / k-anonymity threshold | C | Mandatory | My memo + Riki sheet 2 (k less than or equal to 2 suppressed, k under 10 unusable) | Suppressing small cells. A count of one is a person. My memo and Riki's sheet 2 arrived at this independently, which is a strong signal it belongs in the standard. Open question is the exact k value. |
| D6 | Statistical aggregation (individuals not distinguishable) | C | Mandatory | Riki, Level 1 + sheet 2 (statistical-analysis provision type) | The strongest form, removes the individual entirely. |
| D7 | Added noise / differential privacy | C | Optional | Riki sheet 2 (differential privacy, marked "to be considered") | Stronger than suppression, comes with a formal guarantee. Riki has flagged it for consideration, so it is a live option rather than settled. |
| D8 | Unit of privacy: event-level vs user-level protection | R or C | Mandatory | Riki, boundary slide | Event-level protection fails against repeated behavior (commute, home, work). User-level is the stronger requirement. Conditions D3 to D6. |
| D9 | Purpose / context of use | R or C | Optional | Nikhil (meeting) + Riki sheet 2 (rules by use case) | The same device-to-place link is fine in one context and sensitive in another (Walmart vs church vs home). Sheet 2 makes this concrete by defining provision rules per use case. |

---

## Things I noticed while building this (for the dependency stage)

These are early observations, not the analysis itself. Flagging them so they are not lost.

1. **Sensitivity and provision are two separate axes, and Riki's own framework already splits along them.** Sheet 1 grades how revealing the data is (the seven levels). Sheet 2 grades what you are allowed to do with it (provision: prohibited, allowed, case-by-case). Disclosure and cross-border (D1, D2) live on that second axis, not the sensitivity ladder. This is the same tension raised in the last meeting about a single 1 to 7 scale not holding, and it now has direct evidence: the framework needed a second sheet precisely because provision would not fit on the sensitivity scale. Likely a real finding for the dependency analysis.

2. **My handling controls (Group D) and Riki's sheet 2 are the same layer.** The k-anonymity thresholds, aggregation rules, and differential privacy option in sheet 2 map directly onto D3 through D7. These are not separate efforts. The dependency graph can show how each of these controls attaches to the risk factors it mitigates, which is exactly the bridge between his two sheets.

3. **Controls map onto risks, which is where the trade-offs are.** D3 to D7 are the mitigations for the Group A and B risks. Each one trades privacy against data utility (more aggregation means less useful data). Sheet 2 shows this trade-off in action, since the stricter provision buckets allow less useful data out. That trade-off is probably a core part of what the dependency graph should show.

4. **Several factors are conditioners, not independent nodes.** B4 (cultural context) conditions B3 (facility visit). D8 (unit of privacy) conditions the aggregation controls. These are dependency edges waiting to be drawn, not separate risks.

5. **Mandatory versus optional roughly tracks universal versus law-specific.** The factors that hold under any privacy regime (identifiability, sensitivity, consent) feel mandatory. The ones tied to a specific law (cross-border adequacy, specific DPIA triggers) feel optional or regional. This may be the underlying principle behind the split, and it connects to why the single scale broke when it was extended past GDPR.

6. **The open questions are the k value and differential privacy.** Sheet 2 already proposes suppressing cells at k of 2 or fewer and disallowing segments under k of 10, and marks differential privacy as "to be considered." These are exactly the decisions still to settle, and they are where the standard needs a firm position rather than a draft.

## Next step

Once this factor set is agreed, stage two is to draw the relationships: dependency edges (what presupposes what), trade-off edges (control versus risk, control versus utility), and the mandatory/optional split as a node property. Given that Riki's framework already splits into a sensitivity axis (sheet 1) and a provision axis (sheet 2), the graph should probably reflect both rather than force everything onto one scale. Before building it, I would like to confirm the node set is right, both the factors themselves and the four groups they are sorted into.
