# Architecture Diagram: Speaking Notes

Board: https://whimsical.com/privacy-policy-engine-architecture-Bv4NgN4RPaeXwPgt8gqTsz

## Opening

So far we've built the framework. We know how sensitive the data is, where it's being used, and who is allowed to see it. This diagram is the next step. It shows how a system would actually use all of that to answer one data request.

The short version is this. A request comes in, the system checks it against our rules, picks one decision, and then changes the data to match that decision before anything goes out.

## Layout of the board

Before the steps, a quick look at where things are. There are four big areas. The gray area on the top left is the policy, so our rules. The pink area on the top right is where the decision gets made. The blue area on the bottom left is the input. And the mint area along the bottom middle is where the data actually gets changed.

The main boxes are labeled Step 1 to Step 7, so you can just follow those. The legend is under the diagram, on the bottom left.

## The colors and lines

Quickly on the legend. Blue is what comes in and what goes out. Gray is the policy. Pink is where the decision gets made. Orange is the gatekeeper. Mint is what we do to the data. And yellow is something we're planning for later, not the first version.

Solid arrows mean the request or the data moves to the next step. The dashed arrow means later. And the words on some arrows say what's being passed along.

## Step 1: the request

Start on the bottom left, in the blue Input area. A data request comes in, and the arrow labeled "carries" goes to the box next to it, which lists the five things every request carries.

The data tier, which is Riki's level 1 to 7. Who is asking, so public, commercial, internal, government, or research. Which country. What it's for, like tourism or advertising. And which location group it touches, G1 to G5.

Those five things are all the system needs to make a decision. And each one comes from something we already built. The tiers are Riki's framework. The requester types are from the who sees what proposal. The countries, purposes, and location groups are all tabs in the regional spreadsheet.

## Step 2: the enforcement point

Follow the arrow right, into the mint area. The first box there is orange. That's Step 2, the enforcement point.

The request doesn't go straight to the data. It hits this box first. Its job is to stop every request and ask, is this allowed, and in what form.

## Step 3: the decision point

From the orange box, there's a long arrow labeled "asks for decision" going up to the top right. That lands on Step 3, the decision point, the first box in the pink area. It reads the rules and gives back one answer.

Now look at the top left, the gray area. That's where the rules come from. On the far left is the policy file. It's a YAML file generated from the spreadsheet. It feeds four rule sets, the four boxes next to it. What each location group allows. Country overrides for the eight places. The audience matrix, so who sees what. And the thresholds, where k is 5 by default but a country can raise it.

Each of those four boxes has a long arrow going across to the decision point. That's the decision point reading all four rule sets.

The important point here is that the rules are data, not code. So if Thailand changes a rule, we edit the spreadsheet, not the program.

This split between a decision point and an enforcement point isn't something we made up. It's the standard setup from NIST SP 800-162, which is NIST's guide to attribute based access control.

## Step 4: when rules disagree

Back in the pink area, the arrow labeled "if rules disagree" goes to Step 4, the conflict rule.

Sometimes two rules will say different things. Say the audience matrix allows aggregates but the country rule says block. Our rule is simple. The most restrictive one wins.

That also means if a rule is missing or unclear, the answer can only get stricter, never looser. So the system fails safe.

## Step 5: the decision and the audit log

Next is Step 5, the decision. It's one of four. Full, meaning release it as asked. Aggregate, meaning counts only, and only where there are at least k devices. Masked, meaning IDs are hashed and sensitive rows are taken out. Or Blocked, meaning nothing goes out.

These line up with our Safe, Mask, and Out logic from earlier.

The arrow labeled "records why" goes to the last box on the right, the audit log. It records which rule fired, the factor ID, like A2 or E3 or G1, and the source behind it, like GDPR Article 9. So if anyone asks why something was blocked, we can point to the exact rule and the law behind it.

## Step 6: the transform steps

From the decision, there's a long arrow labeled "returns decision". It goes around the right side and along the bottom, back to the orange enforcement point. So the answer goes back to the gatekeeper.

Now the gatekeeper applies it. The data runs through the row of mint boxes, left to right. Step 6 marks the first one.

First we hash the ad IDs. That's factor A2, the persistent ID problem.

Then we drop device level rows at G1 and G2 places. So things like religious sites and clinics. That's B2 and B3.

Then we roll everything up into counts per H3 cell. H3 is just a hexagon grid for counting devices by area. That's E1 and E4.

Last, we remove any cell with fewer than k devices. A count of one is a person, so those cells never go out. That's E3.

## Step 7: the output

The arrow out of the last mint box goes to Step 7, the blue box on the right. Whatever survives those four steps is what gets released.

## The yellow box

One more box. Above the Input area there's a yellow box for differential privacy, with a dashed arrow labeled "later" going to the suppression step. It's dashed because it's not in the first version. When we add it, it would sit at that step and add noise to the counts. That needs its own design work against NIST SP 800-226.

## Quick example

If it helps to make it concrete, take the Mecca case from Phase I. A commercial client asks for device level visits to Mecca for advertising. That's G1. The G1 rule blocks it right away. The audience matrix and the Saudi rules agree, so there's no conflict. The answer is Blocked, and the audit log cites GDPR Article 9 and the Saudi PDPL.

## Closing

So that's the whole flow. Request in, check the rules, one decision, change the data, release. The next step would be a small Python prototype that runs this on synthetic data, so we can show the Mecca case being blocked without needing database access.
