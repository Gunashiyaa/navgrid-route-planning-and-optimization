import {
  DatasetStats,
  ImportSummary,
  Vessel,
  Trajectory,
  TrajectorySimplifyResult,
  Waypoint,
  NavigationGraph,
  Route,
  ParetoFrontResponse,
  Scenario,
  ScenarioReplanResult,
} from "../types";

const BASE_URL = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "API Request failed";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<{ status: string; positions_loaded: number }> {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse(res);
  },

  async getStats(): Promise<DatasetStats> {
    const res = await fetch(`${BASE_URL}/datasets/stats`);
    return handleResponse<DatasetStats>(res);
  },

  async importDataset(file?: File): Promise<ImportSummary> {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE_URL}/datasets/import?use_sample=false`, {
        method: "POST",
        body: formData,
      });
      return handleResponse<ImportSummary>(res);
    } else {
      const res = await fetch(`${BASE_URL}/datasets/import?use_sample=true`, {
        method: "POST",
      });
      return handleResponse<ImportSummary>(res);
    }
  },

  async getVessels(): Promise<Vessel[]> {
    const res = await fetch(`${BASE_URL}/vessels`);
    return handleResponse<Vessel[]>(res);
  },

  async getTrajectories(mmsi?: number): Promise<Trajectory[]> {
    const url = mmsi ? `${BASE_URL}/trajectories?mmsi=${mmsi}` : `${BASE_URL}/trajectories`;
    const res = await fetch(url);
    return handleResponse<Trajectory[]>(res);
  },

  async simplifyTrajectory(
    trajectory_id?: number,
    tolerance_meters: number = 120.0
  ): Promise<TrajectorySimplifyResult> {
    const res = await fetch(`${BASE_URL}/trajectories/simplify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trajectory_id, tolerance_meters }),
    });
    return handleResponse<TrajectorySimplifyResult>(res);
  },

  async extractWaypoints(
    grid_resolution_nm: number = 1.0,
    min_observations: number = 3,
    merge_distance_nm: number = 1.2
  ): Promise<Waypoint[]> {
    const query = new URLSearchParams({
      grid_resolution_nm: grid_resolution_nm.toString(),
      min_observations: min_observations.toString(),
      merge_distance_nm: merge_distance_nm.toString(),
    });
    const res = await fetch(`${BASE_URL}/waypoints/extract?${query}`, {
      method: "POST",
    });
    return handleResponse<Waypoint[]>(res);
  },

  async getWaypoints(): Promise<Waypoint[]> {
    const res = await fetch(`${BASE_URL}/waypoints`);
    return handleResponse<Waypoint[]>(res);
  },

  async buildNavigationGraph(max_edge_distance_nm: number = 12.0): Promise<NavigationGraph> {
    const res = await fetch(
      `${BASE_URL}/navigation-graph/build?max_edge_distance_nm=${max_edge_distance_nm}`,
      { method: "POST" }
    );
    return handleResponse<NavigationGraph>(res);
  },

  async getNavigationGraph(): Promise<NavigationGraph> {
    const res = await fetch(`${BASE_URL}/navigation-graph`);
    return handleResponse<NavigationGraph>(res);
  },

  async planRoute(
    origin_code: string,
    destination_code: string,
    alpha: number = 1.0,
    beta: number = 1.5,
    scenario_id?: number
  ): Promise<Route> {
    const res = await fetch(`${BASE_URL}/routes/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin_code,
        destination_code,
        alpha_distance_weight: alpha,
        beta_congestion_weight: beta,
        scenario_id,
      }),
    });
    return handleResponse<Route>(res);
  },

  async optimizeRoutes(
    origin_code: string,
    destination_code: string,
    population_size: number = 40,
    generations: number = 25,
    scenario_id?: number
  ): Promise<ParetoFrontResponse> {
    const res = await fetch(`${BASE_URL}/routes/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin_code,
        destination_code,
        population_size,
        generations,
        scenario_id,
      }),
    });
    return handleResponse<ParetoFrontResponse>(res);
  },

  async createScenario(
    name: string,
    description: string,
    polygon_coordinates: [number, number][]
  ): Promise<Scenario> {
    const res = await fetch(`${BASE_URL}/scenarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        polygon_coordinates,
      }),
    });
    return handleResponse<Scenario>(res);
  },

  async getScenarios(): Promise<Scenario[]> {
    const res = await fetch(`${BASE_URL}/scenarios`);
    return handleResponse<Scenario[]>(res);
  },

  async replanScenario(
    scenario_id: number,
    origin_code: string,
    destination_code: string
  ): Promise<ScenarioReplanResult> {
    const query = new URLSearchParams({ origin_code, destination_code });
    const res = await fetch(`${BASE_URL}/scenarios/${scenario_id}/replan?${query}`, {
      method: "POST",
    });
    return handleResponse<ScenarioReplanResult>(res);
  },

  async getRuns(): Promise<any> {
    const res = await fetch(`${BASE_URL}/runs`);
    return handleResponse(res);
  },
};
