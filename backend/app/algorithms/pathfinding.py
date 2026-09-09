import heapq
from typing import List, Dict, Tuple, Any, Optional, Set
from backend.app.algorithms.trajectory_builder import haversine_distance_nm

CRUISE_SPEED_KNOTS = 12.0

class AStarRouter:
    """
    A* Pathfinding on maritime navigation waypoint graph.
    Computes optimal route minimizing weighted cost function:
        cost(edge) = alpha * distance_nm + beta * (congestion_score * 1.5)
    
    Heuristic h(n):
        h(n) = alpha * haversine_distance_nm(n, goal)
        Admissible and consistent since triangle inequality holds for great-circle distance.
    """

    def __init__(self, alpha_distance: float = 1.0, beta_congestion: float = 1.0):
        self.alpha = alpha_distance
        self.beta = beta_congestion

    def plan_route(
        self,
        origin_code: str,
        destination_code: str,
        waypoints: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        excluded_edges: Optional[Set[Tuple[str, str]]] = None,
        excluded_waypoints: Optional[Set[str]] = None
    ) -> Optional[Dict[str, Any]]:
        if origin_code == destination_code:
            return None

        wp_dict = {w["code"]: w for w in waypoints}
        if origin_code not in wp_dict or destination_code not in wp_dict:
            return None

        if excluded_waypoints and (origin_code in excluded_waypoints or destination_code in excluded_waypoints):
            return None

        excluded_edges = excluded_edges or set()
        excluded_waypoints = excluded_waypoints or set()

        # Build adjacency list
        # adj[u] = list of (v, distance, congestion, travel_hours)
        adj: Dict[str, List[Tuple[str, float, float, float]]] = {w["code"]: [] for w in waypoints}

        for e in edges:
            u, v = e["source_code"], e["target_code"]
            if u in excluded_waypoints or v in excluded_waypoints:
                continue
            edge_key_1 = (u, v)
            edge_key_2 = (v, u)
            if edge_key_1 in excluded_edges or edge_key_2 in excluded_edges:
                continue

            d = e["distance_nm"]
            c = e["congestion_score"]
            t = e.get("estimated_travel_hours", (d / CRUISE_SPEED_KNOTS) * (1.0 + 0.08 * c))

            adj[u].append((v, d, c, t))
            adj[v].append((u, d, c, t))

        goal_wp = wp_dict[destination_code]

        def heuristic(node_code: str) -> float:
            node_wp = wp_dict[node_code]
            h_dist = haversine_distance_nm(
                node_wp["latitude"], node_wp["longitude"],
                goal_wp["latitude"], goal_wp["longitude"]
            )
            return self.alpha * h_dist

        # Priority queue: (f_score, g_cost, current_node, path_sequence, acc_dist, acc_congestion, acc_time)
        open_set = []
        start_h = heuristic(origin_code)
        heapq.heappush(open_set, (start_h, 0.0, origin_code, [origin_code], 0.0, 0.0, 0.0))

        best_g: Dict[str, float] = {origin_code: 0.0}

        while open_set:
            f, g, current, path, total_dist, total_cong, total_time = heapq.heappop(open_set)

            if current == destination_code:
                # Construct detailed segments and geojson
                segments = []
                coords = []
                for i in range(len(path) - 1):
                    u_code = path[i]
                    v_code = path[i + 1]
                    w_u = wp_dict[u_code]
                    w_v = wp_dict[v_code]

                    seg_d = haversine_distance_nm(w_u["latitude"], w_u["longitude"], w_v["latitude"], w_v["longitude"])
                    # Look up edge congestion
                    seg_c = 1.0
                    for e in edges:
                        if (e["source_code"] == u_code and e["target_code"] == v_code) or \
                           (e["source_code"] == v_code and e["target_code"] == u_code):
                            seg_c = e["congestion_score"]
                            break

                    seg_t = (seg_d / CRUISE_SPEED_KNOTS) * (1.0 + 0.08 * seg_c)
                    segments.append({
                        "from_waypoint": u_code,
                        "to_waypoint": v_code,
                        "distance_nm": round(seg_d, 3),
                        "congestion_score": round(seg_c, 2),
                        "travel_time_hours": round(seg_t, 3),
                        "start_coords": [w_u["longitude"], w_u["latitude"]],
                        "end_coords": [w_v["longitude"], w_v["latitude"]]
                    })

                for wp_c in path:
                    coords.append([wp_dict[wp_c]["longitude"], wp_dict[wp_c]["latitude"]])

                avg_congestion = round(sum(s["congestion_score"] for s in segments) / max(len(segments), 1), 2)

                return {
                    "name": f"A* Route {origin_code} → {destination_code}",
                    "origin_code": origin_code,
                    "destination_code": destination_code,
                    "algorithm_type": "A_STAR",
                    "total_distance_nm": round(total_dist, 3),
                    "congestion_score": avg_congestion,
                    "estimated_travel_hours": round(total_time, 3),
                    "waypoint_sequence": path,
                    "segments": segments,
                    "geometry_geojson": {
                        "type": "LineString",
                        "coordinates": coords
                    }
                }

            if g > best_g.get(current, float("inf")):
                continue

            for neighbor, d, c, t in adj.get(current, []):
                edge_cost = (self.alpha * d) + (self.beta * (c * 1.2))
                tentative_g = g + edge_cost

                if tentative_g < best_g.get(neighbor, float("inf")):
                    best_g[neighbor] = tentative_g
                    f_score = tentative_g + heuristic(neighbor)
                    new_path = path + [neighbor]
                    heapq.heappush(
                        open_set,
                        (f_score, tentative_g, neighbor, new_path, total_dist + d, total_cong + c, total_time + t)
                    )

        return None
