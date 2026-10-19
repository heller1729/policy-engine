from fastapi import APIRouter, Depends

from engine import techniques
from engine.techniques import REGISTRY
from ..schemas import CatalogOut, PolicyOut, TechniqueOut, TechniqueSampleOut
from ..state import EngineState, get_state

router = APIRouter(tags=["Policy"])


@router.get("/policy", response_model=PolicyOut)
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
        "audience_matrix": {
            "factor": p.audience_matrix.get("factor"),
            "citation": p.audience_matrix["citation"],
            "bands": [
                {"tiers": b["tiers"], "label": b["label"], "cells": {r: b[r] for r in raw["requesters"]}}
                for b in p.audience_matrix["bands"]
            ],
        },
        "jurisdictions": [{"id": j, **conf} for j, conf in p.jurisdictions.items()],
        "purpose_rules": p.purpose_rules,
        "techniques": p.techniques,
    }


@router.get("/catalog", response_model=CatalogOut)
def catalog(state: EngineState = Depends(get_state)):
    c = state.catalog
    return {
        "buffer_m": c.buffer_m,
        "outside_group": c.outside,
        "strictness": c.strictness,
        "places": [{**p, "buffer_m": p.get("buffer_m", c.buffer_m)} for p in c.places],
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


SAMPLE_AREA = "Riyadh"
SHOWN = 6


def _show(rows):
    return [{k: v for k, v in r.items() if k not in ("lat", "lng")} for r in rows[:SHOWN]]


def _sample_rows(data):
    """A few Riyadh rows with every location group present, so drops are visible."""
    rows = [r for r in data if r["area"] == SAMPLE_AREA]
    picked, seen = [], set()
    for r in rows:
        if r["place_group"] not in seen:
            picked.append(r)
            seen.add(r["place_group"])
    return picked + [r for r in rows if r not in picked][: SHOWN - len(picked)]


@router.get("/techniques/samples", response_model=list[TechniqueSampleOut])
def technique_samples(state: EngineState = Depends(get_state)):
    """Each registered technique applied to synthetic rows, before and after."""
    p = state.policy
    ctx = {"k": p.thresholds["k_default"], "h3_resolution": p.thresholds.get("h3_resolution", 7),
           "salt": "demo-salt", "seed": state.noise_seed}
    device_rows = _sample_rows(state.data)
    area_rows = [r for r in state.data if r["area"] == SAMPLE_AREA]
    aggregated = techniques.build("aggregate_h3", p).apply(area_rows, ctx)
    suppressed = techniques.build("suppress_small_cells", p).apply(aggregated, ctx)
    inputs = {"aggregate_h3": area_rows, "suppress_small_cells": aggregated, "laplace_noise": suppressed}

    out = []
    for name, cls in REGISTRY.items():
        rows = inputs.get(name, device_rows)
        result = techniques.build(name, p).apply(rows, ctx)
        if name == "suppress_small_cells":
            kept = {(r["h3_cell"], r["date"], r["home_country"]) for r in result}
            before = sorted(rows, key=lambda r: (r["h3_cell"], r["date"], r["home_country"]) in kept)
        else:
            before = rows
        out.append(TechniqueSampleOut(name=name, factor=cls.factor, description=cls.description,
                                      rows_in=len(rows), rows_out=len(result),
                                      before=_show(before), after=_show(result)))
    return out
