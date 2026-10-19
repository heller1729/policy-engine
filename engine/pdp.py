"""Policy Decision Point: reads the policy and returns one decision per request."""

from .models import Decision, RuleHit
from .policy import Policy


def _matches(when: dict, req, group: str) -> bool:
    if "tier_min" in when and req.data_tier < when["tier_min"]:
        return False
    if "tier_max" in when and req.data_tier > when["tier_max"]:
        return False
    if "requester_in" in when and req.requester not in when["requester_in"]:
        return False
    if "requester_not" in when and req.requester in when["requester_not"]:
        return False
    if "purpose_in" in when and req.purpose not in when["purpose_in"]:
        return False
    if "group_in" in when and group not in when["group_in"]:
        return False
    return True


class DecisionPoint:
    def __init__(self, policy: Policy):
        self.policy = policy

    def decide(self, req) -> Decision:
        p = self.policy
        hits, notes = [], []

        problem = self._check_attributes(req)
        if problem:
            hit = RuleHit("validate", "UNKNOWN_ATTRIBUTE", "Blocked", None, problem)
            return Decision(req, "Blocked", [hit], [hit], False, p.thresholds["k_default"], [], [problem])

        jur = p.jurisdictions[req.jurisdiction]
        device_level = req.data_tier >= p.device_level_from_tier

        group = req.location_group
        shifted = jur.get("group_shift", {}).get(group)
        if shifted:
            notes.append(f"{jur['label']} treats {group} as {shifted}")
            group = shifted

        # Step 1: location group
        g = p.location_groups[group]
        cap = g["device_level"] if device_level else g["aggregate"]
        hits.append(RuleHit("location_group", f"LOC_{group}", cap, g["factor"], g["citation"]))

        # Step 2: audience matrix
        band = self._band(req.data_tier)
        am = p.audience_matrix
        hits.append(RuleHit("audience_matrix", f"AUD_{band['label'].upper().replace(' ', '_')}_{req.requester.upper()}",
                            band[req.requester], am["factor"], am["citation"]))

        # Step 3: jurisdiction overrides
        for rule in jur.get("rules", []):
            if _matches(rule.get("when", {}), req, group):
                hits.append(RuleHit("jurisdiction", rule["id"], rule["cap"], rule.get("factor"),
                                    rule["citation"], rule.get("review", False)))

        # Step 4: purpose rules
        for rule in p.purpose_rules:
            if _matches(rule.get("when", {}), req, group):
                hits.append(RuleHit("purpose", rule["id"], rule["cap"], rule.get("factor"),
                                    rule["citation"], rule.get("review", False)))

        # Thresholds
        k = jur.get("k", p.thresholds["k_default"])
        review = any(h.review for h in hits)

        # Step 5: most restrictive wins
        outcome = hits[0].cap
        for h in hits[1:]:
            outcome = p.stricter(h.cap, outcome)

        # Grey areas never go out as Full or Masked
        if review and p.rank(outcome) < p.rank("Aggregate"):
            notes.append(f"Grey area: {outcome} lowered to Aggregate pending human review")
            outcome = "Aggregate"

        deciding = [h for h in hits if h.cap == outcome]
        plan = self._plan(req, outcome)
        return Decision(req, outcome, hits, deciding, review, k, plan, notes)

    def _check_attributes(self, req):
        p = self.policy
        if req.jurisdiction not in p.jurisdictions:
            return f"Unknown jurisdiction '{req.jurisdiction}', no rules exist, failing safe"
        if req.requester not in p.requesters:
            return f"Unknown requester '{req.requester}', failing safe"
        if req.purpose not in p.purposes:
            return f"Unknown purpose '{req.purpose}', failing safe"
        if req.location_group not in p.location_groups:
            return f"Unknown location group '{req.location_group}', failing safe"
        if not isinstance(req.data_tier, int) or not 1 <= req.data_tier <= 7:
            return f"Data tier must be 1 to 7, got {req.data_tier!r}, failing safe"
        return None

    def _band(self, tier):
        for band in self.policy.audience_matrix["bands"]:
            if tier in band["tiers"]:
                return band
        raise ValueError(f"No audience band for tier {tier}")

    def _plan(self, req, outcome):
        t = self.policy.techniques
        if outcome == "Blocked":
            return []
        if req.data_tier < self.policy.device_level_from_tier:
            plan = list(t["aggregate_product_plan"])
            effective = "Aggregate"
        else:
            plan = list(t["plans"][outcome])
            effective = outcome
        for name, conf in t.get("optional", {}).items():
            if conf.get("enabled") and effective in conf.get("applies_to", []):
                plan.append(name)
        return plan
