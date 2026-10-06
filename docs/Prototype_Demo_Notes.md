# Prototype Demo: Speaking Notes

## Before the meeting

Open the `policy_engine` folder in VS Code. Keep a terminal open at the bottom, inside that folder. Run these once so nothing surprises you live:

```
pip install -r requirements.txt
python -m pytest -q
python demo.py
```

Then delete the `out` folder so the audit log starts empty.

Have these tabs open, in this order: `policy/policy.yaml`, `engine/pdp.py`, `engine/techniques.py`, `engine/pep.py`. Keep the Whimsical board open in a browser tab too, in case he wants to compare.

## Opening

So last time I showed you the architecture diagram. This is that same design, but as working code. It's a small Python prototype. It takes a data request, checks it against our rules, gives one decision with the reason, and then changes the data to match that decision before anything is released.

One thing up front. All the data here is synthetic. I generate fake devices and visits that look like the Phase I tables. So device ID, home country, place, H3 cell, date, and hour. No real Irys or LocationMind data is used, so we can run this anywhere.

## The folder

*(Point at the file tree on the left.)*

The structure follows the diagram. The `policy` folder has the policy file, so the rules. The `engine` folder has the decision point, the enforcement point, the privacy techniques, and the audit log. Then there's `synthetic.py`, which makes the fake data, and `demo.py`, which runs a set of example requests. And there are tests in the `tests` folder.

## The policy file

*(Open `policy/policy.yaml`.)*

This is the most important file. All the rules live here, not in the code.

At the top are the four decisions, in order from least to most strict. Full, Masked, Aggregate, Blocked. That order is what "most restrictive wins" uses.

*(Scroll to `location_groups`.)*

These are the five location groups from the spreadsheet. Each one says what's allowed for device level data and what's allowed for aggregates. So G1, like a mosque or a hospital, blocks device level data but allows counts. And every rule has a factor ID and a citation. That's what ends up in the audit log.

*(Scroll to `audience_matrix`.)*

This is the who sees what matrix, the same table from the proposal. Data tier on one side, requester on the other.

*(Scroll to `jurisdictions`.)*

These are the country overrides. Each country has its k value and a few rules. For example, Thailand has a rule that device level data for anyone outside the team goes down to Aggregate, and it's marked `review: true`. That means it's a grey area, so it gets flagged for a person to check.

*(Scroll to `purpose_rules`.)*

These are the purpose rules. Purpose can only make things stricter. For example, advertising near a religious site, a school, or a defence site is always blocked.

*(Scroll to `techniques`.)*

And this last part is what you asked for last time. Each decision maps to a list of privacy techniques. So Masked runs hashing, then dropping sensitive rows, then removing the hour. Aggregate runs counting by H3 cell, then removing small cells. If we want a different technique, we change this list. We don't touch the engine code. Differential privacy is here too, as an option that's switched off for now.

## Running the demo

*(Go to the terminal.)*

```
python demo.py
```

This runs seven example requests. Let me walk through how to read one, and then go through them.

For each request, it prints the five attributes, then every rule that fired and what that rule allowed. The star marks the rules that actually decided the result. Then the decision, the reason, which techniques ran with how many rows went in and out, and a sample of what got released.

### Scenario 1: the Mecca case

An advertiser asks for device level data on Mecca visits. Tier 6, commercial, Saudi Arabia, advertising, G1.

Four rules fired. The G1 rule says Blocked. The audience matrix says Blocked. The no ads at religious sites rule says Blocked. The Saudi rule only says Aggregate, but that doesn't matter, because the strictest one wins. So the answer is Blocked, nothing is released, and the reason cites GDPR Article 9 and the Saudi PDPL.

### Scenario 2: tourism ministry, Mecca counts

Same place, but now the Saudi tourism ministry wants visitor counts by home country. Tier 2, government, tourism.

This time it's Aggregate. G1 still allows counts. So the data goes through two steps. First about 2,400 visit rows become 65 count cells. Then any cell with fewer than 5 devices is removed, so we're left with 56. That's where the rare nationalities drop out. In the fake data I put a few visitors from Iceland and Fiji, and they don't show up in the output. That's exactly the small count problem from the Phase I memo.

### Scenario 3: advertiser, Dubai

An advertiser asks for visit history in Dubai. Tier 5, commercial, UAE.

The audience matrix says Masked. So the device IDs get hashed, the hour gets dropped, and any rows at sensitive places get removed. You can see the drop step took it from about 1,700 rows to about 850. Those were the hospital visits in the area. So even though the request said G5, the engine still cleans out the sensitive rows. It's a safety net.

### Scenario 4: same request in Thailand

