"""Privacy technique modules.

Each technique takes rows (list of dicts) plus a context and returns new rows.
New techniques (secure aggregation, encryption, synthetic data, ...) are added
by registering a class here and naming it in the policy file.
"""

import hashlib
import hmac
import math
import os
import random
from collections import defaultdict

import h3

REGISTRY = {}


def register(cls):
    REGISTRY[cls.name] = cls
    return cls


class Technique:
    name = ""
    factor = None
    description = ""

    def __init__(self, settings: dict, conf: dict = None):
        self.settings = settings
        self.conf = conf or {}

    def apply(self, rows, ctx):
        raise NotImplementedError


@register
class HashIds(Technique):
    name = "hash_ids"
    factor = "A2"
    description = "Replace device and ad IDs with a salted HMAC"

    def apply(self, rows, ctx):
        salt = os.environ.get(self.settings.get("hash_salt_env", ""), "") or ctx.get("salt", "demo-salt")
        key = salt.encode()
        out = []
        for r in rows:
            r = dict(r)
            digest = hmac.new(key, r["device_id"].encode(), hashlib.sha256).hexdigest()
            r["device_id"] = "h_" + digest[:16]
            out.append(r)
        return out


@register
class DropSensitiveRows(Technique):
    name = "drop_sensitive_rows"
    factor = "B2, B3"
    description = "Remove device level rows at sensitive places"

    def apply(self, rows, ctx):
        groups = set(ctx.get("sensitive_groups") or self.settings.get("sensitive_groups", ["G1", "G2"]))
        return [r for r in rows if r["place_group"] not in groups]


@register
class CoarsenTime(Technique):
    name = "coarsen_time"
    factor = "E2"
    description = "Drop the hour so only the date is kept"

    def apply(self, rows, ctx):
        out = []
        for r in rows:
            r = dict(r)
            r.pop("hour", None)
            out.append(r)
        return out


@register
class AggregateH3(Technique):
    name = "aggregate_h3"
    factor = "E1, E4"
    description = "Count unique devices per H3 cell, date and home country"

    def apply(self, rows, ctx):
        res = ctx.get("h3_resolution", 7)
        buckets = defaultdict(set)
        for r in rows:
            cell = r["h3_cell"]
            if h3.get_resolution(cell) > res:
                cell = h3.cell_to_parent(cell, res)
            buckets[(cell, r["date"], r["home_country"])].add(r["device_id"])
        return [
            {"h3_cell": cell, "date": date, "home_country": hc, "unique_devices": len(devs)}
            for (cell, date, hc), devs in sorted(buckets.items())
        ]


@register
class SuppressSmallCells(Technique):
    name = "suppress_small_cells"
    factor = "E3"
    description = "Remove any cell with fewer than k devices"

    def apply(self, rows, ctx):
        k = ctx["k"]
        return [r for r in rows if r["unique_devices"] >= k]


@register
class LaplaceNoise(Technique):
    name = "laplace_noise"
    factor = "E5"
    description = "Add Laplace noise to counts (differential privacy, experimental)"

    def apply(self, rows, ctx):
        epsilon = float(self.conf.get("epsilon", 1.0))
        rng = random.Random(ctx.get("seed"))
        out = []
        for r in rows:
            r = dict(r)
            u = rng.random() - 0.5
            noise = -(1 / epsilon) * math.copysign(1, u) * math.log(1 - 2 * abs(u))
            r["unique_devices"] = max(0, round(r["unique_devices"] + noise))
            r["noisy"] = True
            out.append(r)
        return out


def build(name, policy):
    if name not in REGISTRY:
        raise KeyError(f"Technique '{name}' is named in the policy but not registered")
    t = policy.techniques
    conf = t.get("optional", {}).get(name, {})
    return REGISTRY[name](t.get("settings", {}), conf)
