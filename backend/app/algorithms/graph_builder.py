import math
from typing import List, Dict, Tuple, Any, Set, Optional
from backend.app.algorithms.trajectory_builder import haversine_distance_nm

CRUISE_SPEED_KNOTS = 12.0

class NavigationGraphBuilder:
    """
    Constructs a navigable topological graph connecting extracted maritime waypoints.
    Edges are derived deterministically from:
    1. Direct vessel trajectory transitions (vessels navigating between waypoints).
    2. Geographic corridor reachability (spatial proximity with distance bounds).
    
    Calculates distance (NM), historical traffic count, and congestion score per edge.
    """

    def __init__(
        self,
        max_edge_distance_nm: float = 12.0,
        min_vessel_transitions: int = 1,
        match_radius_nm: float = 2.0
    ):
        self.max_edge_distance_nm = max_edge_distance_nm
        self.min_vessel_transitions = min_vessel_transitions
        self.match_radius_nm = match_radius_nm

    def find_nearest_waypoint(self, lat: float, lon: float, waypoints: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], float]:
        """Finds closest waypoint to coordinate and distance in NM."""
        best_wp = None
        min_dist = float("inf")
        for wp in waypoints:
            d = haversine_distance_nm(lat, lon, wp["latitude"], wp["longitude"])
            if d < min_dist:
                min_dist = d
                best_wp = wp
        return best_wp, min_dist

    def build_graph(
        self,
        waypoints: List[Dict[str, Any]],
        trajectories: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Returns list of edge dicts:
        {
            'source_code': str,
            'target_code': str,
            'distance_nm': float,
            'historical_vessel_count': int,
            'congestion_score': float,
            'estimated_travel_hours': float
        }
        """
        if len(waypoints) < 2:
            return []

        wp_by_code = {w["code"]: w for w in waypoints}
        edge_traffic: Dict[Tuple[str, str], int] = {}

        # 1. Map trajectories to sequences of waypoints
        for traj in trajectories:
            points = traj.get("points", [])
            if not points:
                continue

            wp_seq = []
            last_code = None

            # Sample trajectory along length
            step = max(1, len(points) // 20)
            sampled = points[::step]
            if points[-1] not in sampled:
                sampled.append(points[-1])

            for pt in sampled:
                nearest, dist = self.find_nearest_waypoint(pt["latitude"], pt["longitude"], waypoints)
                if nearest and dist <= self.match_radius_nm:
                    code = nearest["code"]
                    if code != last_code:
                        wp_seq.append(code)
                        last_code = code

            # Accumulate transitions
            for i in range(len(wp_seq) - 1):
                u, v = wp_seq[i], wp_seq[i + 1]
                if u == v:
                    continue
                d = haversine_distance_nm(
                    wp_by_code[u]["latitude"], wp_by_code[u]["longitude"],
                    wp_by_code[v]["latitude"], wp_by_code[v]["longitude"]
                )
                if d <= self.max_edge_distance_nm:
                    edge_key = (min(u, v), max(u, v))
                    edge_traffic[edge_key] = edge_traffic.get(edge_key, 0) + 1

        # 2. Geometric corridor reachability (k-nearest neighbors to ensure graph connectivity)
        # For each waypoint, connect to the 2-4 nearest neighbors within max_edge_distance_nm
        for i, w1 in enumerate(waypoints):
            candidates = []
            for j, w2 in enumerate(waypoints):
                if i == j:
                    continue
                d = haversine_distance_nm(w1["latitude"], w1["longitude"], w2["latitude"], w2["longitude"])
                if d <= self.max_edge_distance_nm:
                    candidates.append((d, w2["code"]))

            candidates.sort(key=lambda x: x[0])
            for d, target_code in candidates[:3]: # Connect up to 3 closest neighbors
                edge_key = (min(w1["code"], target_code), max(w1["code"], target_code))
                if edge_key not in edge_traffic:
                    edge_traffic[edge_key] = 1 # Initial baseline navigable edge

        # 3. Finalize edges with deterministic metrics
        edges = []
        for (u, v), count in edge_traffic.items():
            w_u = wp_by_code[u]
            w_v = wp_by_code[v]
            dist_nm = haversine_distance_nm(
                w_u["latitude"], w_u["longitude"],
                w_v["latitude"], w_v["longitude"]
            )

            # Formula for congestion score:
            # congestion = 1.0 + (traffic_count * 2.5) / (dist_nm + 0.8)
            congestion = round(1.0 + (count * 2.0) / (dist_nm + 0.5), 2)

            # Travel time: hours = (distance / speed) * (1 + 0.1 * congestion)
            travel_time_hours = round((dist_nm / CRUISE_SPEED_KNOTS) * (1.0 + 0.08 * congestion), 3)

            edges.append({
                "source_code": u,
                "target_code": v,
                "distance_nm": round(dist_nm, 3),
                "historical_vessel_count": count,
                "congestion_score": congestion,
                "estimated_travel_hours": travel_time_hours,
                "source_coords": [w_u["longitude"], w_u["latitude"]],
                "target_coords": [w_v["longitude"], w_v["latitude"]]
            })

        return edges
