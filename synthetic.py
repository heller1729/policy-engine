"""Synthetic visit data shaped like the Phase I tables (device, home country, place, H3 cell, date).

All devices and visits are generated. No real data is used.
"""

import random
import uuid
from datetime import date, timedelta

import h3

PLACES = [
    # area, place, group, lat, lng
    ("Mecca", "Masjid al-Haram", "G1", 21.4225, 39.8262),
    ("Mecca", "Mecca market", "G5", 21.4300, 39.8400),
    ("Riyadh", "Kingdom Centre mall", "G5", 24.7114, 46.6744),
    ("Riyadh", "Specialist hospital", "G1", 24.6706, 46.6773),
    ("Riyadh", "International school", "G3", 24.7400, 46.6500),
    ("Riyadh", "Defence ministry", "G4", 24.6600, 46.7100),
    ("Dubai", "Dubai Mall", "G5", 25.1972, 55.2796),
    ("Dubai", "General hospital", "G1", 25.2371, 55.3166),
    ("Doha", "Villaggio mall", "G5", 25.2600, 51.4430),
    ("Bangkok", "Wat Phra Kaew", "G1", 13.7516, 100.4927),
    ("Bangkok", "Chatuchak market", "G5", 13.7999, 100.5500),
]

HOME_COUNTRIES = {
    "Mecca": {"SAU": 30, "IDN": 20, "PAK": 15, "IND": 10, "EGY": 8, "TUR": 6, "NGA": 5, "GBR": 3, "ISL": 0.3, "FJI": 0.3},
    "Riyadh": {"SAU": 60, "IND": 12, "PAK": 8, "EGY": 8, "USA": 4, "GBR": 3, "JPN": 1, "NOR": 0.3},
    "Dubai": {"ARE": 20, "IND": 30, "PAK": 10, "GBR": 10, "RUS": 8, "USA": 6, "JPN": 2, "CHL": 0.3},
    "Doha": {"QAT": 30, "IND": 25, "NPL": 15, "PHL": 10, "GBR": 5, "EST": 0.3},
    "Bangkok": {"THA": 50, "CHN": 15, "JPN": 8, "USA": 6, "GBR": 5, "DEU": 4, "URY": 0.3},
}

AREA_WEIGHTS = {"Mecca": 3, "Riyadh": 3, "Dubai": 2, "Doha": 1, "Bangkok": 2}


def _jitter(rng, lat, lng, meters=150):
    d = meters / 111_000
    return lat + rng.uniform(-d, d), lng + rng.uniform(-d, d)


def generate(n_devices=3000, start=date(2025, 12, 1), days=7, seed=42):
    rng = random.Random(seed)
    areas = list(AREA_WEIGHTS)
    rows = []
    for _ in range(n_devices):
        device_id = str(uuid.UUID(int=rng.getrandbits(128), version=4))
        area = rng.choices(areas, weights=[AREA_WEIGHTS[a] for a in areas])[0]
        countries = HOME_COUNTRIES[area]
        home = rng.choices(list(countries), weights=list(countries.values()))[0]
        places = [p for p in PLACES if p[0] == area]
        for _ in range(rng.randint(1, 5)):
            _, place, group, lat, lng = rng.choice(places)
            lat, lng = _jitter(rng, lat, lng)
            rows.append({
                "device_id": device_id,
                "home_country": home,
                "area": area,
                "place": place,
                "place_group": group,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "h3_cell": h3.latlng_to_cell(lat, lng, 9),
                "date": (start + timedelta(days=rng.randrange(days))).isoformat(),
                "hour": rng.randrange(24),
            })
    return rows


if __name__ == "__main__":
    import csv
    import sys

    data = generate()
    out = sys.argv[1] if len(sys.argv) > 1 else "synthetic_visits.csv"
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(data[0]))
        w.writeheader()
        w.writerows(data)
    print(f"Wrote {len(data)} rows to {out}")
