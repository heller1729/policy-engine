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


class WithheldGroup(BaseModel):
    rows: int
    cap: str
    rules: list[str]


class StepOut(BaseModel):
    technique: str
    factor: Optional[str]
    rows_in: int
    rows_out: int
    withheld: Optional[dict[str, WithheldGroup]] = None


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


class TierOut(BaseModel):
    level: int
    name: str
    band: str
    device_level: bool


class LocationGroupOut(BaseModel):
    id: str
    name: str
    device_level: str
    aggregate: str
    factor: Optional[str]
    citation: str


class RuleOut(BaseModel):
    id: str
    when: dict = Field(default_factory=dict)
    cap: str
    review: bool = False
    factor: Optional[str] = None
    citation: str


class JurisdictionOut(BaseModel):
    id: str
    label: str
    k: int
    k_review: bool = False
    group_shift: dict[str, str] = Field(default_factory=dict)
    rules: list[RuleOut] = Field(default_factory=list)


class AudienceBandOut(BaseModel):
    tiers: list[int]
    label: str
    cells: dict[str, str]


class AudienceMatrixOut(BaseModel):
    factor: Optional[str]
    citation: str
    bands: list[AudienceBandOut]


class TechniquesConfigOut(BaseModel):
    plans: dict[str, list[str]]
    aggregate_product_plan: list[str]
    optional: dict[str, dict] = Field(default_factory=dict)
    settings: dict = Field(default_factory=dict)


class PolicyOut(BaseModel):
    version: Optional[str]
    decisions: list[str]
    device_level_from_tier: int
    tiers: list[TierOut]
    requesters: list[str]
    purposes: list[str]
    thresholds: dict[str, int]
    location_groups: list[LocationGroupOut]
    audience_matrix: AudienceMatrixOut
    jurisdictions: list[JurisdictionOut]
    purpose_rules: list[RuleOut]
    techniques: TechniquesConfigOut


class CatalogPlaceOut(BaseModel):
    name: str
    area: str
    group: str
    lat: float
    lng: float
    buffer_m: int


class CatalogOut(BaseModel):
    buffer_m: int
    outside_group: str
    strictness: list[str]
    places: list[CatalogPlaceOut]


class AuditListOut(BaseModel):
    total: int
    records: list[dict]


class PlaceOut(BaseModel):
    place: str
    group: str
    rows: int


class AreaSummaryOut(BaseModel):
    area: str
    country: str
    jurisdiction: str
    rows: int
    devices: int
    center: list[float]
    places: list[PlaceOut]
    home_countries: dict[str, int]


class DataSummaryOut(BaseModel):
    synthetic: bool
    dataset: str
    rows: int
    devices: int
    dates: list[str]
    areas: list[AreaSummaryOut]
