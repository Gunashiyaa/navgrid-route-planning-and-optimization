import os
import csv
import time
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.models.models import Vessel, AisPosition, DatasetLog, Trajectory
from backend.app.algorithms.trajectory_builder import TrajectoryBuilder

class AisService:
    @staticmethod
    def import_csv(db: Session, file_path: str) -> Dict[str, Any]:
        start_time = time.time()
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"AIS data file not found at {file_path}")

        records_read = 0
        valid_records = 0
        invalid_records = 0
        duplicates_removed = 0
        vessel_map: Dict[int, Vessel] = {}

        raw_rows = []
        seen_keys = set()

        with open(file_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records_read += 1
                try:
                    mmsi_val = row.get("MMSI") or row.get("mmsi")
                    if not mmsi_val:
                        invalid_records += 1
                        continue
                    mmsi = int(mmsi_val)

                    ts_str = row.get("timestamp") or row.get("Timestamp")
                    if not ts_str:
                        invalid_records += 1
                        continue

                    # Parse timestamp format (ISO or YYYY-MM-DD HH:MM:SS)
                    ts_clean = ts_str.replace("T", " ")
                    try:
                        ts = datetime.strptime(ts_clean, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        ts = datetime.fromisoformat(ts_str)

                    lat = float(row.get("latitude") or row.get("lat") or row.get("Latitude"))
                    lon = float(row.get("longitude") or row.get("lon") or row.get("Longitude"))

                    # Coordinate validation
                    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                        invalid_records += 1
                        continue

                    sog_val = row.get("SOG") or row.get("sog") or row.get("speed_over_ground")
                    sog = float(sog_val) if sog_val not in (None, "") else None
                    if sog is not None and (sog < 0.0 or sog > 102.3):
                        invalid_records += 1
                        continue

                    cog_val = row.get("COG") or row.get("cog") or row.get("course_over_ground")
                    cog = float(cog_val) if cog_val not in (None, "") else None

                    heading_val = row.get("heading") or row.get("Heading")
                    heading = float(heading_val) if heading_val not in (None, "") else None

                    vessel_name = row.get("vessel_name") or row.get("VesselName")
                    vessel_type = row.get("vessel_type") or row.get("VesselType")

                    # Deduplication key: (MMSI, timestamp)
                    dup_key = (mmsi, ts)
                    if dup_key in seen_keys:
                        duplicates_removed += 1
                        continue
                    seen_keys.add(dup_key)

                    valid_records += 1
                    raw_rows.append({
                        "mmsi": mmsi,
                        "vessel_name": vessel_name,
                        "vessel_type": vessel_type,
                        "timestamp": ts,
                        "latitude": lat,
                        "longitude": lon,
                        "sog": sog,
                        "cog": cog,
                        "heading": heading
                    })

                except Exception:
                    invalid_records += 1
                    continue

        # Batch insert vessels and positions
        for r in raw_rows:
            mmsi = r["mmsi"]
            if mmsi not in vessel_map:
                vessel = db.query(Vessel).filter(Vessel.mmsi == mmsi).first()
                if not vessel:
                    vessel = Vessel(
                        mmsi=mmsi,
                        vessel_name=r["vessel_name"] or f"Vessel {mmsi}",
                        vessel_type=r["vessel_type"] or "Commercial",
                    )
                    db.add(vessel)
                    db.flush()
                vessel_map[mmsi] = vessel

            pos = AisPosition(
                vessel_mmsi=mmsi,
                timestamp=r["timestamp"],
                latitude=r["latitude"],
                longitude=r["longitude"],
                speed_over_ground=r["sog"],
                course_over_ground=r["cog"],
                heading=r["heading"]
            )
            db.add(pos)

        db.commit()

        # Construct trajectories using TrajectoryBuilder
        builder = TrajectoryBuilder(max_time_gap_seconds=1800, max_speed_knots=60.0)
        trajectories_created = 0

        for mmsi, vessel in vessel_map.items():
            records = [
                {
                    "timestamp": r["timestamp"],
                    "latitude": r["latitude"],
                    "longitude": r["longitude"],
                    "sog": r["sog"],
                    "cog": r["cog"]
                }
                for r in raw_rows if r["mmsi"] == mmsi
            ]
            traj_list = builder.process_vessel_records(mmsi, records)

            for t_data in traj_list:
                traj = Trajectory(
                    vessel_mmsi=mmsi,
                    start_time=t_data["start_time"],
                    end_time=t_data["end_time"],
                    point_count=t_data["point_count"],
                    length_nm=t_data["length_nm"]
                )
                db.add(traj)
                db.flush()
                trajectories_created += 1

                # Link points
                from backend.app.models.models import TrajectoryPoint
                for idx, pt in enumerate(t_data["points"]):
                    t_pt = TrajectoryPoint(
                        trajectory_id=traj.id,
                        seq_index=idx,
                        latitude=pt["latitude"],
                        longitude=pt["longitude"],
                        timestamp=pt["timestamp"],
                        speed_over_ground=pt.get("sog"),
                        course_over_ground=pt.get("cog"),
                        is_retained=True
                    )
                    db.add(t_pt)

        # Log import record
        log = DatasetLog(
            filename=os.path.basename(file_path),
            records_read=records_read,
            valid_records=valid_records,
            invalid_records=invalid_records,
            duplicates_removed=duplicates_removed,
            vessels_found=len(vessel_map),
            trajectories_created=trajectories_created
        )
        db.add(log)
        db.commit()

        elapsed_ms = round((time.time() - start_time) * 1000.0, 2)

        return {
            "filename": os.path.basename(file_path),
            "records_read": records_read,
            "valid_records": valid_records,
            "invalid_records": invalid_records,
            "duplicates_removed": duplicates_removed,
            "vessels_found": len(vessel_map),
            "trajectories_created": trajectories_created,
            "processing_time_ms": elapsed_ms,
            "status": "COMPLETED"
        }
