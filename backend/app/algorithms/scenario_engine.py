from typing import List, Dict, Tuple, Any, Optional, Set
from backend.app.algorithms.pathfinding import AStarRouter

def point_in_polygon(x: float, y: float, polygon: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to test if point (lon=x, lat=y) is inside polygon.
    polygon is list of [lon, lat] points.
    """
    n = len(polygon)
    if n < 3:
        return False

    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside

def ccw(ax: float, ay: float, bx: float, by: float, cx: float, cy: float) -> bool:
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax)

def line_segments_intersect(
    p1: List[float], p2: List[float],
    q1: List[float], q2: List[float]
) -> bool:
    """Tests if line segment p1-p2 intersects line segment q1-q2."""
    p1x, p1y = p1
    p2x, p2y = p2
    q1x, q1y = q1
    q2x, q2y = q2

    return (ccw(p1x, p1y, q1x, q1y, q2x, q2y) != ccw(p2x, p2y, q1x, q1y, q2x, q2y)) and \
           (ccw(p1x, p1y, p2x, p2y, q1x, q1y) != ccw(p1x, p1y, p2x, p2y, q2x, q2y))

class ScenarioEngine:
    """
    Evaluates spatial restrictions against the maritime navigation network.
    Identifies breached waypoints and severed edges, rebuilds the constrained graph topology,
    and executes deterministic replanning with comparative delta calculations.
    """

    def find_affected_elements(
        self,
        polygon_coords: List[List[float]], # [[lon, lat], ...]
        waypoints: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Tuple[Set[str], Set[Tuple[str, str]]]:
        """
        Returns:
          (affected_waypoint_codes, affected_edge_tuples)
        """
        wp_by_code = {w["code"]: w for w in waypoints}
        affected_wps = set()

        # 1. Test waypoints inside polygon
        for wp in waypoints:
            if point_in_polygon(wp["longitude"], wp["latitude"], polygon_coords):
                affected_wps.add(wp["code"])

        # 2. Test edge intersection with polygon boundary edges
        affected_edges = set()
        poly_len = len(polygon_coords)

        for edge in edges:
            u, v = edge["source_code"], edge["target_code"]
            if u in affected_wps or v in affected_wps:
                affected_edges.add((min(u, v), max(u, v)))
                continue

            # Edge endpoints
            w_u = wp_by_code[u]
            w_v = wp_by_code[v]
            e1 = [w_u["longitude"], w_u["latitude"]]
            e2 = [w_v["longitude"], w_v["latitude"]]

            # Midpoint test (in case entire edge is within polygon)
            mid = [(e1[0] + e2[0]) / 2.0, (e1[1] + e2[1]) / 2.0]
            if point_in_polygon(mid[0], mid[1], polygon_coords):
                affected_edges.add((min(u, v), max(u, v)))
                continue

            # Check boundary segment intersections
            for i in range(poly_len):
                p1 = polygon_coords[i]
                p2 = polygon_coords[(i + 1) % poly_len]
                if line_segments_intersect(e1, e2, p1, p2):
                    affected_edges.add((min(u, v), max(u, v)))
                    break

        return affected_wps, affected_edges

    def check_route_breached(
        self,
        route_sequence: List[str],
        affected_wps: Set[str],
        affected_edges: Set[Tuple[str, str]]
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Tests if a planned route traverses the restricted zone.
        Returns (is_breached, breached_wps, breached_edge_labels).
        """
        breached_wps = [w for w in route_sequence if w in affected_wps]
        breached_edges = []

        for i in range(len(route_sequence) - 1):
            u, v = route_sequence[i], route_sequence[i + 1]
            edge_key = (min(u, v), max(u, v))
            if edge_key in affected_edges:
                breached_edges.append(f"{u} ↔ {v}")

        is_breached = len(breached_wps) > 0 or len(breached_edges) > 0
        return is_breached, breached_wps, breached_edges

    def replan_scenario_route(
        self,
        original_route: Dict[str, Any],
        polygon_coords: List[List[float]],
        waypoints: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        alpha: float = 1.0,
        beta: float = 1.5
    ) -> Dict[str, Any]:
        """
        Executes constrained replanning.
        """
        affected_wps, affected_edges = self.find_affected_elements(polygon_coords, waypoints, edges)

        origin = original_route["origin_code"]
        dest = original_route["destination_code"]

        is_breached, b_wps, b_edges = self.check_route_breached(
            original_route["waypoint_sequence"],
            affected_wps,
            affected_edges
        )

        if not is_breached:
            return {
                "status": "UNAFFECTED",
                "message": "The original route does not intersect the restricted spatial polygon.",
                "original_route": original_route,
                "replanned_route": original_route,
                "distance_delta_nm": 0.0,
                "distance_delta_pct": 0.0,
                "congestion_delta": 0.0,
                "congestion_delta_pct": 0.0,
                "affected_edges": [],
                "affected_waypoints": []
            }

        # Check if origin or destination is inside restriction
        if origin in affected_wps:
            return {
                "status": "NO_FEASIBLE_ROUTE",
                "message": f"Origin waypoint {origin} is situated directly inside the restricted exclusion zone.",
                "original_route": original_route,
                "replanned_route": None,
                "affected_edges": list(b_edges),
                "affected_waypoints": list(b_wps)
            }
        if dest in affected_wps:
            return {
                "status": "NO_FEASIBLE_ROUTE",
                "message": f"Destination waypoint {dest} is situated directly inside the restricted exclusion zone.",
                "original_route": original_route,
                "replanned_route": None,
                "affected_edges": list(b_edges),
                "affected_waypoints": list(b_wps)
            }

        # Plan detour with AStarRouter
        router = AStarRouter(alpha_distance=alpha, beta_congestion=beta)
        replanned = router.plan_route(
            origin,
            dest,
            waypoints,
            edges,
            excluded_edges=affected_edges,
            excluded_waypoints=affected_wps
        )

        if not replanned:
            return {
                "status": "NO_FEASIBLE_ROUTE",
                "message": f"No feasible maritime route exists between {origin} and {dest} under the active spatial restriction.",
                "original_route": original_route,
                "replanned_route": None,
                "affected_edges": list(b_edges),
                "affected_waypoints": list(b_wps)
            }

        replanned["is_replanned"] = True
        replanned["name"] = f"Replanned Detour {origin} → {dest}"

        orig_d = original_route["total_distance_nm"]
        new_d = replanned["total_distance_nm"]
        d_delta = round(new_d - orig_d, 3)
        d_delta_pct = round(((new_d - orig_d) / max(orig_d, 0.001)) * 100.0, 2)

        orig_c = original_route["congestion_score"]
        new_c = replanned["congestion_score"]
        c_delta = round(new_c - orig_c, 2)
        c_delta_pct = round(((new_c - orig_c) / max(orig_c, 0.001)) * 100.0, 2)

        return {
            "status": "REPLANNED_SUCCESS",
            "message": "Alternative feasible route planned successfully avoiding restricted polygon.",
            "original_route": original_route,
            "replanned_route": replanned,
            "distance_delta_nm": d_delta,
            "distance_delta_pct": d_delta_pct,
            "congestion_delta": c_delta,
            "congestion_delta_pct": c_delta_pct,
            "affected_edges": list(b_edges),
            "affected_waypoints": list(b_wps)
        }
