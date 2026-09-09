
# 🌊 NavGrid

### AIS-Based Maritime Route Planning & Optimization System

NavGrid is a full-stack geospatial platform for analyzing historical vessel movements and supporting maritime route planning.

The system processes AIS (Automatic Identification System) vessel-position data, converts vessel trajectories into a navigable spatial network, generates feasible routes, evaluates route characteristics, and allows users to compare and re-plan routes under different navigation scenarios.

NavGrid is designed as a **software engineering and geospatial algorithms project**. It does not rely on machine learning or predictive models.

---

## 🚢 Problem Statement

Maritime and inland-waterway navigation involves more than finding the shortest path between two locations.

Historical vessel movements contain useful information about:

- Frequently travelled areas
- Vessel trajectories
- Navigational corridors
- Traffic concentration
- Route connectivity

At the same time, navigation conditions can change due to:

- Restricted areas
- Temporary closures
- Traffic conditions
- Operational constraints

NavGrid provides a computational platform that transforms historical vessel movement data into an interactive navigation network and allows users to explore alternative routes and scenarios.

---

## 🎯 Objectives

NavGrid aims to:

1. Process real AIS vessel-position data
2. Construct vessel trajectories from timestamped positions
3. Simplify trajectories while preserving their geometric characteristics
4. Extract meaningful navigation waypoints
5. Construct a navigable graph from historical vessel movement
6. Generate routes between selected locations
7. Evaluate routes using distance and traffic-related metrics
8. Generate alternative routes using multi-objective optimization
9. Allow users to introduce spatial restrictions
10. Recalculate and compare routes under modified scenarios

---

## ✨ Key Features

### 📡 AIS Data Processing

- CSV-based AIS data import
- Data validation and cleaning
- Duplicate detection
- Geographic coordinate validation
- Timestamp processing
- Vessel-based trajectory construction
- Dataset statistics

### 🛳️ Trajectory Analysis

- Historical vessel trajectory visualization
- Vessel-level trajectory inspection
- Trajectory segmentation
- Geometric trajectory simplification
- Original vs simplified trajectory comparison

### 📍 Navigation Waypoints

NavGrid extracts meaningful spatial points from historical vessel movement.

Each waypoint can provide information such as:

- Location
- Traffic/visit count
- Associated trajectories
- Connectivity information

Waypoints can be visualized directly on the interactive map.

### 🗺️ Navigation Network

The extracted waypoints are converted into a navigable graph.

```text
Waypoint → Node
Navigable connection → Edge
