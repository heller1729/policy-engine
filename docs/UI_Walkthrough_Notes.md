# Policy Engine v0.2 Walkthrough: Speaking Notes

## Before the meeting

Start the app with the fuller dataset. Do this right before the meeting so the audit log starts empty.

```
policyengenv\Scripts\activate.bat
python serve.py --city
```

Open http://localhost:8000 in Chrome. Zoom the browser to about 110 percent so people can read it on a shared screen. Keep one tab only.

The numbers below are from the city dataset. If the app is started without `--city`, the numbers will be smaller.

## Opening

So last time I showed you the prototype in the terminal. The logic was all there, but you had to read the output to follow it. This time I put a web app on top of the same engine, so we can click through it and actually see what happens to the data.

Nothing in the rules changed for this. The engine underneath is the same one. The app just calls it.

One thing up front, like before. All the data here is synthetic. These are fake devices and fake visits that look like the Phase I tables. Device ID, home country, place, H3 cell, date and hour. I also added a few cities, so now there's at least one city for every jurisdiction in the policy. Mecca and Riyadh, Dubai, Doha, Bangkok, and then New York, London, Paris and Tokyo.

I'll go through the screens one by one, and I'll use three scenarios to show how it behaves.

## The request builder

*(Stay on the Request builder page.)*

This is the main screen. On the left is the data request. It's the same five attributes from the architecture board. The data tier, which is Riki's 1 to 7 level. Who is asking. Which jurisdiction applies. The purpose. And the location group. Then there's an area, which just picks which city's data we're looking at.

On the right is the answer. And the important thing is that it updates as soon as I change anything on the left. I don't have to press anything to see the decision. That's only the decision though. Nothing touches the data until I press Run.

At the top there's a dropdown with the demo scenarios, so I don't have to type everything in. Let me start with the one we always start with.

## Scenario 1: The Mecca case

*(Pick scenario 1 from the Demo scenario dropdown.)*

So this is an advertiser asking for device level visits in Mecca. Tier 6, commercial, Saudi Arabia, advertising, G1.

The big box says Blocked. Nothing is released. And right under it, it tells you which rules decided that. LOC_G1, the audience matrix cell for commercial at tier 6, and ADS_NO_RED_LOCATION_TARGETING.

*(Scroll down to "How the engine got there".)*

This part explains how it got there. The row of steps at the top is the same seven steps as the board, in the same colors. Steps 6 and 7 are crossed out here because it's blocked, so nothing runs and nothing gets released.

Under that is what I call the ladder. It goes from Full on the left to Blocked on the right. Each rule that fired is placed where it capped the request. So you can see three rules sitting in Blocked, and one rule, SA_LOCALIZATION, sitting alone in Aggregate. That's the Saudi localization rule. On its own it would only have dropped this to counts. But the strictest rule wins, so the answer is Blocked.

Then below that are the rule cards, grouped by step. Location group, audience matrix, jurisdiction, purpose. Every card has the rule ID, the decision it caps at, the factor ID, and the citation. The dark border means that rule is one of the deciding ones. If I hover over a factor chip, like G1, it tells me what the factor means.

*(Hover over the G1 chip.)*

*(Scroll to "What the enforcement point will run" and press Run request.)*

If I run it anyway, you can see the result. The input on the left map is Mecca, 75 small cells of visits. The right map says nothing released. So the request still goes into the audit log, which matters, but no data leaves.

## Scenario 1, part 2: Same place, different request

*(Pick scenario 2 from the dropdown.)*

Now the same place, Mecca, but a different request. The tourism ministry wants visitor counts by home country. Tier 2, government, tourism.

This time it's Aggregate. G1 doesn't allow device level data, but it does allow counts. So the location is the same, and the answer is different because of who is asking and what they're asking for.

*(Press Run request.)*

Now the result section shows what actually happened to the data. This is the funnel. We start with 6,492 visit rows in Mecca. The first step is the place check, which I'll come back to. Then aggregate_h3 turns those rows into 585 cells. A cell here is a hexagon, a date, and a home country. Then suppress_small_cells removes every cell with fewer than 5 devices. That takes it down to 296. So 289 cells were removed because they were small enough to point at a person.

