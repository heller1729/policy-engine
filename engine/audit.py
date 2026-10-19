import json
from datetime import datetime, timezone
from pathlib import Path


class AuditLog:
    def __init__(self, path=None):
        self.path = Path(path) if path else None
        self.records = []

    def write(self, decision, steps, overrides=None):
        record = {
            "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            **decision.to_dict(),
            "enforcement": steps,
        }
        if overrides:
            record["policy_overrides"] = overrides
        self.records.append(record)
        if self.path:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.path, "a") as f:
                f.write(json.dumps(record) + "\n")
        return record
