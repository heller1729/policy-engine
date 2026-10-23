# Architecture Diagram: Speaking Notes (v0.2)

Board: https://whimsical.com/privacy-policy-engine-architecture-Bv4NgN4RPaeXwPgt8gqTsz

## Opening

So far we've built the framework. We know how sensitive the data is, where it's being used, and who is allowed to see it. This diagram shows how the system uses all of that to answer one data request.

The short version is this. A request comes in, the system checks it against our rules, picks one decision, and then changes the data to match that decision before anything goes out.

This version of the board matches the code as it is now, which is v0.2. The prototype has a web app on top of it, so everything I'm showing here can also be clicked through live.

## Layout of the board

Before the steps, a quick look at where things are. The gray area on the top left is the policy, so our rules. The pink area on the top right is where the decision gets made. The blue area on the left is the input. And the mint area in the middle is where the data actually gets changed.

The main boxes are labeled Step 1 to Step 7, so you can just follow those. The legend is under the diagram.

## Quick overview (if we're short on time)

Here's the whole thing in a minute.

A request comes in from the web app, the API, or the command line. It says what tier of data, who is asking, which country, what it's for, which kind of place, and which area.

It goes to the enforcement point first, which asks the decision point what to do. The decision point checks the request against our rules. Those are location group rules, country rules, the who sees what matrix, purpose rules, and k. If two rules disagree, the stricter one wins. The answer is one of four: Full, Masked, Aggregate, or Blocked. The audit log records which rules fired and why.

Then the enforcement point applies it. First it checks every row against a list of sensitive places, and holds back rows that deserve a stricter answer. Then it runs either the Masked steps, which hash the IDs, drop sensitive rows, and remove the hour, or the Aggregate steps, which count devices per hex cell and remove any cell under k. Whatever is left is released.

The rules live in a file, not in the code, so a country change means editing the file. Next we're adding technique profiles, so the decision can also pick methods like private set intersection or encrypted search.

## Questions for LocationMind about building this into their systems

If we want to develop this further and run it on their side, these are the things I'd want to ask.

**Where it runs**

1. Where would this run on your side? Your own servers, a cloud account, or next to Snowflake?
2. Are there any rules about where the data and the engine have to be hosted, for example data staying in Japan or in a certain region?
3. Is a Docker image the easiest way for your team to run it, or do you have a standard setup we should match?

**Data**

4. Can we get read access to the Snowflake schemas and a few sample rows, so we can test on real column names before touching real data?
5. Do you have a list of sensitive places we can use instead of our synthetic one? Is it points, polygons, or H3 cells?
6. Roughly how big is a typical request? Thousands of rows, millions, or more? And do requests need an answer right away, or can they run as batch jobs?

**How requests come in**

7. How do clients ask for data today? Through an API, a dashboard, or by talking to your team?
8. How would the engine know who is asking? Do you have accounts or roles we can read the requester type from?

**Rules and ownership**

9. Who on your side would own the policy file and keep the country rules up to date?
10. Is k = 5 still right for every country, or do some need a higher number?
11. When a request is flagged for review, who should look at it, and how should they get notified?
12. Where should the audit log be stored, and who needs to read it? Your team, clients, or regulators?

**Next steps**

13. Which use case should we pilot first? Tourism seems safest since it's mostly aggregate data.
14. Who would be our main technical contact for this, and how often should we meet?

## The colors and lines

Quickly on the colors. Blue is what comes in, the data we run on, and what goes out. Gray is the policy. Pink is where the decision gets made. Orange is the gatekeeper. Mint is what we do to the data. And yellow is something we're planning for later.

Solid arrows mean the request or the data moves to the next step. A dashed arrow means it's optional or planned for later. The words on some arrows say what's being passed along, or which path the data takes.

## Ways in

Start at the bottom left, the blue box called Ways in. There are three ways to send a request today. The web app, the API behind it, and the command line.

The web app has a few pages. A request builder, a who sees what page, a page that shows the whole policy, a page that shows each technique on sample rows, the audit log, and a present mode for meetings like this one.

All three end up in the same place. The arrow labeled "sends" goes up to Step 1.

## Step 1: the request

Step 1 is the data request. The arrow labeled "carries" goes to the box next to it, which lists what every request carries.

The data tier, which is Riki's level 1 to 7. Who is asking, so public, commercial, internal, government, or research. Which country's rules apply. What it's for, like tourism or advertising. Which location group it touches, G1 to G5. And which area, like Mecca or Dubai.

There's also an optional what if. Someone can raise k or switch on noise for one request. But they can only make it stricter, never looser.

Each of these comes from something we already built. The tiers are Riki's framework. The requester types are from the who sees what proposal. The countries, purposes, and location groups are all tabs in the regional spreadsheet.

## Step 2: the enforcement point

Follow the arrow right, into the mint area. The first box there is orange. That's Step 2, the enforcement point.

The request doesn't go straight to the data. It hits this box first. Its job is to stop every request and ask, is this allowed, and in what form.

Two other things feed into it from below. The blue cylinder is the data. Right now it's synthetic data for nine cities, one or more for each of our eight jurisdictions. The arrow says "rows for the area", so the enforcement point only pulls the rows for the area that was asked for. Real Irys data in Snowflake would plug in here later.

## Step 3: the decision point

From the orange box, an arrow goes up to the pill that says "asks for decision". From there the line runs across to the dot and up into Step 3, the decision point. That's the first box in the pink area.

