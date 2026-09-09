import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import {
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  PenTool,
  RotateCcw,
  CheckCircle,
  Eye,
  EyeOff,
  Ship,
  Info
} from "lucide-react";
import { useNavGridStore } from "../stores/useNavGridStore";

export const MaritimeMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const {
    trajectories,
    waypoints,
    graph,
    currentRoute,
    selectedSolution,
    scenarios,
    selectedScenarioId,
    replanResult,
    layers,
    toggleLayer,
    drawingPolygon,
    setDrawingPolygon,
    polygonDraft,
    addPolygonDraftPoint,
    resetPolygonDraft,
    originCode,
    destinationCode,
    setOriginCode,
    setDestinationCode,
    selectedWaypointCode,
    setSelectedWaypointCode,
  } = useNavGridStore();

  const [selectedElementInfo, setSelectedElementInfo] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Dark tactical nautical style using OpenStreetMap / Carto Dark tiles
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors © CARTO",
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [1.45, 51.15], // Dover Strait center
      zoom: 10,
      pitch: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-left");

    // Click handler for polygon drawing or inspecting elements
    map.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      const state = useNavGridStore.getState();
      if (state.drawingPolygon) {
        state.addPolygonDraftPoint([roundCoord(lng), roundCoord(lat)]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Sources and Layers when data or layer visibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onStyleLoad = () => {
      updateMapLayers();
    };

    if (map.isStyleLoaded()) {
      updateMapLayers();
    } else {
      map.once("styledata", onStyleLoad);
    }
  }, [
    trajectories,
    waypoints,
    graph,
    currentRoute,
    selectedSolution,
    scenarios,
    selectedScenarioId,
    replanResult,
    layers,
    polygonDraft,
  ]);

  const roundCoord = (val: number) => Math.round(val * 100000) / 100000;

  const updateMapLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // 1. Trajectories Source & Layer
    const trajFeatures = (trajectories || []).map((t) => ({
      type: "Feature" as const,
      properties: {
        id: t.id,
        mmsi: t.vessel_mmsi,
        name: t.vessel_name || `Vessel ${t.vessel_mmsi}`,
        type: t.vessel_type || "Commercial",
        length_nm: t.length_nm,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: (t.points || []).map((p) => [p.longitude, p.latitude]),
      },
    }));

    updateGeoJsonSource(map, "trajectories-src", {
      type: "FeatureCollection",
      features: trajFeatures,
    });

    ensureLayer(map, "trajectories-layer", "trajectories-src", "line", {
      "line-color": [
        "match",
        ["get", "type"],
        "Tanker", "#f59e0b",
        "Tanker / Hazard A", "#f97316",
        "Passenger / Ro-Ro Ferry", "#06b6d4",
        "Cargo / Container", "#3b82f6",
        "Bulk Carrier", "#8b5cf6",
        "Tug / SAR", "#10b981",
        "#64748b"
      ],
      "line-width": 1.8,
      "line-opacity": layers.trajectories ? 0.65 : 0,
    });

    // 2. Navigation Graph Edges
    const edgeFeatures = (graph?.edges || []).map((e) => ({
      type: "Feature" as const,
      properties: {
        id: e.id,
        label: `${e.source_code} ↔ ${e.target_code}`,
        distance_nm: e.distance_nm,
        congestion: e.congestion_score,
        traffic: e.historical_vessel_count,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [e.source_coords, e.target_coords],
      },
    }));

    updateGeoJsonSource(map, "edges-src", {
      type: "FeatureCollection",
      features: edgeFeatures,
    });

    ensureLayer(map, "edges-layer", "edges-src", "line", {
      "line-color": [
        "step",
        ["get", "congestion"],
        "#10b981", 2.0,
        "#f59e0b", 4.0,
        "#ef4444"
      ],
      "line-width": 2.2,
      "line-dasharray": [2, 2],
      "line-opacity": layers.graphEdges ? 0.75 : 0,
    });

    // 3. Planned Route (A*)
    const routeFeatures = [];
    if (currentRoute && currentRoute.geometry_geojson) {
      routeFeatures.push({
        type: "Feature" as const,
        properties: {
          name: currentRoute.name,
          distance: currentRoute.total_distance_nm,
          congestion: currentRoute.congestion_score,
          time: currentRoute.estimated_travel_hours,
        },
        geometry: currentRoute.geometry_geojson,
      });
    }

    updateGeoJsonSource(map, "planned-route-src", {
      type: "FeatureCollection",
      features: routeFeatures,
    });

    ensureLayer(map, "planned-route-glow", "planned-route-src", "line", {
      "line-color": "#06b6d4",
      "line-width": 8,
      "line-opacity": layers.plannedRoute ? 0.35 : 0,
      "line-blur": 3,
    });

    ensureLayer(map, "planned-route-layer", "planned-route-src", "line", {
      "line-color": "#22d3ee",
      "line-width": 3.5,
      "line-opacity": layers.plannedRoute ? 0.95 : 0,
    });

    // 4. Pareto Selected Candidate Route
    const paretoFeatures = [];
    if (selectedSolution && selectedSolution.geometry_geojson) {
      paretoFeatures.push({
        type: "Feature" as const,
        properties: {
          id: selectedSolution.solution_id,
          name: selectedSolution.name,
          distance: selectedSolution.distance_nm,
          congestion: selectedSolution.congestion_score,
        },
        geometry: selectedSolution.geometry_geojson,
      });
    }

    updateGeoJsonSource(map, "pareto-route-src", {
      type: "FeatureCollection",
      features: paretoFeatures,
    });

    ensureLayer(map, "pareto-route-layer", "pareto-route-src", "line", {
      "line-color": "#a855f7",
      "line-width": 3.5,
      "line-dasharray": [3, 2],
      "line-opacity": layers.paretoRoute ? 0.95 : 0,
    });

    // 5. Replanned Detour Route (from Scenario Replan)
    const replanFeatures = [];
    if (replanResult?.replanned_route?.geometry_geojson) {
      replanFeatures.push({
        type: "Feature" as const,
        properties: {
          name: replanResult.replanned_route.name,
          distance: replanResult.replanned_route.total_distance_nm,
          congestion: replanResult.replanned_route.congestion_score,
        },
        geometry: replanResult.replanned_route.geometry_geojson,
      });
    }

    updateGeoJsonSource(map, "replan-route-src", {
      type: "FeatureCollection",
      features: replanFeatures,
    });

    ensureLayer(map, "replan-route-layer", "replan-route-src", "line", {
      "line-color": "#10b981",
      "line-width": 4,
      "line-dasharray": [1, 2],
      "line-opacity": layers.plannedRoute ? 0.95 : 0,
    });

    // 6. Active Scenarios (Restricted Polygons)
    const scenarioFeatures = (scenarios || []).map((s) => {
      const coords = s.polygon_geojson;
      // Close polygon ring if needed
      const ring = coords.length > 2 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])
        ? [...coords, coords[0]]
        : coords;

      return {
        type: "Feature" as const,
        properties: {
          id: s.id,
          name: s.name,
          affected_edges: s.affected_edge_count,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring],
        },
      };
    });

    // Add draft polygon if in drawing mode
    if (polygonDraft.length >= 3) {
      const draftRing = [...polygonDraft, polygonDraft[0]];
      scenarioFeatures.push({
        type: "Feature" as const,
        properties: {
          id: -1,
          name: "Draft Exclusion Zone",
          affected_edges: 0,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [draftRing],
        },
      });
    }

    updateGeoJsonSource(map, "scenarios-src", {
      type: "FeatureCollection",
      features: scenarioFeatures,
    });

    ensureLayer(map, "scenarios-fill", "scenarios-src", "fill", {
      "fill-color": "#f43f5e",
      "fill-opacity": layers.restrictions ? 0.25 : 0,
    });

    ensureLayer(map, "scenarios-border", "scenarios-src", "line", {
      "line-color": "#f43f5e",
      "line-width": 2,
      "line-dasharray": [3, 2],
      "line-opacity": layers.restrictions ? 0.85 : 0,
    });

    // 7. Waypoints Nodes
    const wpFeatures = (waypoints || []).map((w) => ({
      type: "Feature" as const,
      properties: {
        code: w.code,
        name: w.name || `Waypoint ${w.code}`,
        observations: w.observation_count,
        trajectories: w.trajectory_count,
        density: w.traffic_density_score,
        isOrigin: w.code === originCode,
        isDest: w.code === destinationCode,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [w.longitude, w.latitude],
      },
    }));

    updateGeoJsonSource(map, "waypoints-src", {
      type: "FeatureCollection",
      features: wpFeatures,
    });

    ensureLayer(map, "waypoints-circle", "waypoints-src", "circle", {
      "circle-radius": [
        "case",
        ["get", "isOrigin"], 9,
        ["get", "isDest"], 9,
        6.5
      ],
      "circle-color": [
        "case",
        ["get", "isOrigin"], "#10b981",
        ["get", "isDest"], "#ef4444",
        "#facc15"
      ],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#0f172a",
      "circle-opacity": layers.waypoints ? 1 : 0,
      "circle-stroke-opacity": layers.waypoints ? 1 : 0,
    });

    // Waypoint Labels
    ensureLayer(map, "waypoints-label", "waypoints-src", "symbol", {
      layout: {
        "text-field": ["get", "code"],
        "text-size": 11,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-font": ["Open Sans Bold"],
      },
      paint: {
        "text-color": "#e2e8f0",
        "text-halo-color": "#0f172a",
        "text-halo-width": 2,
        "text-opacity": layers.waypoints ? 1 : 0,
      },
    });

    // Click on waypoints
    map.off("click", "waypoints-circle", handleWaypointClick);
    map.on("click", "waypoints-circle", handleWaypointClick);
  };

  const handleWaypointClick = (e: any) => {
    if (!e.features || e.features.length === 0) return;
    const feat = e.features[0];
    const code = feat.properties.code;
    const obs = feat.properties.observations;
    const trajs = feat.properties.trajectories;
    const density = feat.properties.density;

    setSelectedWaypointCode(code);
    setSelectedElementInfo(
      `Waypoint ${code} | Observations: ${obs} | Unique Trajectories: ${trajs} | Traffic Density: ${density} hits/NM²`
    );
  };

  const updateGeoJsonSource = (map: maplibregl.Map, id: string, data: any) => {
    const src = map.getSource(id) as maplibregl.GeoJSONSource;
    if (src) {
      src.setData(data);
    } else {
      map.addSource(id, {
        type: "geojson",
        data,
      });
    }
  };

  const ensureLayer = (
    map: maplibregl.Map,
    id: string,
    source: string,
    type: any,
    paint: any,
    layout?: any
  ) => {
    if (map.getLayer(id)) {
      Object.keys(paint).forEach((key) => {
        map.setPaintProperty(id, key as any, paint[key]);
      });
    } else {
      map.addLayer({
        id,
        type,
        source,
        paint,
        ...(layout ? { layout } : {}),
      });
    }
  };

  return (
    <div className={`relative w-full h-full ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950" : "min-h-[540px]"}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950" />

      {/* Top Left Status & Waypoint Selector Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-col space-y-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 shadow-lg flex items-center space-x-3 text-xs font-mono text-slate-200">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-white">Dover Strait Tactical Grid</span>
          </div>
          <span className="text-slate-500">|</span>
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Origin:</span>
            <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
              {originCode}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Dest:</span>
            <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/60">
              {destinationCode}
            </span>
          </div>
        </div>

        {selectedWaypointCode && (
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg flex items-center space-x-2 text-xs font-mono">
            <span className="text-amber-400 font-semibold">{selectedWaypointCode} Selected:</span>
            <button
              onClick={() => setOriginCode(selectedWaypointCode)}
              className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40"
            >
              Set as Origin
            </button>
            <button
              onClick={() => setDestinationCode(selectedWaypointCode)}
              className="px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40"
            >
              Set as Dest
            </button>
          </div>
        )}
      </div>

      {/* Top Right Tactical Layer Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col space-y-2">
        <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-700 shadow-xl text-xs space-y-2 w-48 font-mono">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-slate-300 font-semibold">
            <div className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chart Layers</span>
            </div>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>AIS Trajectories</span>
              </span>
              <input
                type="checkbox"
                checked={layers.trajectories}
                onChange={() => toggleLayer("trajectories")}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Waypoints (SDGB)</span>
              </span>
              <input
                type="checkbox"
                checked={layers.waypoints}
                onChange={() => toggleLayer("waypoints")}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Nav Graph Edges</span>
              </span>
              <input
                type="checkbox"
                checked={layers.graphEdges}
                onChange={() => toggleLayer("graphEdges")}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-300" />
                <span>A* Planned Route</span>
              </span>
              <input
                type="checkbox"
                checked={layers.plannedRoute}
                onChange={() => toggleLayer("plannedRoute")}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Pareto Solution</span>
              </span>
              <input
                type="checkbox"
                checked={layers.paretoRoute}
                onChange={() => toggleLayer("paretoRoute")}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Restricted Zones</span>
              </span>
              <input
                type="checkbox"
                checked={layers.restrictions}
                onChange={() => toggleLayer("restrictions")}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
            </label>
          </div>

          {/* Polygon Drawing Control */}
          <div className="pt-2 border-t border-slate-800">
            {!drawingPolygon ? (
              <button
                onClick={() => setDrawingPolygon(true)}
                className="w-full flex items-center justify-center space-x-1 py-1 px-2 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-semibold"
              >
                <PenTool className="w-3 h-3" />
                <span>Draw Restriction</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[11px] text-rose-300 flex items-center justify-between font-mono">
                  <span>Draft Points:</span>
                  <span className="font-bold">{polygonDraft.length}</span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={resetPolygonDraft}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={polygonDraft.length < 3}
                    onClick={() => setDrawingPolygon(false)}
                    className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Info Banner */}
      {selectedElementInfo && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 shadow-2xl text-xs font-mono text-cyan-300 flex items-center space-x-2 max-w-xl">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">{selectedElementInfo}</span>
          <button
            onClick={() => setSelectedElementInfo(null)}
            className="ml-2 text-slate-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
