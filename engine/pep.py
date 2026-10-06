"""Policy Enforcement Point: stops each request, asks the PDP, applies the plan."""

from . import techniques
from .audit import AuditLog
from .pdp import DecisionPoint
from .policy import Policy


class EnforcementPoint:
    def __init__(self, policy: Policy, data, audit: AuditLog = None, salt="demo-salt", seed=None):
        self.policy = policy
        self.pdp = DecisionPoint(policy)
        self.data = data
        self.audit = audit or AuditLog()
        self.salt = salt
        self.seed = seed

    def handle(self, req):
        decision = self.pdp.decide(req)
        rows = self._scope(req)
        steps = []

        if decision.outcome == "Blocked":
            result = []
        else:
            ctx = {
                "k": decision.k,
                "h3_resolution": self.policy.thresholds.get("h3_resolution", 7),
                "salt": self.salt,
                "seed": self.seed,
            }
            result = rows
            for name in decision.plan:
                t = techniques.build(name, self.policy)
                before = len(result)
                result = t.apply(result, ctx)
                steps.append({"technique": name, "factor": t.factor, "rows_in": before, "rows_out": len(result)})

        record = self.audit.write(decision, steps)
        return result, decision, record

    def _scope(self, req):
        if req.area is None:
            return list(self.data)
        return [r for r in self.data if r["area"] == req.area]