The decision point does three things.

First, it checks the input. If any value is one it doesn't know, like a country we have no rules for, the answer is Blocked right away. So the system fails safe.

Second, it applies the group shift. In Saudi Arabia and Thailand, G2 religious places get treated as G1.

Third, it reads the rules. Look at the top left, the gray area. The policy file is on the left. It's a YAML file, written from the regional spreadsheet. It holds the rule sets on the right. What each location group allows. Overrides for the eight jurisdictions. The audience matrix, so who sees what. Purpose rules, like no ad targeting at sensitive places. And the thresholds, which is k, 5 by default and set per jurisdiction, plus the noise setting.

There's one arrow from the policy area to the decision point, labeled "reads all rule sets". That's all of them going in together.

The important point here is that the rules are data, not code. If Thailand changes a rule, we edit the policy file, not the program.

This split between a decision point and an enforcement point isn't something we made up. It's the standard setup from NIST SP 800-162, which is NIST's guide to attribute based access control.

## Step 4: when rules disagree

Back in the pink area, the arrow labeled "if rules disagree" goes to Step 4, the conflict rule.

Sometimes two rules say different things. Say the audience matrix allows aggregates but a country rule says block. Our rule is simple. The most restrictive one wins.

That also means a rule can only ever make the answer stricter. Never looser.

## Step 5: the decision and the audit log

Next is Step 5, the decision. It's one of four. Full means release it as asked. Masked means device rows, but with IDs hashed and sensitive rows taken out. Aggregate means counts only, and only where there are at least k devices. Blocked means nothing goes out.

There's also the grey area case. Some rules are marked for human review, like the Thailand rule on ad IDs. When one of those fires, a Full or Masked answer becomes Aggregate, and the request gets flagged for review.

The arrow labeled "records why" goes to the audit log on the right. It records every rule that fired, the factor ID, like A2 or E3 or G1, the source behind it, like GDPR Article 9, and how many rows went in and came out. So if anyone asks why something was blocked, we can point to the exact rule and the law behind it.

Below Step 5 there's the yellow box, with a dashed arrow labeled "later". I'll come back to that at the end.

## Step 6: the place check

From the decision, the long arrow labeled "returns decision" goes around the right side and along the bottom, back to the orange enforcement point. So the answer goes back to the gatekeeper.

Now the gatekeeper applies it. The first mint box is Step 6, the place check. This is new since the last version.

The problem it solves is this. A request says one location group, like G5, everyday places. But the rows in that area might include a hospital or a mosque. So the place check looks at every row on its own. The gray box below it is the place catalog. It's a list of sensitive places with their coordinates and a buffer around each one. The arrow says "row groups", so each row gets its own location group from where it actually is.

Then for each group, it asks the decision point again. Any rows that deserve a stricter answer than the request got are held back. So most restrictive wins applies to every row, not just to the request as a whole.

## The two plans

After the place check, the data splits into one of two plans, depending on the decision.

The top row is the Masked plan. First we hash the ad IDs with a secret key. That's factor A2, the persistent ID problem. Then we drop any rows at G1 to G4 places. That's B2 and B3, and it's a backup to the place check. Then we coarsen the time by dropping the hour. That's E2, which Deepanshu raised.

The bottom row is the Aggregate plan. First we roll everything up into counts per H3 cell. H3 is just a hexagon grid for counting devices by area. That's E1 and E4. Then we remove any cell with fewer than k devices. A count of one is a person, so those cells never go out. That's E3.

The last box on that row has a dashed border. That's Laplace noise, which is differential privacy. It's built now, but it's off by default and switched on in the policy file. That's why the arrow into it says "if on".

One more detail. Any request for tier 1 to 3 always runs the Aggregate plan, even if the decision is Full, because those are aggregate products by definition. And if the decision is Blocked, no plan runs at all.

## Step 7: the output

Both rows end at Step 7, the blue box on the right. Whatever survives those steps is what gets released.

## Quick example

Take the Mecca case from Phase I. A commercial client asks for tier 6 device level data in Mecca for advertising. That's G1.

Three rules all say Blocked. The G1 location rule, the audience matrix, and the purpose rule that says no ad targeting at religious or medical sites. The Saudi localization rule on its own would only cap it at Aggregate, but most restrictive wins, so the answer is Blocked. The audit log cites GDPR Article 9 and the Saudi PDPL for the G1 rule, plus the who sees what proposal and the Ad ID tab.

A second example shows the place check. A commercial advertiser in Dubai asks for tier 5 data at everyday places. The decision is Masked. But the synthetic Dubai data includes rows at a hospital. The place check holds those back, so 1,702 rows go in and 854 come out, with IDs hashed and the hour dropped.

## The yellow box and what's next

Back to the yellow box under Step 5. That's technique profiles, and it's what we're working on next, based on Dr. Matsuo's feedback.

Right now the decision only says how much gets released. The next step is for it to also say how the work gets done. For example, private set intersection, so a buyer can learn how many of its customers are in our data without either side handing over its list. Or encrypted search, where the data stays encrypted and a key only opens what the policy allows. Or user level differential privacy, which protects a whole device instead of single events.

These would be chosen per jurisdiction, requester, and purpose, which is why the arrow goes into the decision.

## Closing

So that's the whole flow. Request in, check the rules, one decision, a place check on every row, change the data, release. All of it runs today on synthetic data in the prototype, and I can show any of these cases live in the web app.
