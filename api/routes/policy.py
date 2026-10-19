from fastapi import APIRouter, Depends

from engine import techniques
from ..schemas import TechniqueOut
from ..state import EngineState, get_state

router = APIRouter()


@router.get("/policy")
def policy(state: EngineState = Depends(get_state)):
    p = state.policy
    raw = p.data
    band_of = {t: band["label"] for band in p.audience_matrix["bands"] for t in band["tiers"]}
    names = raw.get("tier_names", {})
    return {
        "version": raw.get("version"),
        "decisions": p.decisions,
        "device_level_from_tier": p.device_level_from_tier,
        "tiers": [
            {"level": t, "name": names.get(t, f"Lv {t}"), "band": band_of[t],
             "device_level": t >= p.device_level_from_tier}
            for t in sorted(band_of)
        ],
        "requesters": list(raw["requesters"]),
        "purposes": list(raw["purposes"]),
        "thresholds": p.thresholds,
        "location_groups": [{"id": g, **conf} for g, conf in p.location_groups.items()],
        "audience_matrix": p.audience_matrix,
        "jurisdictions": [{"id": j, **conf} for j, conf in p.jurisdictions.items()],
        "purpose_rules": p.purpose_rules,
        "techniques": p.techniques,
    }


@router.get("/techniques", response_model=list[TechniqueOut])
def technique_list(state: EngineState = Depends(get_state)):
    t = state.policy.techniques
    used = {}
    for decision, plan in t["plans"].items():
        for name in plan:
            used.setdefault(name, []).append(f"plans.{decision}")
    for name in t.get("aggregate_product_plan", []):
        used.setdefault(name, []).append("aggregate_product_plan")
    for name in t.get("optional", {}):
        used.setdefault(name, []).append("optional")
    return [
        TechniqueOut(name=name, factor=cls.factor, description=cls.description, used_in=used.get(name, []))
        for name, cls in techniques.REGISTRY.items()
    ]
