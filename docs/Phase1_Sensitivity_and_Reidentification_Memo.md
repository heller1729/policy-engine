# Phase I Outputs: Sensitivity Classification and Re-identification Review

**Author:** Pratham Jangra
**Date:** June 2026
**Scope:** Global South Phase I, December 2025 Irys dataset
**Source reviewed:** Global South Data Aggregation Specification Sheet (Delivery 1 v1.0, Delivery 2 v1.1) and the Phase I workflow decks

> **In one line:** This is a first privacy pass over the Phase I outputs, classifying each table by re-identification risk and proposing how each should be handled. The single decision I would most value the team's input on is the minimum count threshold for the aggregate tables.

## Why this memo

Phase I has produced a working pipeline and six aggregated outputs from the Irys movement data. What does not yet exist alongside them is a privacy view: which outputs carry re-identification risk, how much, and what handling each one needs before it is queried or shared. This memo is a first pass at that, built entirely from the specification sheet so it does not depend on database access. The aim is to give the team a shared starting point and to surface a few questions that are worth settling early, before the standard work goes further.

I have classified each table on a simple four tier scale that maps onto the Safe, Mask, and Out logic the project is built around. The tiers are working definitions, not final ones, and I expect them to change once we align on the formal sensitivity matrix.

- **Tier 1, Low:** Aggregated counts with no path to an individual. Return as is.
- **Tier 2, Moderate:** Aggregated, but a narrow dimension or a small count can resolve to one person. Return with a minimum count rule applied.
- **Tier 3, High:** Device level, but limited attributes. Mask or restrict.
- **Tier 4, Critical:** Device level joined to a sensitive attribute or precise place and time. Out, or release only under strict controls.

## The source table sets the ceiling

Before the outputs, it is worth naming what they are derived from, because the source defines the worst case. PROD_MOVEMENT_EVENTS holds, for every event, exact start and end coordinates to roughly one meter, a centroid, a dispersion radius, precise start time and duration, timezone, speed, and the data provider. The specification's own worked example is a device resting about six hours inside a footprint of roughly 28 meters, which the note itself describes as movement within a single building. The device type is an Android Advertising ID.

This is the most identifying layer in the system. None of the Phase I outputs should ever be more revealing than this, and the device level outputs inherit its sensitivity wherever they carry the device ID forward. I am classifying the source itself as **Tier 4, Critical**, access restricted to the processing pipeline only.

## Table by table

### Device-wise visit history (DEVICE_VISIT_HISTORY_2025_12)

**Tier 4, Critical.** This keeps the device ID alongside a full travel portfolio: every country visited, the number of visits, and total hours in each. That combination is a behavioral fingerprint. A device with an uncommon set of countries is uniquely identifiable on the pattern alone, no name required, and the home country field narrows it further. The risk here is not a single field but the uniqueness of the whole travel history.

**Proposed handling:** Do not expose at the device level. For any downstream use, drop the device ID and serve only aggregated cuts, with a minimum count rule. If a device level join is genuinely needed for the affinity work later, it should sit behind strict access controls rather than in a general query path.

### International OD, country wise (COUNTRY_OD_2025_12)

**Tier 1 to 2, Low to Moderate.** This is daily country to country volume with movement and unique device counts, no device ID. On its own this is low risk. The reason it is not automatically Tier 1 is the small count case: a rare origin and destination pair on a given day can have a unique device count of one or two, which points at a specific traveler.

**Proposed handling:** Return as is once a minimum unique device threshold is applied. Suppress or bucket any cell below the threshold.

### International OD, home country wise (COUNTRY_HOD_2025_12)

**Tier 2, Moderate.** Same as above but with the home country dimension added. Every dimension you add shrinks the crowd in each cell. "Devices whose home is country X travelling from A to B on this day" will hit counts of one far more often than the country wise version, especially for smaller home countries.

**Proposed handling:** Minimum count rule, applied more strictly than the country wise table because the extra dimension thins the cells. Consider grouping rare home countries into a broader category.

