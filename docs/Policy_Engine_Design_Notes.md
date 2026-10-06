# Policy Engine Design Doc: Speaking Notes

## Opening

This is the one page design doc that goes with the diagram. The diagram shows the flow. This doc explains the choices behind it, so why it's built this way, what goes in, what comes out, and what we're leaving for later.

## Why this design

The engine is based on NIST SP 800-162, which is NIST's guide to attribute based access control. The basic idea is that you decide access from attributes of the request, not from a fixed list of users.

That guide splits the system into two parts. The decision point reads the rules and makes the call. The enforcement point stops the request and applies that call to the data.

We kept those two parts separate on purpose. It means the rules and the data pipeline can change on their own. If we add a new country override, that's a policy edit. Nobody has to touch the code.

## Inputs

Every request carries five attributes. Data tier, requester, jurisdiction, purpose, and location group.

The point I'd make here is that none of these are new. The tiers are Riki's 7 level framework. The requester types come from the who sees what proposal. The eight jurisdictions, the purposes, and the G1 to G5 groups are all tabs in the regional spreadsheet. So the engine is really just putting together work we've already done.

## Output

The engine gives back one of four decisions. Full, Aggregate, Masked, or Blocked. Full is the data as asked. Aggregate is counts only, above k. Masked means IDs hashed and sensitive rows removed. Blocked means nothing goes out.

These map to our Safe, Mask, and Out categories, so it's the same logic we've used since Phase I.

Every decision also comes with an audit record. That's the rule that fired, the factor ID from our inventory, and the citation. So every answer can be traced back to a reason.

## Policy as data

The rules live in a YAML file, not in code. YAML is just a plain text format that both people and programs can read.

The spreadsheet stays the version people look at and edit. The YAML file is generated from it. That way the two never get out of sync.

There are four rule sets in the file. Location group rules, jurisdiction overrides, the audience matrix, and thresholds. k is 5 by default, and a country can set it higher.

## Decision logic

The order of the checks matters, so here's how it runs.

First, check the location group. If it's G1 or G2, anything at device level is blocked right there.

Second, look up the audience matrix for that data tier and that requester.

Third, apply the country override.

Fourth, apply the thresholds.

Fifth, if any of those disagree, the most restrictive one wins.

And last, write the audit record.

The reason we went with most restrictive wins is that it fails safe. If a rule is missing or unclear, the answer can only get stricter. It can never accidentally release more than it should.

## Grey areas

Some cases won't fit cleanly. A good example is a place whose sensitivity depends on who's visiting, like Watanabe's point about Mecca for a pilgrim versus a shrine for a Japanese tourist.

For those, the engine gives aggregates only and flags the request for a person to review. A grey area never gets Full by default.

## Enforcement pipeline

Once there's a decision, the data goes through four steps. Hash the ad IDs, which is A2. Drop device level rows at G1 and G2 places, which is B2 and B3. Roll up into counts per H3 cell and time bucket, which is E1 and E4. And remove any cell under k, which is E3.

Each step ties back to a factor from the inventory, so every transform has a reason behind it.

## Worked example

The Mecca case is a good test. The request is Lv 6 data, from a commercial client, in Saudi Arabia, for advertising, at a G1 location.

The answer is Blocked. The G1 rule fires first. The audience matrix and the Saudi override both agree, so nothing needs to be resolved. The audit record cites GDPR Article 9 and the Saudi PDPL.

## Prototype plan

The next step is a small Python prototype. It reads the policy file, makes synthetic data shaped like the Phase I tables, so device ID, home country, H3 cell, and date, and runs requests through the whole thing.

The goal is to show the Mecca case getting blocked, with the reason printed from the audit record. And since the data is synthetic, we don't need database access to build or show it.

## What's out of scope for now

Three things are left for later.

Differential privacy, because it needs its own design and has to be checked against NIST SP 800-226.

Real data, because that needs Snowflake access.

And the triggered obligations, like appointing a DPO or breach notification rules. Those are still open questions from the regional work.

## Questions for you

There are three things I'd like your view on.

First, is most restrictive wins the right conflict rule, or should some rules have a set priority over others?

Second, should purpose ever be able to loosen a decision, or only make it stricter?

And third, what format should the audit record use if we need to report to regulators or partners?
