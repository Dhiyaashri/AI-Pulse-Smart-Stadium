from flask import Flask, jsonify
from flask_cors import CORS
import random
import time
import threading

app = Flask(__name__)
CORS(app)

# --- SIMULATION STATE ---
# Representing logical zones of a stadium in a grid/graph.
# We'll assign neighbors for pathfinding logic.
zones = {
    "Z-1": {"name": "North Gate Entry", "capacity": 500, "current_occupancy": 150, "status": "open", "neighbors": ["Z-7"]},
    "Z-2": {"name": "South Gate Entry", "capacity": 500, "current_occupancy": 120, "status": "open", "neighbors": ["Z-7"]},
    "Z-3": {"name": "Food Court A", "capacity": 300, "current_occupancy": 80,  "status": "open", "neighbors": ["Z-7", "Z-5"]},
    "Z-4": {"name": "Food Court B", "capacity": 300, "current_occupancy": 140, "status": "open", "neighbors": ["Z-7", "Z-6"]},
    "Z-5": {"name": "Restrooms East", "capacity": 100, "current_occupancy": 20, "status": "open", "neighbors": ["Z-3", "Z-8"]},
    "Z-6": {"name": "Restrooms West", "capacity": 100, "current_occupancy": 80,  "status": "open", "neighbors": ["Z-4", "Z-9"]},
    "Z-7": {"name": "Main Concourse", "capacity": 2000, "current_occupancy": 600, "status": "open", "neighbors": ["Z-1", "Z-2", "Z-3", "Z-4", "Z-8", "Z-9"]},
    "Z-8": {"name": "VIP Lounge", "capacity": 200, "current_occupancy": 50, "status": "open", "neighbors": ["Z-7", "Z-5"]},
    "Z-9": {"name": "Merch Store 1", "capacity": 150, "current_occupancy": 120, "status": "open", "neighbors": ["Z-7", "Z-6"]},
}

vendors = [
    {"id": "V1", "name": "Burger Spot", "location": "Z-3", "queue_time_min": 5, "inventory_level": 85, "status": "normal"},
    {"id": "V2", "name": "Pizza Hut", "location": "Z-4", "queue_time_min": 12, "inventory_level": 40, "status": "normal"},
    {"id": "V3", "name": "Cold Drinks E", "location": "Z-7", "queue_time_min": 2, "inventory_level": 20, "status": "normal"},
    {"id": "V4", "name": "Hotdogs North", "location": "Z-1", "queue_time_min": 15, "inventory_level": 10, "status": "normal"},
    {"id": "V5", "name": "Team Shop", "location": "Z-9", "queue_time_min": 8, "inventory_level": 55, "status": "normal"},
]

global_state = {
    "emergency_mode": False,
    "sensor_failure": False,
    "system_health": "Optimal",
    "data_latency_ms": 12,
    "alerts": []
}

def add_alert(msg, alert_type="system"):
    # alert_type: system, vendor, emergency, operation
    global_state["alerts"].insert(0, {"msg": msg, "type": alert_type, "time": time.strftime("%H:%M:%S")})
    # Keep only last 10
    if len(global_state["alerts"]) > 10:
        global_state["alerts"].pop()

# --- SIMULATION LOOP ---
def simulation_loop():
    while True:
        # Update zones with random fluctuations
        for z_id, z_data in zones.items():
            if z_data["status"] == "closed":
                # People leave immediately
                z_data["current_occupancy"] = max(0, z_data["current_occupancy"] - int(z_data["capacity"] * 0.5))
                continue
            
            # Normal fluctuation
            change = int(z_data["capacity"] * random.uniform(-0.02, 0.05))
            
            if global_state["emergency_mode"]:
                # If emergency, everyone leaves rapidly towards Exits (Z-1, Z-2)
                if z_id not in ["Z-1", "Z-2"]:
                    z_data["current_occupancy"] = max(0, z_data["current_occupancy"] - int(z_data["capacity"] * 0.15))
                else:
                    z_data["current_occupancy"] = min(z_data["capacity"], z_data["current_occupancy"] + int(z_data["capacity"] * 0.2))
            else:
                new_occ = max(0, min(z_data["capacity"], z_data["current_occupancy"] + change))
                z_data["current_occupancy"] = new_occ

        # Update vendor stats
        for v in vendors:
            if v["status"] == "overload":
                v["queue_time_min"] = min(60, v["queue_time_min"] + random.randint(1, 5))
                v["inventory_level"] = max(0, v["inventory_level"] - random.randint(2, 6))
            else:
                v["queue_time_min"] = max(0, min(30, v["queue_time_min"] + random.randint(-2, 2)))
                v["inventory_level"] = max(0, v["inventory_level"] - random.randint(0, 2))

        # Check conditions
        for z_id, z_data in zones.items():
            if z_data["status"] != "closed":
                density = z_data["current_occupancy"] / z_data["capacity"]
                if density > 0.90:
                    # SURGE DETECTED implicitly
                    add_alert(f"CROWD SURGE: {z_data['name']} is heavily congested ({int(density*100)}%).", "operation")

        for v in vendors:
            if v["queue_time_min"] > 25:
                add_alert(f"VENDOR OVERLOAD: {v['name']} queue extremely long. Hiding from routing.", "vendor")
            if v["inventory_level"] < 5 and v["inventory_level"] > 0:
                add_alert(f"STOCK CRITICAL: {v['name']} needs immediate restocking.", "vendor")

        global_state["data_latency_ms"] = random.randint(5, 45) if not global_state["sensor_failure"] else 999
        
        time.sleep(2) # 2-second simulation tick

