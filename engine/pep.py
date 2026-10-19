"""Policy Enforcement Point: stops each request, asks the PDP, applies the plan."""

from collections import Counter
from dataclasses import dataclass, field, replace

from . import techniques
from .audit import AuditLog
from .catalog import PlaceCatalog
from .pdp import DecisionPoint
from .policy import Policy


@dataclass
class Run:
    rows: list
    decision: object
    record: dict
    scoped: list = field(default_factory=list)
    stages: list = field(default_factory=list)


class EnforcementPoint:
    def __init__(self, policy: Policy, data, audit: AuditLog = None, salt="demo-salt", seed=None,
                 catalog: PlaceCatalog = None):
        self.policy = policy
        self.pdp = DecisionPoint(policy)
        self.data = data
        self.audit = audit or AuditLog()
        self.salt = salt
        self.seed = seed
        self.catalog = catalog or PlaceCatalog.load()

    def handle(self, req):
        run = self.run(req)
        return run.rows, run.decision, run.record

    def run(self, req, trace=False):
        """Like handle, but with trace=True also keeps the scoped input and the rows after each step."""
        decision = self.pdp.decide(req)
        rows = self._scope(req)
        steps, stages = [], []

        if decision.outcome == "Blocked":
            result = []
        else:
            ctx = {
                "k": decision.k,
                "h3_resolution": self.policy.thresholds.get("h3_resolution", 7),
                "salt": self.salt,
                "seed": self.seed,
            }
            result, step = self._place_check(req, decision, rows)
            steps.append(step)
            if trace:
                stages.append(result)
            for name in decision.plan:
                t = techniques.build(name, self.policy)
                before = len(result)
                result = t.apply(result, ctx)
                steps.append({"technique": name, "factor": t.factor, "rows_in": before, "rows_out": len(result)})
                if trace:
                    stages.append(result)

        record = self.audit.write(decision, steps, self.policy.overrides)
        return Run(result, decision, record, rows if trace else [], stages)

    def _place_check(self, req, decision, rows):
        """Withhold rows whose own location group would get a stricter decision than this release."""
        p = self.policy
        effective = decision.outcome
        if req.data_tier < p.device_level_from_tier:
            effective = p.stricter("Aggregate", effective)
        groups = [self.catalog.group_for(r) for r in rows]
        withheld = {}
        for group, n in sorted(Counter(groups).items()):
            d = self.pdp.decide(replace(req, location_group=group))
            if p.rank(d.outcome) > p.rank(effective):
                withheld[group] = {"rows": n, "cap": d.outcome, "rules": [h.rule_id for h in d.deciding]}
        kept = [r for r, g in zip(rows, groups) if g not in withheld]
        step = {"technique": "place_check", "factor": "B3", "rows_in": len(rows), "rows_out": len(kept),
                "withheld": withheld}
        return kept, step

    def _scope(self, req):
        if req.area is None:
            return list(self.data)
        return [r for r in self.data if r["area"] == req.area]
