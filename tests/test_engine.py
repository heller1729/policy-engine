import copy
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine import DecisionPoint, EnforcementPoint, PlaceCatalog, Policy, PolicyError, Request  # noqa: E402
from synthetic import AREA_INFO, AREA_WEIGHTS, generate  # noqa: E402


@pytest.fixture(scope="module")
def policy():
    return Policy.load()


@pytest.fixture(scope="module")
def pdp(policy):
    return DecisionPoint(policy)


@pytest.fixture(scope="module")
def data():
    return generate(n_devices=1500, seed=1)


def decide(pdp, *args, **kw):
    return pdp.decide(Request(*args, **kw))


def test_mecca_case_blocked(pdp):
    d = decide(pdp, 6, "commercial", "saudi_arabia", "advertising", "G1")
    assert d.outcome == "Blocked"
    assert "LOC_G1" in [h.rule_id for h in d.deciding]
    assert d.plan == []


def test_mecca_counts_for_tourism_are_aggregate(pdp):
    d = decide(pdp, 2, "government", "saudi_arabia", "tourism", "G1")
    assert d.outcome == "Aggregate"
    assert d.plan == ["aggregate_h3", "suppress_small_cells"]


def test_everyday_place_area_stats_full(pdp):
    d = decide(pdp, 1, "public", "qatar", "tourism", "G5")
    assert d.outcome == "Full"
    assert d.plan == ["aggregate_h3", "suppress_small_cells"]


def test_commercial_device_logs_masked(pdp):
    d = decide(pdp, 5, "commercial", "uae", "advertising", "G5")
    assert d.outcome == "Masked"
    assert d.plan == ["hash_ids", "drop_sensitive_rows", "coarsen_time"]


def test_thailand_grey_area_goes_to_aggregate_with_review(pdp):
    d = decide(pdp, 5, "commercial", "thailand", "advertising", "G5")
    assert d.outcome == "Aggregate"
    assert d.review is True


def test_thailand_area_stats_follow_the_baseline(pdp):
    d = decide(pdp, 1, "public", "thailand", "tourism", "G5")
    assert d.review is False
    assert d.outcome == "Full"
    assert d.k == 5


def test_jurisdiction_k_is_a_policy_value(policy):
    data = copy.deepcopy(policy.data)
    data["jurisdictions"]["thailand"]["k"] = 12
    assert DecisionPoint(Policy(data)).decide(Request(2, "government", "thailand", "tourism", "G5")).k == 12


def test_us_blocks_ads_near_clinics(pdp):
    d = decide(pdp, 2, "commercial", "us", "advertising", "G2")
    assert d.outcome == "Blocked"


def test_ads_blocked_near_schools(pdp):
    d = decide(pdp, 1, "commercial", "eu", "advertising", "G3")
    assert d.outcome == "Blocked"


def test_saudi_shifts_g2_to_g1(pdp):
    d = decide(pdp, 4, "internal", "saudi_arabia", "cybersecurity", "G2")
    assert d.hits[0].rule_id == "LOC_G1"
    assert d.outcome == "Blocked"


def test_unknown_jurisdiction_fails_safe(pdp):
    d = decide(pdp, 1, "public", "brazil", "tourism", "G5")
    assert d.outcome == "Blocked"


@pytest.mark.parametrize("field,value", [
    ("requester", "broker"), ("purpose", "insurance"), ("location_group", "G9"), ("data_tier", 8),
])
def test_unknown_attributes_fail_safe(pdp, field, value):
    kw = dict(data_tier=2, requester="public", jurisdiction="uae", purpose="tourism", location_group="G5")
    kw[field] = value
    assert pdp.decide(Request(**kw)).outcome == "Blocked"


def test_most_restrictive_wins_everywhere(policy, pdp):
    for tier in range(1, 8):
        for requester in policy.requesters:
            for jur in policy.jurisdictions:
                for purpose in policy.purposes:
                    for group in policy.location_groups:
                        d = decide(pdp, tier, requester, jur, purpose, group)
                        strictest = max(policy.rank(h.cap) for h in d.hits)
                        assert policy.rank(d.outcome) >= strictest


def test_suppression_removes_small_cells(policy, data):
    pep = EnforcementPoint(policy, data)
    rows, d, _ = pep.handle(Request(2, "government", "saudi_arabia", "tourism", "G1", area="Mecca"))
    assert rows
    assert all(r["unique_devices"] >= d.k for r in rows)
    assert all("device_id" not in r for r in rows)


