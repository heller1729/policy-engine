"""FastAPI app around the policy engine. Serves the built web app from web/dist when it exists."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .routes import audit, data, decide, matrix, policy, scenarios
from .state import EngineState

WEB_DIST = Path(__file__).resolve().parent.parent / "web" / "dist"


class SinglePageApp(StaticFiles):
    """Serve index.html for client side routes such as /matrix."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as e:
            if e.status_code != 404 or path.startswith("api"):
                raise
            return await super().get_response("index.html", scope)


def create_app(policy_path=None, audit_path=None) -> FastAPI:
    app = FastAPI(title="Geolocation Privacy Policy Engine", version="0.2",
                  description="Synthetic data only. Decisions follow policy/policy.yaml.")
    app.state.engine = EngineState(policy_path=policy_path, audit_path=audit_path)
    for module in (policy, scenarios, decide, matrix, audit, data):
        app.include_router(module.router, prefix="/api")
    if WEB_DIST.is_dir():
        app.mount("/", SinglePageApp(directory=WEB_DIST, html=True), name="web")
    return app


app = create_app(audit_path="out/api_audit.jsonl")
