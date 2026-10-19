"""One policy, one synthetic dataset and one audit log per server."""

from fastapi import HTTPException, Request as HttpRequest

from engine import AuditLog, PlaceCatalog, Policy, PolicyError
from synthetic import generate


class EngineState:
    def __init__(self, policy_path=None, audit_path=None, city=False, seed=42):
        self.policy = Policy.load(policy_path)
        self.city = city
        self.data = generate(n_devices=8000 if city else 3000, seed=seed, city=city)
        self.audit = AuditLog(audit_path)
        self.catalog = PlaceCatalog.load()
        self.noise_seed = 7

    def policy_for(self, overrides):
        if overrides is None:
            return self.policy
        values = overrides.model_dump(exclude_none=True)
        if not values:
            return self.policy
        try:
            return self.policy.with_overrides(**values)
        except PolicyError as e:
            raise HTTPException(status_code=400, detail=str(e))


def get_state(request: HttpRequest) -> EngineState:
    return request.app.state.engine