*(Point at the maps.)*

The maps show the same thing. Left is the input. Right is what's released. The bigger hexagons are the released cells, and the dashed grey ones are the cells that got suppressed. And the two maps move together, so if I zoom one, the other follows.

*(Zoom in on one map.)*

On the left there's a "what if" box. I can raise k for this one request and see what changes. Let's say k is 20 instead of 5.

*(Type 20 in the k box and press Run request.)*

Now only 78 cells survive instead of 296. So that's the tradeoff with utility, in one click. And this box can only make things stricter. If I try to put k below 5, it refuses and says why. It's there to explore, not to get around the policy.

*(Clear the k box.)*

## Scenario 2: The Dubai advertiser

*(Pick scenario 3.)*

This one is an advertiser asking for visit history around Dubai. Tier 5, commercial, UAE, advertising, and they say G5, so everyday places like malls.

The decision is Masked. That comes from the audience matrix. Commercial users can get device logs, but only masked. So IDs get hashed, sensitive rows are removed, and the hour is dropped.

*(Press Run request.)*

Now look at the first step in the funnel, the place check. This is new since the last version. The request says G5, everyday places. But the Dubai data also has visits near a hospital and a children's hospital. Before, the engine trusted the group in the request. Now it looks up every row's own location from a place catalog, by its coordinates.

So here it withheld 1,082 rows at G1 places, because LOC_G1 and the ad targeting rule block those. And it withheld 529 rows at G3 places, because ADS_NO_VULNERABLE_TARGETING blocks advertising around places with children. So out of 4,353 rows, 2,742 are left.

*(Point at the right map.)*

You can see it on the map. The hospital clusters are just gone on the right.

*(Click the Released rows tab.)*

This is what the advertiser would actually get. The device ID column starts with h underscore. That's a salted hash, so it's not the real ad ID. And there's no hour column. Only the date. That was Deepanshu's point about temporal aggregation.

*(Click the Audit record tab.)*

And this is the audit record for this exact run. The request, every rule that fired with its factor and citation, which rules decided it, and what each step did, including the rows the place check withheld and why. This is the same record that gets written to the log file on the server.

## Scenario 3: The same request in Thailand

*(Pick scenario 4.)*

Now the exact same advertiser request, but in Bangkok under Thailand's PDPA.

The answer changes to Aggregate, and there's an orange flag that says flagged for human review. The deciding rule is TH_ADID_DEVICE_LEVEL. Under the PDPA, ad IDs are personal data and consent is the main lawful basis. So this is a grey area. And the rule in the engine is that a grey area never goes out as Full or Masked. It drops to counts, and somebody has to look at it.

*(Press Run request.)*

The place check here withholds 1,583 rows near the temples and the hospital. Then the rest is counted and suppressed down to 136 cells. So same request, same kind of data, and the advertiser gets counts in Thailand where they'd get masked rows in Dubai.

## Who sees what

*(Click "Who sees what" in the top bar.)*

This page is the audience matrix you asked for, but after every rule has been applied. So it's not the first cut table anymore. It's what the engine would really do for every tier and every requester.

*(Set Jurisdiction to Thailand, Purpose to Advertising, Location group to G5, Compare with UAE.)*

Let me put Thailand next to the UAE, for advertising at everyday places. The outlined cells are the ones that differ. There are 6 of them. And they're all in the same place. Device logs, tier 4 and 5, for commercial, government and research. In the UAE those are Masked. In Thailand they're Aggregate with the review flag. That's the Thai ad ID rule, and you can see exactly where it bites.

*(Change Compare with to "Audience matrix alone".)*

I can also compare against the audience matrix on its own, before the location, jurisdiction and purpose rules. That shows how much the other rules tighten the starting point.

*(Click the Thailand cell for Lv 4, Commercial.)*

And every cell is clickable. If I click one, it opens that exact request in the request builder, with Bangkok already picked as the area. So if someone asks "why is this one Aggregate", I can answer in one click.

## Policy

*(Click "Policy" in the top bar.)*

This page is the policy file itself, but readable. Nobody has to open the YAML.

The location groups are at the top. These came from Puneet's red, yellow, green idea, which we refined into five groups. For each one you can see what's allowed for device level data and what's allowed for aggregates, and the legal basis.

