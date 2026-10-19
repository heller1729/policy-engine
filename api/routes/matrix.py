from fastapi import APIRouter, Depends

from engine import DecisionPoint, Request
from ..schemas import MatrixCell, MatrixIn, MatrixOut
from ..state import EngineState, get_state

router = APIRouter(tags=["Who sees what"])


@router.post("/matrix", response_model=MatrixOut)
def matrix(body: MatrixIn, state: EngineState = Depends(get_state)):
    """Outcome for every tier and requester after all rules apply, not the raw audience matrix."""
    policy = state.policy_for(body.overrides)
    pdp = DecisionPoint(policy)
    tiers = sorted(t for band in policy.audience_matrix["bands"] for t in band["tiers"])
    requesters = list(policy.data["requesters"])
    cells = []
    for tier in tiers:
        for requester in requesters:
            d = pdp.decide(Request(tier, requester, body.jurisdiction, body.purpose, body.location_group))
            cells.append(MatrixCell(tier=tier, requester=requester, outcome=d.outcome, review=d.review,
                                    deciding_rules=[h.rule_id for h in d.deciding]))
    return MatrixOut(jurisdiction=body.jurisdiction, purpose=body.purpose,
                     location_group=body.location_group, tiers=tiers, requesters=requesters, cells=cells)
