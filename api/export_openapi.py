"""Write the OpenAPI schema to a file so the web app can generate its types.

    python -m api.export_openapi web/openapi.json
"""

import json
import sys
from pathlib import Path

from .main import create_app


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "web/openapi.json")
    out.write_text(json.dumps(create_app().openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
