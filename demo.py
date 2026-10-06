"""Run the demo scenarios through the policy engine.

    python demo.py              all scenarios
    python demo.py --noise      same, with the Laplace noise module switched on
    python demo.py --only 1     one scenario
"""

import argparse
import copy

from engine import AuditLog, EnforcementPoint, Policy, Request
from synthetic import generate

SCENARIOS = [
    ("Mecca case: advertiser asks for device level Mecca visits",
     Request(6, "commercial", "saudi_arabia", "advertising", "G1", area="Mecca")),
    ("Tourism ministry asks for Mecca visitor counts by home country",
     Request(2, "government", "saudi_arabia", "tourism", "G1", area="Mecca")),
    ("Advertiser asks for visit history at Dubai malls",
     Request(5, "commercial", "uae", "advertising", "G5", area="Dubai")),
    ("Same advertiser request, but in Thailand",
     Request(5, "commercial", "thailand", "advertising", "G5", area="Bangkok")),
    ("Internal team, cybersecurity, raw data near a defence site",
     Request(7, "internal", "saudi_arabia", "cybersecurity", "G4", area="Riyadh")),
    ("Research partner asks for movement trends in Doha",
     Request(3, "research", "qatar", "tourism", "G5", area="Doha")),
    ("Request from a country with no rules yet",
     Request(2, "government", "brazil", "tourism", "G5", area="Riyadh")),
]


def show(title, rows, decision, record, max_rows=6):
    r = decision.request
    print("=" * 78)
    print(title)
    print(f"  Request: tier Lv {r.data_tier}, {r.requester}, {r.jurisdiction}, {r.purpose}, {r.location_group}, area {r.area}")
    print("  Rules fired:")
    for h in decision.hits:
        mark = "*" if h in decision.deciding else " "
        flag = " (review)" if h.review else ""
        factor = f" [{h.factor}]" if h.factor else ""
        print(f"   {mark} {h.step:<15} {h.rule_id:<34} -> {h.cap}{factor}{flag}")
    for n in decision.notes:
        print(f"  Note: {n}")
    print(f"  DECISION: {decision.outcome}" + ("  (flagged for human review)" if decision.review else ""))
    if decision.deciding:
        print(f"  Because: {decision.deciding[0].citation}")
    if record["enforcement"]:
        print("  Enforcement:")
        for s in record["enforcement"]:
            print(f"     {s['technique']:<22} [{s['factor']}]  rows {s['rows_in']} -> {s['rows_out']}")
    print(f"  Released rows: {len(rows)}")
    for row in rows[:max_rows]:
        print("     ", {k: v for k, v in row.items() if k not in ("lat", "lng")})
    if len(rows) > max_rows:
        print(f"      ... {len(rows) - max_rows} more")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--noise", action="store_true", help="switch on the Laplace noise module")
    ap.add_argument("--only", type=int, help="run one scenario by number")
    ap.add_argument("--audit", default="out/audit.jsonl", help="audit log path")
    args = ap.parse_args()

    policy = Policy.load()
    if args.noise:
        data = copy.deepcopy(policy.data)
        data["techniques"]["optional"]["laplace_noise"]["enabled"] = True
        policy = Policy(data)

    pep = EnforcementPoint(policy, generate(), AuditLog(args.audit), seed=7)
    for i, (title, req) in enumerate(SCENARIOS, 1):
        if args.only and i != args.only:
            continue
        rows, decision, record = pep.handle(req)
        show(f"{i}. {title}", rows, decision, record)
    print("=" * 78)
    print(f"Audit log written to {args.audit}")


if __name__ == "__main__":
    main()
