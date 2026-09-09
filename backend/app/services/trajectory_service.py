from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.models import Trajectory, TrajectoryPoint, Vessel
from backend.app.algorithms.simplification import MPDPSimplifier
from backend.app.algorithms.trajectory_builder import haversine_distance_nm

class TrajectoryService:
    @staticmethod
    def get_trajectories(db: Session, mmsi: Optional[int] = None) -> List[Dict[str, Any]]:
        query = db.query(Trajectory)
        if mmsi:
            query = query.filter(Trajectory.vessel_mmsi == mmsi)
        trajectories = query.all()

        results = []
        for t in trajectories:
            pts = (
                db.query(TrajectoryPoint)
                .filter(TrajectoryPoint.trajectory_id == t.id)
                .order_by(TrajectoryPoint.seq_index.asc())
                .all()
            )
            vessel = db.query(Vessel).filter(Vessel.mmsi == t.vessel_mmsi).first()
            results.append({
                "id": t.id,
                "vessel_mmsi": t.vessel_mmsi,
                "vessel_name": vessel.vessel_name if vessel else f"Vessel {t.vessel_mmsi}",
                "vessel_type": vessel.vessel_type if vessel else "Commercial",
                "start_time": t.start_time,
                "end_time": t.end_time,
                "point_count": t.point_count,
                "simplified_point_count": t.simplified_point_count or t.point_count,
                "reduction_ratio": t.reduction_ratio or 0.0,
                "length_nm": t.length_nm,
                "points": [
                    {
                        "seq_index": p.seq_index,
                        "latitude": p.latitude,
                        "longitude": p.longitude,
                        "timestamp": p.timestamp,
                        "speed_over_ground": p.speed_over_ground,
                        "course_over_ground": p.course_over_ground,
                        "is_retained": p.is_retained
                    }
                    for p in pts
                ]
            })
        return results

    @staticmethod
    def simplify_trajectory(
        db: Session,
        trajectory_id: int,
        tolerance_meters: float = 120.0
    ) -> Dict[str, Any]:
        traj = db.query(Trajectory).filter(Trajectory.id == trajectory_id).first()
        if not traj:
            raise ValueError(f"Trajectory {trajectory_id} not found")

        pts = (
            db.query(TrajectoryPoint)
            .filter(TrajectoryPoint.trajectory_id == trajectory_id)
            .order_by(TrajectoryPoint.seq_index.asc())
            .all()
        )

        pt_dicts = [
            {
                "latitude": p.latitude,
                "longitude": p.longitude,
                "course_over_ground": p.course_over_ground,
                "id": p.id
            }
            for p in pts
        ]

        simplifier = MPDPSimplifier(tolerance_meters=tolerance_meters)
        simplified, metrics = simplifier.simplify(pt_dicts)

        retained_ids = set(p["id"] for p in simplified)

        # Update database retained status
        for p in pts:
            p.is_retained = p.id in retained_ids

        traj.simplified_point_count = len(simplified)
        traj.reduction_ratio = metrics["reduction_percentage"]
        db.commit()

        # Compute lengths
        orig_len = 0.0
        for i in range(1, len(pt_dicts)):
            orig_len += haversine_distance_nm(
                pt_dicts[i - 1]["latitude"], pt_dicts[i - 1]["longitude"],
                pt_dicts[i]["latitude"], pt_dicts[i]["longitude"]
            )

        simp_len = 0.0
        for i in range(1, len(simplified)):
            simp_len += haversine_distance_nm(
                simplified[i - 1]["latitude"], simplified[i - 1]["longitude"],
                simplified[i]["latitude"], simplified[i]["longitude"]
            )

        return {
            "trajectory_id": traj.id,
            "vessel_mmsi": traj.vessel_mmsi,
            "tolerance_meters": tolerance_meters,
            "original_point_count": len(pt_dicts),
            "simplified_point_count": len(simplified),
            "reduction_percentage": metrics["reduction_percentage"],
            "original_points": [[p["longitude"], p["latitude"]] for p in pt_dicts],
            "simplified_points": [[p["longitude"], p["latitude"]] for p in simplified],
            "original_length_nm": round(orig_len, 3),
            "simplified_length_nm": round(simp_len, 3)
        }
