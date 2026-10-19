from typing import Literal, Optional

from pydantic import BaseModel, Field


class Overrides(BaseModel):
    noise: Optional[bool] = None
    epsilon: Optional[float] = None
    k_min: Optional[int] = None


class RequestIn(BaseModel):
    data_tier: int
    requester: str
    jurisdiction: str
    purpose: str
    location_group: str
    area: Optional[str] = None
    overrides: Optional[Overrides] = None


class RuleHitOut(BaseModel):
    step: str
    rule_id: str
    cap: str
    factor: Optional[str]
    citation: str
    review: bool
    deciding: bool


class DecisionOut(BaseModel):
    request_id: str
    outcome: str
    review: bool
    k: int
    plan: list[str]
    hits: list[RuleHitOut]
    deciding_rules: list[str]
    notes: list[str]


class StepOut(BaseModel):
    technique: str
    factor: Optional[str]
    rows_in: int
    rows_out: int


class CellCount(BaseModel):
    cell: str
    count: int


class MapOut(BaseModel):
    released_kind: Literal["none", "device_rows", "unique_devices"]
    input: list[CellCount]
    released: list[CellCount]
    suppressed: list[CellCount]


class ReleasedPage(BaseModel):
    total: int
    offset: int
    limit: int
    rows: list[dict]


class RunOut(BaseModel):
    decision: DecisionOut
    rows_in: int
    steps: list[StepOut]
    released: ReleasedPage
    map: MapOut
    audit: dict


class MatrixIn(BaseModel):
    jurisdiction: str
    purpose: str
    location_group: str
    overrides: Optional[Overrides] = None


class MatrixCell(BaseModel):
    tier: int
    requester: str
    outcome: str
    review: bool
    deciding_rules: list[str]


class MatrixOut(BaseModel):
    jurisdiction: str
    purpose: str
    location_group: str
    tiers: list[int]
    requesters: list[str]
    cells: list[MatrixCell]


class ScenarioOut(BaseModel):
    number: int
    title: str
    attributes: dict
    expected: str
    expected_review: bool
    why: str


class TechniqueOut(BaseModel):
    name: str
    factor: Optional[str]
    description: str
    used_in: list[str] = Field(default_factory=list)
