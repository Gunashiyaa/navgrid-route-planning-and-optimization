import csv
import math
from datetime import datetime, timedelta

def generate_ais_dataset(output_path: str = "data/sample/sample_ais.csv"):
    base_time = datetime(2026, 5, 12, 6, 0, 0)
    records = []

    # Corridor 1: Northeast-bound TSS Lane (Lon 1.22 -> 1.70, Lat 51.02 -> 51.28)
    # Vessel 1: Container Ship (MMSI 219018271)
    # 40 pings every 2 minutes
    v1_mmsi = 219018271
    for step in range(45):
        t = base_time + timedelta(minutes=step * 2)
        fraction = step / 44.0
        lat = 51.020 + fraction * 0.260 + 0.001 * math.sin(step * 0.4)
        lon = 1.220 + fraction * 0.480 + 0.001 * math.cos(step * 0.4)
        sog = 16.2 + 0.6 * math.sin(step * 0.5)
        cog = 55.0 + 3.0 * math.sin(step * 0.3)
        records.append({
            "MMSI": v1_mmsi,
            "vessel_name": "MAERSK MC-KINNEY MOLLER",
            "vessel_type": "Cargo / Container",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": round(sog, 1),
            "COG": round(cog, 1),
            "heading": int(cog)
        })

    # Vessel 2: Oil Tanker (MMSI 352002145) Northeast-bound
    v2_mmsi = 352002145
    for step in range(40):
        t = base_time + timedelta(minutes=step * 2 + 10)
        fraction = step / 39.0
        lat = 51.035 + fraction * 0.250 + 0.0008 * math.cos(step * 0.3)
        lon = 1.230 + fraction * 0.460
        sog = 12.4 + 0.3 * math.sin(step * 0.2)
        cog = 53.5 + 2.0 * math.cos(step * 0.3)
        records.append({
            "MMSI": v2_mmsi,
            "vessel_name": "NORDIC POLLUX",
            "vessel_type": "Tanker",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": round(sog, 1),
            "COG": round(cog, 1),
            "heading": int(cog)
        })

    # Corridor 2: Southwest-bound TSS Lane (Lon 1.72 -> 1.20, Lat 51.32 -> 51.06)
    # Vessel 3: Bulk Carrier (MMSI 477123456)
    v3_mmsi = 477123456
    for step in range(42):
        t = base_time + timedelta(minutes=step * 2 + 5)
        fraction = step / 41.0
        lat = 51.320 - fraction * 0.255 + 0.001 * math.sin(step * 0.2)
        lon = 1.710 - fraction * 0.490
        sog = 11.5 + 0.4 * math.cos(step * 0.4)
        cog = 233.0 + 3.0 * math.sin(step * 0.3)
        records.append({
            "MMSI": v3_mmsi,
            "vessel_name": "PACIFIC GLORY",
            "vessel_type": "Bulk Carrier",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": round(sog, 1),
            "COG": round(cog, 1),
            "heading": int(cog)
        })

    # Vessel 4: Chemical Tanker (MMSI 257003456) Southwest-bound
    v4_mmsi = 257003456
    for step in range(38):
        t = base_time + timedelta(minutes=step * 2 + 20)
        fraction = step / 37.0
        lat = 51.335 - fraction * 0.260
        lon = 1.730 - fraction * 0.480
        sog = 13.1 + 0.5 * math.sin(step * 0.3)
        cog = 232.0 + 2.5 * math.cos(step * 0.2)
        records.append({
            "MMSI": v4_mmsi,
            "vessel_name": "STOLT PRIDE",
            "vessel_type": "Tanker / Hazard A",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": round(sog, 1),
            "COG": round(cog, 1),
            "heading": int(cog)
        })

    # Corridor 3: Cross-Channel Ferry (Dover Lat 51.12 Lon 1.34 -> Calais Lat 50.97 Lon 1.84)
    # Vessel 5: Ro-Ro Ferry (MMSI 232001122)
    v5_mmsi = 232001122
    for step in range(35):
        t = base_time + timedelta(minutes=step * 2 + 15)
        fraction = step / 34.0
        lat = 51.125 - fraction * 0.155 + 0.002 * math.sin(step * 0.5)
        lon = 1.340 + fraction * 0.480 + 0.002 * math.cos(step * 0.5)
        sog = 18.2 + 0.8 * math.sin(step * 0.3)
        cog = 120.0 + 4.0 * math.sin(step * 0.2)
        records.append({
            "MMSI": v5_mmsi,
            "vessel_name": "PRIDE OF KENT",
            "vessel_type": "Passenger / Ro-Ro Ferry",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": round(sog, 1),
            "COG": round(cog, 1),
            "heading": int(cog)
        })

    # Vessel 6: Ro-Ro Ferry return route (Calais -> Dover) (MMSI 228037700)
    v6_mmsi = 228037700
    for step in range(35):
        t = base_time + timedelta(minutes=step * 2 + 30)
        fraction = step / 34.0
        lat = 50.975 + fraction * 0.145
        lon = 1.820 - fraction * 0.460
        sog = 17.8 + 0.5 * math.cos(step * 0.4)
        cog = 300.0 + 3.0 * math.sin(step * 0.3)
        records.append({
            "MMSI": v6_mmsi,
            "vessel_name": "COTE DES DUNES",
            "vessel_type": "Passenger / Ro-Ro Ferry",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": round(sog, 1),
            "COG": round(cog, 1),
            "heading": int(cog)
        })

    # Vessel 7: Coastal Patrol / Tug with a 45-minute pause to test Trajectory Splitting (MMSI 235012345)
    v7_mmsi = 235012345
    # Segment A (20 pings)
    for step in range(20):
        t = base_time + timedelta(minutes=step * 2)
        lat = 51.100 + step * 0.004
        lon = 1.300 + step * 0.005
        records.append({
            "MMSI": v7_mmsi,
            "vessel_name": "ANGLIAN MONARCH",
            "vessel_type": "Tug / SAR",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": 9.2,
            "COG": 48.0,
            "heading": 48
        })
    # Temporal Gap of 50 minutes (> 30 min max_time_gap_seconds)
    # Segment B (20 pings)
    for step in range(20):
        t = base_time + timedelta(minutes=40 + 50 + step * 2)
        lat = 51.180 + step * 0.004
        lon = 1.400 + step * 0.006
        records.append({
            "MMSI": v7_mmsi,
            "vessel_name": "ANGLIAN MONARCH",
            "vessel_type": "Tug / SAR",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": 8.8,
            "COG": 52.0,
            "heading": 52
        })

    # Vessel 8: General Cargo (MMSI 311000888) Northbound connecting Dover to Thames approaches
    v8_mmsi = 311000888
    for step in range(35):
        t = base_time + timedelta(minutes=step * 2 + 8)
        fraction = step / 34.0
        lat = 51.080 + fraction * 0.260
        lon = 1.420 + fraction * 0.180
        sog = 13.8 + 0.4 * math.sin(step * 0.3)
        cog = 32.0 + 3.0 * math.cos(step * 0.4)
        records.append({
            "MMSI": v8_mmsi,
            "vessel_name": "ATLANTIC NAVIGATOR",
            "vessel_type": "General Cargo",
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "SOG": round(sog, 1),
            "COG": round(cog, 1),
            "heading": int(cog)
        })

    # Add deliberate anomalies for testing data cleaning pipeline:
    # 1. Duplicate timestamp
    records.append({
        "MMSI": v1_mmsi,
        "vessel_name": "MAERSK MC-KINNEY MOLLER",
        "vessel_type": "Cargo / Container",
        "timestamp": base_time.strftime("%Y-%m-%d %H:%M:%S"), # duplicate of step 0
        "latitude": 51.020,
        "longitude": 1.220,
        "SOG": 16.2,
        "COG": 55.0,
        "heading": 55
    })
    # 2. Out of range SOG (> 102.3 knots)
    records.append({
        "MMSI": v2_mmsi,
        "vessel_name": "NORDIC POLLUX",
        "vessel_type": "Tanker",
        "timestamp": (base_time + timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S"),
        "latitude": 51.200,
        "longitude": 1.500,
        "SOG": 199.9, # Anomaly
        "COG": 50.0,
        "heading": 50
    })
    # 3. Invalid coordinates (lat > 90)
    records.append({
        "MMSI": v3_mmsi,
        "vessel_name": "PACIFIC GLORY",
        "vessel_type": "Bulk Carrier",
        "timestamp": (base_time + timedelta(hours=3, minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
        "latitude": 999.0, # Anomaly
        "longitude": 1.400,
        "SOG": 12.0,
        "COG": 230.0,
        "heading": 230
    })

    # Write CSV
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        fieldnames = ["MMSI", "vessel_name", "vessel_type", "timestamp", "latitude", "longitude", "SOG", "COG", "heading"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow(r)

    print(f"Generated {len(records)} AIS records in {output_path}")

if __name__ == "__main__":
    generate_ais_dataset()
