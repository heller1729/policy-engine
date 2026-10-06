# Proposal: who should see what

## The gap

- The framework so far grades how sensitive each piece of data is and what controls apply.
- It does not yet say who may see each piece, or in what form.
- Adding that turns the framework from a classification into a usable access rule.

## The core idea

- Sensitivity is not the whole question. The same data can be fine for one audience and off limits for another.
- Example: a monthly city visitor count is publishable to anyone; a device-level list of Mecca visitors should never leave the organization.
- So the model needs two axes: data type and audience. Each cell states what that audience receives.

## Axis 1: data tiers

Reuses the existing sensitivity levels, with the Phase I tables mapped on.

| Tier | Example data |
| :-- | :-- |
| Lv 1 to 2 | Area and population statistics (OD counts, stay population) |
| Lv 3 | Aggregated behavioral trends (movement heatmaps) |
| Lv 4 to 5 | Pseudonymous device logs (visit history) |
| Lv 6 | Sensitive-attribute inference (religious or medical visits) |
| Lv 7 | Direct identifiers (raw device or ad ID joined to location) |

## Axis 2: audiences

- Public (open dashboards, published statistics)
- Commercial buyers (advertisers, agencies buying datasets)
- Internal teams (analysts and the pipeline, need-to-know)
- Government and public-sector clients
- Research partners (academic work)
- Data subject (own data only, via a rights request)

## Disclosure rules (cell values)

Four levels, aligned with the existing Safe, Mask, Out logic.

| Rule | Meaning |
| :-- | :-- |
| Full | Data as it is |
| Aggregate | Counts only, above a minimum threshold |
| Masked | De-identified and coarsened |
| Blocked | No access |

## Proposed matrix (first cut)

| Data tier | Public | Commercial | Internal | Government | Research |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Area statistics (Lv 1 to 2) | Full | Full | Full | Full | Full |
| Behavioral trends (Lv 3) | Aggregate | Aggregate | Full | Full | Aggregate |
| Device logs (Lv 4 to 5) | Blocked | Masked | Full | Masked | Masked |
| Sensitive inference (Lv 6) | Blocked | Blocked | Masked | Aggregate | Aggregate |
| Direct identifiers (Lv 7) | Blocked | Blocked | Full | Blocked | Blocked |

Internal is Full because the team runs the pipeline, but access to the bottom two rows should be need-to-know rather than open to all staff.

## Fit with the existing framework

- It is the disclosure dimension from the dependency graph, made concrete.
- Sensitivity level sets the stakes, audience sets who is asking, the cell gives the answer.
- It is the direct input the rule-based query engine needs: request (data type plus requester) maps to a rule.

## Open questions

- Audience list: is this the right set, or are recipients like data brokers or specific government bodies missing?
- Rules: are four levels enough, or are finer steps needed?
- Purpose of use: should the same audience get different answers depending on why they are asking? If so, the matrix gains a third dimension.
