import pytest
from datetime import datetime, timedelta
from backend.app.algorithms.trajectory_builder import (
    haversine_distance_nm, haversine_distance_meters,
    calculate_initial_bearing, TrajectoryBuilder
)
from backend.app.algorithms.simplification import MPDPSimplifier
from backend.app.algorithms.waypoint_extractor import WaypointExtractor
from backend.app.algorithms.graph_builder import NavigationGraphBuilder
from backend.app.algorithms.pathfinding import AStarRouter
from backend.app.algorithms.nsga2 import NSGA2RouteOptimizer
from backend.app.algorithms.scenario_engine import ScenarioEngine, point_in_polygon

def test_haversine_distance():
    # Dover (51.12, 1.31) to Calais (50.95, 1.85) is ~ 26-28 NM
    d = haversine_distance_nm(51.12, 1.31, 50.95, 1.85)
    assert 22.0 < d < 30.0

def test_trajectory_builder_splits_on_temporal_gap():
    builder = TrajectoryBuilder(max_time_gap_seconds=1800, min_points=3)
    base_t = datetime(2026, 5, 1, 12, 0, 0)
    records = []
    # Voyage 1: 5 points
    for i in range(5):
        records.append({
            "timestamp": base_t + timedelta(minutes=i * 2),
            "latitude": 51.0 + i * 0.01,
            "longitude": 1.2 + i * 0.01,
            "sog": 12.0,
            "cog": 45.0
        })
    # Temporal gap of 60 minutes
    gap_t = base_t + timedelta(minutes=68)
    # Voyage 2: 5 points
    for i in range(5):
        records.append({
            "timestamp": gap_t + timedelta(minutes=i * 2),
            "latitude": 51.2 + i * 0.01,
            "longitude": 1.4 + i * 0.01,
            "sog": 12.0,
            "cog": 45.0
        })

    trajs = builder.process_vessel_records(123456789, records)
    assert len(trajs) == 2
    assert trajs[0]["point_count"] == 5
    assert trajs[1]["point_count"] == 5

def test_mpdp_simplification_reduces_collinear_points():
    simplifier = MPDPSimplifier(tolerance_meters=150.0)
    # 20 collinear points along a straight line + 1 detour vertex
    points = []
    for i in range(20):
        points.append({
            "latitude": 51.0 + (i * 0.01),
            "longitude": 1.0 + (i * 0.01),
            "course_over_ground": 45.0
        })
    # Add an offset point in the middle
    points[10]["latitude"] += 0.02 # ~ 2.2 km perpendicular deviation

    simplified, metrics = simplifier.simplify(points)
    assert len(simplified) < len(points)
    assert metrics["reduction_percentage"] > 50.0
    # Both endpoints and the significant turn must be retained
    assert len(simplified) >= 3

def test_waypoint_extraction_and_graph_construction():
    # Build synthetic trajectories
    t1_points = [
        {"latitude": 51.0, "longitude": 1.2, "is_retained": True},
        {"latitude": 51.1, "longitude": 1.4, "is_retained": True},
        {"latitude": 51.2, "longitude": 1.6, "is_retained": True}
    ]
    t2_points = [
        {"latitude": 51.0, "longitude": 1.2, "is_retained": True},
        {"latitude": 51.15, "longitude": 1.4, "is_retained": True},
        {"latitude": 51.2, "longitude": 1.6, "is_retained": True}
    ]
    trajs = [
        {"id": 1, "points": t1_points},
        {"id": 2, "points": t2_points}
    ]

    extractor = WaypointExtractor(grid_resolution_nm=4.0, min_observations=1, merge_distance_nm=4.0)
    wps = extractor.extract_waypoints(trajs)
    assert len(wps) >= 2

    graph_builder = NavigationGraphBuilder(max_edge_distance_nm=25.0)
    edges = graph_builder.build_graph(wps, trajs)
    assert len(edges) >= 1

