from pathlib import Path
import yaml

DEFAULT_POLICY = Path(__file__).resolve().parent.parent / "policy" / "policy.yaml"


class PolicyError(ValueError):
    pass


class Policy:
    def __init__(self, data: dict):
        self.data = data
        self.decisions = data["decisions"]
        self._rank = {d: i for i, d in enumerate(self.decisions)}
        self.device_level_from_tier = data["device_level_from_tier"]
        self.requesters = set(data["requesters"])
        self.purposes = set(data["purposes"])
        self.thresholds = data["thresholds"]
        self.location_groups = data["location_groups"]
        self.audience_matrix = data["audience_matrix"]
        self.jurisdictions = data["jurisdictions"]
        self.purpose_rules = data.get("purpose_rules", [])
        self.techniques = data["techniques"]
        self._validate()

    @classmethod
    def load(cls, path=None):
        path = Path(path or DEFAULT_POLICY)
        with open(path) as f:
            return cls(yaml.safe_load(f))

    def rank(self, decision: str) -> int:
        return self._rank[decision]

    def stricter(self, a: str, b: str) -> str:
        return a if self.rank(a) >= self.rank(b) else b

    def _validate(self):
        known = set(self.decisions)

        def check(value, where):
            if value not in known:
                raise PolicyError(f"Unknown decision '{value}' in {where}")

        for g, rule in self.location_groups.items():
            check(rule["device_level"], f"location_groups.{g}")
            check(rule["aggregate"], f"location_groups.{g}")
        for band in self.audience_matrix["bands"]:
            for r in self.requesters:
                if r not in band:
                    raise PolicyError(f"Audience matrix band {band['tiers']} missing requester '{r}'")
                check(band[r], f"audience_matrix {band['tiers']}.{r}")
        for j, conf in self.jurisdictions.items():
            for rule in conf.get("rules", []):
                check(rule["cap"], f"jurisdictions.{j}.{rule['id']}")
        for rule in self.purpose_rules:
            check(rule["cap"], f"purpose_rules.{rule['id']}")
        for d in self.techniques["plans"]:
            check(d, "techniques.plans")
