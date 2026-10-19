import { useSearchParams } from "react-router-dom";
import { ApiError, type RequestBody } from "../api/client";
import { useDataSummary, useDecision, usePolicy, useScenarios } from "../api/hooks";
import { Card } from "../components/Card";
import { DecisionSummary } from "../components/DecisionSummary";
import { FlowSteps } from "../components/FlowSteps";
import { PlanView } from "../components/PlanView";
import { RequestForm } from "../components/RequestForm";
import { RuleSteps } from "../components/RuleSteps";
import { StrictnessLadder } from "../components/StrictnessLadder";
import { readRequest, writeRequest } from "../lib/requestParams";

export function RequestBuilder() {
  const [params, setParams] = useSearchParams();
  const request = readRequest(params);
  const policy = usePolicy();
  const scenarios = useScenarios();
  const summary = useDataSummary();
  const decision = useDecision(request);

  const update = (next: RequestBody) => setParams(writeRequest(next), { replace: true });
  const overrideError =
    decision.error instanceof ApiError && decision.error.status === 400 ? decision.error.message : undefined;

  if (policy.isError) {
    return <p className="p-8 text-sm text-rose-700">Could not reach the API. Start it with python serve.py.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card title="Data request">
          {policy.data && scenarios.data ? (
            <RequestForm
              value={request}
              onChange={update}
              policy={policy.data}
              scenarios={scenarios.data}
              summary={summary.data}
              overrideError={overrideError}
            />
          ) : (
            <p className="text-sm text-slate-400">Loading policy</p>
          )}
        </Card>
      </aside>

      <div className="min-w-0 space-y-5">
        {decision.error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {overrideError ? `Override rejected: ${overrideError}` : decision.error.message}
          </p>
        )}
        {decision.data ? (
          <>
            <DecisionSummary decision={decision.data} stale={decision.isPlaceholderData || !!overrideError} />
            <Card title="How the engine got there">
              <div className="space-y-5">
                <FlowSteps blocked={decision.data.outcome === "Blocked"} />
                <StrictnessLadder hits={decision.data.hits} outcome={decision.data.outcome} />
                <RuleSteps decision={decision.data} />
              </div>
            </Card>
            <Card title="What the enforcement point will run">
              <PlanView
                decision={decision.data}
                tier={request.data_tier}
                deviceLevelFrom={policy.data?.device_level_from_tier ?? 4}
              />
            </Card>
          </>
        ) : (
          !decision.error && <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        )}
      </div>
    </div>
  );
}