def test_astar_routing():
    wps = [
        {"code": "WP-01", "name": "Start", "latitude": 51.0, "longitude": 1.0},
        {"code": "WP-02", "name": "Mid", "latitude": 51.1, "longitude": 1.2},
        {"code": "WP-03", "name": "End", "latitude": 51.2, "longitude": 1.4}
    ]
    edges = [
        {"source_code": "WP-01", "target_code": "WP-02", "distance_nm": 10.0, "congestion_score": 1.2},
        {"source_code": "WP-02", "target_code": "WP-03", "distance_nm": 10.0, "congestion_score": 1.1}
    ]

    router = AStarRouter(alpha_distance=1.0, beta_congestion=1.0)
    route = router.plan_route("WP-01", "WP-03", wps, edges)
    assert route is not None
    assert route["waypoint_sequence"] == ["WP-01", "WP-02", "WP-03"]
    assert route["total_distance_nm"] == 20.0

def test_nsga2_optimization():
    wps = [
        {"code": "WP-A", "latitude": 51.0, "longitude": 1.0},
        {"code": "WP-B1", "latitude": 51.1, "longitude": 1.1}, # shorter, high congestion
        {"code": "WP-B2", "latitude": 51.2, "longitude": 1.0}, # longer, low congestion
        {"code": "WP-C", "latitude": 51.3, "longitude": 1.1}
    ]
    edges = [
        {"source_code": "WP-A", "target_code": "WP-B1", "distance_nm": 5.0, "congestion_score": 4.0},
        {"source_code": "WP-B1", "target_code": "WP-C", "distance_nm": 5.0, "congestion_score": 4.0},
        {"source_code": "WP-A", "target_code": "WP-B2", "distance_nm": 8.0, "congestion_score": 1.0},
        {"source_code": "WP-B2", "target_code": "WP-C", "distance_nm": 8.0, "congestion_score": 1.0}
    ]

    optimizer = NSGA2RouteOptimizer(population_size=20, generations=10)
    result = optimizer.optimize("WP-A", "WP-C", wps, edges)
    solutions = result["solutions"]
    assert len(solutions) >= 1
    # Solutions should expose Pareto trade-offs
    distances = [s["distance_nm"] for s in solutions]
    assert min(distances) <= 10.0

def test_scenario_replanning():
    wps = [
        {"code": "WP-A", "latitude": 51.0, "longitude": 1.0},
        {"code": "WP-B", "latitude": 51.1, "longitude": 1.1},
        {"code": "WP-C", "latitude": 51.2, "longitude": 1.2},
        {"code": "WP-ALT", "latitude": 51.1, "longitude": 1.3}
    ]
    edges = [
        {"source_code": "WP-A", "target_code": "WP-B", "distance_nm": 6.0, "congestion_score": 1.0},
        {"source_code": "WP-B", "target_code": "WP-C", "distance_nm": 6.0, "congestion_score": 1.0},
        {"source_code": "WP-A", "target_code": "WP-ALT", "distance_nm": 8.0, "congestion_score": 1.0},
        {"source_code": "WP-ALT", "target_code": "WP-C", "distance_nm": 8.0, "congestion_score": 1.0}
    ]

    # Polygon restricting WP-B
    poly = [
        [1.08, 51.08],
        [1.12, 51.08],
        [1.12, 51.12],
        [1.08, 51.12]
    ]

    engine = ScenarioEngine()
    aff_wps, aff_edges = engine.find_affected_elements(poly, wps, edges)
    assert "WP-B" in aff_wps

    orig_route = {
        "origin_code": "WP-A",
        "destination_code": "WP-C",
        "total_distance_nm": 12.0,
        "congestion_score": 1.0,
        "waypoint_sequence": ["WP-A", "WP-B", "WP-C"]
    }

    replan_res = engine.replan_scenario_route(orig_route, poly, wps, edges)
    assert replan_res["status"] == "REPLANNED_SUCCESS"
    assert "WP-ALT" in replan_res["replanned_route"]["waypoint_sequence"]
    assert "WP-B" not in replan_res["replanned_route"]["waypoint_sequence"]
    assert replan_res["distance_delta_nm"] == 4.0 # 16.0 - 12.0
