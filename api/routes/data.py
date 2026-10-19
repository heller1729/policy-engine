from collections import Counter, defaultdict

from fastapi import APIRouter, Depends

from ..state import EngineState, get_state

router = APIRouter(tags=["Synthetic data"])


@router.get("/data/summary", response_model=dict)
def summary(state: EngineState = Depends(get_state)):
    """Shape of the synthetic dataset. Counts only, no device rows."""
    rows = state.data
    areas = defaultdict(lambda: {"rows": 0, "devices": set(), "places": Counter(), "groups": {},
                                 "home_countries": Counter(), "lat": 0.0, "lng": 0.0})
    for r in rows:
        a = areas[r["area"]]
        a["rows"] += 1
        a["devices"].add(r["device_id"])
        a["places"][r["place"]] += 1
        a["groups"][r["place"]] = r["place_group"]
        a["home_countries"][r["home_country"]] += 1
        a["lat"] += r["lat"]
        a["lng"] += r["lng"]

    return {
        "synthetic": True,
        "rows": len(rows),
        "devices": len({r["device_id"] for r in rows}),
        "dates": sorted({r["date"] for r in rows}),
        "areas": [
            {
                "area": name,
                "rows": a["rows"],
                "devices": len(a["devices"]),
                "center": [round(a["lat"] / a["rows"], 4), round(a["lng"] / a["rows"], 4)],
                "places": [{"place": p, "group": a["groups"][p], "rows": n} for p, n in a["places"].most_common()],
                "home_countries": dict(a["home_countries"].most_common()),
            }
            for name, a in sorted(areas.items())
        ],
    }
