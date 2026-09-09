# NAVGRID: Deterministic Maritime Route Planning & Optimization

An intelligent geospatial engine and tactical nautical workbench for mining historical AIS (Automatic Identification System) vessel trajectories, synthesizing waypoint corridor networks, computing multi-objective A* passage plans, and generating NSGA-II Pareto frontiers.

---

## 🚀 Running Locally on Your Laptop

### 1. Prerequisites
Ensure you have the following installed on your laptop:
- **Node.js**: Version 18 or higher ([Download Node.js](https://nodejs.org/))
- **Python**: Version 3.10 or higher ([Download Python](https://www.python.org/))
- **Git**: ([Download Git](https://git-scm.com/))

---

### 2. Quick Setup

#### Step A: Install Python Backend Dependencies
Open your terminal in the project root directory:
```bash
# Optional but recommended: create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install required Python packages
pip install -r requirements.txt
```

#### Step B: Install Node.js Frontend Dependencies
```bash
npm install
```

---

### 3. Start the Application
Run a single command to start both the Python FastAPI engine and Vite development server:
```bash
npm run dev
```

- **Frontend & App Interface**: Open [http://localhost:3000](http://localhost:3000) in your browser.
- **FastAPI Interactive Docs (Swagger)**: Open [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 4. Running Backend Tests
To execute the automated deterministic verification test suite (13 unit and integration tests):
```bash
python3 -m pytest tests/ -v
```

---

## 📦 Pushing to Your GitHub Repository

If you downloaded the project as a ZIP or want to push it to your own GitHub account:

1. **Create a new repository** on [GitHub](https://github.com/new) (e.g., `navgrid-maritime`). Leave it empty (without initializing README).
2. Open your terminal in the project directory on your laptop:
```bash
# Initialize git (if not already a git repository)
git init

# Stage all files
git add .

# Create the initial commit
git commit -m "Initial commit: NAVGRID maritime route planning engine"

# Set the main branch
git branch -M main

# Link your remote repository (replace with your GitHub URL)
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# Push your code
git push -u origin main
```
