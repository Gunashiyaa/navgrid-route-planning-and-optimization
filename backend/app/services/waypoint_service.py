from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.models.models import Waypoint, Trajectory, TrajectoryPoint, NavigationEdge
from backend.app.algorithms.waypoint_extractor import WaypointExtractor
from backend.app.services.trajectory_service import TrajectoryService

class WaypointService:
    @staticmethod
    def extract_and_store(
        db: Session,
        grid_resolution_nm: float = 1.0,
        min_observations: int = 3,
        merge_distance_nm: float = 1.2
    ) -> List[Dict[str, Any]]:
        # Fetch current trajectories with points
        trajectories = TrajectoryService.get_trajectories(db)
        if not trajectories:
            return []

        extractor = WaypointExtractor(
            grid_resolution_nm=grid_resolution_nm,
            min_observations=min_observations,
            merge_distance_nm=merge_distance_nm
        )
        extracted = extractor.extract_waypoints(trajectories)

        # Clear existing waypoints and edges to maintain clean network integrity
        db.query(NavigationEdge).delete()
        db.query(Waypoint).delete()
        db.commit()

        stored_waypoints = []
        for w in extracted:
            wp = Waypoint(
                code=w["code"],
                name=w["name"],
                latitude=w["latitude"],
                longitude=w["longitude"],
                observation_count=w["observation_count"],
                trajectory_count=w["trajectory_count"],
                traffic_density_score=w["traffic_density_score"],
                cluster_radius_nm=w["cluster_radius_nm"]
            )
            db.add(wp)
            db.flush()
            stored_waypoints.append({
                "id": wp.id,
                "code": wp.code,
                "name": wp.name,
                "latitude": wp.latitude,
                "longitude": wp.longitude,
                "observation_count": wp.observation_count,
                "trajectory_count": wp.trajectory_count,
                "traffic_density_score": wp.traffic_density_score,
                "cluster_radius_nm": wp.cluster_radius_nm
            })

        db.commit()
        return stored_waypoints

    @staticmethod
    def get_all(db: Session) -> List[Dict[str, Any]]:
        waypoints = db.query(Waypoint).order_by(Waypoint.code.asc()).all()
        return [
            {
                "id": w.id,
                "code": w.code,
                "name": w.name,
                "latitude": w.latitude,
                "longitude": w.longitude,
                "observation_count": w.observation_count,
                "trajectory_count": w.trajectory_count,
                "traffic_density_score": w.traffic_density_score,
                "cluster_radius_nm": w.cluster_radius_nm
            }
            for w in waypoints
        ]
