import math
from datetime import datetime
from typing import List, Dict, Tuple, Any

EARTH_RADIUS_KM = 6371.0088
KM_TO_NM = 0.539957
METERS_PER_NM = 1852.0

def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance between two points in Nautical Miles."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance_km = EARTH_RADIUS_KM * c
    return distance_km * KM_TO_NM

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in meters."""
    return haversine_distance_nm(lat1, lon1, lat2, lon2) * METERS_PER_NM

def calculate_initial_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate initial compass bearing (0-360 degrees) from point 1 to point 2."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (math.cos(phi1) * math.sin(phi2) -
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360.0) % 360.0

class TrajectoryBuilder:
    """
    Constructs discrete vessel trajectories from raw chronological AIS telemetry.
    Applies deterministic rules:
    - Time continuity threshold: splits if delta_t > max_time_gap_seconds (default 1800s)
    - Kinematic feasibility: splits if derived speed > max_speed_knots (default 60 kn)
    - Minimum point threshold: discards micro-trajectories < min_points (default 3)
    """

    def __init__(self, max_time_gap_seconds: int = 1800, max_speed_knots: float = 60.0, min_points: int = 3):
        self.max_time_gap_seconds = max_time_gap_seconds
        self.max_speed_knots = max_speed_knots
        self.min_points = min_points

    def process_vessel_records(self, mmsi: int, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Input: list of dicts with 'timestamp', 'latitude', 'longitude', 'sog', 'cog'.
        Output: list of trajectory dicts with points, start_time, end_time, length_nm.
        """
        # 1. Filter invalid coordinates
        valid = []
        for r in records:
            lat = r.get("latitude")
            lon = r.get("longitude")
            ts = r.get("timestamp")
            if lat is None or lon is None or ts is None:
                continue
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                continue
            sog = r.get("sog")
            if sog is not None and (sog < 0.0 or sog > 102.3):
                continue
            valid.append(r)

        if not valid:
            return []

        # 2. Sort chronologically
        valid.sort(key=lambda x: x["timestamp"])

        # 3. Deduplicate exact timestamps
        deduped = []
        seen_ts = set()
        for r in valid:
            ts = r["timestamp"]
            if ts not in seen_ts:
                seen_ts.add(ts)
                deduped.append(r)

        if len(deduped) < self.min_points:
            return []

        # 4. Partition into continuous trajectories
        trajectories = []
        current_chunk = [deduped[0]]

        for i in range(1, len(deduped)):
            prev = deduped[i - 1]
            curr = deduped[i]

            prev_ts = prev["timestamp"]
            curr_ts = curr["timestamp"]
            delta_seconds = (curr_ts - prev_ts).total_seconds()

            distance_nm = haversine_distance_nm(
                prev["latitude"], prev["longitude"],
                curr["latitude"], curr["longitude"]
            )

            # Check temporal gap
            is_gap = delta_seconds > self.max_time_gap_seconds or delta_seconds <= 0

            # Check kinematic plausibility (effective speed in knots)
            effective_speed = (distance_nm / (delta_seconds / 3600.0)) if delta_seconds > 0 else 999.0
            is_unphysical_jump = effective_speed > self.max_speed_knots

            if is_gap or is_unphysical_jump:
                if len(current_chunk) >= self.min_points:
                    trajectories.append(self._finalize_trajectory(mmsi, current_chunk))
                current_chunk = [curr]
            else:
                current_chunk.append(curr)

        if len(current_chunk) >= self.min_points:
            trajectories.append(self._finalize_trajectory(mmsi, current_chunk))

        return trajectories

    def _finalize_trajectory(self, mmsi: int, points: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_dist_nm = 0.0
        for i in range(1, len(points)):
            p1 = points[i - 1]
            p2 = points[i]
            total_dist_nm += haversine_distance_nm(
                p1["latitude"], p1["longitude"],
                p2["latitude"], p2["longitude"]
            )

        return {
            "vessel_mmsi": mmsi,
            "start_time": points[0]["timestamp"],
            "end_time": points[-1]["timestamp"],
            "point_count": len(points),
            "length_nm": round(total_dist_nm, 3),
            "points": points
        }
