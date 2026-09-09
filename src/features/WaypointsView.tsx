import React, { useState } from "react";
import {
  Navigation,
  Grid,
  Sparkles,
  MapPin,
  Flame,
  ArrowRight,
  RefreshCw,
  Eye
} from "lucide-react";
import { useNavGridStore } from "../stores/useNavGridStore";
import { api } from "../services/api";

export const WaypointsView: React.FC = () => {
  const {
    waypoints,
    setWaypoints,
    setGraph,
    originCode,
    destinationCode,
    setOriginCode,
    setDestinationCode,
    setActiveTab,
    setIsLoading,
    setStatusMessage,
    isLoading
  } = useNavGridStore();

  const [gridRes, setGridRes] = useState<number>(1.0);
  const [minObs, setMinObs] = useState<number>(3);
  const [mergeDist, setMergeDist] = useState<number>(1.2);

  const handleReExtractWaypoints = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Re-running Spatial Density Grid Binning (SDGB)...");
      const wps = await api.extractWaypoints(gridRes, minObs, mergeDist);
      setWaypoints(wps);
      const graph = await api.buildNavigationGraph();
      setGraph(graph);
      setStatusMessage(`Extracted ${wps.length} navigation junction waypoints from historical AIS patterns.`);
    } catch (err: any) {
      setStatusMessage(`Waypoint extraction error: ${err.message}`);
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
              <Navigation className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                Spatial Density Grid Binning (SDGB) Waypoint Extraction
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Extracts maritime decision junctions and fairway entry/exit waypoints from historical AIS tracks
              without ML. Partitions the geographic extent into equal nautical-mile density bins, computes cluster centroids,
              and merges adjacent sub-clusters within the threshold distance.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleReExtractWaypoints}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Re-Extract Waypoints</span>
            </button>
          </div>
        </div>

        {/* Hyperparameter Inputs */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-5 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase">
              Grid Resolution (NM):
            </label>
            <input
              type="number"
              step="0.1"
              min="0.4"
              max="5.0"
              value={gridRes}
              onChange={(e) => setGridRes(parseFloat(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-[11px] text-slate-400">Bin cell side length in nautical miles</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase">
              Min Telemetry Observations:
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={minObs}
              onChange={(e) => setMinObs(parseInt(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-[11px] text-slate-400">Filters sparse transient pings</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase">
              Cluster Merge Distance (NM):
            </label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="5.0"
              value={mergeDist}
              onChange={(e) => setMergeDist(parseFloat(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-[11px] text-slate-400">Consolidation radius between nearby cell centers</span>
          </div>
        </div>
      </div>

      {/* Waypoints Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Discovered Waypoint Nodes ({waypoints.length} Total)
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Active Routing:</span>
            <span className="text-emerald-400 font-bold">{originCode}</span>
            <span className="text-slate-500">→</span>
            <span className="text-rose-400 font-bold">{destinationCode}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Node Code</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3">Latitude / Longitude</th>
                <th className="py-2.5 px-3 text-center">AIS Observations</th>
                <th className="py-2.5 px-3 text-center">Unique Vessels</th>
                <th className="py-2.5 px-3 text-center">Traffic Density</th>
                <th className="py-2.5 px-3 text-right">Route Assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {waypoints.map((wp) => {
                const isOrigin = wp.code === originCode;
                const isDest = wp.code === destinationCode;
                return (
                  <tr key={wp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800 font-bold">
                        {wp.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {wp.name || "Fairway Node"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {wp.latitude.toFixed(4)}° N, {wp.longitude.toFixed(4)}° E
                    </td>
                    <td className="py-2.5 px-3 text-center text-cyan-400 font-bold">
                      {wp.observation_count}
                    </td>
                    <td className="py-2.5 px-3 text-center text-indigo-400 font-bold">
                      {wp.trajectory_count}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>{wp.traffic_density_score} pts/NM²</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => setOriginCode(wp.code)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            isOrigin
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                          }`}
                        >
                          {isOrigin ? "Origin ✓" : "Set Origin"}
                        </button>
                        <button
                          onClick={() => setDestinationCode(wp.code)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            isDest
                              ? "bg-rose-600 text-white"
                              : "bg-slate-800 hover:bg-rose-950 text-rose-400 border border-rose-800/60"
                          }`}
                        >
                          {isDest ? "Dest ✓" : "Set Dest"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
