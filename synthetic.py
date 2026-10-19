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

# Extra public places for the city dataset (python serve.py --city). Coordinates are approximate.
CITY_PLACES = [
    ("Mecca", "Abraj Al Bait mall", "G5", 21.4189, 39.8257),
    ("Mecca", "Aziziyah district", "G5", 21.4030, 39.8600),
    ("Mecca", "Haramain railway station", "G5", 21.3930, 39.7940),
    ("Mecca", "Mina", "G1", 21.4133, 39.8933),
    ("Mecca", "Ajyad hospital", "G1", 21.4205, 39.8275),
    ("Mecca", "Al Nuzha school", "G3", 21.4400, 39.8400),
    ("Riyadh", "Riyadh Park mall", "G5", 24.7560, 46.6300),
    ("Riyadh", "King Fahd stadium", "G5", 24.7890, 46.8390),
    ("Riyadh", "Olaya metro station", "G5", 24.6950, 46.6850),
    ("Riyadh", "Diriyah", "G5", 24.7340, 46.5750),
    ("Riyadh", "Al Rajhi mosque", "G1", 24.7660, 46.7810),
    ("Riyadh", "University campus", "G5", 24.7180, 46.6190),
    ("Dubai", "Dubai Marina", "G5", 25.0800, 55.1400),
    ("Dubai", "Mall of the Emirates", "G5", 25.1180, 55.2000),
    ("Dubai", "Deira souk", "G5", 25.2690, 55.2970),
    ("Dubai", "Jumeirah mosque", "G1", 25.2340, 55.2650),
    ("Dubai", "Dubai airport", "G5", 25.2530, 55.3650),
    ("Dubai", "Children's hospital", "G3", 25.2260, 55.3170),
    ("Doha", "Souq Waqif", "G5", 25.2870, 51.5330),
    ("Doha", "Katara", "G5", 25.3590, 51.5260),
    ("Doha", "Hamad hospital", "G1", 25.2930, 51.5030),
    ("Doha", "Education City", "G5", 25.3170, 51.4400),
    ("Doha", "Corniche", "G5", 25.3000, 51.5200),
    ("Bangkok", "Siam Paragon", "G5", 13.7460, 100.5350),
    ("Bangkok", "Lumphini park", "G5", 13.7310, 100.5410),
    ("Bangkok", "Khao San road", "G5", 13.7590, 100.4970),
    ("Bangkok", "Siriraj hospital", "G1", 13.7590, 100.4850),
    ("Bangkok", "Hua Lamphong station", "G5", 13.7390, 100.5170),
    ("Bangkok", "Wat Arun", "G1", 13.7440, 100.4890),
]

# One major city for each jurisdiction that had no data: US, UK, EU and Japan.
# Generated from a separate random stream after the original cities, so the
# original rows do not change. Hospitals, clinics, schools and offices have
# generic names; coordinates are approximate.
WORLD_PLACES = [
    ("New York", "Times Square", "G5", 40.7580, -73.9855),
    ("New York", "Grand Central Terminal", "G5", 40.7527, -73.9772),
    ("New York", "Central Park", "G5", 40.7829, -73.9654),
    ("New York", "Midtown hospital", "G1", 40.7644, -73.9550),
    ("New York", "Reproductive health clinic", "G2", 40.7390, -73.9900),
    ("New York", "Federal office building", "G4", 40.7155, -74.0039),
    ("London", "Oxford Street", "G5", 51.5152, -0.1419),
    ("London", "King's Cross station", "G5", 51.5308, -0.1238),
    ("London", "Hyde Park", "G5", 51.5073, -0.1657),
    ("London", "Riverside hospital", "G1", 51.4986, -0.1186),
    ("London", "Trade union office", "G2", 51.5246, -0.1340),
    ("London", "Primary school", "G3", 51.5400, -0.1430),
    ("Paris", "Louvre", "G5", 48.8606, 2.3376),
    ("Paris", "Gare du Nord", "G5", 48.8809, 2.3553),
    ("Paris", "Champs Elysees", "G5", 48.8698, 2.3076),
    ("Paris", "Notre Dame", "G1", 48.8530, 2.3499),
    ("Paris", "Addiction treatment centre", "G2", 48.8400, 2.3700),
    ("Paris", "Defence ministry", "G4", 48.8350, 2.2790),
    ("Tokyo", "Shibuya crossing", "G5", 35.6595, 139.7005),
    ("Tokyo", "Tokyo station", "G5", 35.6812, 139.7671),
    ("Tokyo", "Shinjuku Gyoen", "G5", 35.6852, 139.7100),
    ("Tokyo", "Meiji Shrine", "G1", 35.6764, 139.6993),
    ("Tokyo", "Elementary school", "G3", 35.6620, 139.7300),
    ("Tokyo", "Political party office", "G2", 35.6760, 139.7440),
]

