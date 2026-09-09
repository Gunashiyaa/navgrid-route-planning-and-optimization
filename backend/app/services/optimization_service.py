import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.models.models import OptimizationRun
from backend.app.algorithms.nsga2 import NSGA2RouteOptimizer
from backend.app.services.graph_service import GraphService

class OptimizationService:
    @staticmethod
    def run_nsga2(
        db: Session,
        origin_code: str,
        destination_code: str,
        population_size: int = 40,
        generations: int = 25,
        scenario_id: Optional[int] = None
    ) -> Dict[str, Any]:
        graph = GraphService.get_graph(db)
        waypoints = graph["nodes"]
        edges = graph["edges"]

        if not waypoints or not edges:
            raise ValueError("Navigation graph is empty. Please build waypoints and navigation graph first.")

        excluded_edges = set()
        excluded_waypoints = set()

        if scenario_id:
            from backend.app.models.models import Scenario
            from backend.app.algorithms.scenario_engine import ScenarioEngine
            scen = db.query(Scenario).filter(Scenario.id == scenario_id).first()
            if scen:
                poly = json.loads(scen.polygon_geojson)
                engine = ScenarioEngine()
                excluded_waypoints, excluded_edges = engine.find_affected_elements(poly, waypoints, edges)

        optimizer = NSGA2RouteOptimizer(
            population_size=population_size,
            generations=generations
        )

        result = optimizer.optimize(
            origin_code,
            destination_code,
            waypoints,
            edges,
            excluded_edges=excluded_edges,
            excluded_waypoints=excluded_waypoints
        )

        # Persist run
        run_record = OptimizationRun(
            origin_wp_code=origin_code,
            dest_wp_code=destination_code,
            scenario_id=scenario_id,
            population_size=population_size,
            generations=generations,
            pareto_solutions_json=json.dumps(result["solutions"]),
            runtime_ms=result["runtime_ms"]
        )
        db.add(run_record)
        db.commit()

        return result
