import os
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db, engine, Base
from backend.app.models.models import (
    Vessel, AisPosition, Trajectory, TrajectoryPoint, Waypoint,
    NavigationEdge, Route, Scenario, OptimizationRun, DatasetLog
)
from backend.app.schemas.schemas import (
    AisPositionOut, VesselOut, TrajectoryOut, TrajectorySimplifyRequest,
    TrajectorySimplifyResponse, WaypointOut, NavigationGraphResponse,
    RouteOut, RoutePlanRequest, OptimizeRequest, ParetoFrontResponse,
    ScenarioCreateRequest, ScenarioOut, ScenarioReplanResponse,
    ImportSummaryResponse, DatasetStatsResponse
)
from backend.app.services.ais_service import AisService
from backend.app.services.trajectory_service import TrajectoryService
from backend.app.services.waypoint_service import WaypointService
from backend.app.services.graph_service import GraphService
from backend.app.services.route_service import RouteService
from backend.app.services.optimization_service import OptimizationService
from backend.app.services.scenario_service import ScenarioService

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    pos_count = db.query(func.count(AisPosition.id)).scalar() or 0
    traj_count = db.query(func.count(Trajectory.id)).scalar() or 0
    wp_count = db.query(func.count(Waypoint.id)).scalar() or 0
    return {
        "status": "healthy",
        "system": "NAVGRID AIS Route Planning & Optimization System",
        "version": "1.0.0",
        "database": "connected",
        "positions_loaded": pos_count,
        "trajectories_count": traj_count,
        "waypoints_count": wp_count
    }

@router.get("/datasets/stats", response_model=DatasetStatsResponse)
def get_dataset_stats(db: Session = Depends(get_db)):
    raw_count = db.query(func.count(AisPosition.id)).scalar() or 0
    vessels_count = db.query(func.count(Vessel.id)).scalar() or 0
    traj_count = db.query(func.count(Trajectory.id)).scalar() or 0
    wp_count = db.query(func.count(Waypoint.id)).scalar() or 0
    edge_count = db.query(func.count(NavigationEdge.id)).scalar() or 0
    routes_count = db.query(func.count(Route.id)).scalar() or 0
    scenarios_count = db.query(func.count(Scenario.id)).scalar() or 0

    # Bounds
    min_lat = db.query(func.min(AisPosition.latitude)).scalar() or 50.8
    max_lat = db.query(func.max(AisPosition.latitude)).scalar() or 51.5
    min_lon = db.query(func.min(AisPosition.longitude)).scalar() or 1.0
    max_lon = db.query(func.max(AisPosition.longitude)).scalar() or 1.9

    return {
        "total_raw_positions": raw_count,
        "valid_positions": raw_count,
        "total_vessels": vessels_count,
        "total_trajectories": traj_count,
        "total_waypoints": wp_count,
        "total_edges": edge_count,
        "total_routes_planned": routes_count,
        "total_scenarios": scenarios_count,
        "bounding_box": {
            "min_latitude": round(min_lat, 4),
            "max_latitude": round(max_lat, 4),
            "min_longitude": round(min_lon, 4),
            "max_longitude": round(max_lon, 4)
        }
    }

@router.post("/datasets/import", response_model=ImportSummaryResponse)
def import_dataset(
    file: Optional[UploadFile] = File(None),
    use_sample: bool = Query(True),
    db: Session = Depends(get_db)
):
    target_path = "data/sample/sample_ais.csv"
    if file and file.filename:
        os.makedirs("data/raw", exist_ok=True)
        target_path = f"data/raw/{file.filename}"
        with open(target_path, "wb") as buffer:
            buffer.write(file.file.read())
    else:
        # Check if sample exists, if not generate it
        if not os.path.exists(target_path):
            from scripts.generate_sample_data import generate_ais_dataset
            generate_ais_dataset(target_path)

    summary = AisService.import_csv(db, target_path)
    return summary

@router.get("/ais/positions")
def get_ais_positions(
    mmsi: Optional[int] = None,
    limit: int = Query(250, ge=10, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(AisPosition)
    if mmsi:
        query = query.filter(AisPosition.vessel_mmsi == mmsi)
    total = query.count()
    records = query.order_by(AisPosition.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": p.id,
                "vessel_mmsi": p.vessel_mmsi,
                "timestamp": p.timestamp.isoformat(),
                "latitude": p.latitude,
                "longitude": p.longitude,
                "speed_over_ground": p.speed_over_ground,
                "course_over_ground": p.course_over_ground,
                "heading": p.heading,
                "trajectory_id": p.trajectory_id
            }
            for p in records
        ]
    }

@router.get("/vessels", response_model=List[VesselOut])
def get_vessels(db: Session = Depends(get_db)):
    vessels = db.query(Vessel).all()
    results = []
    for v in vessels:
        p_count = db.query(func.count(AisPosition.id)).filter(AisPosition.vessel_mmsi == v.mmsi).scalar() or 0
        t_count = db.query(func.count(Trajectory.id)).filter(Trajectory.vessel_mmsi == v.mmsi).scalar() or 0
        results.append({
            "mmsi": v.mmsi,
            "vessel_name": v.vessel_name,
            "vessel_type": v.vessel_type,
            "length": v.length,
            "width": v.width,
            "position_count": p_count,
            "trajectory_count": t_count
        })
    return results

