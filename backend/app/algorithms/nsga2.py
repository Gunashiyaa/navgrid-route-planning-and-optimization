import time
import random
import math
from typing import List, Dict, Tuple, Any, Optional, Set
from backend.app.algorithms.trajectory_builder import haversine_distance_nm
from backend.app.algorithms.pathfinding import AStarRouter, CRUISE_SPEED_KNOTS

class NSGA2RouteOptimizer:
    """
    Non-dominated Sorting Genetic Algorithm II (NSGA-II) for Maritime Route Planning.
    Simultaneously optimizes two conflicting maritime objectives:
      f1: Minimize Total Route Distance (NM)
      f2: Minimize Cumulative Congestion Score
    
    Exposes the non-dominated Pareto frontier of trade-off maritime trajectories.
    """

    def __init__(
        self,
        population_size: int = 40,
        generations: int = 25,
        crossover_rate: float = 0.8,
        mutation_rate: float = 0.3
    ):
        self.pop_size = population_size
        self.generations = generations
        self.cx_rate = crossover_rate
        self.mut_rate = mutation_rate

    def optimize(
        self,
        origin_code: str,
        destination_code: str,
        waypoints: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        excluded_edges: Optional[Set[Tuple[str, str]]] = None,
        excluded_waypoints: Optional[Set[str]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        wp_dict = {w["code"]: w for w in waypoints}

        # Build adjacency graph
        adj: Dict[str, List[str]] = {w["code"]: [] for w in waypoints}
        edge_metrics: Dict[Tuple[str, str], Tuple[float, float]] = {}

        excluded_edges = excluded_edges or set()
        excluded_waypoints = excluded_waypoints or set()

        for e in edges:
            u, v = e["source_code"], e["target_code"]
            if u in excluded_waypoints or v in excluded_waypoints:
                continue
            if (u, v) in excluded_edges or (v, u) in excluded_edges:
                continue

            adj[u].append(v)
            adj[v].append(u)
            edge_metrics[(u, v)] = (e["distance_nm"], e["congestion_score"])
            edge_metrics[(v, u)] = (e["distance_nm"], e["congestion_score"])

        def evaluate_path(path: List[str]) -> Tuple[float, float, float]:
            """Returns (distance_nm, avg_congestion, travel_hours)."""
            total_dist = 0.0
            cong_sum = 0.0
            for i in range(len(path) - 1):
                u, v = path[i], path[i + 1]
                d, c = edge_metrics.get((u, v), (999.0, 50.0))
                total_dist += d
                cong_sum += c
            n_segs = max(1, len(path) - 1)
            avg_cong = cong_sum / n_segs
            travel_hours = (total_dist / CRUISE_SPEED_KNOTS) * (1.0 + 0.08 * avg_cong)
            return round(total_dist, 3), round(avg_cong, 2), round(travel_hours, 3)

        # 1. Initialize diverse population
        population: List[List[str]] = []

        # Seed with multi-weighted A* solutions
        router = AStarRouter()
        weight_pairs = [
            (1.0, 0.0), (1.0, 0.5), (1.0, 1.0), (1.0, 2.0),
            (0.5, 3.0), (0.2, 5.0), (0.8, 1.5), (1.2, 0.8)
        ]
        for alpha, beta in weight_pairs:
            router.alpha = alpha
            router.beta = beta
            route = router.plan_route(origin_code, destination_code, waypoints, edges, excluded_edges, excluded_waypoints)
            if route and route["waypoint_sequence"] not in population:
                population.append(route["waypoint_sequence"])

        # Seed with randomized DFS explorations to inject genetic variety
        def random_dfs(curr: str, target: str, visited: Set[str], max_depth: int = 15) -> Optional[List[str]]:
            if curr == target:
                return [curr]
            if max_depth <= 0:
                return None
            nbrs = list(adj.get(curr, []))
            random.shuffle(nbrs)
            for nbr in nbrs:
                if nbr not in visited:
                    res = random_dfs(nbr, target, visited | {nbr}, max_depth - 1)
                    if res:
                        return [curr] + res
            return None

        attempts = 0
        while len(population) < self.pop_size and attempts < 100:
            attempts += 1
            rand_path = random_dfs(origin_code, destination_code, {origin_code})
            if rand_path and rand_path not in population:
                population.append(rand_path)

        if not population:
            # Graph disconnected
            return {
                "origin_code": origin_code,
                "destination_code": destination_code,
                "population_size": self.pop_size,
                "generations": self.generations,
                "runtime_ms": round((time.time() - start_time) * 1000.0, 2),
                "total_evaluated": 0,
                "solutions": []
            }

        # 2. Evolutionary loop
        evaluated_cache = {}

        for gen in range(self.generations):
            # Evaluate current population
            fitness = []
            for indiv in population:
                indiv_key = tuple(indiv)
                if indiv_key not in evaluated_cache:
                    evaluated_cache[indiv_key] = evaluate_path(indiv)
                d, c, t = evaluated_cache[indiv_key]
                fitness.append((d, c))

            # Non-dominated sorting
            fronts = self._fast_non_dominated_sort(fitness)

            # Generate offspring
            offspring: List[List[str]] = []
            while len(offspring) < self.pop_size:
                p1 = self._tournament_select(population, fronts)
                p2 = self._tournament_select(population, fronts)

                child = list(p1)
                # Crossover at common waypoint
                if random.random() < self.cx_rate:
                    common = set(p1[1:-1]) & set(p2[1:-1])
                    if common:
                        pivot = random.choice(list(common))
                        idx1 = p1.index(pivot)
                        idx2 = p2.index(pivot)
                        child = p1[:idx1] + p2[idx2:]

                # Mutation: reroute a sub-path
                if random.random() < self.mut_rate and len(child) > 3:
                    mut_idx = random.randint(1, len(child) - 2)
                    mut_node = child[mut_idx]
                    nbrs = [n for n in adj.get(mut_node, []) if n not in child]
                    if nbrs:
                        alt = random.choice(nbrs)
                        # Check if alt connects to child[mut_idx+1]
                        if child[mut_idx + 1] in adj.get(alt, []):
                            child[mut_idx] = alt

                # Validate connectivity of child
                is_valid = True
                for k in range(len(child) - 1):
                    if child[k + 1] not in adj.get(child[k], []):
                        is_valid = False
                        break
                if is_valid and len(child) == len(set(child)): # no cycles
                    offspring.append(child)
                else:
                    offspring.append(p1)

            # Combine parent + offspring for elitist survival
            combined = population + offspring
            combined_unique = []
            seen_comb = set()
            for ind in combined:
                t_ind = tuple(ind)
                if t_ind not in seen_comb:
                    seen_comb.add(t_ind)
                    combined_unique.append(ind)

            comb_fitness = []
            for ind in combined_unique:
                ind_key = tuple(ind)
                if ind_key not in evaluated_cache:
                    evaluated_cache[ind_key] = evaluate_path(ind)
                d, c, _ = evaluated_cache[ind_key]
                comb_fitness.append((d, c))

            comb_fronts = self._fast_non_dominated_sort(comb_fitness)

            # Select best N individuals for next generation
            next_pop = []
            for f in comb_fronts:
                if len(next_pop) + len(f) <= self.pop_size:
                    for idx in f:
                        next_pop.append(combined_unique[idx])
                else:
                    # Crowding distance sort for partial front
                    crowding = self._calculate_crowding_distance(f, comb_fitness)
                    sorted_f = sorted(f, key=lambda idx: crowding[idx], reverse=True)
                    needed = self.pop_size - len(next_pop)
                    for idx in sorted_f[:needed]:
                        next_pop.append(combined_unique[idx])
                    break

            population = next_pop

        # Final Pareto front evaluation
        final_fitness = []
        for ind in population:
            d, c, _ = evaluated_cache[tuple(ind)]
            final_fitness.append((d, c))

        final_fronts = self._fast_non_dominated_sort(final_fitness)
        pareto_indices = final_fronts[0] if final_fronts else []

        pareto_solutions = []
        seen_pareto_pairs = set()

        for sol_idx, idx in enumerate(pareto_indices):
            path = population[idx]
            d, c, t = evaluated_cache[tuple(path)]
            pair = (d, c)
            if pair in seen_pareto_pairs:
                continue
            seen_pareto_pairs.add(pair)

            coords = [[wp_dict[wp]["longitude"], wp_dict[wp]["latitude"]] for wp in path]

            pareto_solutions.append({
                "solution_id": f"SOL-{sol_idx + 1:02d}",
                "name": f"Candidate {sol_idx + 1} ({d} NM / Cong. {c})",
                "distance_nm": d,
                "congestion_score": c,
                "estimated_hours": t,
                "waypoint_sequence": path,
                "geometry_geojson": {
                    "type": "LineString",
                    "coordinates": coords
                },
                "is_pareto_optimal": True,
                "rank": 1,
                "crowding_distance": 0.0
            })

        # Sort Pareto solutions by distance ascending (Distance vs Congestion trade-off spectrum)
        pareto_solutions.sort(key=lambda s: s["distance_nm"])

        return {
            "origin_code": origin_code,
            "destination_code": destination_code,
            "population_size": self.pop_size,
            "generations": self.generations,
            "runtime_ms": round((time.time() - start_time) * 1000.0, 2),
            "total_evaluated": len(evaluated_cache),
            "solutions": pareto_solutions
        }

    def _fast_non_dominated_sort(self, fitness: List[Tuple[float, float]]) -> List[List[int]]:
        """Standard NSGA-II non-dominated sorting."""
        n = len(fitness)
        domination_count = [0] * n
        dominated_indices: List[List[int]] = [[] for _ in range(n)]
        fronts: List[List[int]] = [[]]

        for p in range(n):
            d_p, c_p = fitness[p]
            for q in range(n):
                if p == q:
                    continue
                d_q, c_q = fitness[q]
                # p dominates q if p <= q on all and < on at least one
                if (d_p <= d_q and c_p <= c_q) and (d_p < d_q or c_p < c_q):
                    dominated_indices[p].append(q)
                elif (d_q <= d_p and c_q <= c_p) and (d_q < d_p or c_q < c_p):
                    domination_count[p] += 1

            if domination_count[p] == 0:
                fronts[0].append(p)

        i = 0
        while i < len(fronts) and fronts[i]:
            next_front = []
            for p in fronts[i]:
                for q in dominated_indices[p]:
                    domination_count[q] -= 1
                    if domination_count[q] == 0:
                        next_front.append(q)
            i += 1
            if next_front:
                fronts.append(next_front)

        return [f for f in fronts if f]

    def _calculate_crowding_distance(self, front: List[int], fitness: List[Tuple[float, float]]) -> Dict[int, float]:
        """Calculates crowding distances for a given Pareto front."""
        dist = {idx: 0.0 for idx in front}
        if len(front) <= 2:
            for idx in front:
                dist[idx] = float("inf")
            return dist

        for obj_idx in (0, 1):
            sorted_front = sorted(front, key=lambda idx: fitness[idx][obj_idx])
            dist[sorted_front[0]] = float("inf")
            dist[sorted_front[-1]] = float("inf")

            obj_min = fitness[sorted_front[0]][obj_idx]
            obj_max = fitness[sorted_front[-1]][obj_idx]
            obj_range = obj_max - obj_min
            if obj_range < 1e-6:
                continue

            for i in range(1, len(sorted_front) - 1):
                prev_idx = sorted_front[i - 1]
                next_idx = sorted_front[i + 1]
                dist[sorted_front[i]] += (fitness[next_idx][obj_idx] - fitness[prev_idx][obj_idx]) / obj_range

        return dist

    def _tournament_select(self, population: List[List[str]], fronts: List[List[int]]) -> List[str]:
        """Binary tournament selection by front rank."""
        idx_to_rank = {}
        for rank, f in enumerate(fronts):
            for idx in f:
                idx_to_rank[idx] = rank

        i1 = random.randint(0, len(population) - 1)
        i2 = random.randint(0, len(population) - 1)

        r1 = idx_to_rank.get(i1, 999)
        r2 = idx_to_rank.get(i2, 999)

        winner = i1 if r1 <= r2 else i2
        return population[winner]
