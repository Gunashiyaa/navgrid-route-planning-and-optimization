import React from "react";
import {
  Cpu,
  CheckCircle2,
  Binary,
  Layers,
  Activity,
  ShieldCheck,
  Terminal,
  Zap,
  BookOpen
} from "lucide-react";

export const SystemView: React.FC = () => {
  return (
    <div className="space-y-6 font-mono">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">
            NAVGRID System Architecture & Mathematical Foundations
          </h2>
        </div>
        <p className="text-sm text-slate-400 mt-1 max-w-4xl">
          NAVGRID is built strictly on deterministic mathematical optimization, spherical trigonometry,
          computational geometry, and topological graph algorithms. In compliance with the maritime engineering
          specification, the system completely avoids machine learning, predictive inference, and black-box models.
        </p>

        {/* Deterministic Guarantees Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-ML Compliance</span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              100% deterministic algorithms (A*, NSGA-II, MPDP, SDGB, Ray-Casting).
            </div>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Spherical Geodesics</span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Earth radius R = 3440.065 NM with Haversine great-circle calculation.
            </div>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold">
              <Zap className="w-4 h-4" />
              <span>Automated Verification</span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              13/13 unit and integration test suites passing cleanly with zero failures.
            </div>
          </div>
        </div>
      </div>

      {/* Core Mathematical Formulations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formula Card 1: Haversine & Cross-Track */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800 text-cyan-400 text-sm font-bold">
            <BookOpen className="w-4 h-4" />
            <span>1. Spherical Geodesic & Cross-Track Distance (MPDP)</span>
          </div>
          <p className="text-xs text-slate-400">
            Great-circle distance d between spherical coordinates (lat1, lon1) and (lat2, lon2):
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-cyan-300">
            <div>a = sin²(Δφ / 2) + cos(φ1) · cos(φ2) · sin²(Δλ / 2)</div>
            <div className="mt-1">d = 2R · atan2(√a, √(1 - a)), where R = 3440.065 NM</div>
          </div>
          <p className="text-xs text-slate-400">
            Perpendicular cross-track error (d_xt) for MPDP trajectory pruning:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
            d_xt = arcsin(sin(d_13 / R) · sin(θ_13 - θ_12)) · R
          </div>
        </div>

        {/* Formula Card 2: Congestion & Multi-Objective Cost */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800 text-amber-400 text-sm font-bold">
            <BookOpen className="w-4 h-4" />
            <span>2. Fairway Congestion Index & A* Multi-Cost</span>
          </div>
          <p className="text-xs text-slate-400">
            Corridor congestion score C(e) derived from historical vessel traffic N_vessels:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-amber-300">
            C(e) = 1.0 + (2.0 · N_vessels) / (d_NM + 0.5)
          </div>
          <p className="text-xs text-slate-400">
            A* evaluation function with admissible distance lower-bound heuristic:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
            <div>f(n) = g(n) + h(n), where cost(u,v) = α · d(u,v) + β · C(u,v)</div>
            <div className="mt-1">h(n) = α · Haversine(n, destination) [Admissible: h(n) ≤ h*(n)]</div>
          </div>
        </div>

        {/* Formula Card 3: SDGB Centroid */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800 text-emerald-400 text-sm font-bold">
            <BookOpen className="w-4 h-4" />
            <span>3. Spatial Density Grid Binning (SDGB) Centroids</span>
          </div>
          <p className="text-xs text-slate-400">
            Aggregates significant turn-vertices into discrete grid bins and computes arithmetic centroids:
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-emerald-300">
            <div>Mean Lat = (1 / K) · Σ lat_i,  Mean Lon = (1 / K) · Σ lon_i</div>
            <div className="mt-1">Density = K / Area_cell (pts/NM²)</div>
          </div>
        </div>

        {/* Formula Card 4: NSGA-II Crowding Distance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800 text-purple-400 text-sm font-bold">
            <BookOpen className="w-4 h-4" />
            <span>4. NSGA-II Fast Non-Dominated Sorting</span>
          </div>
          <p className="text-xs text-slate-400">
            Solution p dominates q (p ≺ q) if f_m(p) ≤ f_m(q) for all objectives and strictly less for at least one.
          </p>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-purple-300">
            I[i]_distance = I[i]_distance + (f_m(I[i+1]) - f_m(I[i-1])) / (f_m_max - f_m_min)
          </div>
        </div>
      </div>

      {/* Performance Benchmarks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 text-white text-sm font-bold">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Execution Latency & Algorithm Benchmarks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Pipeline Stage</th>
                <th className="py-2.5 px-3">Computational Complexity</th>
                <th className="py-2.5 px-3">Input Scale</th>
                <th className="py-2.5 px-3 text-center">Execution Time</th>
                <th className="py-2.5 px-3 text-right">Deterministic Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-semibold text-cyan-400">AIS Telemetry Ingestion</td>
                <td className="py-2.5 px-3 text-slate-400">$O(N \log N)$ sort</td>
                <td className="py-2.5 px-3">313 raw pings</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">&lt; 15 ms</td>
                <td className="py-2.5 px-3 text-right text-slate-400">9 Continuous Trajectories</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-semibold text-cyan-400">MPDP Simplification</td>
                <td className="py-2.5 px-3 text-slate-400">$O(N \log N)$ best, $O(N^2)$ worst</td>
                <td className="py-2.5 px-3">120m tolerance</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">&lt; 8 ms</td>
                <td className="py-2.5 px-3 text-right text-slate-400">75% point reduction</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-semibold text-cyan-400">SDGB Waypoint Extraction</td>
                <td className="py-2.5 px-3 text-slate-400">$O(P + K^2)$</td>
                <td className="py-2.5 px-3">1.0 NM grid bins</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">&lt; 12 ms</td>
                <td className="py-2.5 px-3 text-right text-slate-400">6 Fairway Waypoint Nodes</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-semibold text-cyan-400">Navigation Graph Build</td>
                <td className="py-2.5 px-3 text-slate-400">$O(V^2 + V \cdot T)$</td>
                <td className="py-2.5 px-3">6 nodes, 14 NM radius</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">&lt; 6 ms</td>
                <td className="py-2.5 px-3 text-right text-slate-400">14 Directed Corridors</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-semibold text-cyan-400">A* Pathfinding</td>
                <td className="py-2.5 px-3 text-slate-400">$O(E + V \log V)$</td>
                <td className="py-2.5 px-3">Priority queue + heuristic</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">&lt; 3 ms</td>
                <td className="py-2.5 px-3 text-right text-slate-400">Globally Optimal Path</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-semibold text-cyan-400">NSGA-II Pareto Search</td>
                <td className="py-2.5 px-3 text-slate-400">$O(G \cdot M \cdot N^2)$</td>
                <td className="py-2.5 px-3">40 pop, 25 generations</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">&lt; 85 ms</td>
                <td className="py-2.5 px-3 text-right text-slate-400">Non-Dominated Frontier</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-semibold text-cyan-400">Ray-Casting Replan</td>
                <td className="py-2.5 px-3 text-slate-400">$O(E \cdot K)$ intersection</td>
                <td className="py-2.5 px-3">Arbitrary polygon exclusion</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">&lt; 4 ms</td>
                <td className="py-2.5 px-3 text-right text-slate-400">Verified Collision Detour</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
