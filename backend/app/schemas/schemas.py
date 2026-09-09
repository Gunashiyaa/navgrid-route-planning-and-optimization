from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

class AisPositionBase(BaseModel):
    vessel_mmsi: int
    timestamp: datetime
    latitude: float
    longitude: float
    speed_over_ground: Optional[float] = None
    course_over_ground: Optional[float] = None
    heading: Optional[float] = None

class AisPositionOut(AisPositionBase):
    id: int
    trajectory_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class VesselOut(BaseModel):
    mmsi: int
    vessel_name: Optional[str] = None
    vessel_type: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    position_count: int = 0
    trajectory_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class TrajectoryPointOut(BaseModel):
    seq_index: int
    latitude: float
    longitude: float
    timestamp: datetime
    speed_over_ground: Optional[float] = None
    course_over_ground: Optional[float] = None
    is_retained: bool = True

class TrajectoryOut(BaseModel):
    id: int
    vessel_mmsi: int
    start_time: datetime
    end_time: datetime
    point_count: int
    simplified_point_count: int
    reduction_ratio: float
    length_nm: float
    points: Optional[List[TrajectoryPointOut]] = None
    model_config = ConfigDict(from_attributes=True)

class TrajectorySimplifyRequest(BaseModel):
    trajectory_id: Optional[int] = None
    tolerance_meters: float = Field(default=100.0, ge=10.0, le=2000.0)

class TrajectorySimplifyResponse(BaseModel):
    trajectory_id: int
    vessel_mmsi: int
    tolerance_meters: float
    original_point_count: int
    simplified_point_count: int
    reduction_percentage: float
    original_points: List[List[float]] # [[lon, lat], ...]
    simplified_points: List[List[float]] # [[lon, lat], ...]
    original_length_nm: float
    simplified_length_nm: float

class WaypointOut(BaseModel):
    id: int
    code: str
    name: Optional[str] = None
    latitude: float
    longitude: float
    observation_count: int
    trajectory_count: int
    traffic_density_score: float
    cluster_radius_nm: float
    model_config = ConfigDict(from_attributes=True)

class NavigationEdgeOut(BaseModel):
    id: int
    source_id: int
    source_code: str
    target_id: int
    target_code: str
    distance_nm: float
    historical_vessel_count: int
    congestion_score: float
    source_coords: List[float] # [lon, lat]
    target_coords: List[float] # [lon, lat]

class NavigationGraphResponse(BaseModel):
    nodes: List[WaypointOut]
    edges: List[NavigationEdgeOut]
    total_nodes: int
    total_edges: int

class RouteSegmentOut(BaseModel):
    from_waypoint: str
    to_waypoint: str
    distance_nm: float
    congestion_score: float
    travel_time_hours: float
    start_coords: List[float]
    end_coords: List[float]

class RouteOut(BaseModel):
    id: Optional[int] = None
    name: str
    origin_code: str
    destination_code: str
    algorithm_type: str
    total_distance_nm: float
    congestion_score: float
    estimated_travel_hours: float
    waypoint_sequence: List[str]
    segments: List[RouteSegmentOut]
    geometry_geojson: Dict[str, Any]
    is_replanned: bool = False
    scenario_id: Optional[int] = None

class RoutePlanRequest(BaseModel):
    origin_code: str
    destination_code: str
    alpha_distance_weight: float = Field(default=1.0, ge=0.0, le=10.0)
    beta_congestion_weight: float = Field(default=1.5, ge=0.0, le=10.0)
    scenario_id: Optional[int] = None

class OptimizeRequest(BaseModel):
    origin_code: str
    destination_code: str
    population_size: int = Field(default=40, ge=10, le=200)
    generations: int = Field(default=25, ge=5, le=100)
    scenario_id: Optional[int] = None

class ParetoSolution(BaseModel):
    solution_id: str
    name: str
    distance_nm: float
    congestion_score: float
    estimated_hours: float
    waypoint_sequence: List[str]
    geometry_geojson: Dict[str, Any]
    is_pareto_optimal: bool = True
    rank: int = 1
    crowding_distance: float = 0.0

class ParetoFrontResponse(BaseModel):
    origin_code: str
    destination_code: str
    population_size: int
    generations: int
    runtime_ms: float
    total_evaluated: int
    solutions: List[ParetoSolution]

class ScenarioCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    polygon_coordinates: List[List[float]] # [[lon, lat], ...] closed or open

class ScenarioOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    polygon_geojson: Any
    affected_edge_count: int
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ScenarioReplanResponse(BaseModel):
    scenario: ScenarioOut
    original_route: RouteOut
    replanned_route: Optional[RouteOut] = None
    status: str # REPLANNED_SUCCESS or NO_FEASIBLE_ROUTE
    distance_delta_nm: Optional[float] = None
    distance_delta_pct: Optional[float] = None
    congestion_delta: Optional[float] = None
    congestion_delta_pct: Optional[float] = None
    affected_edges: List[str] = []
    affected_waypoints: List[str] = []
    reason: Optional[str] = None

class ImportSummaryResponse(BaseModel):
    filename: str
    records_read: int
    valid_records: int
    invalid_records: int
    duplicates_removed: int
    vessels_found: int
    trajectories_created: int
    processing_time_ms: float
    status: str

class DatasetStatsResponse(BaseModel):
    total_raw_positions: int
    valid_positions: int
    total_vessels: int
    total_trajectories: int
    total_waypoints: int
    total_edges: int
    total_routes_planned: int
    total_scenarios: int
    bounding_box: Dict[str, float]
