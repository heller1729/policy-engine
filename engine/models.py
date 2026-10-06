from dataclasses import dataclass, field, asdict
from typing import Optional
import uuid


@dataclass
class Request:
    data_tier: int
    requester: str
    jurisdiction: str
    purpose: str
    location_group: str
    area: Optional[str] = None
    request_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])

    def to_dict(self):
        return asdict(self)


@dataclass
class RuleHit:
    step: str
    rule_id: str
    cap: str
    factor: Optional[str]
    citation: str
    review: bool = False

    def to_dict(self):
        return asdict(self)


@dataclass
class Decision:
    request: Request
    outcome: str
    hits: list
    deciding: list
    review: bool
    k: int
    plan: list
    notes: list = field(default_factory=list)

    def to_dict(self):
        return {
            "request": self.request.to_dict(),
            "outcome": self.outcome,
            "review": self.review,
            "k": self.k,
            "plan": self.plan,
            "deciding_rules": [h.rule_id for h in self.deciding],
            "rules_fired": [h.to_dict() for h in self.hits],
            "notes": self.notes,
        }
