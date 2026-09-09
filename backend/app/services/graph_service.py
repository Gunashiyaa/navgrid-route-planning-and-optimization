from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.models.models import Waypoint, NavigationEdge
from backend.app.algorithms.graph_builder import NavigationGraphBuilder
from backend.app.services.trajectory_service import TrajectoryService
from backend.app.services.waypoint_service import WaypointService

class GraphService:
    @staticmethod
    def build_and_store(
        db: Session,
        max_edge_distance_nm: float = 12.0
    ) -> Dict[str, Any]:
        waypoints = WaypointService.get_all(db)
        if len(waypoints) < 2:
            return {"nodes": [], "edges": [], "total_nodes": 0, "total_edges": 0}

        trajectories = TrajectoryService.get_trajectories(db)

        builder = NavigationGraphBuilder(max_edge_distance_nm=max_edge_distance_nm)
        edges_data = builder.build_graph(waypoints, trajectories)

        # Clear existing edges
        db.query(NavigationEdge).delete()
        db.commit()

        wp_id_by_code = {w["code"]: w["id"] for w in waypoints}
        stored_edges = []

        for e in edges_data:
            src_id = wp_id_by_code.get(e["source_code"])
            tgt_id = wp_id_by_code.get(e["target_code"])
            if not src_id or not tgt_id:
                continue

            edge = NavigationEdge(
                source_waypoint_id=src_id,
                target_waypoint_id=tgt_id,
                distance_nm=e["distance_nm"],
                historical_vessel_count=e["historical_vessel_count"],
                congestion_score=e["congestion_score"],
                is_bidirectional=True
            )
            db.add(edge)
            db.flush()

            stored_edges.append({
                "id": edge.id,
                "source_id": src_id,
                "source_code": e["source_code"],
                "target_id": tgt_id,
                "target_code": e["target_code"],
                "distance_nm": e["distance_nm"],
                "historical_vessel_count": e["historical_vessel_count"],
                "congestion_score": e["congestion_score"],
                "source_coords": e["source_coords"],
                "target_coords": e["target_coords"]
            })

        db.commit()

        return {
            "nodes": waypoints,
            "edges": stored_edges,
            "total_nodes": len(waypoints),
            "total_edges": len(stored_edges)
        }

    @staticmethod
    def get_graph(db: Session) -> Dict[str, Any]:
        waypoints = WaypointService.get_all(db)
        wp_by_id = {w["id"]: w for w in waypoints}

        edges = db.query(NavigationEdge).all()
        edge_list = []
        for e in edges:
            src = wp_by_id.get(e.source_waypoint_id)
            tgt = wp_by_id.get(e.target_waypoint_id)
            if not src or not tgt:
                continue
            edge_list.append({
                "id": e.id,
                "source_id": e.source_waypoint_id,
                "source_code": src["code"],
                "target_id": e.target_waypoint_id,
                "target_code": tgt["code"],
                "distance_nm": e.distance_nm,
                "historical_vessel_count": e.historical_vessel_count,
                "congestion_score": e.congestion_score,
                "source_coords": [src["longitude"], src["latitude"]],
                "target_coords": [tgt["longitude"], tgt["latitude"]]
            })

        return {
            "nodes": waypoints,
            "edges": edge_list,
            "total_nodes": len(waypoints),
            "total_edges": len(edge_list)
        }
