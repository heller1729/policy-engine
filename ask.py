"""Send one request through the engine from the command line.

    python ask.py --tier 6 --requester commercial --jurisdiction saudi_arabia \
                  --purpose advertising --group G1 --area Mecca
"""

import argparse
import json

from demo import show
from engine import AuditLog, EnforcementPoint, Policy, Request
from synthetic import generate


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tier", type=int, required=True)
    ap.add_argument("--requester", required=True)
    ap.add_argument("--jurisdiction", required=True)
    ap.add_argument("--purpose", required=True)
    ap.add_argument("--group", required=True)
    ap.add_argument("--area")
    ap.add_argument("--policy", help="path to a policy file")
    ap.add_argument("--json", action="store_true", help="print the audit record as JSON")
    args = ap.parse_args()

    pep = EnforcementPoint(Policy.load(args.policy), generate(), AuditLog("out/audit.jsonl"))
    req = Request(args.tier, args.requester, args.jurisdiction, args.purpose, args.group, area=args.area)
    rows, decision, record = pep.handle(req)
    if args.json:
        print(json.dumps(record, indent=2))
    else:
        show("Request", rows, decision, record)


if __name__ == "__main__":
    main()
