/**
 * AI-Pulse Smart Stadium
 * Javascript Digital Twin Simulation Engine
 */

class StadiumSim {
    constructor() {
        // Base state
        this.state = {
            liveCrowd: 42580,
            systemHealth: 100,
            activePromos: 0,
            zones: {
                A: { density: 45, status: 'online' },
                B: { density: 62, status: 'online' },
                C: { density: 30, status: 'online' },
                D: { density: 80, status: 'online' }
            },
            isEmergency: false,
            alerts: []
        };
        
        // DOM Elements mapping
        this.dom = {
            crowd: document.getElementById('ui-live-crowd'),
            health: document.getElementById('ui-sys-health'),
            promos: document.getElementById('ui-active-promos'),
            alertFeed: document.getElementById('ui-alert-feed'),
            prediction: document.getElementById('ui-prediction-text'),
            toast: document.getElementById('toast-container')
        };
    }

    init() {
        this.addAlert("System Initialization Complete. AI Engine Online.", "system");
        this.updateUI();
        
        // Polling loop
        this.interval = setInterval(() => {
            this.tick();
        }, 3000);
    }

    tick() {
        if (!this.state.isEmergency) {
            // Random fluctuation for crowd
            let fluctuation = Math.floor(Math.random() * 50) - 25;
            this.state.liveCrowd = Math.max(0, this.state.liveCrowd + fluctuation);
            
            // Random zone density shifts
            ['A', 'B', 'C', 'D'].forEach(zone => {
                if(this.state.zones[zone].status === 'online') {
                    let densityShift = Math.floor(Math.random() * 7) - 3; // -3 to +3
                    let val = this.state.zones[zone].density + densityShift;
                    this.state.zones[zone].density = Math.max(5, Math.min(95, val));
                }
            });
            
            this.state.systemHealth = 100;
            if(Math.random() > 0.8) {
               this.state.systemHealth = 99; // slight realistic drop
            }
        }
        
        this.updateUI();
    }

    updateUI() {
        // Stats
        if(this.dom.crowd) this.dom.crowd.textContent = this.state.liveCrowd.toLocaleString();
        if(this.dom.health) {
            this.dom.health.textContent = this.state.systemHealth + '%';
            if(this.state.systemHealth < 50) this.dom.health.className = "val text-red pulse-text-red";
            else this.dom.health.className = "val";
        }
        if(this.dom.promos) this.dom.promos.textContent = this.state.activePromos;

        // Zones Heatmap Colors
        ['A', 'B', 'C', 'D'].forEach(zone => {
            let el = document.getElementById(`zone-${zone}`);
            let valEl = document.getElementById(`val-zone-${zone}`);
            if(!el) return;
            
            let zData = this.state.zones[zone];
            
            if (zData.status === 'offline') {
                el.style.background = 'rgba(50,50,50,0.6)';
                el.style.boxShadow = 'none';
                valEl.textContent = 'OFFLINE';
                valEl.style.color = '#8b8f9e';
            } else {
                valEl.textContent = zData.density + '%';
                valEl.style.color = '#fff';
                
                if (zData.density >= 85) {
                    el.style.background = 'rgba(255, 51, 102, 0.4)'; // Red
                    el.style.boxShadow = '0 0 20px rgba(255,51,102,0.8)';
                } else if (zData.density > 60) {
                    el.style.background = 'rgba(255, 204, 0, 0.3)'; // Yellow
                    el.style.boxShadow = 'none';
                } else {
                    el.style.background = 'rgba(0, 255, 102, 0.2)'; // Green
                    el.style.boxShadow = 'none';
                }
            }
        });
        
        this.renderAlerts();
    }

    renderAlerts() {
        if(!this.dom.alertFeed) return;
        this.dom.alertFeed.innerHTML = this.state.alerts.map(a => `
            <div class="alert-item type-${a.type}">
                <div class="text-xs text-muted mb-sm">${new Date(a.time).toLocaleTimeString()}</div>
                <div>${a.msg}</div>
            </div>
        `).join('');
    }

    addAlert(msg, type="operation") {
        this.state.alerts.unshift({ time: Date.now(), msg, type });
        if(this.state.alerts.length > 5) this.state.alerts.pop(); // Keep top 5
        this.updateUI();
    }

    showToast(message) {
        if(!this.dom.toast) return;
        const div = document.createElement('div');
        div.className = 'toast show';
        div.textContent = message;
        this.dom.toast.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }

    // --- BUTTON HANDLERS ---
    
    triggerAttendeeRoute(mode) {
        console.log(`Routing calculated for: ${mode}`);
        this.showToast(`Recalculating optimal path for ${mode}...`);
        const etaText = document.getElementById('ui-route-eta');
        if(etaText) etaText.textContent = `ETA: ${Math.floor(Math.random() * 5 + 2)} Min to Objective`;
    }

    triggerVendorDeploy() {
        this.state.activePromos++;
        this.showToast("10% Discount pushed to Zone B users.");
        this.addAlert("Flash Promo Executed: Zone B Discount", "vendor");
        this.updateUI();
    }

    resetSimulation() {
        // Restore defaults
        this.state.liveCrowd = 42580;
        this.state.systemHealth = 100;
        this.state.activePromos = 0;
        this.state.isEmergency = false;
        this.state.zones = {
            A: { density: 45, status: 'online' },
            B: { density: 62, status: 'online' },
            C: { density: 30, status: 'online' },
            D: { density: 80, status: 'online' }
        };
        this.state.alerts = [];
        
        if(this.dom.prediction) this.dom.prediction.textContent = "Stable crowd flow expected over the next 15 minutes.";
        
        this.showToast("Simulation Reset Successfully");
        this.addAlert("System Reset Triggered. Nominal operations restored.", "system");
        this.updateUI();
    }

    // --- EDGE CASES ---
    
    triggerFire() {
        this.state.isEmergency = true;
        this.state.systemHealth = 0;
        
        // Massive UI state changes
        ['A', 'B', 'C', 'D'].forEach(z => this.state.zones[z].density = 99);
        this.state.liveCrowd = 0; // simulating massive drops off meters
        
        if(this.dom.prediction) this.dom.prediction.textContent = "EVACUATION IN PROGRESS. FOLLOW LIT PATHWAYS.";
        this.dom.prediction.style.color = "var(--c-neon-red)";
        
        this.addAlert("EMERGENCY RED: FIRE DETECTED. AUTO-EVACUATION ROUTING ENABLED.", "emergency");
        this.updateUI();
    }

    triggerSurge() {
        this.state.zones['C'].density = 95;
        this.addAlert("Dispatch Staff: Critical crowd surge detected in Section C.", "emergency");
        if(this.dom.prediction) this.dom.prediction.textContent = "High congestion detected in Sector C. Suggesting alternate routes to attendees.";
        this.updateUI();
    }

    triggerSensorDrop() {
        this.state.zones['A'].status = 'offline';
        this.state.systemHealth = 85;
        this.addAlert("SENSOR OFFLINE: Zone A data feed dropped. Engaging predictive fallback.", "operation");
        this.updateUI();
    }

    quickReset() {
        window.scrollTo({top: 0});
    }
}

// Global hook
const stadiumApp = new StadiumSim();
document.addEventListener('DOMContentLoaded', () => {
    stadiumApp.init();
});
