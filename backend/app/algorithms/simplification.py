import math
from typing import List, Dict, Tuple, Any

from backend.app.algorithms.trajectory_builder import haversine_distance_meters, calculate_initial_bearing

def perpendicular_distance_meters(
    lat_p: float, lon_p: float,
    lat_a: float, lon_a: float,
    lat_b: float, lon_b: float
) -> float:
    """
    Computes the cross-track perpendicular distance in meters from point P to line segment AB
    using spherical trigonometry / cross-track distance formula.
    """
    # Distance from A to B
    d_ab = haversine_distance_meters(lat_a, lon_a, lat_b, lon_b)
    if d_ab < 1e-6:
        return haversine_distance_meters(lat_p, lon_p, lat_a, lon_a)

    # Distance from A to P
    d_ap = haversine_distance_meters(lat_a, lon_a, lat_p, lon_p)

    # Initial bearings
    theta_ab = math.radians(calculate_initial_bearing(lat_a, lon_a, lat_b, lon_b))
    theta_ap = math.radians(calculate_initial_bearing(lat_a, lon_a, lat_p, lon_p))

    # Cross track error in radians
    # sin(d_xt / R) = sin(d_ap / R) * sin(theta_ap - theta_ab)
    earth_radius_m = 6371008.8
    delta_bearing = theta_ap - theta_ab

    sin_ratio = math.sin(d_ap / earth_radius_m) * math.sin(delta_bearing)
    # Clip for numerical precision
    sin_ratio = max(-1.0, min(1.0, sin_ratio))
    cross_track_m = abs(math.asin(sin_ratio) * earth_radius_m)

    return cross_track_m

def angular_deviation_degrees(cog1: float, cog2: float) -> float:
    """Calculates minimal circular difference between two compass bearings."""
    diff = abs(cog1 - cog2) % 360.0
    return diff if diff <= 180.0 else 360.0 - diff

class MPDPSimplifier:
    """
    Maritime-adapted Modified Douglas-Peucker (MPDP) trajectory simplifier.
    Considers both perpendicular cross-track error (meters) and course-over-ground (COG)
    heading alterations to preserve maritime navigation maneuvers (channel turns, waypoints).
    """

    def __init__(
        self,
        tolerance_meters: float = 120.0,
        cog_threshold_degrees: float = 30.0
    ):
        self.tolerance_meters = tolerance_meters
        self.cog_threshold_degrees = cog_threshold_degrees

    def simplify(self, points: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Simplifies points list. Returns (retained_points, metrics_summary).
        Each point must have 'latitude', 'longitude', and optionally 'course_over_ground'.
        """
        n = len(points)
        if n <= 2:
            return points, {
                "original_count": n,
                "simplified_count": n,
                "reduction_percentage": 0.0,
                "tolerance_meters": self.tolerance_meters
            }

        # Boolean mask for retention
        retained = [False] * n
        retained[0] = True
        retained[-1] = True

        self._simplify_recursive(points, 0, n - 1, retained)

        simplified_points = [p for i, p in enumerate(points) if retained[i]]
        reduction_pct = round((1.0 - (len(simplified_points) / float(n))) * 100.0, 2)

        metrics = {
            "original_count": n,
            "simplified_count": len(simplified_points),
            "reduction_percentage": reduction_pct,
            "tolerance_meters": self.tolerance_meters,
            "cog_threshold_degrees": self.cog_threshold_degrees
        }

        return simplified_points, metrics

    def _simplify_recursive(
        self,
        points: List[Dict[str, Any]],
        start_idx: int,
        end_idx: int,
        retained: List[bool]
    ):
        if end_idx <= start_idx + 1:
            return

        p_start = points[start_idx]
        p_end = points[end_idx]

        max_dist = 0.0
        max_idx = start_idx
        significant_turn_idx = -1

        # Calculate baseline course between segment terminals
        baseline_bearing = calculate_initial_bearing(
            p_start["latitude"], p_start["longitude"],
            p_end["latitude"], p_end["longitude"]
        )

        for i in range(start_idx + 1, end_idx):
            pt = points[i]
            dist_m = perpendicular_distance_meters(
                pt["latitude"], pt["longitude"],
                p_start["latitude"], p_start["longitude"],
                p_end["latitude"], p_end["longitude"]
            )

            if dist_m > max_dist:
                max_dist = dist_m
                max_idx = i

            # Check if point contains a notable direction change
            pt_cog = pt.get("course_over_ground")
            if pt_cog is not None:
                cog_dev = angular_deviation_degrees(pt_cog, baseline_bearing)
                if cog_dev > self.cog_threshold_degrees and dist_m > (self.tolerance_meters * 0.4):
                    if significant_turn_idx == -1 or dist_m > perpendicular_distance_meters(
                        points[significant_turn_idx]["latitude"], points[significant_turn_idx]["longitude"],
                        p_start["latitude"], p_start["longitude"],
                        p_end["latitude"], p_end["longitude"]
                    ):
                        significant_turn_idx = i

        split_idx = max_idx
        if max_dist < self.tolerance_meters and significant_turn_idx != -1:
            split_idx = significant_turn_idx
            max_dist = self.tolerance_meters # force retention

        if max_dist >= self.tolerance_meters:
            retained[split_idx] = True
            self._simplify_recursive(points, start_idx, split_idx, retained)
            self._simplify_recursive(points, split_idx, end_idx, retained)
