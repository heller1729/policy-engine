from collections import Counter

from fastapi import APIRouter, Depends, Query

from engine import DecisionPoint, EnforcementPoint, Request
from ..schemas import CellCount, DecisionOut, MapOut, ReleasedPage, RequestIn, RuleHitOut, RunOut, StepOut
from ..state import EngineState, get_state

router = APIRouter()


def to_request(body: RequestIn) -> Request:
    return Request(body.data_tier, body.requester, body.jurisdiction, body.purpose,
                   body.location_group, area=body.area)


def decision_out(d) -> DecisionOut:
    deciding = {id(h) for h in d.deciding}
    return DecisionOut(
        request_id=d.request.request_id,
        outcome=d.outcome,
        review=d.review,
        k=d.k,
        plan=d.plan,
        hits=[RuleHitOut(**h.to_dict(), deciding=id(h) in deciding) for h in d.hits],
        deciding_rules=[h.rule_id for h in d.deciding],
        notes=d.notes,
    )


def _cells(counter: Counter) -> list[CellCount]:
    return [CellCount(cell=c, count=n) for c, n in sorted(counter.items())]


def _count_cells(rows) -> Counter:
    counts = Counter()
    for r in rows:
        if "unique_devices" in r:
            counts[r["h3_cell"]] += r["unique_devices"]
        elif "h3_cell" in r:
            counts[r["h3_cell"]] += 1
    return counts


def build_map(run) -> MapOut:
    rows = run.rows
    if not rows:
        kind = "none"
    elif "unique_devices" in rows[0]:
        kind = "unique_devices"
    else:
        kind = "device_rows"

    suppressed = Counter()
    plan = run.decision.plan
    if "suppress_small_cells" in plan:
        i = plan.index("suppress_small_cells")
        before = run.stages[i - 1] if i > 0 else run.scoped
        after = run.stages[i]
        kept = {(r["h3_cell"], r["date"], r["home_country"]) for r in after}
        suppressed = _count_cells(
            r for r in before if (r["h3_cell"], r["date"], r["home_country"]) not in kept
        )

    return MapOut(
        released_kind=kind,
        input=_cells(_count_cells(run.scoped)),
        released=_cells(_count_cells(rows)),
        suppressed=_cells(suppressed),
    )


@router.post("/decide", response_model=DecisionOut)
def decide(body: RequestIn, state: EngineState = Depends(get_state)):
    """Decision only. Nothing is read from the data and nothing is written to the audit log."""
    policy = state.policy_for(body.overrides)
    return decision_out(DecisionPoint(policy).decide(to_request(body)))


@router.post("/request", response_model=RunOut)
def run_request(
    body: RequestIn,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    state: EngineState = Depends(get_state),
):
    policy = state.policy_for(body.overrides)
    pep = EnforcementPoint(policy, state.data, state.audit, seed=state.noise_seed)
    run = pep.run(to_request(body), trace=True)
    return RunOut(
        decision=decision_out(run.decision),
        rows_in=len(run.scoped),
        steps=[StepOut(**s) for s in run.record["enforcement"]],
        released=ReleasedPage(total=len(run.rows), offset=offset, limit=limit,
                              rows=run.rows[offset:offset + limit]),
        map=build_map(run),
        audit=run.record,
    )
