import copy
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
        self.overrides = {}
        self._validate()

    @classmethod
    def load(cls, path=None):
        path = Path(path or DEFAULT_POLICY)
        with open(path) as f:
            return cls(yaml.safe_load(f))

    def with_overrides(self, noise=None, epsilon=None, k_min=None):
        """A copy of the policy for a what if run. Overrides can add noise or raise k, never loosen a rule."""
        data = copy.deepcopy(self.data)
        applied = {}
        if noise is not None or epsilon is not None:
            module = data["techniques"].get("optional", {}).get("laplace_noise")
            if module is None:
                raise PolicyError("Policy has no laplace_noise module to override")
            required = module.get("enabled", False)
            if noise is not None:
                if required and not noise:
                    raise PolicyError("The policy enables laplace_noise, an override cannot switch it off")
                module["enabled"] = bool(noise)
                applied["noise"] = bool(noise)
            if epsilon is not None:
                if epsilon <= 0:
                    raise PolicyError("epsilon must be greater than 0")
                if required and epsilon > float(module.get("epsilon", 1.0)):
                    raise PolicyError("The policy enables laplace_noise, an override can only lower epsilon")
                module["epsilon"] = float(epsilon)
                applied["epsilon"] = float(epsilon)
        if k_min is not None:
            current = data["thresholds"]["k_default"]
            if k_min < current:
                raise PolicyError(f"k can only be raised, k_min {k_min} is below the default {current}")
            data["thresholds"]["k_default"] = k_min
            for conf in data["jurisdictions"].values():
                conf["k"] = max(conf.get("k", current), k_min)
            applied["k_min"] = k_min
        policy = Policy(data)
        policy.overrides = applied
        return policy

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
