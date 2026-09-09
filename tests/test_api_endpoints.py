import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        # Pre-seed if needed
        c.post("/api/datasets/import")
        c.post("/api/waypoints/extract")
        c.post("/api/navigation-graph/build")
        yield c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "positions_loaded" in data

def test_dataset_stats(client):
    response = client.get("/api/datasets/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_raw_positions"] > 0
    assert data["total_vessels"] > 0
    assert data["total_trajectories"] > 0
    assert data["total_waypoints"] > 0

def test_vessels_and_trajectories(client):
    v_res = client.get("/api/vessels")
    assert v_res.status_code == 200
    vessels = v_res.json()
    assert len(vessels) > 0

    t_res = client.get("/api/trajectories")
    assert t_res.status_code == 200
    trajs = t_res.json()
    assert len(trajs) > 0

def test_waypoints_and_graph(client):
    wp_res = client.get("/api/waypoints")
    assert wp_res.status_code == 200
    waypoints = wp_res.json()
    assert len(waypoints) >= 2

    graph_res = client.get("/api/navigation-graph")
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert graph["total_nodes"] >= 2
    assert graph["total_edges"] >= 1

def test_route_planning(client):
    wp_res = client.get("/api/waypoints")
    waypoints = wp_res.json()
    origin = waypoints[0]["code"]
    dest = waypoints[-1]["code"]

    route_res = client.post("/api/routes/plan", json={
        "origin_code": origin,
        "destination_code": dest,
        "alpha_distance_weight": 1.0,
        "beta_congestion_weight": 1.0
    })
    assert route_res.status_code in [200, 404]
    if route_res.status_code == 200:
        data = route_res.json()
        assert data["total_distance_nm"] > 0
        assert len(data["waypoint_sequence"]) >= 2
        assert "geometry_geojson" in data

def test_scenario_creation(client):
    scen_res = client.post("/api/scenarios", json={
        "name": "Strait Traffic Restriction Test",
        "description": "Exclusion test zone",
        "polygon_coordinates": [
            [1.40, 51.10],
            [1.50, 51.10],
            [1.50, 51.20],
            [1.40, 51.20]
        ]
    })
    assert scen_res.status_code == 200
    scen = scen_res.json()
    assert scen["name"] == "Strait Traffic Restriction Test"
    assert scen["id"] > 0