The exact same advertiser request, but in Bangkok, under Thai law.

Now the Thai rule fires. Ad IDs are personal data under the PDPA and consent is the main legal basis. So it goes down to Aggregate and it's flagged for human review. This shows the same request getting a different answer just because the country changed.

### Scenario 5: internal team near a defence site

Our own team asks for raw data in Riyadh for cybersecurity. Tier 7, internal, G4.

The audience matrix would allow Full for internal. But G4 is security sensitive, so it's aggregate only. This is the Strava case. Even our own team gets counts here, not device rows.

### Scenario 6: research partner, Doha

A research partner asks for movement trends in Doha. Tier 3. The matrix says Aggregate for research, so they get counts above k.

### Scenario 7: a country with no rules

A request comes in for Brazil. We have no rules for Brazil. So instead of guessing, the engine blocks it and says why. That's the fail safe idea. If something is missing or unknown, the answer only gets stricter.

## The code, briefly

*(Open `engine/pdp.py`, scroll to `decide`.)*

This is the decision point. It's short on purpose. The comments line up with the diagram. Step 1, location group. Step 2, audience matrix. Step 3, country rules. Step 4, purpose rules. Then step 5, most restrictive wins. That part is just a loop that keeps the strictest answer. Right after that is the grey area check. If anything was flagged for review, the result can't be Full or Masked.

*(Open `engine/pep.py`, show `handle`.)*

This is the enforcement point. It asks the decision point, then runs the techniques in the plan one by one, and records how many rows went in and out of each step.

*(Open `engine/techniques.py`.)*

This is the part that answers your feedback. Every privacy technique is its own small class. To add a new one, like secure aggregation or an encryption method, you write one class here with the `register` line on top, and then name it in the policy file. That's it. And if the policy names a technique that doesn't exist, the engine stops with an error, so nothing gets released by mistake.

## Live change

*(Go back to `policy/policy.yaml`, scroll to `laplace_noise`, change `enabled: false` to `enabled: true`, save.)*

Let me show that live. I'm switching on the differential privacy module. Just one word in the policy file.

```
python demo.py --only 6
```

Now you can see a third step in the list, `laplace_noise`, and the counts are slightly different and marked as noisy. No code changed. Only the policy.

*(Change it back to `false` and save.)*

## Audit log

*(Open `out/audit.jsonl`.)*

Every request writes one record here. It has the request, the decision, which rules fired, the factor IDs, the citations, and the enforcement steps. So for any output, we can go back and see exactly why it was released or blocked.

If you want to see one nicely formatted:

```
python ask.py --tier 6 --requester commercial --jurisdiction saudi_arabia --purpose advertising --group G1 --area Mecca --json
```

## Tests

```
python -m pytest -q
```

There are 22 tests. Most check a specific case, like the Mecca case being blocked. One of them runs every combination of tier, requester, country, purpose, and location group, so 4,200 requests, and checks that the answer is never looser than the strictest rule. So the main promise of the design holds every time.

## What's simplified

A few things I kept simple for this version.

First, I wrote the policy file by hand from the spreadsheet. The spreadsheet cells are written as sentences, so a script can't read them yet. If we add a machine readable version of the overrides tab, we can generate the YAML from it.

Second, cross border transfer is folded into the Saudi rule. A proper version would add a destination attribute to the request.

Third, the noise step runs after suppression. So a noisy count can come out under k. The right order needs its own design work against NIST SP 800-226.

## Closing and questions for you

So that's the prototype. Request in, rules checked, one decision with a reason, techniques applied, and everything logged.

A few things I'd like your view on. Which privacy and encryption techniques should I add first, once you share the papers? Is most restrictive wins still the right rule, or should some rules have priority? And should I put this in a GitHub repo so the LocationMind team can review it?

## If he asks

**Why YAML and not the spreadsheet directly?**
The spreadsheet is for people to read and discuss. The YAML is for the engine. Keeping them separate means we can change wording in the spreadsheet without breaking anything. The plan is to generate one from the other.

**Why is Masked less strict than Aggregate?**
Masked still gives rows for each device, just with hashed IDs and sensitive places removed. Aggregate gives only counts, so no rows for individuals at all. That's why Aggregate is stricter.

**Can purpose make a decision looser?**
Not right now. Purpose rules can only tighten. That's still an open question in the design doc.

**How would a new technique like homomorphic encryption fit?**
It would be a new class in `techniques.py` and a new entry in a plan in the policy file. The decision point could also pick a different plan per country or per requester later.

**Is this using real data?**
No. Everything is generated in `synthetic.py`. Moving to real data would need Snowflake access.
