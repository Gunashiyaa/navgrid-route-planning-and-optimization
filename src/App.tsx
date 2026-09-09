import React, { useEffect } from "react";
import { NavigationHeader } from "./components/NavigationHeader";
import { MaritimeMap } from "./components/MaritimeMap";
import { CleaningView } from "./features/CleaningView";
import { SimplificationView } from "./features/SimplificationView";
import { WaypointsView } from "./features/WaypointsView";
import { GraphView } from "./features/GraphView";
import { RoutingView } from "./features/RoutingView";
import { OptimizationView } from "./features/OptimizationView";
import { ScenariosView } from "./features/ScenariosView";
import { SystemView } from "./features/SystemView";
import { useNavGridStore } from "./stores/useNavGridStore";
import { api } from "./services/api";
import {
  Compass,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Info,
  CheckCircle2,
  RefreshCw,
  Navigation,
  Activity,
  Sliders,
  Play
} from "lucide-react";

export default function App() {
  const {
    activeTab,
    setActiveTab,
    setStats,
    setVessels,
    setTrajectories,
    setWaypoints,
    setGraph,
    setScenarios,
    setCurrentRoute,
    originCode,
    destinationCode,
    setOriginCode,
    setDestinationCode,
    alphaWeight,
    betaWeight,
    statusMessage,
    setStatusMessage,
    isLoading,
    setIsLoading,
    waypoints,
    currentRoute,
  } = useNavGridStore();

  // Initial data bootstrap on mount
  useEffect(() => {
    async function initData() {
      try {
        setIsLoading(true);
        setStatusMessage("Initializing NAVGRID geospatial engine and maritime corridors...");
        
        // Fetch health & baseline stats
        await api.getHealth();
        let statsData = await api.getStats();

        // If dataset is unseeded, trigger automatic import
        if (!statsData || statsData.total_raw_positions === 0) {
          await api.importDataset();
          statsData = await api.getStats();
        }
        setStats(statsData);

        const vesselsData = await api.getVessels();
        setVessels(vesselsData);

        const trajsData = await api.getTrajectories();
        setTrajectories(trajsData);

        let wpsData = await api.getWaypoints();
        if (!wpsData || wpsData.length === 0) {
          wpsData = await api.extractWaypoints();
        }
        setWaypoints(wpsData);

        let graphData = await api.getNavigationGraph();
        if (!graphData || graphData.total_nodes === 0) {
          graphData = await api.buildNavigationGraph();
        }
        setGraph(graphData);

        const scenariosData = await api.getScenarios();
        setScenarios(scenariosData);

        // Pre-plan a default route if waypoints exist
        if (wpsData && wpsData.length >= 2) {
          const orig = wpsData[0].code;
          const dest = wpsData[wpsData.length - 1].code;
          setOriginCode(orig);
          setDestinationCode(dest);
          try {
            const initialRoute = await api.planRoute(orig, dest, 1.0, 1.5);
            setCurrentRoute(initialRoute);
          } catch (e) {
            console.warn("Initial route planning note:", e);
          }
        }

        setStatusMessage("NAVGRID engine operational. Tactical chart active.");
      } catch (err: any) {
        console.error("Initialization error:", err);
        setStatusMessage(`Connection note: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, []);

  const handleQuickPlan = async () => {
    if (!originCode || !destinationCode) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Computing A* passage between ${originCode} and ${destinationCode}...`);
      const route = await api.planRoute(originCode, destinationCode, alphaWeight, betaWeight);
      setCurrentRoute(route);
      setStatusMessage(`Planned passage: ${route.total_distance_nm.toFixed(2)} NM, ${route.waypoint_sequence.length} nodes.`);
    } catch (err: any) {
      setStatusMessage(`Planning failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Sticky Top Header */}
      <NavigationHeader />

      {/* Real-time Status / Notification Ribbon */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-1.5 text-xs font-mono flex items-center justify-between text-slate-300">
        <div className="flex items-center space-x-2 truncate">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span className="text-slate-400 shrink-0">ENGINE TELEMETRY:</span>
          <span className="text-cyan-300 font-medium truncate">{statusMessage}</span>
        </div>
        {isLoading && (
          <div className="flex items-center space-x-1 text-cyan-400 shrink-0">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[11px]">Processing...</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "map" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Tactical Map (3 columns on large screens) */}
            <div className="lg:col-span-3 min-h-[580px] h-full">
              <MaritimeMap />
            </div>

            {/* Tactical Quick Command Sidebar */}
            <div className="lg:col-span-1 space-y-4 font-mono">
              {/* Route Quick Planner Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Passage Planner</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    A* Heuristic
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Origin Node:</label>
                    <select
                      value={originCode}
                      onChange={(e) => setOriginCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-emerald-300 rounded px-2.5 py-1.5 text-xs font-bold"
                    >
                      {waypoints.map((w) => (
                        <option key={w.id} value={w.code}>
                          {w.code} - {w.name || "Fairway Node"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Destination Node:</label>
                    <select
                      value={destinationCode}
                      onChange={(e) => setDestinationCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-rose-300 rounded px-2.5 py-1.5 text-xs font-bold"
                    >
                      {waypoints.map((w) => (
                        <option key={w.id} value={w.code}>
                          {w.code} - {w.name || "Fairway Node"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleQuickPlan}
                    disabled={isLoading || originCode === destinationCode}
                    className="w-full mt-2 flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Compute Passage</span>
                  </button>
                </div>

                {currentRoute && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Distance:</span>
                      <span className="text-cyan-400 font-bold">{currentRoute.total_distance_nm.toFixed(2)} NM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Congestion Index:</span>
                      <span className="text-amber-400 font-bold">{currentRoute.congestion_score.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estimated Duration:</span>
                      <span className="text-emerald-400 font-bold">{currentRoute.estimated_travel_hours.toFixed(1)} hrs</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Pipeline Shortcuts */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-2.5">
                <div className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800">
                  Pipeline Workbenches
                </div>

                <button
                  onClick={() => setActiveTab("simplification")}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-xs"
                >
                  <span className="flex items-center space-x-2">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MPDP Simplification</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => setActiveTab("waypoints")}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-xs"
                >
                  <span className="flex items-center space-x-2">
                    <Navigation className="w-3.5 h-3.5 text-amber-400" />
                    <span>SDGB Waypoints</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => setActiveTab("optimization")}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-xs"
                >
                  <span className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>NSGA-II Pareto Optimization</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => setActiveTab("scenarios")}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-xs"
                >
                  <span className="flex items-center space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Restriction Replanning</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {/* Integrity Badge */}
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/40 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-cyan-300 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deterministic Engine</span>
                </div>
                <p className="text-slate-400">
                  Every corridor, waypoint centroid, and route cost is calculated via geometric proof and graph traversal. Zero ML inference.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cleaning" && <CleaningView />}
        {activeTab === "simplification" && <SimplificationView />}
        {activeTab === "waypoints" && <WaypointsView />}
        {activeTab === "graph" && <GraphView />}
        {activeTab === "routing" && <RoutingView />}
        {activeTab === "optimization" && <OptimizationView />}
        {activeTab === "scenarios" && <ScenariosView />}
        {activeTab === "system" && <SystemView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/80 py-4 px-6 text-center text-xs font-mono text-slate-500">
        NAVGRID Maritime Geospatial Engine • Historical AIS Trajectory Mining • Deterministic Route Optimization
      </footer>
    </div>
  );
}