def test_masked_output_has_no_raw_ids_or_sensitive_rows(policy, data):
    pep = EnforcementPoint(policy, data)
    rows, _, _ = pep.handle(Request(5, "commercial", "uae", "advertising", "G5", area="Dubai"))
    raw_ids = {r["device_id"] for r in data}
    assert rows
    assert all(r["device_id"].startswith("h_") and r["device_id"] not in raw_ids for r in rows)
    assert all(r["place_group"] not in ("G1", "G2") for r in rows)
    assert all("hour" not in r for r in rows)


def test_blocked_releases_nothing(policy, data):
    pep = EnforcementPoint(policy, data)
    rows, _, record = pep.handle(Request(6, "commercial", "saudi_arabia", "advertising", "G1", area="Mecca"))
    assert rows == []
    assert record["enforcement"] == []


def test_audit_record_carries_reason(policy, data):
    pep = EnforcementPoint(policy, data)
    _, _, record = pep.handle(Request(6, "commercial", "saudi_arabia", "advertising", "G1", area="Mecca"))
    assert record["outcome"] == "Blocked"
    assert "LOC_G1" in record["deciding_rules"]
    assert any("Art 9" in h["citation"] for h in record["rules_fired"])


def test_noise_module_switches_on_from_policy_only(policy):
    data = copy.deepcopy(policy.data)
    data["techniques"]["optional"]["laplace_noise"]["enabled"] = True
    d = DecisionPoint(Policy(data)).decide(Request(3, "research", "qatar", "tourism", "G5"))
    assert d.plan[-1] == "laplace_noise"


def test_policy_rejects_unknown_decision(policy):
    data = copy.deepcopy(policy.data)
    data["location_groups"]["G5"]["aggregate"] = "Sometimes"
    with pytest.raises(PolicyError):
        Policy(data)


def test_unregistered_technique_is_an_error(policy, data):
    raw = copy.deepcopy(policy.data)
    raw["techniques"]["plans"]["Masked"] = ["hash_ids", "homomorphic_encrypt"]
    pep = EnforcementPoint(Policy(raw), data)
    with pytest.raises(KeyError):
        pep.handle(Request(5, "commercial", "uae", "advertising", "G5", area="Dubai"))


def test_drop_sensitive_rows_covers_g1_to_g4(policy):
    from engine.techniques import build
    rows = [{"place_group": g} for g in ("G1", "G2", "G3", "G4", "G5")]
    out = build("drop_sensitive_rows", policy).apply(rows, {})
    assert [r["place_group"] for r in out] == ["G5"]


def test_catalog_matches_synthetic_labels():
    catalog = PlaceCatalog.load()
    for r in generate(n_devices=1500, seed=3):
        assert catalog.group_for(r) == r["place_group"]


def test_row_without_coordinates_fails_safe_to_g1():
    assert PlaceCatalog.load().group_for({"device_id": "x"}) == "G1"


def test_place_check_withholds_rows_by_their_own_group(policy, data):
    pep = EnforcementPoint(policy, data)
    rows, d, record = pep.handle(Request(5, "commercial", "uae", "advertising", "G5", area="Riyadh"))
    check = record["enforcement"][0]
    assert d.outcome == "Masked"
    assert check["technique"] == "place_check"
    assert set(check["withheld"]) == {"G1", "G3", "G4"}
    assert "ADS_NO_VULNERABLE_TARGETING" in check["withheld"]["G3"]["rules"]
    assert rows and all(r["place_group"] == "G5" for r in rows)


def test_no_released_row_is_looser_than_its_own_group(policy):
    small = generate(n_devices=300, seed=5)
    catalog = PlaceCatalog.load()
    pep = EnforcementPoint(policy, small, catalog=catalog)
    pdp = DecisionPoint(policy)
    for tier in (4, 5, 6, 7):
        for requester in policy.requesters:
            for jur in policy.jurisdictions:
                for purpose in policy.purposes:
                    req = Request(tier, requester, jur, purpose, "G5", area="Riyadh")
                    run = pep.run(req, trace=True)
                    if run.decision.outcome in ("Blocked", "Aggregate"):
                        continue
                    for r in run.stages[0]:
                        g = catalog.group_for(r)
                        own = pdp.decide(Request(tier, requester, jur, purpose, g)).outcome
                        assert policy.rank(own) <= policy.rank(run.decision.outcome), (req, g)


def test_world_cities_do_not_change_original_rows():
    with_world = [r for r in generate(n_devices=400, seed=9) if r["area"] in AREA_WEIGHTS]
    assert with_world == generate(n_devices=400, seed=9, world=False)


def test_every_jurisdiction_has_a_city(policy):
    covered = {AREA_INFO[a][1] for a in {r["area"] for r in generate(n_devices=400, seed=9)}}
    assert set(policy.jurisdictions) <= covered
