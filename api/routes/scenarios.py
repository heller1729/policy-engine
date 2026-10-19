from fastapi import APIRouter

from scenarios import SCENARIOS
from ..schemas import ScenarioOut

router = APIRouter(tags=["Scenarios"])


@router.get("/scenarios", response_model=list[ScenarioOut])
def scenarios():
    return [
        ScenarioOut(number=s.number, title=s.title, attributes=s.attributes(), expected=s.expected,
                    expected_review=s.expected_review, why=s.why)
        for s in SCENARIOS
    ]
