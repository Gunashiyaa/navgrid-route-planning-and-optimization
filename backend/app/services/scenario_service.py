import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.models.models import Scenario, Route
from backend.app.algorithms.scenario_engine import ScenarioEngine
from backend.app.services.graph_service import GraphService
from backend.app.services.route_service import RouteService

class ScenarioService:
    @staticmethod
    def create_scenario(
        db: Session,
        name: str,
        description: Optional[str],
        polygon_coords: List[List[float]]
    ) -> Dict[str, Any]:
        graph = GraphService.get_graph(db)
        waypoints = graph["nodes"]
        edges = graph["edges"]

        engine = ScenarioEngine()
        affected_wps, affected_edges = engine.find_affected_elements(polygon_coords, waypoints, edges)

        scen = Scenario(
            name=name,
            description=description,
            polygon_geojson=json.dumps(polygon_coords),
            affected_edge_count=len(affected_edges),
            status="ACTIVE"
        )
        db.add(scen)
        db.commit()

        return {
            "id": scen.id,
            "name": scen.name,
            "description": scen.description,
            "polygon_geojson": polygon_coords,
            "affected_edge_count": len(affected_edges),
            "status": scen.status,
            "created_at": scen.created_at
        }

    @staticmethod
    def get_all(db: Session) -> List[Dict[str, Any]]:
        scenarios = db.query(Scenario).order_by(Scenario.created_at.desc()).all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "polygon_geojson": json.loads(s.polygon_geojson),
                "affected_edge_count": s.affected_edge_count,
                "status": s.status,
                "created_at": s.created_at
            }
            for s in scenarios
        ]

    @staticmethod
    def replan_route_under_scenario(
        db: Session,
        scenario_id: int,
        origin_code: str,
        destination_code: str
    ) -> Dict[str, Any]:
        scen = db.query(Scenario).filter(Scenario.id == scenario_id).first()
        if not scen:
            raise ValueError(f"Scenario {scenario_id} not found")

        polygon_coords = json.loads(scen.polygon_geojson)
        graph = GraphService.get_graph(db)
        waypoints = graph["nodes"]
        edges = graph["edges"]

        # 1. First get or calculate original unconstrained route
        from backend.app.algorithms.pathfinding import AStarRouter
        router = AStarRouter(alpha_distance=1.0, beta_congestion=1.0)
        original_route = router.plan_route(origin_code, destination_code, waypoints, edges)
        if not original_route:
            raise ValueError(f"No baseline navigable route exists between {origin_code} and {destination_code}")

        # 2. Run scenario engine replanner
        engine = ScenarioEngine()
        result = engine.replan_scenario_route(
            original_route=original_route,
            polygon_coords=polygon_coords,
            waypoints=waypoints,
            edges=edges
        )

        scen_out = {
            "id": scen.id,
            "name": scen.name,
            "description": scen.description,
            "polygon_geojson": polygon_coords,
            "affected_edge_count": scen.affected_edge_count,
            "status": scen.status,
            "created_at": scen.created_at
        }
        result["scenario"] = scen_out

        # If replanned route was found, save it in db
        if result.get("replanned_route"):
            replanned_data = result["replanned_route"]
            from backend.app.models.models import Waypoint
            o_wp = db.query(Waypoint).filter(Waypoint.code == origin_code).first()
            d_wp = db.query(Waypoint).filter(Waypoint.code == destination_code).first()
            route_model = Route(
                name=f"Replanned Detour ({scen.name})",
                origin_waypoint_id=o_wp.id,
                destination_waypoint_id=d_wp.id,
                algorithm_type="A_STAR_REPLANNED",
                total_distance_nm=replanned_data["total_distance_nm"],
                congestion_score=replanned_data["congestion_score"],
                estimated_travel_hours=replanned_data["estimated_travel_hours"],
                waypoint_sequence_json=json.dumps(replanned_data["waypoint_sequence"]),
                geometry_geojson=json.dumps(replanned_data["geometry_geojson"]),
                is_replanned=True,
                scenario_id=scen.id
            )
            db.add(route_model)
            db.commit()
            replanned_data["id"] = route_model.id

        return result
