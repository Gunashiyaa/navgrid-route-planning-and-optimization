import math
from typing import List, Dict, Tuple, Any
from backend.app.algorithms.trajectory_builder import haversine_distance_nm

class WaypointExtractor:
    """
    Deterministic Geospatial Waypoint Extractor (SDGB: Spatial Density Grid Binning).
    Extracts navigation waypoints from vessel trajectories without machine learning.
    
    Methodology:
    1. Harvests key navigation points: trajectory endpoints (terminals/ports/anchorages)
       and course turning points extracted during MPDP trajectory simplification.
    2. Maps points into a deterministic discrete spatial grid of resolution `cell_size_nm`.
    3. Identifies cells exceeding the minimum observation threshold.
    4. Computes the geometric centroid (mean latitude, mean longitude) of each cluster.
    5. Merges proximate centroids within `merge_distance_nm` to avoid redundant waypoints.
    6. Measures observation count, trajectory count, and spatial density for each waypoint.
    """

    def __init__(
        self,
        grid_resolution_nm: float = 1.0,
        min_observations: int = 3,
        merge_distance_nm: float = 1.2
    ):
        self.grid_resolution_nm = grid_resolution_nm
        self.min_observations = min_observations
        self.merge_distance_nm = merge_distance_nm

    def extract_waypoints(self, trajectories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Input: list of trajectory dicts with 'id'/'vessel_mmsi' and 'points'.
        Output: list of waypoint dicts with code, lat, lon, observations, trajectories.
        """
        if not trajectories:
            return []

        # 1. Harvest key points
        key_points = []
        for traj_idx, traj in enumerate(trajectories):
            points = traj.get("points", [])
            if not points:
                continue
            traj_id = traj.get("id", traj_idx)

            # Add endpoints with high importance
            key_points.append({
                "lat": points[0]["latitude"],
                "lon": points[0]["longitude"],
                "traj_id": traj_id,
                "is_terminal": True
            })
            key_points.append({
                "lat": points[-1]["latitude"],
                "lon": points[-1]["longitude"],
                "traj_id": traj_id,
                "is_terminal": True
            })

            # Add retained intermediate turning points
            for pt in points[1:-1]:
                if pt.get("is_retained", True):
                    key_points.append({
                        "lat": pt["latitude"],
                        "lon": pt["longitude"],
                        "traj_id": traj_id,
                        "is_terminal": False
                    })

        if not key_points:
            return []

        # 2. Grid binning (lat degree ~ 60 NM, lon degree ~ 60 * cos(lat) NM)
        ref_lat = sum(p["lat"] for p in key_points) / len(key_points)
        lat_nm_per_deg = 60.0
        lon_nm_per_deg = 60.0 * math.cos(math.radians(ref_lat))
        if lon_nm_per_deg < 1e-4:
            lon_nm_per_deg = 1.0

        grid_cells: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}

        for pt in key_points:
            gx = int(math.floor((pt["lon"] * lon_nm_per_deg) / self.grid_resolution_nm))
            gy = int(math.floor((pt["lat"] * lat_nm_per_deg) / self.grid_resolution_nm))
            cell_key = (gx, gy)
            if cell_key not in grid_cells:
                grid_cells[cell_key] = []
            grid_cells[cell_key].append(pt)

        # 3. Calculate preliminary cluster centroids
        raw_clusters = []
        for (gx, gy), pts in grid_cells.items():
            if len(pts) >= self.min_observations:
                c_lat = sum(p["lat"] for p in pts) / len(pts)
                c_lon = sum(p["lon"] for p in pts) / len(pts)
                traj_ids = set(p["traj_id"] for p in pts)
                raw_clusters.append({
                    "lat": c_lat,
                    "lon": c_lon,
                    "points": pts,
                    "traj_ids": traj_ids
                })

        # Fallback if sparse: if no cluster passed threshold, take all non-empty cells
        if not raw_clusters and grid_cells:
            for pts in grid_cells.values():
                c_lat = sum(p["lat"] for p in pts) / len(pts)
                c_lon = sum(p["lon"] for p in pts) / len(pts)
                raw_clusters.append({
                    "lat": c_lat,
                    "lon": c_lon,
                    "points": pts,
                    "traj_ids": set(p["traj_id"] for p in pts)
                })

        # 4. Merge proximate clusters (Hierarchical greedy single-linkage agglomeration)
        merged_clusters = []
        visited = set()

        for i, c1 in enumerate(raw_clusters):
            if i in visited:
                continue
            group = [c1]
            visited.add(i)

            for j in range(i + 1, len(raw_clusters)):
                if j in visited:
                    continue
                c2 = raw_clusters[j]
                dist_nm = haversine_distance_nm(c1["lat"], c1["lon"], c2["lat"], c2["lon"])
                if dist_nm <= self.merge_distance_nm:
                    group.append(c2)
                    visited.add(j)

            # Combined centroid
            total_pts = sum(len(g["points"]) for g in group)
            merged_lat = sum(g["lat"] * len(g["points"]) for g in group) / total_pts
            merged_lon = sum(g["lon"] * len(g["points"]) for g in group) / total_pts
            all_trajs = set()
            for g in group:
                all_trajs.update(g["traj_ids"])

            # Compute cluster radius
            max_r = 0.0
            for g in group:
                for p in g["points"]:
                    r = haversine_distance_nm(merged_lat, merged_lon, p["lat"], p["lon"])
                    if r > max_r:
                        max_r = r

            merged_clusters.append({
                "latitude": round(merged_lat, 5),
                "longitude": round(merged_lon, 5),
                "observation_count": total_pts,
                "trajectory_count": len(all_trajs),
                "cluster_radius_nm": round(max(max_r, 0.1), 3),
                "traffic_density_score": round(total_pts / max(math.pi * (max_r ** 2), 0.5), 2)
            })

        # Sort waypoints deterministically (West to East, then South to North)
        merged_clusters.sort(key=lambda w: (w["longitude"], w["latitude"]))

        # Assign systematic codes WP-01, WP-02, ...
        waypoints = []
        for idx, w in enumerate(merged_clusters, start=1):
            code = f"WP-{idx:02d}"
            waypoints.append({
                "code": code,
                "name": f"Nav Junction {code}",
                "latitude": w["latitude"],
                "longitude": w["longitude"],
                "observation_count": w["observation_count"],
                "trajectory_count": w["trajectory_count"],
                "cluster_radius_nm": w["cluster_radius_nm"],
                "traffic_density_score": w["traffic_density_score"]
            })

        return waypoints
