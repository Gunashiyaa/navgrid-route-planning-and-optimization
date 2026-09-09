import { create } from "zustand";
import {
  DatasetStats,
  Vessel,
  Trajectory,
  TrajectorySimplifyResult,
  Waypoint,
  NavigationGraph,
  Route,
  ParetoFrontResponse,
  ParetoSolution,
  Scenario,
  ScenarioReplanResult,
} from "../types";

export type NavTab =
  | "map"
  | "cleaning"
  | "simplification"
  | "waypoints"
  | "graph"
  | "routing"
  | "optimization"
  | "scenarios"
  | "system";

export interface MapLayerState {
  rawAis: boolean;
  trajectories: boolean;
  simplified: boolean;
  waypoints: boolean;
  graphEdges: boolean;
  plannedRoute: boolean;
  paretoRoute: boolean;
  restrictions: boolean;
}

interface NavGridState {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;

  stats: DatasetStats | null;
  setStats: (stats: DatasetStats | null) => void;

  vessels: Vessel[];
  setVessels: (vessels: Vessel[]) => void;
  selectedVesselMmsi: number | null;
  setSelectedVesselMmsi: (mmsi: number | null) => void;

  trajectories: Trajectory[];
  setTrajectories: (trajs: Trajectory[]) => void;
  selectedTrajectoryId: number | null;
  setSelectedTrajectoryId: (id: number | null) => void;

  simplificationResult: TrajectorySimplifyResult | null;
  setSimplificationResult: (res: TrajectorySimplifyResult | null) => void;
  simplificationTolerance: number;
  setSimplificationTolerance: (tol: number) => void;

  waypoints: Waypoint[];
  setWaypoints: (wps: Waypoint[]) => void;
  selectedWaypointCode: string | null;
  setSelectedWaypointCode: (code: string | null) => void;

  graph: NavigationGraph | null;
  setGraph: (graph: NavigationGraph | null) => void;

  originCode: string;
  setOriginCode: (code: string) => void;
  destinationCode: string;
  setDestinationCode: (code: string) => void;
  alphaWeight: number;
  setAlphaWeight: (w: number) => void;
  betaWeight: number;
  setBetaWeight: (w: number) => void;

  currentRoute: Route | null;
  setCurrentRoute: (route: Route | null) => void;

  paretoResult: ParetoFrontResponse | null;
  setParetoResult: (res: ParetoFrontResponse | null) => void;
  selectedSolution: ParetoSolution | null;
  setSelectedSolution: (sol: ParetoSolution | null) => void;

  scenarios: Scenario[];
  setScenarios: (scenarios: Scenario[]) => void;
  selectedScenarioId: number | null;
  setSelectedScenarioId: (id: number | null) => void;
  replanResult: ScenarioReplanResult | null;
  setReplanResult: (res: ScenarioReplanResult | null) => void;

  drawingPolygon: boolean;
  setDrawingPolygon: (drawing: boolean) => void;
  polygonDraft: [number, number][];
  setPolygonDraft: (coords: [number, number][]) => void;
  addPolygonDraftPoint: (coord: [number, number]) => void;
  resetPolygonDraft: () => void;

  layers: MapLayerState;
  toggleLayer: (layer: keyof MapLayerState) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  statusMessage: string;
  setStatusMessage: (msg: string) => void;
}

export const useNavGridStore = create<NavGridState>((set) => ({
  activeTab: "map",
  setActiveTab: (tab) => set({ activeTab: tab }),

  stats: null,
  setStats: (stats) => set({ stats }),

  vessels: [],
  setVessels: (vessels) => set({ vessels }),
  selectedVesselMmsi: null,
  setSelectedVesselMmsi: (mmsi) => set({ selectedVesselMmsi: mmsi }),

  trajectories: [],
  setTrajectories: (trajectories) => set({ trajectories }),
  selectedTrajectoryId: null,
  setSelectedTrajectoryId: (id) => set({ selectedTrajectoryId: id }),

  simplificationResult: null,
  setSimplificationResult: (res) => set({ simplificationResult: res }),
  simplificationTolerance: 120.0,
  setSimplificationTolerance: (tol) => set({ simplificationTolerance: tol }),

  waypoints: [],
  setWaypoints: (waypoints) => set({ waypoints }),
  selectedWaypointCode: null,
  setSelectedWaypointCode: (code) => set({ selectedWaypointCode: code }),

  graph: null,
  setGraph: (graph) => set({ graph }),

  originCode: "WP-01",
  setOriginCode: (originCode) => set({ originCode }),
  destinationCode: "WP-06",
  setDestinationCode: (destinationCode) => set({ destinationCode }),
  alphaWeight: 1.0,
  setAlphaWeight: (alphaWeight) => set({ alphaWeight }),
  betaWeight: 1.5,
  setBetaWeight: (betaWeight) => set({ betaWeight }),

  currentRoute: null,
  setCurrentRoute: (currentRoute) => set({ currentRoute }),

  paretoResult: null,
  setParetoResult: (paretoResult) => set({ paretoResult }),
  selectedSolution: null,
  setSelectedSolution: (selectedSolution) => set({ selectedSolution }),

  scenarios: [],
  setScenarios: (scenarios) => set({ scenarios }),
  selectedScenarioId: null,
  setSelectedScenarioId: (selectedScenarioId) => set({ selectedScenarioId }),
  replanResult: null,
  setReplanResult: (replanResult) => set({ replanResult }),

  drawingPolygon: false,
  setDrawingPolygon: (drawingPolygon) => set({ drawingPolygon }),
  polygonDraft: [],
  setPolygonDraft: (polygonDraft) => set({ polygonDraft }),
  addPolygonDraftPoint: (coord) =>
    set((state) => ({ polygonDraft: [...state.polygonDraft, coord] })),
  resetPolygonDraft: () => set({ polygonDraft: [], drawingPolygon: false }),

  layers: {
    rawAis: false,
    trajectories: true,
    simplified: false,
    waypoints: true,
    graphEdges: true,
    plannedRoute: true,
    paretoRoute: true,
    restrictions: true,
  },
  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),

  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  statusMessage: "System Ready. Connected to deterministic AIS engine.",
  setStatusMessage: (statusMessage) => set({ statusMessage }),
}));
