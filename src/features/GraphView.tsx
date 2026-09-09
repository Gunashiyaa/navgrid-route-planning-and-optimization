import React, { useState } from "react";
import {
  GitBranch,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertOctagon,
  RefreshCw
} from "lucide-react";
import { useNavGridStore } from "../stores/useNavGridStore";
import { api } from "../services/api";

export const GraphView: React.FC = () => {
  const { graph, setGraph, setIsLoading, setStatusMessage, isLoading } = useNavGridStore();
  const [maxDistance, setMaxDistance] = useState<number>(14.0);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleRebuildGraph = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Rebuilding topological navigation graph and edge congestion indices...");
      const newGraph = await api.buildNavigationGraph(maxDistance);
      setGraph(newGraph);
      setStatusMessage(`Graph constructed with ${newGraph.total_nodes} nodes and ${newGraph.total_edges} bidirectional edges.`);
    } catch (err: any) {
      setStatusMessage(`Graph build error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const edges = graph?.edges || [];
  const filteredEdges = edges.filter((e) =>
    `${e.source_code} ${e.target_code}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                Topological Maritime Navigation Graph & Traffic Density
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Constructs an adjacency network connecting navigable waypoints. Each directed corridor edge evaluates
              spherical Great-Circle geodesic distance, historical AIS vessel traversal frequency, and a deterministic
              congestion coefficient: C = 1.0 + (2.0 × N_vessels) / (d_NM + 0.5).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRebuildGraph}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Rebuild Graph Topology</span>
            </button>
          </div>
        </div>

        {/* Network Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800/80 font-mono">
          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400">Total Graph Nodes</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5">
              {graph?.total_nodes ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">Navigable waypoints</span>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400">Directed Corridors</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {graph?.total_edges ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">Navigable channel segments</span>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400">Max Reachability Distance</span>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">
              {maxDistance} NM
            </div>
            <span className="text-[11px] text-slate-400">Corridor line-of-sight threshold</span>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400">Average Node Degree</span>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">
              {graph && graph.total_nodes > 0
                ? (graph.total_edges / graph.total_nodes).toFixed(1)
                : "--"}
            </div>
            <span className="text-[11px] text-slate-400">Interconnectivity ratio</span>
          </div>
        </div>
      </div>

      {/* Filter and Edge Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 font-mono">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Corridor Edge Attributes & Congestion Scores
            </h3>
          </div>
          <input
            type="text"
            placeholder="Filter by node (e.g. WP-01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs w-full sm:w-64 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="max-h-96 overflow-y-auto pr-1">
          <table className="w-full text-left font-mono text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Corridor Link</th>
                <th className="py-2.5 px-3">Distance (NM)</th>
                <th className="py-2.5 px-3 text-center">Historical AIS Vessels</th>
                <th className="py-2.5 px-3 text-center">Congestion Metric (C)</th>
                <th className="py-2.5 px-3 text-right">Traffic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEdges.map((e) => {
                const isHigh = e.congestion_score >= 3.5;
                const isModerate = e.congestion_score >= 2.0 && e.congestion_score < 3.5;
                return (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold border border-slate-700">
                        {e.source_code}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold border border-slate-700">
                        {e.target_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-semibold">
                      {e.distance_nm.toFixed(2)} NM
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-200 font-bold">
                      {e.historical_vessel_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] ${
                          isHigh
                            ? "bg-rose-950 text-rose-300 border-rose-800"
                            : isModerate
                            ? "bg-amber-950 text-amber-300 border-amber-800"
                            : "bg-emerald-950 text-emerald-300 border-emerald-800"
                        }`}
                      >
                        {e.congestion_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-slate-400">
                        {isHigh ? "High Traffic Fairway" : isModerate ? "Moderate Transit" : "Free Navigation"}
                      </span>
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