# Start thread
sim_thread = threading.Thread(target=simulation_loop, daemon=True)
sim_thread.start()

# --- API ENDPOINTS ---
@app.route('/api/state')
def get_state():
    return jsonify({
        "zones": zones,
        "vendors": vendors,
        "global_state": global_state
    })

@app.route('/api/trigger', methods=['POST'])
def trigger_event():
    # Helper to simulate edge cases
    pass

@app.route('/api/trigger-emergency', methods=['POST'])
def trigger_emergency():
    global_state["emergency_mode"] = True
    add_alert("EMERGENCY RED: SIMULATION TRIGGERED. EVACUATE VIA GATES 1 & 2.", "emergency")
    return jsonify({"status": "emergency_activated"})

@app.route('/api/resolve-emergency', methods=['POST'])
def resolve_emergency():
    global_state["emergency_mode"] = False
    add_alert("EMERGENCY RESOLVED. Normal operations resuming.", "system")
    return jsonify({"status": "emergency_resolved"})

@app.route('/api/trigger-zone-closure/<z_id>', methods=['POST'])
def trigger_zone_closure(z_id):
    if z_id in zones:
        zones[z_id]["status"] = "closed"
        add_alert(f"ZONE CLOSED manually: {zones[z_id]['name']}. Rerouting traffic.", "operation")
        return jsonify({"status": f"closed {z_id}"})
    return jsonify({"error": "Invalid zone"}), 400

@app.route('/api/resolve-zone-closure/<z_id>', methods=['POST'])
def resolve_zone_closure(z_id):
    if z_id in zones:
        zones[z_id]["status"] = "open"
        add_alert(f"ZONE RE-OPENED: {zones[z_id]['name']}.", "operation")
        return jsonify({"status": f"opened {z_id}"})
    return jsonify({"error": "Invalid zone"}), 400

@app.route('/api/trigger-surge/<z_id>', methods=['POST'])
def trigger_surge(z_id):
    if z_id in zones:
        zones[z_id]["current_occupancy"] = int(zones[z_id]["capacity"] * 0.95)
        add_alert(f"SURGE TRIGGERED maliciously in {zones[z_id]['name']}.", "operation")
        return jsonify({"status": f"surge {z_id}"})
    return jsonify({"error": "Invalid zone"}), 400

@app.route('/api/trigger-vendor-overload/<v_id>', methods=['POST'])
def trigger_vendor_overload(v_id):
    for v in vendors:
        if v["id"] == v_id:
            v["status"] = "overload"
            v["queue_time_min"] = 30
            v["inventory_level"] = 5
            add_alert(f"VENDOR EVENT: {v['name']} overloaded and out of stock.", "vendor")
            return jsonify({"status": f"overloaded {v_id}"})
    return jsonify({"error": "Invalid vendor"}), 400

@app.route('/api/trigger-sensor-failure', methods=['POST'])
def trigger_sensor_failure():
    global_state["sensor_failure"] = True
    global_state["system_health"] = "Degraded"
    add_alert("SENSOR FAILURE: Main concourse depth sensors offline. Using predictive fallback.", "system")
    return jsonify({"status": "sensor_failed"})

@app.route('/api/reset', methods=['POST'])
def reset_simulation():
    # Clear out emergency and sensor failure
    global_state["emergency_mode"] = False
    global_state["sensor_failure"] = False
    global_state["system_health"] = "Optimal"
    global_state["alerts"] = []

    # Reset Zones
    for z_id in zones:
        zones[z_id]["status"] = "open"
        zones[z_id]["current_occupancy"] = int(zones[z_id]["capacity"] * random.uniform(0.1, 0.4))
    
    # Reset vendors
    for v in vendors:
        v["status"] = "normal"
        v["queue_time_min"] = random.randint(2, 5)
        v["inventory_level"] = random.randint(60, 90)

    add_alert("SYSTEM RESET: AI Digital Twin synchronized to baseline.", "system")
    return jsonify({"status": "reset_complete"})

if __name__ == '__main__':
    app.run(port=5000)
