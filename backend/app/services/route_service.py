import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.models.models import Route, Waypoint
from backend.app.algorithms.pathfinding import AStarRouter
from backend.app.services.graph_service import GraphService

class RouteService:
    @staticmethod
    def plan_route(
        db: Session,
        origin_code: str,
        destination_code: str,
        alpha: float = 1.0,
        beta: float = 1.5,
        scenario_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        graph = GraphService.get_graph(db)
        waypoints = graph["nodes"]
        edges = graph["edges"]

        if not waypoints or not edges:
            raise ValueError("Navigation graph is empty. Please build waypoints and navigation graph first.")

        wp_dict = {w["code"]: w for w in waypoints}
        if origin_code not in wp_dict:
            raise ValueError(f"Origin waypoint {origin_code} not found in navigation graph")
        if destination_code not in wp_dict:
            raise ValueError(f"Destination waypoint {destination_code} not found in navigation graph")

        excluded_edges = set()
        excluded_waypoints = set()

        if scenario_id:
            from backend.app.models.models import Scenario
            from backend.app.algorithms.scenario_engine import ScenarioEngine
            scen = db.query(Scenario).filter(Scenario.id == scenario_id).first()
            if scen:
                poly = json.loads(scen.polygon_geojson)
                engine = ScenarioEngine()
                excluded_waypoints, excluded_edges = engine.find_affected_elements(poly, waypoints, edges)

        router = AStarRouter(alpha_distance=alpha, beta_congestion=beta)
        route_data = router.plan_route(
            origin_code,
            destination_code,
            waypoints,
            edges,
            excluded_edges=excluded_edges,
            excluded_waypoints=excluded_waypoints
        )

        if not route_data:
            return None

        # Persist route in database
        origin_wp = db.query(Waypoint).filter(Waypoint.code == origin_code).first()
        dest_wp = db.query(Waypoint).filter(Waypoint.code == destination_code).first()

        route_model = Route(
            name=route_data["name"],
            origin_waypoint_id=origin_wp.id,
            destination_waypoint_id=dest_wp.id,
            algorithm_type="A_STAR",
            total_distance_nm=route_data["total_distance_nm"],
            congestion_score=route_data["congestion_score"],
            estimated_travel_hours=route_data["estimated_travel_hours"],
            waypoint_sequence_json=json.dumps(route_data["waypoint_sequence"]),
            geometry_geojson=json.dumps(route_data["geometry_geojson"]),
            is_replanned=scenario_id is not None,
            scenario_id=scenario_id
        )
        db.add(route_model)
        db.commit()

        route_data["id"] = route_model.id
        return route_data
