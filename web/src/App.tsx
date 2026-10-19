import { ExternalLink } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import { PolicyPage } from "./pages/PolicyPage";
import { RequestBuilder } from "./pages/RequestBuilder";
import { WhoSeesWhat } from "./pages/WhoSeesWhat";

const NAV = [
  { to: "/", label: "Request builder" },
  { to: "/matrix", label: "Who sees what" },
  { to: "/policy", label: "Policy" },
];

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            <span className="font-semibold">Geolocation Privacy Policy Engine</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">v0.2 in progress</span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1.5 text-sm ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              Synthetic data only
            </span>
            <a href="/docs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800">
              API docs <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/matrix" element={<WhoSeesWhat />} />
          <Route path="/policy" element={<PolicyPage />} />
          <Route path="*" element={<RequestBuilder />} />
        </Routes>
      </main>
    </div>
  );
}
