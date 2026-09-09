import React, { useState } from "react";
import {
  Sparkles,
  Sliders,
  TrendingDown,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label
} from "recharts";
import { useNavGridStore } from "../stores/useNavGridStore";
import { api } from "../services/api";
import { ParetoSolution } from "../types";

export const OptimizationView: React.FC = () => {
  const {
    waypoints,
    originCode,
    destinationCode,
    setOriginCode,
    setDestinationCode,
    paretoResult,
    setParetoResult,
    selectedSolution,
    setSelectedSolution,
    setActiveTab,
    setIsLoading,
    setStatusMessage,
    isLoading
  } = useNavGridStore();

  const [popSize, setPopSize] = useState<number>(40);
  const [generations, setGenerations] = useState<number>(25);

  const handleRunNSGA2 = async () => {
    if (!originCode || !destinationCode) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Executing NSGA-II Multi-Objective Optimization (${popSize} individuals, ${generations} gen)...`);
      const res = await api.optimizeRoutes(originCode, destinationCode, popSize, generations);
      setParetoResult(res);
      if (res.solutions.length > 0) {
        setSelectedSolution(res.solutions[0]);
      }
      setStatusMessage(
        `NSGA-II Complete: Discovered ${res.solutions.length} non-dominated Pareto frontier candidates in ${res.runtime_ms}ms.`
      );
    } catch (err: any) {
      setStatusMessage(`NSGA-II error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const scatterData = (paretoResult?.solutions || []).map((s, idx) => ({
    x: Math.round(s.distance_nm * 100) / 100,
    y: Math.round(s.congestion_score * 100) / 100,
    id: s.solution_id,
    name: s.name,
    raw: s,
    isSelected: selectedSolution?.solution_id === s.solution_id,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-2xl font-mono text-xs text-slate-200">
          <div className="font-bold text-cyan-400">{data.name}</div>
          <div className="mt-1 text-slate-300">
            Distance: <span className="text-white font-bold">{data.x} NM</span>
          </div>
          <div className="text-slate-300">
            Congestion: <span className="text-amber-400 font-bold">{data.y}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Click point to inspect route passage
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                NSGA-II Multi-Objective Pareto Frontier Optimization
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Solves the maritime trade-off between minimizing transit mileage vs minimizing high-density corridor congestion.
              Utilizes Non-dominated Sorting Genetic Algorithm II (NSGA-II) with fast non-dominated ranking,
              crowding distance sorting for population diversity, and simulated binary crossover (SBX).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunNSGA2}
              disabled={isLoading || originCode === destinationCode}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Run NSGA-II Evolution</span>
            </button>
          </div>
        </div>

        {/* Algorithm Configuration */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase">Origin Node:</label>
            <select
              value={originCode}
              onChange={(e) => setOriginCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-emerald-300 font-bold rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
            >
              {waypoints.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code} - {w.name || "Fairway"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold uppercase">Destination Node:</label>
            <select
              value={destinationCode}
              onChange={(e) => setDestinationCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-rose-300 font-bold rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
            >
              {waypoints.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code} - {w.name || "Fairway"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-semibold uppercase">Population Size ($N$):</label>
              <span className="text-purple-400 font-bold">{popSize}</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              step="5"
              value={popSize}
              onChange={(e) => setPopSize(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] text-slate-400">Candidate route individuals</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-semibold uppercase">Generations ($G$):</label>
              <span className="text-purple-400 font-bold">{generations}</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={generations}
              onChange={(e) => setGenerations(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] text-slate-400">Genetic reproduction cycles</span>
          </div>
        </div>
      </div>

      {/* Pareto Scatter Plot & Candidates */}
      {paretoResult && paretoResult.solutions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recharts Scatter Plot */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-2 space-y-4 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pareto Trade-off Frontier ($f_1$ Distance vs $f_2$ Congestion)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Runtime: {paretoResult.runtime_ms} ms | Evaluated: {paretoResult.total_evaluated}
              </span>
            </div>

            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Distance"
                    unit=" NM"
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={["auto", "auto"]}
                  >
                    <Label
                      value="Total Route Distance (NM) →"
                      offset={-15}
                      position="insideBottom"
                      fill="#94a3b8"
                      fontSize={11}
                    />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Congestion"
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={["auto", "auto"]}
                  >
                    <Label
                      value="← Traffic Congestion Index"
                      angle={-90}
                      position="insideLeft"
                      fill="#94a3b8"
                      fontSize={11}
                    />
                  </YAxis>
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter
                    name="Pareto Candidates"
                    data={scatterData}
                    onClick={(entry) => setSelectedSolution(entry.raw)}
                    cursor="pointer"
                  >
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isSelected ? "#22d3ee" : "#a855f7"}
                        stroke={entry.isSelected ? "#ffffff" : "#c084fc"}
                        strokeWidth={entry.isSelected ? 3 : 1.5}
                        r={entry.isSelected ? 8 : 6}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between px-2">
              <span>Lower-left is ideal. Purple nodes define non-dominated trade-offs.</span>
              <span className="text-cyan-400 font-semibold">Cyan indicates active candidate</span>
            </div>
          </div>

          {/* Solution Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-1 space-y-4 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Candidate Route
              </h3>
              {selectedSolution && (
                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                  Rank 1 Non-Dominated
                </span>
              )}
            </div>

            {selectedSolution ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-cyan-400">{selectedSolution.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Solution ID: {selectedSolution.solution_id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                    <span className="text-[11px] text-slate-400">Distance</span>
                    <div className="text-lg font-bold text-slate-200">
                      {selectedSolution.distance_nm.toFixed(2)} NM
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                    <span className="text-[11px] text-slate-400">Congestion</span>
                    <div className="text-lg font-bold text-amber-400">
                      {selectedSolution.congestion_score.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">
                    Waypoint Progression:
                  </span>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap gap-1.5">
                    {selectedSolution.waypoint_sequence.map((wp, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold"
                      >
                        {wp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => setActiveTab("map")}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    <span>View Track On Chart</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Click any node on the Pareto Frontier chart to inspect its metrics.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center font-mono">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            Click "Run NSGA-II Evolution" to calculate the Pareto frontier of multi-objective maritime routes.
          </p>
        </div>
      )}
    </div>
  );
};
