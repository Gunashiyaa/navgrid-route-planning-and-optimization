import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Plus
} from "lucide-react";
import { useNavGridStore } from "../stores/useNavGridStore";
import { api } from "../services/api";

export const ScenariosView: React.FC = () => {
  const {
    scenarios,
    setScenarios,
    selectedScenarioId,
    setSelectedScenarioId,
    replanResult,
    setReplanResult,
    originCode,
    destinationCode,
    setOriginCode,
    setDestinationCode,
    waypoints,
    setActiveTab,
    setIsLoading,
    setStatusMessage,
    isLoading
  } = useNavGridStore();

  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioDesc, setNewScenarioDesc] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleRunReplan = async () => {
    if (!activeScenario) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Executing spatial restriction replanning for scenario "${activeScenario.name}"...`);
      const result = await api.replanScenario(activeScenario.id, originCode, destinationCode);
      setReplanResult(result);
      setStatusMessage(
        `Replanning complete: ${result.status}. Distance delta: ${result.distance_delta_nm?.toFixed(2) ?? 0} NM (${result.distance_delta_pct?.toFixed(1) ?? 0}%).`
      );
    } catch (err: any) {
      setStatusMessage(`Replanning error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePresetScenario = async (presetType: string) => {
    try {
      setIsLoading(true);
      let name = "";
      let desc = "";
      let coords: [number, number][] = [];

      if (presetType === "dover_closure") {
        name = "Dover TSS Northeast Fairway Hazard";
        desc = "Temporary exclusion zone due to naval exercise / deep dredging.";
        coords = [
          [1.44, 51.13],
          [1.52, 51.13],
          [1.52, 51.22],
          [1.44, 51.22],
        ];
      } else if (presetType === "varne_shallows") {
        name = "Varne Bank Shallows Navigational Warning";
        desc = "Hydrographic survey detected shifting sand shoals; fairway severed.";
        coords = [
          [1.25, 51.00],
          [1.38, 51.00],
          [1.38, 51.09],
          [1.25, 51.09],
        ];
      }

      setStatusMessage(`Provisioning spatial scenario "${name}"...`);
      const created = await api.createScenario(name, desc, coords);
      const updated = await api.getScenarios();
      setScenarios(updated);
      setSelectedScenarioId(created.id);
      setStatusMessage(`Scenario created: ${created.affected_edge_count} navigation corridor edges severed.`);
    } catch (err: any) {
      setStatusMessage(`Failed to create scenario: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                Spatial Restriction Zones & Constrained Detour Replanning
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Evaluates arbitrary polygonal hazard exclusion zones (e.g. marine sanctuaries, cable laying, naval exercises).
              Uses ray-casting polygon-segment intersection tests to deterministically sever affected graph corridors
              and computes constrained detour routes with quantitative delta comparisons.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunReplan}
              disabled={isLoading || !activeScenario}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Constrained Replan</span>
            </button>
          </div>
        </div>

        {/* Preset and Scenario Selector */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-5 font-mono text-xs">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-slate-400 font-semibold uppercase">Active Restriction Scenario:</label>
            <select
              value={activeScenario?.id || ""}
              onChange={(e) => setSelectedScenarioId(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-rose-300 font-bold rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id}: {s.name} ({s.affected_edge_count} edges severed)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase">Load Realistic Presets:</label>
            <div className="flex space-x-2">
              <button
                onClick={() => handleCreatePresetScenario("dover_closure")}
                className="flex-1 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px]"
              >
                Dover TSS Hazard
              </button>
              <button
                onClick={() => handleCreatePresetScenario("varne_shallows")}
                className="flex-1 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px]"
              >
                Varne Shoals
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Replan Comparison Dashboard */}
      {replanResult && replanResult.status === "REPLANNED_SUCCESS" && replanResult.replanned_route ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {/* Baseline Distance */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Original Unconstrained Track</span>
              <div className="text-2xl font-bold text-slate-200 mt-1">
                {replanResult.original_route.total_distance_nm.toFixed(2)} NM
              </div>
              <span className="text-[11px] text-slate-400">Normal TSS transit</span>
            </div>

            {/* Replanned Distance */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Replanned Detour Distance</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {replanResult.replanned_route.total_distance_nm.toFixed(2)} NM
              </div>
              <span className="text-[11px] text-slate-400">Guaranteed collision-free</span>
            </div>

            {/* Distance Delta */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Distance Penalty ($\Delta d$)</span>
              <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center space-x-1">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <span>+{replanResult.distance_delta_nm?.toFixed(2)} NM</span>
              </div>
              <span className="text-[11px] text-slate-400">
                +{replanResult.distance_delta_pct?.toFixed(1)}% extra passage distance
              </span>
            </div>

            {/* Severed Corridors */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Severed Corridors</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">
                {replanResult.affected_edges.length} Edges
              </div>
              <span className="text-[11px] text-slate-400">Pruned from navigation graph</span>
            </div>
          </div>

          {/* Comparison Itinerary Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Detour Passage Verification
                </h3>
              </div>
              <button
                onClick={() => setActiveTab("map")}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>View Detour on Nautical Chart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Route Sequence */}
              <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-slate-700">
                  <span>ORIGINAL UNCONSTRAINED ROUTE</span>
                  <span className="text-cyan-400">{replanResult.original_route.total_distance_nm.toFixed(2)} NM</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {replanResult.original_route.waypoint_sequence.map((wp, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs"
                    >
                      {wp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Replanned Detour Sequence */}
              <div className="bg-slate-800/40 p-4 rounded-lg border border-emerald-900/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300 pb-2 border-b border-slate-700">
                  <span>CONSTRAINED REPLANNED DETOUR</span>
                  <span className="text-emerald-400">{replanResult.replanned_route.total_distance_nm.toFixed(2)} NM</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {replanResult.replanned_route.waypoint_sequence.map((wp, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-800 text-xs font-bold"
                    >
                      {wp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : replanResult && replanResult.status === "NO_FEASIBLE_ROUTE" ? (
        <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-8 text-center font-mono text-rose-300">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <div className="text-lg font-bold">No Feasible Detour Route Available</div>
          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            The spatial exclusion boundary severs all continuous graph corridors between {originCode} and {destinationCode}.
            Vessel must hold station or await restriction lifting.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center font-mono">
          <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            Select a restriction scenario above and click "Execute Constrained Replan" to simulate spatial rerouting.
          </p>
        </div>
      )}
    </div>
  );
};
