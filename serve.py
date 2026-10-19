"""Start the API and the built web app on http://localhost:8000.

    python serve.py
    python serve.py --port 8080 --reload
    python serve.py --city          fuller synthetic dataset for the map (demo numbers differ)
"""

import argparse
import os

import uvicorn


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--reload", action="store_true")
    ap.add_argument("--city", action="store_true", help="more places per area and 8000 devices")
    args = ap.parse_args()
    if args.city:
        os.environ["POLICY_ENGINE_DATA"] = "city"
    uvicorn.run("api.main:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
