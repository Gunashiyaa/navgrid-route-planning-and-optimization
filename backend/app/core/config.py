import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "NAVGRID AIS Route Planning & Optimization System"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/navgrid.db")
    MAX_TIME_GAP_SECONDS: int = int(os.getenv("MAX_TIME_GAP_SECONDS", "1800")) # 30 min trajectory split
    MAX_SPEED_KNOTS: float = float(os.getenv("MAX_SPEED_KNOTS", "60.0")) # Plausible vessel speed ceiling
    DEFAULT_SIMPLIFICATION_TOLERANCE_METERS: float = float(os.getenv("SIMPLIFICATION_TOLERANCE_M", "120.0"))

settings = Settings()