HOME_COUNTRIES = {
    "Mecca": {"SAU": 30, "IDN": 20, "PAK": 15, "IND": 10, "EGY": 8, "TUR": 6, "NGA": 5, "GBR": 3, "ISL": 0.3, "FJI": 0.3},
    "Riyadh": {"SAU": 60, "IND": 12, "PAK": 8, "EGY": 8, "USA": 4, "GBR": 3, "JPN": 1, "NOR": 0.3},
    "Dubai": {"ARE": 20, "IND": 30, "PAK": 10, "GBR": 10, "RUS": 8, "USA": 6, "JPN": 2, "CHL": 0.3},
    "Doha": {"QAT": 30, "IND": 25, "NPL": 15, "PHL": 10, "GBR": 5, "EST": 0.3},
    "Bangkok": {"THA": 50, "CHN": 15, "JPN": 8, "USA": 6, "GBR": 5, "DEU": 4, "URY": 0.3},
    "New York": {"USA": 60, "CHN": 6, "IND": 5, "GBR": 5, "MEX": 5, "BRA": 3, "JPN": 3, "ISL": 0.3},
    "London": {"GBR": 55, "IND": 8, "USA": 7, "FRA": 6, "POL": 5, "CHN": 4, "NGA": 3, "FJI": 0.3},
    "Paris": {"FRA": 55, "USA": 8, "GBR": 7, "DEU": 6, "CHN": 5, "ITA": 5, "JPN": 3, "URY": 0.3},
    "Tokyo": {"JPN": 65, "CHN": 10, "KOR": 8, "USA": 5, "TWN": 4, "THA": 3, "AUS": 2, "EST": 0.3},
}

AREA_WEIGHTS = {"Mecca": 3, "Riyadh": 3, "Dubai": 2, "Doha": 1, "Bangkok": 2}
WORLD_WEIGHTS = {"New York": 1, "London": 1, "Paris": 1, "Tokyo": 1}

# Country of each area and the policy jurisdiction that usually applies there.
AREA_INFO = {
    "Mecca": ("SAU", "saudi_arabia"),
    "Riyadh": ("SAU", "saudi_arabia"),
    "Dubai": ("ARE", "uae"),
    "Doha": ("QAT", "qatar"),
    "Bangkok": ("THA", "thailand"),
    "New York": ("USA", "us"),
    "London": ("GBR", "uk"),
    "Paris": ("FRA", "eu"),
    "Tokyo": ("JPN", "japan"),
}


def _jitter(rng, lat, lng, meters=150):
    d = meters / 111_000
    return lat + rng.uniform(-d, d), lng + rng.uniform(-d, d)


def generate(n_devices=3000, start=date(2025, 12, 1), days=7, seed=42, city=False, world=True):
    """city=True adds CITY_PLACES and spreads visits wider, for a fuller map.

    world=True appends New York, London, Paris and Tokyo from a separate random
    stream, so the rows for the original five cities are the same either way.
    """
    spread = 400 if city else 150
    rows = _visits(random.Random(seed), n_devices, AREA_WEIGHTS, PLACES + CITY_PLACES if city else PLACES,
                   spread, start, days)
    if world:
        rows += _visits(random.Random(seed + 1000), round(n_devices * 0.8), WORLD_WEIGHTS, WORLD_PLACES,
                        spread, start, days)
    return rows


def _visits(rng, n_devices, weights, all_places, spread, start, days):
    areas = list(weights)
    rows = []
    for _ in range(n_devices):
        device_id = str(uuid.UUID(int=rng.getrandbits(128), version=4))
        area = rng.choices(areas, weights=[weights[a] for a in areas])[0]
        countries = HOME_COUNTRIES[area]
        home = rng.choices(list(countries), weights=list(countries.values()))[0]
        places = [p for p in all_places if p[0] == area]
        for _ in range(rng.randint(1, 5)):
            _, place, group, lat, lng = rng.choice(places)
            lat, lng = _jitter(rng, lat, lng, spread)
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
