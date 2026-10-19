import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse

from ..state import EngineState, get_state

router = APIRouter()


def _filtered(records, outcome, review, jurisdiction):
    for r in records:
        if outcome and r["outcome"] != outcome:
            continue
        if review is not None and r["review"] != review:
            continue
        if jurisdiction and r["request"]["jurisdiction"] != jurisdiction:
            continue
        yield r


@router.get("/audit")
def audit(
    outcome: Optional[str] = None,
    review: Optional[bool] = None,
    jurisdiction: Optional[str] = None,
    limit: int = Query(200, ge=1, le=5000),
    state: EngineState = Depends(get_state),
):
    """Records written since the server started, newest first."""
    records = list(_filtered(reversed(state.audit.records), outcome, review, jurisdiction))
    return {"total": len(records), "records": records[:limit]}


@router.get("/audit/export", response_class=PlainTextResponse)
def export(state: EngineState = Depends(get_state)):
    body = "".join(json.dumps(r) + "\n" for r in state.audit.records)
    return PlainTextResponse(body, media_type="application/x-ndjson",
                             headers={"Content-Disposition": "attachment; filename=audit.jsonl"})


@router.get("/audit/{request_id}")
def audit_record(request_id: str, state: EngineState = Depends(get_state)):
    for r in state.audit.records:
        if r["request"]["request_id"] == request_id:
            return r
    raise HTTPException(status_code=404, detail=f"No audit record for request {request_id}")