### Domestic OD, administrative boundaries (DOMESTIC_OD_AGGREGATION_202512)

**Tier 2, Moderate.** Movement between admin areas inside Saudi Arabia, UAE, and Qatar, carrying home country. No device ID, but the same small count exposure as the OD tables, and finer geography (Admin 2 governorate level in Saudi Arabia) plus home country makes thin cells likely. A single foreign device of a given nationality moving between two specific governorates is re-identifiable.

**Proposed handling:** Minimum count rule. Watch the foreign device cells in particular, since foreign counts are small to begin with, as the device insight numbers in the decks already show.

### Domestic stay population (ME_STAY_POPULATION_202512)

**Tier 2, Moderate.** Hourly count of unique devices per H3 Level 7 hexagon, by home country. Aggregated, so no direct identifier, but an H3 Level 7 cell is small (the spec calls it 500m wide), and an hourly count of one foreign device of a given nationality in a small cell at a specific hour is effectively a single person at a place and time.

**Proposed handling:** Minimum count rule per cell and hour. Sparse cells should be suppressed or aggregated up to a coarser time or space grain.

### Mecca visitors (currently labelled ME_STAY_POPULATION_202512)

**Tier 4, Critical.** This is the sharpest case in the set. It keeps the device ID, the home country, and the exact date of a visit to the Mecca region. Device plus religious site plus date plus nationality is among the most sensitive location data that can be produced, and it concerns a special category of information in most privacy regimes. A device whose home is a small country, visiting on a specific day, is trivially isolable.

**Proposed handling:** This should not be served at the device level in any general path. If the use case is a count of pilgrims by home country and day, derive that aggregate with a minimum count rule and retire the device level table from circulation. If device level is ever required, it belongs under the strictest controls the project can define, and is the first table the Out path should cover.

## Summary

| Table | Tier | Main risk | Handling |
| :---- | :---- | :---- | :---- |
| PROD_MOVEMENT_EVENTS (source) | Critical | Precise place, time, persistent ID | Pipeline only |
| Device-wise visit history | Critical | Behavioral fingerprint | No device level exposure |
| Mecca visitors | Critical | Device, religion, date, nationality | Out, or strict control only |
| International OD, home country | Moderate | Thin cells from home dimension | Minimum count rule |
| Domestic OD | Moderate | Fine geography plus home country | Minimum count rule |
| Stay population | Moderate | Small cell, single hour | Minimum count rule |
| International OD, country wise | Low to Moderate | Rare OD pairs | Minimum count rule |

## Three things worth settling early

These are not criticisms of the delivery, they are the questions a privacy standard has to answer and the spec does not yet.

**1. The data license is blank.** It is empty in both v1.0 and v1.1, two months apart. A governance standard rests on knowing the terms under which the data can be used and shared. We should record the Irys license and the permitted uses before building rules on top of the data.

**2. There is no minimum count rule.** The spec describes how every table is built but sets no threshold below which a cell is suppressed. A unique device count of one is a person. A single k anonymity style threshold, applied consistently across the aggregate tables, would close most of the moderate tier risk in one move. Agreeing on that number is probably the highest value early decision.

**3. "Anonymized" needs a definition.** Two tables describe the device ID as anonymized, but it is an Android Advertising ID, which is persistent and pseudonymous rather than anonymous. It can be rejoined across datasets and across time. Aligning on what we mean by anonymized, and where pseudonymous is the more accurate word, will keep the standard honest.

## One data quality note

The Mecca visitors table is labelled ME_STAY_POPULATION_202512 in the spec, the same name as the stay population table, although its columns are entirely different. This looks like a copy paste in the document rather than a real table collision, but it is worth confirming with the team so the naming is unambiguous.

## Suggested next steps

1. Agree on the sensitivity tiers and map them to the project's formal matrix.
2. Decide a single minimum count threshold for the aggregate tables.
3. Get read access to schemas and a small sample so the moderate tier cells can be checked against real counts, which is where the threshold gets validated.
4. From there, turn this classification into the first version of the Safe, Mask, and Out rule set that the query engine will enforce.