*(Scroll to Jurisdiction overrides.)*

Then the jurisdiction overrides. Each country shows its k, and only the rules where it differs from the baseline. The conditions are written out in plain words. So instead of the YAML you read "tier 4 and above, requester is not internal".

*(Type B3 in the search box.)*

There's also a search. If I type B3, which is the sensitive facility visit factor, it filters down to everything tied to it. Four rules cite it. The US geofencing rule, the EU and UK Article 9 rules, and the ad targeting rule. And the technique that drops sensitive rows shows up too, because that's the control for it. You can also just click any factor chip to filter by it.

*(Clear the search and scroll to Place catalog.)*

At the bottom is the place catalog, which is the list of sensitive places the place check uses, and a glossary of all the factor IDs. The catalog is synthetic for now. For real use we'd need LocationMind's actual place list.

## Techniques

*(Click "Techniques".)*

This page is about the privacy techniques themselves. Which technique runs for which decision is set in the policy file, not in the code. So adding a technique means writing one module and adding it to the policy.

Each card shows the technique applied to a few sample rows from Riyadh, before and after. So hash_ids, the IDs change and nothing else does. drop_sensitive_rows, six rows go in and two come out. coarsen_time, the hour column disappears. And suppress_small_cells, the small cells at the top are the ones that get removed.

This is the page where your point from last time comes in, about supporting more than differential privacy. When the papers come in, new techniques would show up here, and the next design question is how the engine picks between them.

## Audit log

*(Click "Audit log".)*

Every request we just ran is here, newest first. You can see the outcome, the rules that decided it, how many rows the place check withheld, and what was released. I can filter by outcome or by jurisdiction.

*(Click the "Needs review" tab.)*

The grey area requests have their own tab. Here that's the Thailand one. There's no approve button on purpose. If someone could approve it in the app, it would release more than the policy allows. So review happens outside, and the app only shows what needs it.

*(Point at Export JSONL.)*

And the whole log can be exported as a file, one record per line.

## Present mode

*(Click "Present".)*

The last screen is for meetings like this one. It goes through all 13 scenarios, one per screen. I just use the arrow keys.

*(Press the right arrow a few times, then jump to the last dot.)*

Each screen has the request, the result in big text, why, the deciding rules, and the maps. The dots at the top are colored by the outcome, so you can see the mix at a glance.

This last one is the only Full in the set. It's the internal data team pulling raw Tokyo logs to check the pipeline. They get real device IDs, because internal at device level is the one case where that's allowed. But even here the place check still holds back the rows at the shrine, the party office and the school. So Full doesn't mean everything.

And if a policy change ever breaks one of these, the screen shows a red warning saying the result doesn't match what the scenario expects. There's also an automated test that clicks through all 13 in Chrome, so I'd catch it before a demo.

## Closing

So that's the whole app. Same engine as before, but now you can see every decision, why it was made, and what it does to the data.

The next step is the one you asked for. Supporting more privacy and encryption techniques, and designing how the engine chooses between them. Once I have the papers I'll list which ones to start with.

## If someone asks

**Why is the strictest rule always the one that wins?**
Because a rule can only tighten. If we let one rule loosen another, we'd have to decide which law is more important, and that's a legal call, not something the engine should guess. So the safe default is that every rule gets to say no.

**Why did Thailand change from last time?**
Before, Thailand's k was marked as still to be set, and that flagged every Thailand request for review, even basic area statistics. Now k is a normal number, 5, like the rest, and it can be changed in the policy file. So the only grey area left in Thailand is the ad ID rule.

**What is k again?**
It's the minimum number of different devices a cell needs before it can be released. We use 5 because that's LocationMind's working standard. A count of one is a person, so small counts get removed.

**How does the place check know where a hospital is?**
Right now it uses a small list of sensitive places with coordinates and a 600 meter buffer around each. Any visit inside that buffer takes that place's group. For real data we'd swap that list for LocationMind's real place list, and the buffer size should be agreed with counsel.

**Is any of this real data?**
No. Everything is generated. We still don't have Snowflake access, and real data shouldn't come into this repo anyway.
