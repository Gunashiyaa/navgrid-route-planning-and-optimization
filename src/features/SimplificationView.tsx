import React, { useState, useEffect } from "react";
import {
  Sliders,
  CheckCircle,
  Play,
  RotateCcw,
  Minimize2,
  TrendingDown,
  Navigation2,
  Activity,
  Compass
} from "lucide-react";
import { useNavGridStore } from "../stores/useNavGridStore";
import { api } from "../services/api";

export const SimplificationView: React.FC = () => {
  const {
    trajectories,
    simplificationResult,
    setSimplificationResult,
    simplificationTolerance,
    setSimplificationTolerance,
    setIsLoading,
    setStatusMessage,
    isLoading
  } = useNavGridStore();

  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<number | null>(null);

  useEffect(() => {
    if (trajectories.length > 0 && !selectedTrajectoryId) {
      setSelectedTrajectoryId(trajectories[0].id);
    }
  }, [trajectories]);

  const handleRunSimplification = async () => {
    if (!selectedTrajectoryId) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Executing MPDP simplification (tolerance: ${simplificationTolerance}m)...`);
      const result = await api.simplifyTrajectory(selectedTrajectoryId, simplificationTolerance);
      setSimplificationResult(result);
      setStatusMessage(
        `MPDP Complete: Reduced from ${result.original_point_count} to ${result.simplified_point_count} points (${result.reduction_percentage}% reduction).`
      );
    } catch (err: any) {
      setStatusMessage(`Simplification error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const activeTrajectory = trajectories.find((t) => t.id === selectedTrajectoryId) || trajectories[0];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                Modified Douglas-Peucker (MPDP) Trajectory Simplification
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Deterministically reduces redundant collinear AIS transmissions along maritime fairways while preserving
              critical navigation maneuvers (channel turns, waypoint junctions, and fairway alterations)
              using dual spherical cross-track deviation and Course-Over-Ground (COG) angular thresholds.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunSimplification}
              disabled={isLoading || !selectedTrajectoryId}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Run MPDP Simplification</span>
            </button>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-5 font-mono">
          {/* Trajectory Select */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase">
              Target Trajectory:
            </label>
            <select
              value={selectedTrajectoryId || ""}
              onChange={(e) => setSelectedTrajectoryId(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-cyan-500"
            >
              {trajectories.map((t) => (
                <option key={t.id} value={t.id}>
                  Traj #{t.id} - {t.vessel_name} ({t.point_count} pts, {t.length_nm} NM)
                </option>
              ))}
            </select>
          </div>

          {/* Tolerance Slider */}
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-400 font-semibold uppercase">
                Perpendicular Cross-Track Tolerance ($\varepsilon$):
              </label>
              <span className="text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                {simplificationTolerance} meters
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={simplificationTolerance}
              onChange={(e) => setSimplificationTolerance(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>20 m (Tighter fidelity)</span>
              <span>120 m (Standard maritime)</span>
              <span>1000 m (Aggressive compression)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics & Results Comparison */}
      {simplificationResult ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono">
            <span className="text-xs text-slate-400">Original Point Count</span>
            <div className="text-2xl font-bold text-slate-200 mt-1">
              {simplificationResult.original_point_count}
            </div>
            <span className="text-[11px] text-slate-400">Raw AIS telemetry pings</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono">
            <span className="text-xs text-slate-400">Simplified Point Count</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {simplificationResult.simplified_point_count}
            </div>
            <span className="text-[11px] text-slate-400">Retained significant vertices</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono">
            <span className="text-xs text-slate-400">Point Count Reduction</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center space-x-1">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <span>{simplificationResult.reduction_percentage}%</span>
            </div>
            <span className="text-[11px] text-slate-400">Data compression ratio</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono">
            <span className="text-xs text-slate-400">Path Distance Preserved</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {simplificationResult.simplified_length_nm} NM
            </div>
            <span className="text-[11px] text-slate-400">
              vs {simplificationResult.original_length_nm} NM original ({Math.abs(Math.round((simplificationResult.simplified_length_nm - simplificationResult.original_length_nm) * 1000) / 1000)} NM variance)
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center font-mono">
          <Sliders className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            Select a trajectory and click "Run MPDP Simplification" to observe mathematical reduction metrics.
          </p>
        </div>
      )}

      {/* Side-by-Side Points Inspection Table */}
      {simplificationResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Vertex Retention Table (Trajectory #{simplificationResult.trajectory_id})
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Tolerance: {simplificationResult.tolerance_meters}m | Heading Threshold: 30°
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto pr-1">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2 px-3">Vertex Index</th>
                  <th className="py-2 px-3">Longitude</th>
                  <th className="py-2 px-3">Latitude</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Retention Criteria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {simplificationResult.simplified_points.map((pt, idx) => {
                  const isTerminal = idx === 0 || idx === simplificationResult.simplified_points.length - 1;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-cyan-400 font-bold">#{idx + 1}</td>
                      <td className="py-2 px-3">{pt[0].toFixed(5)}° E</td>
                      <td className="py-2 px-3">{pt[1].toFixed(5)}° N</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold text-[10px]">
                          RETAINED
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        {isTerminal ? "Voyage Terminal Endpoint" : "Channel Turn / COG Deviation > 30°"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
