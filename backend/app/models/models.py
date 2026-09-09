from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, DateTime, Boolean, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True, index=True)
    mmsi = Column(Integer, unique=True, index=True, nullable=False)
    vessel_name = Column(String(128), nullable=True)
    vessel_type = Column(String(64), nullable=True)
    length = Column(Float, nullable=True)
    width = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    positions = relationship("AisPosition", back_populates="vessel", cascade="all, delete-orphan")
    trajectories = relationship("Trajectory", back_populates="vessel", cascade="all, delete-orphan")

class AisPosition(Base):
    __tablename__ = "ais_positions"

    id = Column(Integer, primary_key=True, index=True)
    vessel_mmsi = Column(Integer, ForeignKey("vessels.mmsi", ondelete="CASCADE"), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_over_ground = Column(Float, nullable=True) # knots
    course_over_ground = Column(Float, nullable=True) # degrees
    heading = Column(Float, nullable=True) # degrees
    trajectory_id = Column(Integer, ForeignKey("trajectories.id", ondelete="SET NULL"), nullable=True, index=True)

    vessel = relationship("Vessel", back_populates="positions")
    trajectory = relationship("Trajectory", back_populates="positions")

    __table_args__ = (
        Index("ix_ais_pos_mmsi_time", "vessel_mmsi", "timestamp"),
        Index("ix_ais_pos_lat_lon", "latitude", "longitude"),
    )

class Trajectory(Base):
    __tablename__ = "trajectories"

    id = Column(Integer, primary_key=True, index=True)
    vessel_mmsi = Column(Integer, ForeignKey("vessels.mmsi", ondelete="CASCADE"), index=True, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    point_count = Column(Integer, nullable=False, default=0)
    simplified_point_count = Column(Integer, nullable=True, default=0)
    reduction_ratio = Column(Float, nullable=True, default=0.0)
    length_nm = Column(Float, nullable=True, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    vessel = relationship("Vessel", back_populates="trajectories")
    positions = relationship("AisPosition", back_populates="trajectory")
    points = relationship("TrajectoryPoint", back_populates="trajectory", cascade="all, delete-orphan", order_by="TrajectoryPoint.seq_index")

class TrajectoryPoint(Base):
    __tablename__ = "trajectory_points"

    id = Column(Integer, primary_key=True, index=True)
    trajectory_id = Column(Integer, ForeignKey("trajectories.id", ondelete="CASCADE"), index=True, nullable=False)
    seq_index = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    speed_over_ground = Column(Float, nullable=True)
    course_over_ground = Column(Float, nullable=True)
    is_retained = Column(Boolean, default=True) # Retained after MPDP simplification

    trajectory = relationship("Trajectory", back_populates="points")

    __table_args__ = (
        Index("ix_traj_pts_traj_seq", "trajectory_id", "seq_index"),
    )

class Waypoint(Base):
    __tablename__ = "waypoints"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    observation_count = Column(Integer, default=0)
    trajectory_count = Column(Integer, default=0)
    traffic_density_score = Column(Float, default=0.0)
    cluster_radius_nm = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class NavigationEdge(Base):
    __tablename__ = "navigation_edges"

    id = Column(Integer, primary_key=True, index=True)
    source_waypoint_id = Column(Integer, ForeignKey("waypoints.id", ondelete="CASCADE"), nullable=False, index=True)
    target_waypoint_id = Column(Integer, ForeignKey("waypoints.id", ondelete="CASCADE"), nullable=False, index=True)
    distance_nm = Column(Float, nullable=False)
    historical_vessel_count = Column(Integer, default=1)
    congestion_score = Column(Float, default=1.0) # Density per NM
    is_bidirectional = Column(Boolean, default=True)

    source_waypoint = relationship("Waypoint", foreign_keys=[source_waypoint_id])
    target_waypoint = relationship("Waypoint", foreign_keys=[target_waypoint_id])

    __table_args__ = (
        Index("ix_nav_edge_src_tgt", "source_waypoint_id", "target_waypoint_id"),
    )

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=True)
    origin_waypoint_id = Column(Integer, ForeignKey("waypoints.id"), nullable=False)
    destination_waypoint_id = Column(Integer, ForeignKey("waypoints.id"), nullable=False)
    algorithm_type = Column(String(64), default="A_STAR") # A_STAR, NSGA_II_PARETO
    total_distance_nm = Column(Float, nullable=False)
    congestion_score = Column(Float, nullable=False)
    estimated_travel_hours = Column(Float, nullable=False)
    waypoint_sequence_json = Column(Text, nullable=False) # JSON list of waypoint codes/ids
    geometry_geojson = Column(Text, nullable=False) # LineString GeoJSON
    is_replanned = Column(Boolean, default=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    origin_waypoint = relationship("Waypoint", foreign_keys=[origin_waypoint_id])
    destination_waypoint = relationship("Waypoint", foreign_keys=[destination_waypoint_id])
    scenario = relationship("Scenario", back_populates="routes")

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    polygon_geojson = Column(Text, nullable=False) # Polygon coordinates JSON
    affected_edge_count = Column(Integer, default=0)
    status = Column(String(32), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    routes = relationship("Route", back_populates="scenario")

class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(Integer, primary_key=True, index=True)
    origin_wp_code = Column(String(32), nullable=False)
    dest_wp_code = Column(String(32), nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id", ondelete="SET NULL"), nullable=True)
    population_size = Column(Integer, default=50)
    generations = Column(Integer, default=30)
    pareto_solutions_json = Column(Text, nullable=False) # JSON list of candidate solutions
    runtime_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class DatasetLog(Base):
    __tablename__ = "dataset_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(256), nullable=False)
    records_read = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    duplicates_removed = Column(Integer, default=0)
    vessels_found = Column(Integer, default=0)
    trajectories_created = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
