import copy
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.main import create_app  # noqa: E402
from engine import DecisionPoint, Policy, PolicyError, Request  # noqa: E402
from scenarios import SCENARIOS  # noqa: E402


@pytest.fixture(scope="module")
def client():
    return TestClient(create_app())


def body(**kw):
    base = dict(data_tier=2, requester="government", jurisdiction="saudi_arabia",
                purpose="tourism", location_group="G1", area="Mecca")
    base.update(kw)
    return base


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: f"scenario_{s.number}")
def test_scenarios_through_api(client, sc):
    r = client.post("/api/request", json=sc.attributes())
    assert r.status_code == 200
    d = r.json()["decision"]
    assert d["outcome"] == sc.expected
    assert d["review"] == sc.expected_review


def test_scenarios_endpoint_lists_all(client):
    data = client.get("/api/scenarios").json()
    assert [s["number"] for s in data] == list(range(1, 14))


def test_decide_does_not_touch_audit(client):
    before = client.get("/api/audit").json()["total"]
    client.post("/api/decide", json=body())
    assert client.get("/api/audit").json()["total"] == before


def test_unknown_attribute_is_blocked_not_an_error(client):
    r = client.post("/api/decide", json=body(jurisdiction="brazil"))
    assert r.status_code == 200
    assert r.json()["outcome"] == "Blocked"
    assert r.json()["deciding_rules"] == ["UNKNOWN_ATTRIBUTE"]


def test_mecca_counts_funnel_and_map(client):
    r = client.post("/api/request", json=body()).json()
    assert [(s["rows_in"], s["rows_out"]) for s in r["steps"]] == [(2373, 2373), (2373, 65), (65, 56)]
    assert r["steps"][0]["technique"] == "place_check"
    assert r["map"]["released_kind"] == "unique_devices"
    assert r["map"]["suppressed"]
    assert all(row["unique_devices"] >= r["decision"]["k"] for row in r["released"]["rows"])


def test_masked_response_has_no_raw_ids(client):
    r = client.post("/api/request", json=body(data_tier=5, requester="commercial", jurisdiction="uae",
                                              purpose="advertising", location_group="G5", area="Dubai"))
    released = r.json()["released"]
    raw_ids = {row["device_id"] for row in client.app.state.engine.data}
    assert released["total"] > 0
    assert all(row["device_id"].startswith("h_") and row["device_id"] not in raw_ids
               for row in released["rows"])


def test_blocked_releases_nothing(client):
    r = client.post("/api/request", json=SCENARIOS[0].attributes()).json()
    assert r["released"]["total"] == 0
    assert r["steps"] == []
    assert r["map"]["released"] == []


def test_paging(client):
    req = body(data_tier=5, requester="commercial", jurisdiction="uae",
               purpose="advertising", location_group="G5", area="Dubai")
    r = client.post("/api/request?offset=10&limit=5", json=req).json()
    assert r["released"]["offset"] == 10
    assert len(r["released"]["rows"]) == 5


def test_matrix_agrees_with_engine(client):
    pdp = DecisionPoint(Policy.load())
    for jur in ("thailand", "saudi_arabia", "us"):
        m = client.post("/api/matrix", json=dict(jurisdiction=jur, purpose="advertising",
                                                  location_group="G2")).json()
        assert len(m["cells"]) == 35
        for c in m["cells"]:
            d = pdp.decide(Request(c["tier"], c["requester"], jur, "advertising", "G2"))
            assert c["outcome"] == d.outcome
            assert c["review"] == d.review


def test_override_cannot_lower_k(client):
    r = client.post("/api/decide", json=body(overrides={"k_min": 2}))
    assert r.status_code == 400


def test_override_raises_k_and_is_audited(client):
    r = client.post("/api/request", json=body(overrides={"k_min": 20})).json()
    assert r["decision"]["k"] == 20
    assert all(row["unique_devices"] >= 20 for row in r["released"]["rows"])
    assert r["audit"]["policy_overrides"] == {"k_min": 20}


def test_noise_override_adds_noise_step(client):
    r = client.post("/api/request", json=body(overrides={"noise": True, "epsilon": 0.5})).json()
    assert r["decision"]["plan"][-1] == "laplace_noise"
    assert all(row.get("noisy") for row in r["released"]["rows"])


def test_override_cannot_loosen_noise_the_policy_requires():
    data = copy.deepcopy(Policy.load().data)
    data["techniques"]["optional"]["laplace_noise"]["enabled"] = True
    strict = Policy(data)
    with pytest.raises(PolicyError):
        strict.with_overrides(noise=False)
    with pytest.raises(PolicyError):
        strict.with_overrides(epsilon=5.0)
    assert strict.with_overrides(epsilon=0.5).overrides == {"epsilon": 0.5}


def test_audit_filter_and_export(client):
    client.post("/api/request", json=SCENARIOS[3].attributes())
    flagged = client.get("/api/audit", params={"review": True}).json()
    assert flagged["total"] >= 1
    assert all(r["review"] for r in flagged["records"])
    rid = flagged["records"][0]["request"]["request_id"]
    assert client.get(f"/api/audit/{rid}").status_code == 200
    export = client.get("/api/audit/export")
    assert export.status_code == 200
    assert len(export.text.strip().splitlines()) == len(client.app.state.engine.audit.records)


def test_policy_and_techniques(client):
    p = client.get("/api/policy").json()
    assert [t["level"] for t in p["tiers"]] == list(range(1, 8))
    assert all(r["citation"] for j in p["jurisdictions"] for r in j.get("rules", []))
    names = {t["name"] for t in client.get("/api/techniques").json()}
    assert {"hash_ids", "aggregate_h3", "suppress_small_cells", "laplace_noise"} <= names


def test_data_summary_has_no_device_ids(client):
    text = client.get("/api/data/summary").text
    assert '"synthetic":true' in text
    assert not any(r["device_id"] in text for r in client.app.state.engine.data)


def test_city_dataset_is_opt_in_and_fuller():
    default = TestClient(create_app()).get("/api/data/summary").json()
    city_client = TestClient(create_app(city=True))
    city = city_client.get("/api/data/summary").json()
    assert default["dataset"] == "default" and city["dataset"] == "city"
    assert city["rows"] > default["rows"]
    r = city_client.post("/api/request", json=body()).json()
    assert r["decision"]["outcome"] == "Aggregate"
    assert len(r["map"]["input"]) > 20


def test_catalog_endpoint(client):
    c = client.get("/api/catalog").json()
    assert c["strictness"][0] == "G1" and c["outside_group"] == "G5"
    assert {p["area"] for p in c["places"]} >= {"Mecca", "New York", "London", "Paris", "Tokyo"}
    assert all(p["group"] in {"G1", "G2", "G3", "G4"} for p in c["places"])


def test_technique_samples(client):
    samples = {t["name"]: t for t in client.get("/api/techniques/samples").json()}
    assert set(samples) >= {"hash_ids", "drop_sensitive_rows", "coarsen_time", "aggregate_h3", "suppress_small_cells"}
    assert all(r["device_id"].startswith("h_") for r in samples["hash_ids"]["after"])
    assert all(r["place_group"] not in ("G1", "G2", "G3", "G4") for r in samples["drop_sensitive_rows"]["after"])
    assert all("hour" not in r for r in samples["coarsen_time"]["after"])
    assert samples["suppress_small_cells"]["rows_out"] < samples["suppress_small_cells"]["rows_in"]
    assert all("lat" not in r for t in samples.values() for r in t["before"] + t["after"])
