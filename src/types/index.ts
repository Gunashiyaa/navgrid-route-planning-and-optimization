export interface AisPosition {
  id: number;
  vessel_mmsi: number;
  timestamp: string;
  latitude: float;
  longitude: float;
  speed_over_ground?: number | null;
  course_over_ground?: number | null;
  heading?: number | null;
  trajectory_id?: number | null;
}

export type float = number;

export interface Vessel {
  mmsi: number;
  vessel_name?: string | null;
  vessel_type?: string | null;
  length?: number | null;
  width?: number | null;
  position_count: number;
  trajectory_count: number;
}

export interface TrajectoryPoint {
  seq_index: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed_over_ground?: number | null;
  course_over_ground?: number | null;
  is_retained: boolean;
}

export interface Trajectory {
  id: number;
  vessel_mmsi: number;
  vessel_name?: string;
  vessel_type?: string;
  start_time: string;
  end_time: string;
  point_count: number;
  simplified_point_count: number;
  reduction_ratio: number;
  length_nm: number;
  points?: TrajectoryPoint[];
}

export interface TrajectorySimplifyResult {
  trajectory_id: number;
  vessel_mmsi: number;
  tolerance_meters: number;
  original_point_count: number;
  simplified_point_count: number;
  reduction_percentage: number;
  original_points: [number, number][]; // [lon, lat]
  simplified_points: [number, number][]; // [lon, lat]
  original_length_nm: number;
  simplified_length_nm: number;
}

export interface Waypoint {
  id: number;
  code: string;
  name?: string | null;
  latitude: number;
  longitude: number;
  observation_count: number;
  trajectory_count: number;
  traffic_density_score: number;
  cluster_radius_nm: number;
}

export interface NavigationEdge {
  id: number;
  source_id: number;
  source_code: string;
  target_id: number;
  target_code: string;
  distance_nm: number;
  historical_vessel_count: number;
  congestion_score: number;
  source_coords: [number, number]; // [lon, lat]
  target_coords: [number, number]; // [lon, lat]
}

export interface NavigationGraph {
  nodes: Waypoint[];
  edges: NavigationEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface RouteSegment {
  from_waypoint: string;
  to_waypoint: string;
  distance_nm: number;
  congestion_score: number;
  travel_time_hours: number;
  start_coords: [number, number];
  end_coords: [number, number];
}

export interface Route {
  id?: number | null;
  name: string;
  origin_code: string;
  destination_code: string;
  algorithm_type: string;
  total_distance_nm: number;
  congestion_score: number;
  estimated_travel_hours: number;
  waypoint_sequence: string[];
  segments: RouteSegment[];
  geometry_geojson: {
    type: string;
    coordinates: [number, number][];
  };
  is_replanned: boolean;
  scenario_id?: number | null;
}

export interface ParetoSolution {
  solution_id: string;
  name: string;
  distance_nm: number;
  congestion_score: number;
  estimated_hours: number;
  waypoint_sequence: string[];
  geometry_geojson: {
    type: string;
    coordinates: [number, number][];
  };
  is_pareto_optimal: boolean;
  rank: number;
  crowding_distance: number;
}

export interface ParetoFrontResponse {
  origin_code: string;
  destination_code: string;
  population_size: number;
  generations: number;
  runtime_ms: number;
  total_evaluated: number;
  solutions: ParetoSolution[];
}

export interface Scenario {
  id: number;
  name: string;
  description?: string | null;
  polygon_geojson: [number, number][]; // coordinates
  affected_edge_count: number;
  status: string;
  created_at: string;
}

export interface ScenarioReplanResult {
  scenario: Scenario;
  original_route: Route;
  replanned_route?: Route | null;
  status: "REPLANNED_SUCCESS" | "NO_FEASIBLE_ROUTE" | "UNAFFECTED";
  distance_delta_nm?: number | null;
  distance_delta_pct?: number | null;
  congestion_delta?: number | null;
  congestion_delta_pct?: number | null;
  affected_edges: string[];
  affected_waypoints: string[];
  message?: string;
}

export interface DatasetStats {
  total_raw_positions: number;
  valid_positions: number;
  total_vessels: number;
  total_trajectories: number;
  total_waypoints: number;
  total_edges: number;
  total_routes_planned: number;
  total_scenarios: number;
  bounding_box: {
    min_latitude: number;
    max_latitude: number;
    min_longitude: number;
    max_longitude: number;
  };
}

export interface ImportSummary {
  filename: string;
  records_read: number;
  valid_records: number;
  invalid_records: number;
  duplicates_removed: number;
  vessels_found: number;
  trajectories_created: number;
  processing_time_ms: number;
  status: string;
}
