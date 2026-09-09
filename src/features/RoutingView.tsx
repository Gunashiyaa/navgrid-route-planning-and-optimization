import React, { useState } from "react";
import {
  Compass,
  ArrowRight,
  Sliders,
  Clock,
  Navigation,
  CheckCircle2,
  ShieldCheck,
  Flame,
  Activity,
  MapPin,
  Play
} from "lucide-react";
import { useNavGridStore } from "../stores/useNavGridStore";
import { api } from "../services/api";

export const RoutingView: React.FC = () => {
  const {
    waypoints,
    originCode,
    destinationCode,
    setOriginCode,
    setDestinationCode,
    alphaWeight,
    setAlphaWeight,
    betaWeight,
    setBetaWeight,
    currentRoute,
    setCurrentRoute,
    setActiveTab,
    setIsLoading,
    setStatusMessage,
    isLoading,
  } = useNavGridStore();

  const handlePlanRoute = async () => {
    if (!originCode || !destinationCode) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Computing deterministic A* route from ${originCode} to ${destinationCode}...`);
      const route = await api.planRoute(originCode, destinationCode, alphaWeight, betaWeight);
      setCurrentRoute(route);
      setStatusMessage(
        `A* Route Planned: ${route.total_distance_nm.toFixed(2)} NM, ${route.waypoint_sequence.length} waypoints, ETA: ${route.estimated_travel_hours.toFixed(1)} hrs.`
      );
    } catch (err: any) {
      setStatusMessage(`Route planning error: ${err.message}`);
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
              <Compass className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                Deterministic A* Maritime Pathfinding & Route Generation
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Calculates optimal passage between maritime waypoints using an admissible Euclidean/Haversine heuristic.
              Balances geometric travel distance against historical traffic congestion using composite edge cost:
              f(n) = g(n) + h(n), where cost(u, v) = α · d(u, v) + β · C(u, v).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePlanRoute}
              disabled={isLoading || originCode === destinationCode}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Compute A* Route</span>
            </button>
          </div>
        </div>

        {/* Route Planning Inputs */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-mono text-xs">
          {/* Origin */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Origin Waypoint:</span>
            </label>
            <select
              value={originCode}
              onChange={(e) => setOriginCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-emerald-300 font-bold rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
            >
              {waypoints.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code} - {w.name || "Fairway Node"}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Destination Waypoint:</span>
            </label>
            <select
              value={destinationCode}
              onChange={(e) => setDestinationCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-rose-300 font-bold rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500"
            >
              {waypoints.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code} - {w.name || "Fairway Node"}
                </option>
              ))}
            </select>
          </div>

          {/* Alpha Weight */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-semibold uppercase">
                $\alpha$ (Distance Weight):
              </label>
              <span className="text-cyan-400 font-bold">{alphaWeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={alphaWeight}
              onChange={(e) => setAlphaWeight(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-[10px] text-slate-400">Prioritize physical shortest path</span>
          </div>

          {/* Beta Weight */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-semibold uppercase">
                $\beta$ (Congestion Weight):
              </label>
              <span className="text-amber-400 font-bold">{betaWeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="5.0"
              step="0.1"
              value={betaWeight}
              onChange={(e) => setBetaWeight(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] text-slate-400">Penalize dense traffic fairways</span>
          </div>
        </div>
      </div>

      {/* Planned Route Result Cards */}
      {currentRoute ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Total Route Distance</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1">
                {currentRoute.total_distance_nm.toFixed(2)} NM
              </div>
              <span className="text-[11px] text-slate-400">Cumulative Great-Circle track</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Average Congestion</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {currentRoute.congestion_score.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">AIS traffic penalty index</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Transit Duration (ETA)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center space-x-1">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>{currentRoute.estimated_travel_hours.toFixed(1)} hrs</span>
              </div>
              <span className="text-[11px] text-slate-400">Cruising speed: 12.0 knots</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Waypoints Visited</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {currentRoute.waypoint_sequence.length} Nodes
              </div>
              <span className="text-[11px] text-slate-400">{currentRoute.segments.length} fairway legs</span>
            </div>
          </div>

          {/* Turn-by-Turn Leg Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Turn-by-Turn Passage Plan (Itinerary)
                </h3>
              </div>
              <button
                onClick={() => setActiveTab("map")}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <span>View on Chart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Leg #</th>
                    <th className="py-2.5 px-3">From</th>
                    <th className="py-2.5 px-3">To</th>
                    <th className="py-2.5 px-3">Distance (NM)</th>
                    <th className="py-2.5 px-3 text-center">Congestion Score</th>
                    <th className="py-2.5 px-3 text-center">Est. Leg Time</th>
                    <th className="py-2.5 px-3 text-right">Geographic Bearing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {currentRoute.segments.map((seg, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">Leg {idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-slate-200">
                          {seg.from_waypoint}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-slate-200">
                          {seg.to_waypoint}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-semibold">
                        {seg.distance_nm.toFixed(2)} NM
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">
                          {seg.congestion_score.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {(seg.travel_time_hours * 60).toFixed(0)} min
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        Fairway Track
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center font-mono">
          <Compass className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            Select origin and destination waypoints, tune $\alpha$ and $\beta$, and click "Compute A* Route".
          </p>
        </div>
      )}
    </div>
  );
};