@router.get("/trajectories")
def get_trajectories(mmsi: Optional[int] = None, db: Session = Depends(get_db)):
    return TrajectoryService.get_trajectories(db, mmsi)

@router.post("/trajectories/simplify", response_model=TrajectorySimplifyResponse)
def simplify_trajectory(
    req: TrajectorySimplifyRequest,
    db: Session = Depends(get_db)
):
    # If no ID specified, select the first trajectory
    traj_id = req.trajectory_id
    if not traj_id:
        first_t = db.query(Trajectory).first()
        if not first_t:
            raise HTTPException(status_code=400, detail="No trajectories found in database to simplify.")
        traj_id = first_t.id

    try:
        res = TrajectoryService.simplify_trajectory(db, traj_id, req.tolerance_meters)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/waypoints/extract", response_model=List[WaypointOut])
def extract_waypoints(
    grid_resolution_nm: float = Query(1.0, ge=0.2, le=5.0),
    min_observations: int = Query(3, ge=1, le=50),
    merge_distance_nm: float = Query(1.2, ge=0.5, le=5.0),
    db: Session = Depends(get_db)
):
    try:
        wps = WaypointService.extract_and_store(db, grid_resolution_nm, min_observations, merge_distance_nm)
        return wps
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/waypoints", response_model=List[WaypointOut])
def get_waypoints(db: Session = Depends(get_db)):
    return WaypointService.get_all(db)

@router.post("/navigation-graph/build", response_model=NavigationGraphResponse)
def build_navigation_graph(
    max_edge_distance_nm: float = Query(12.0, ge=2.0, le=30.0),
    db: Session = Depends(get_db)
):
    try:
        graph = GraphService.build_and_store(db, max_edge_distance_nm)
        return graph
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/navigation-graph", response_model=NavigationGraphResponse)
def get_navigation_graph(db: Session = Depends(get_db)):
    return GraphService.get_graph(db)

@router.post("/routes/plan", response_model=RouteOut)
def plan_route(
    req: RoutePlanRequest,
    db: Session = Depends(get_db)
):
    try:
        route = RouteService.plan_route(
            db=db,
            origin_code=req.origin_code,
            destination_code=req.destination_code,
            alpha=req.alpha_distance_weight,
            beta=req.beta_congestion_weight,
            scenario_id=req.scenario_id
        )
        if not route:
            raise HTTPException(
                status_code=404,
                detail=f"No feasible route exists between {req.origin_code} and {req.destination_code} under current constraints."
            )
        return route
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/routes/optimize", response_model=ParetoFrontResponse)
def optimize_routes(
    req: OptimizeRequest,
    db: Session = Depends(get_db)
):
    try:
        result = OptimizationService.run_nsga2(
            db=db,
            origin_code=req.origin_code,
            destination_code=req.destination_code,
            population_size=req.population_size,
            generations=req.generations,
            scenario_id=req.scenario_id
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/scenarios", response_model=ScenarioOut)
def create_scenario(
    req: ScenarioCreateRequest,
    db: Session = Depends(get_db)
):
    if len(req.polygon_coordinates) < 3:
        raise HTTPException(status_code=400, detail="Polygon must contain at least 3 coordinate pairs.")
    res = ScenarioService.create_scenario(db, req.name, req.description, req.polygon_coordinates)
    return res

@router.get("/scenarios", response_model=List[ScenarioOut])
def get_scenarios(db: Session = Depends(get_db)):
    return ScenarioService.get_all(db)

@router.post("/scenarios/{id}/replan", response_model=ScenarioReplanResponse)
def replan_scenario(
    id: int,
    origin_code: str = Query(..., description="Origin waypoint code"),
    destination_code: str = Query(..., description="Destination waypoint code"),
    db: Session = Depends(get_db)
):
    try:
        result = ScenarioService.replan_route_under_scenario(
            db=db,
            scenario_id=id,
            origin_code=origin_code,
            destination_code=destination_code
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.get("/runs")
def get_runs(db: Session = Depends(get_db)):
    opt_runs = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).limit(20).all()
    import_logs = db.query(DatasetLog).order_by(DatasetLog.created_at.desc()).limit(20).all()

    return {
        "optimization_runs": [
            {
                "id": r.id,
                "origin": r.origin_wp_code,
                "destination": r.dest_wp_code,
                "population_size": r.population_size,
                "generations": r.generations,
                "solutions_count": len(json.loads(r.pareto_solutions_json)),
                "runtime_ms": r.runtime_ms,
                "created_at": r.created_at.isoformat()
            }
            for r in opt_runs
        ],
        "import_logs": [
            {
                "id": l.id,
                "filename": l.filename,
                "records_read": l.records_read,
                "valid_records": l.valid_records,
                "invalid_records": l.invalid_records,
                "duplicates_removed": l.duplicates_removed,
                "vessels_found": l.vessels_found,
                "trajectories_created": l.trajectories_created,
                "created_at": l.created_at.isoformat()
            }
            for l in import_logs
        ]
    }
