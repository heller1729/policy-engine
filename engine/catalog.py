"""Place catalog: the location group of a row comes from its own coordinates."""

import math
from pathlib import Path

import yaml

DEFAULT_CATALOG = Path(__file__).resolve().parent.parent / "policy" / "place_catalog.yaml"


def _distance_m(lat1, lng1, lat2, lng2):
    la1, lo1, la2, lo2 = map(math.radians, (lat1, lng1, lat2, lng2))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(h))


class PlaceCatalog:
    def __init__(self, data: dict):
        self.buffer_m = data.get("default_buffer_m", 600)
        self.outside = data.get("outside_group", "G5")
        self.strictness = data["strictness"]
        self.places = data.get("places", [])
        self._cache = {}
        for p in self.places:
            if p["group"] not in self.strictness:
                raise ValueError(f"Place '{p['name']}' has unknown group '{p['group']}'")

    @classmethod
    def load(cls, path=None):
        with open(Path(path or DEFAULT_CATALOG), encoding="utf-8") as f:
            return cls(yaml.safe_load(f))

    def group_for(self, row) -> str:
        """Strictest group whose buffer contains the row. Rows without coordinates fail safe to the strictest group."""
        lat, lng = row.get("lat"), row.get("lng")
        if lat is None or lng is None:
            return self.strictness[0]
        key = (lat, lng)
        if key not in self._cache:
            self._cache[key] = self._lookup(lat, lng)
        return self._cache[key]

    def _lookup(self, lat, lng):
        best = self.outside
        for p in self.places:
            if self.strictness.index(p["group"]) >= self.strictness.index(best):
                continue
            if _distance_m(lat, lng, p["lat"], p["lng"]) <= p.get("buffer_m", self.buffer_m):
                best = p["group"]
        return best
