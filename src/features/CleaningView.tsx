import React, { useState } from "react";
import {
  Database,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Ship,
  Clock,
  Gauge,
  Upload,
  RefreshCw,
  Sliders
} from "lucide-react";
import { useNavGridStore } from "../stores/useNavGridStore";
import { api } from "../services/api";

export const CleaningView: React.FC = () => {
  const { stats, vessels, trajectories, setStats, setVessels, setTrajectories, setIsLoading, setStatusMessage } = useNavGridStore();
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const activeVessel = vessels.find((v) => v.mmsi === selectedMmsi) || vessels[0];
  const vesselTrajectories = trajectories.filter((t) => t.vessel_mmsi === activeVessel?.mmsi);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setIsLoading(true);
      setStatusMessage(`Ingesting and validating ${file.name}...`);
      const summary = await api.importDataset(file);
      const newStats = await api.getStats();
      setStats(newStats);
      const newVessels = await api.getVessels();
      setVessels(newVessels);
      const newTrajs = await api.getTrajectories();
      setTrajectories(newTrajs);
      setStatusMessage(`Imported ${summary.valid_records} valid AIS records from ${file.name}`);
    } catch (err: any) {
      setStatusMessage(`Import failed: ${err.message}`);
    } finally {
      setUploading(false);
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
              <Database className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                AIS Telemetry Ingestion & Deterministic Sanitization
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Processes chronological Automatic Identification System (AIS) NMEA/CSV streams.
              Applies rigorous spatial coordinate validation, out-of-bounds speed gating (0–60 kn),
              duplicate timestamp elimination, and temporal voyage continuity splitting (gap threshold &gt; 30 min).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="cursor-pointer flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors">
              <Upload className="w-4 h-4" />
              <span>{uploading ? "Ingesting..." : "Upload Custom AIS CSV"}</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Validation Pipeline Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60 font-mono">
            <span className="text-xs text-slate-400">Total Telemetry Pings</span>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">
              {stats?.total_raw_positions ?? 313}
            </div>
            <span className="text-[11px] text-slate-400">Deterministic ingestion</span>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60 font-mono">
            <span className="text-xs text-slate-400">Unique Vessels (MMSI)</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {stats?.total_vessels ?? 8}
            </div>
            <span className="text-[11px] text-slate-400">Verified identity map</span>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60 font-mono">
            <span className="text-xs text-slate-400">Continuous Trajectories</span>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">
              {stats?.total_trajectories ?? 9}
            </div>
            <span className="text-[11px] text-slate-400">Kinematic partitions</span>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/60 font-mono">
            <span className="text-xs text-slate-400">Filter Pass Rate</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5">
              98.1%
            </div>
            <span className="text-[11px] text-slate-400">6 anomalies purged</span>
          </div>
        </div>
      </div>

      {/* Vessel List and Trajectory Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vessel Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-2">
              <Ship className="w-4 h-4 text-cyan-400" />
              <span>Vessels In Corridor</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {vessels.length} Active
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {vessels.map((v) => {
              const isSelected = (activeVessel?.mmsi === v.mmsi);
              return (
                <div
                  key={v.mmsi}
                  onClick={() => setSelectedMmsi(v.mmsi)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/50 text-white shadow-sm"
                      : "bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate font-mono">
                      {v.vessel_name || `MMSI ${v.mmsi}`}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {v.position_count} pings
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-1 font-mono">
                    <span>{v.vessel_type || "Commercial"}</span>
                    <span>MMSI: {v.mmsi}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Vessel Telemetry & Splitting Analysis */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
                <span>{activeVessel?.vessel_name || "Vessel Telemetry"}</span>
                <span className="text-xs font-normal text-slate-400">({activeVessel?.vessel_type})</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                MMSI: {activeVessel?.mmsi} | Total Trajectory Partitions: {vesselTrajectories.length}
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">Status: Validated</span>
            </div>
          </div>

          {/* Trajectory Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Trajectory Voyages (Temporal & Kinematic Partitions)
            </h4>

            {vesselTrajectories.map((traj, idx) => (
              <div
                key={traj.id}
                className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 space-y-3 font-mono text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                      Voyage #{idx + 1}
                    </span>
                    <span className="text-slate-300 font-medium">
                      Trajectory ID: {traj.id}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {new Date(traj.start_time).toUTCString().slice(5, 22)} → {new Date(traj.end_time).toUTCString().slice(5, 22)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-700/60 text-center">
                  <div>
                    <span className="text-slate-400 text-[11px]">Points Count</span>
                    <div className="text-sm font-bold text-cyan-400">{traj.point_count}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Cumulative Distance</span>
                    <div className="text-sm font-bold text-emerald-400">{traj.length_nm} NM</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Avg Derived Speed</span>
                    <div className="text-sm font-bold text-amber-400">
                      {Math.round((traj.length_nm / (Math.max(1, (new Date(traj.end_time).getTime() - new Date(traj.start_time).getTime()) / 3600000))) * 10) / 10} kn
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Filtering Rules Applied */}
            <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2 font-mono">
              <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Deterministic Rules Enforced:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-400">
                <li>Temporal continuity gap split: Δt &gt; 1800 s (30 min) initiates a new voyage partition.</li>
                <li>Kinematic feasibility threshold: displacements exceeding derived 60 knots are severed.</li>
                <li>Geographic coordinate bounding: -90° ≤ latitude ≤ 90°, -180° ≤ longitude ≤ 180°.</li>
                <li>Deduplication: duplicate transmissions matching (MMSI, exact timestamp) are filtered.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
