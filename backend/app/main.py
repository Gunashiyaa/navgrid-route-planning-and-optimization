import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.api.routes import router
from backend.app.services.ais_service import AisService
from backend.app.services.waypoint_service import WaypointService
from backend.app.services.graph_service import GraphService
from backend.app.models.models import AisPosition

# Ensure data directory exists
os.makedirs("data/sample", exist_ok=True)
os.makedirs("data/raw", exist_ok=True)

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NAVGRID Maritime Route Planning & Optimization API",
    description="Deterministic AIS data processing, waypoint extraction, navigation graphs, A* pathfinding, and NSGA-II multi-objective optimization.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.on_event("startup")
def bootstrap_dataset():
    """Ensure database has baseline sample data pre-seeded on startup if empty."""
    db = SessionLocal()
    try:
        count = db.query(AisPosition).count()
        if count == 0:
            sample_path = "data/sample/sample_ais.csv"
            if not os.path.exists(sample_path):
                from scripts.generate_sample_data import generate_ais_dataset
                generate_ais_dataset(sample_path)
            # Import sample data
            AisService.import_csv(db, sample_path)
            # Extract waypoints
            WaypointService.extract_and_store(db)
            # Build navigation graph
            GraphService.build_and_store(db)
            print("NAVGRID database initialized and seeded with baseline Dover Strait AIS dataset.")
    except Exception as e:
        print(f"Dataset bootstrap notice: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
