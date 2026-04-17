/**
 * AI-Pulse Smart Stadium
 * Global Logic Controller
 */

const API_BASE = 'http://127.0.0.1:5000/api';

const app = {
    currentRole: 'landing',
    pollInterval: null,
    chartInstance: null,

    init() {
        this.switchRole('landing');
        this.startPolling();
    },

    // --- NAVIGATION ---
    switchRole(role) {
        const pages = document.querySelectorAll('.page');
        
        // Hide all pages with a tiny delay to allow fade out
        pages.forEach(p => {
            p.style.opacity = '0';
            setTimeout(() => p.classList.remove('active'), 300);
        });
        
        // Show selected after a tiny delay
        setTimeout(() => {
            const selected = document.getElementById(`page-${role}`);
            if(selected) {
                selected.classList.add('active');
                setTimeout(() => selected.style.opacity = '1', 50);
            }
        }, 300);

        this.currentRole = role;

        // Nav config
        const nav = document.getElementById('global-nav');
        const navTitle = document.getElementById('nav-role-title');

        if (role === 'landing') {
            nav.classList.add('hidden');
        } else {
            nav.classList.remove('hidden');
            if(role === 'attendee') navTitle.innerHTML = 'Attendee <span style="font-weight:300">| Smart Nav</span>';
            if(role === 'operations') navTitle.innerHTML = 'Operations <span style="color:var(--c-neon-purple)">| Command Center</span>';
            if(role === 'vendor') navTitle.innerHTML = 'Vendor <span style="color:var(--c-neon-green)">| AI Engine</span>';
            
            // Re-render chart if vendor
            if(role === 'vendor') this.initVendorChart();
        }
    },

    // --- DATA POLLING ---
    async startPolling() {
        this.pollData();
        this.pollInterval = setInterval(() => this.pollData(), 2000);
    },

    async pollData() {
        try {
            const res = await fetch(`${API_BASE}/state`);
            const data = await res.json();
            this.updateUI(data);
        } catch (e) {
            console.error("Backend offline. Fallback required.");
        }
    },

    // --- UI UPDATERS ---
    updateUI(data) {
        // Global
        const healthEl = document.getElementById('nav-system-health');
        if(data.global_state.system_health === "Optimal") {
            healthEl.innerHTML = `Health: <span class="text-green">Optimal (${data.global_state.data_latency_ms}ms)</span>`;
        } else if (data.global_state.system_health === "Degraded") {
            healthEl.innerHTML = `Health: <span style="color:orange">Degraded (${data.global_state.data_latency_ms}ms)</span>`;
        } else {
            healthEl.innerHTML = `Health: <span class="text-red">Critical</span>`;
        }

        // --- Ops Dashboard Views ---
        this.renderHeatmap(data.zones, 'ops-stadium-map');
        this.renderHeatmap(data.zones, 'attendee-mini-map'); // simplified
        this.renderAlerts(data.global_state.alerts);
        
        if(data.global_state.emergency_mode) {
            document.getElementById('ops-network-status').textContent = 'EMERGENCY OVERRIDE';
            document.getElementById('ops-network-status').className = 'val text-red';
            document.getElementById('ops-evac-time').textContent = 'EVACUATING...';
        } else {
            document.getElementById('ops-network-status').textContent = 'Online';
            document.getElementById('ops-network-status').className = 'val pulse-text-green';
            document.getElementById('ops-evac-time').textContent = '3.2 Min';
        }

        // --- Attendee Views ---
        let attendeeHTML = '';
        data.vendors.forEach(v => {
            if (v.status !== 'overload') { // Hide overloaded from recommendations
                let statusClass = v.queue_time_min > 10 ? 'bad' : (v.queue_time_min > 5 ? 'med' : 'good');
                let waitText = v.queue_time_min + ' Min';
                attendeeHTML += `
                    <div class="vendor-row">
                        <div>
                            <div class="vendor-name">${v.name}</div>
                            <div class="vendor-loc">Located at ${v.location}</div>
                        </div>
                        <div class="vendor-wait ${statusClass}">${waitText}</div>
                    </div>
                `;
            }
        });
        document.getElementById('attendee-vendor-list').innerHTML = attendeeHTML || '<div class="text-muted">No vendors available nearby.</div>';

        // --- Vendor Views ---
        let v2 = data.vendors.find(v => v.id === "V2"); // use V2 for demo
        if(v2) {
            document.getElementById('vendor-inv-index').textContent = v2.inventory_level + '%';
            document.getElementById('vendor-queue-time').textContent = v2.queue_time_min + 'm';
            if (v2.status === 'overload' || v2.inventory_level < 10) {
                document.getElementById('vendor-demand-state').textContent = 'CRITICAL OVERLOAD';
                document.getElementById('vendor-demand-state').style.color = 'var(--c-neon-red)';
                document.getElementById('vendor-inv-warning').style.display = 'block';
            } else {
                document.getElementById('vendor-demand-state').textContent = 'Stable';
                document.getElementById('vendor-demand-state').style.color = 'var(--c-neon-purple)';
                document.getElementById('vendor-inv-warning').style.display = 'none';
            }
            
            // Randomize chart a bit based on queue
            if(this.chartInstance && this.currentRole === 'vendor') {
                this.updateVendorChart(v2.queue_time_min);
            }
        }
    },

    renderHeatmap(zones, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '';
        for (const [id, z] of Object.entries(zones)) {
            let density = z.current_occupancy / z.capacity;
            let bgColor = `rgba(0, 255, 102, 0.2)`; // green
            let shadow = `none`;
            
            if(z.status === 'closed') {
                bgColor = `rgba(50, 50, 50, 0.8)`; // gray / black
                shadow = `inset 0 0 20px rgba(0,0,0,1)`;
            } else if (density > 0.85) {
                bgColor = `rgba(255, 51, 102, 0.6)`; // red
                shadow = `0 0 20px rgba(255,51,102,0.8)`;
            } else if (density > 0.5) {
                bgColor = `rgba(255, 204, 0, 0.4)`; // yellow
            }

            let icon = '';
            if (z.status === 'closed') icon = '🚫';
            else if (density > 0.85) icon = '🔥';

            html += `
                <div class="stadium-node" style="background: ${bgColor}; box-shadow: ${shadow}">
                    <div class="node-status-icon">${icon}</div>
                    <div class="node-val">${z.status === 'closed' ? 'CLOSED' : Math.floor(density * 100) + '%'}</div>
                    <div class="node-name">${z.name}</div>
                </div>
            `;
        }
        container.innerHTML = html;
        
        // Update AR overlay logic dynamically based on Z-7
        if(containerId === 'attendee-mini-map' && zones['Z-7'].status === 'closed') {
            document.querySelector('.ar-overlay-text').innerHTML = `Navigating to Z-6 (West) <br><span style="color:var(--c-neon-red)" class="text-sm route-status">⚠️ Z-7 Closed. Recalculating route...</span>`;
        } else if (containerId === 'attendee-mini-map') {
            document.querySelector('.ar-overlay-text').innerHTML = `Navigating to Z-7 (Main Concourse) <br><span class="text-sm route-status">Optimized for least crowded path.</span>`;
        }
    },

    renderAlerts(alerts) {
        const feed = document.getElementById('ops-alert-feed');
        if(!feed) return;
        let html = '';
        alerts.forEach(a => {
            html += `<div class="alert-item type-${a.type}">
                <span class="text-xs text-muted">[${a.time}]</span><br>
                ${a.msg}
            </div>`;
        });
        feed.innerHTML = html;
    },

    // --- CHART JS ---
    initVendorChart() {
        const ctx = document.getElementById('vendorChart');
        if(!ctx) return;
        
        if(this.chartInstance) this.chartInstance.destroy();

        Chart.defaults.color = '#8b8f9e';
        Chart.defaults.font.family = "'Inter', sans-serif";

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['12 PM', '1 PM', '2 PM', '3 PM', '4 PM', 'Current', '+10m', '+20m'],
                datasets: [{
                    label: 'Sales Velocity (Items/hr)',
                    data: [120, 150, 180, 130, 210, 240, 260, 200],
                    borderColor: '#b026fa',
                    backgroundColor: 'rgba(176,38,250,0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00f0ff',
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    updateVendorChart(modifier) {
        if(!this.chartInstance) return;
        let d = this.chartInstance.data.datasets[0].data;
        // bump the prediction randomly based on queue modifier
        d[6] = 260 + (modifier * 5);
        d[7] = 200 + (modifier * 2);
        this.chartInstance.update('none');
    },
    
    // Calculate new route logic for attendee
    calculateRoute(type) {
        document.querySelectorAll('.routing-options .btn-pill').forEach(b => b.classList.remove('active'));
        
        let targetId = '';
        let msg = '';
        
        if (type === 'least') {
            targetId = 'btn-route-least';
            msg = 'Recalculating... Optimized for least crowded path.';
        } else if (type === 'fast') {
            targetId = 'btn-route-fast';
            msg = 'Recalculating... Optimized for fastest absolute travel time.';
        } else if (type === 'safe') {
            targetId = 'btn-route-safe';
            msg = 'Recalculating... Filtering for well-lit, family friendly zones only.';
        }
        
        document.getElementById(targetId).classList.add('active');
        
        // Mock UI Update
        const overlay = document.querySelector('.ar-overlay-text');
        overlay.innerHTML = `Calculating... <span style="color:yellow">Hold device steady.</span>`;
        
        setTimeout(() => {
            overlay.innerHTML = `Navigating to Objective <br><span class="text-sm route-status" style="color:var(--c-neon-green)">${msg}</span>`;
            // Simple visual toast fallback
        }, 800);
    },

    // Deploy Promo Logic for Vendor
    deployPromo() {
        const btn = document.getElementById('btn-deploy-promo');
        btn.disabled = true;
        btn.textContent = 'Deploying AI Target Mode...';
        btn.style.opacity = '0.5';

        setTimeout(() => {
            btn.textContent = 'Active: 452 Nearest Fans Notified!';
            btn.style.background = 'var(--c-neon-green)';
            btn.style.opacity = '1';
        }, 1500);
    },

    // --- EDGE CASE TRIGGERS ---
    triggerZoneClosure(zId) {
        fetch(`${API_BASE}/trigger-zone-closure/${zId}`, { method: 'POST' });
    },
    triggerEmergency() {
        fetch(`${API_BASE}/trigger-emergency`, { method: 'POST' });
    },
    triggerSurge(zId) {
        fetch(`${API_BASE}/trigger-surge/${zId}`, { method: 'POST' });
    },
    triggerVendorOverload(vId) {
        fetch(`${API_BASE}/trigger-vendor-overload/${vId}`, { method: 'POST' });
    },
    triggerSensorFailure() {
        fetch(`${API_BASE}/trigger-sensor-failure`, { method: 'POST' });
    },
    resolveEvents() {
        fetch(`${API_BASE}/reset`, { method: 'POST' }).then(() => {
            alert('Simulation state entirely reset to baseline.');
            this.pollData(); // Force immediate refresh
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
