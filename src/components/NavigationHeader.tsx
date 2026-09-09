import React from "react";
import {
  Ship,
  Layers,
  Sparkles,
  GitBranch,
  Navigation,
  Compass,
  Sliders,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Database
} from "lucide-react";
import { useNavGridStore, NavTab } from "../stores/useNavGridStore";
import { api } from "../services/api";

export const NavigationHeader: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    stats,
    setStats,
    setTrajectories,
    setWaypoints,
    setGraph,
    setIsLoading,
    setStatusMessage,
    isLoading
  } = useNavGridStore();

  const handleResetData = async () => {
    try {
      setIsLoading(true);
      setStatusMessage("Re-ingesting AIS dataset and recalculating network graph...");
      await api.importDataset();
      const newStats = await api.getStats();
      setStats(newStats);
      const trajs = await api.getTrajectories();
      setTrajectories(trajs);
      const wps = await api.extractWaypoints();
      setWaypoints(wps);
      const graph = await api.buildNavigationGraph();
      setGraph(graph);
      setStatusMessage("AIS dataset and navigation graph successfully re-seeded.");
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "map", label: "Chart View", icon: <Ship className="w-4 h-4" /> },
    { id: "cleaning", label: "AIS Telemetry", icon: <Database className="w-4 h-4" /> },
    { id: "simplification", label: "MPDP Simplification", icon: <Sliders className="w-4 h-4" /> },
    { id: "waypoints", label: "Waypoints (SDGB)", icon: <Navigation className="w-4 h-4" /> },
    { id: "graph", label: "Nav Graph", icon: <GitBranch className="w-4 h-4" /> },
    { id: "routing", label: "A* Pathfinding", icon: <Compass className="w-4 h-4" /> },
    { id: "optimization", label: "NSGA-II Pareto", icon: <Sparkles className="w-4 h-4" /> },
    { id: "scenarios", label: "Scenarios & Detours", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "system", label: "Architecture", icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and System Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white font-mono">
                  NAVGRID
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                  v1.0 Deterministic
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                AIS-Based Maritime Route Planning & Optimization System
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center space-x-4 text-xs font-mono text-slate-300">
            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400">Positions: </span>
              <span className="text-cyan-400 font-semibold">{stats?.total_raw_positions ?? "--"}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400">Vessels: </span>
              <span className="text-emerald-400 font-semibold">{stats?.total_vessels ?? "--"}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400">Trajectories: </span>
              <span className="text-indigo-400 font-semibold">{stats?.total_trajectories ?? "--"}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400">Waypoints: </span>
              <span className="text-amber-400 font-semibold">{stats?.total_waypoints ?? "--"}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400">Edges: </span>
              <span className="text-rose-400 font-semibold">{stats?.total_edges ?? "--"}</span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetData}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors disabled:opacity-50"
              title="Re-seed sample dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
              <span className="hidden sm:inline">Reset Engine</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/80 text-xs">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
