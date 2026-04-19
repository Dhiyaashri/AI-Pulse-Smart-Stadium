/**
 * AI-Pulse Smart Stadium
 * Global Logic Controller
 */

const app = {
    currentRole: 'landing',
    chartInstance: null,

    simulation: {
        zones: {
            'Z-1': { name: 'North Gate', density: 30, status: 'open' },
            'Z-2': { name: 'VIP Lounge', density: 40, status: 'open' },
            'Z-3': { name: 'Food Court A', density: 80, status: 'open' },
            'Z-4': { name: 'West Wing', density: 20, status: 'open' },
            'Z-5': { name: 'Center Pitch', density: 10, status: 'open' },
            'Z-6': { name: 'East Wing', density: 60, status: 'open' },
            'Z-7': { name: 'Main Concourse', density: 50, status: 'open' },
            'Z-8': { name: 'South Gate', density: 20, status: 'open' },
            'Z-9': { name: 'Merch Stand', density: 90, status: 'open' },
        },
        alerts: [],
        alertLimit: 15,
        sensorFailureMode: false,
        emergencyMode: false
    },

    init() {
        this.switchRole('landing');
        this.startSimulation();
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
            if(role === 'vendor') {
                this.initVendorChart();
                this.updateVendorUI();
            }
        }
    },

    // --- FRONTEND SIMULATION ENGINE ---
    startSimulation() {
        this.renderSimulatedHeatmap('ops-stadium-map');
        this.renderSimulatedHeatmap('attendee-mini-map');
        this.renderVendorRecommendations();
        this.addAlert('System initialized. Monitoring actively.', 'info');
        
        // Heatmap loop
        setInterval(() => {
            if (!this.simulation.emergencyMode && !this.simulation.sensorFailureMode) {
                this.updateHeatmapDensities();
            }
            this.renderSimulatedHeatmap('ops-stadium-map');
            this.renderSimulatedHeatmap('attendee-mini-map');
            this.renderVendorRecommendations(); // Keep attendee UI feeling live
        }, 2500);

        // Alert loop
        setInterval(() => {
            if (!this.simulation.emergencyMode && !this.simulation.sensorFailureMode) {
                this.generateRandomAlert();
            }
        }, 4000);
    },

    updateHeatmapDensities() {
        for (let key in this.simulation.zones) {
            let z = this.simulation.zones[key];
            if (z.status === 'closed') continue;
            // Random fluctuation -15 to +15
            let change = Math.floor(Math.random() * 31) - 15;
            z.density += change;
            if (z.density < 5) z.density = 5;
            if (z.density > 100) z.density = 100;
        }
    },

    generateRandomAlert() {
        let highZones = [];
        for (let key in this.simulation.zones) {
            if (this.simulation.zones[key].status !== 'closed' && this.simulation.zones[key].density > 85) {
                highZones.push(this.simulation.zones[key].name);
            }
        }

        const randomEvents = [
            `Routine AI scan active at Gate 2`,
            `Restroom maintenance requested near West Wing`,
            `Ambient crowd sentiment optimal at 88%`
        ];

        if (highZones.length > 0) {
            let zName = highZones[Math.floor(Math.random() * highZones.length)];
            this.addAlert(`High crowd volume detected in ${zName}!`, 'warning');
        } else if (Math.random() > 0.7) {
            this.addAlert(`Queue exceeded threshold at Gate 3`, 'warning');
        } else {
            this.addAlert(randomEvents[Math.floor(Math.random() * randomEvents.length)], 'info');
        }
    },

    addAlert(msg, type) {
        let alerts = this.simulation.alerts;
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
        
        // Push new alert to top
        alerts.unshift({ time: timeStr, msg: msg, type: type });
        
        if (alerts.length > this.simulation.alertLimit) {
            alerts.pop();
        }
        this.renderSimulatedAlerts();
    },

    renderSimulatedAlerts() {
        const feed = document.getElementById('ops-alert-feed');
        if(!feed) return;
        let html = '';
        this.simulation.alerts.forEach(a => {
            let classType = '';
            if (a.type === 'critical') classType = 'type-emergency';
            else if (a.type === 'warning') classType = 'type-operation';
            else classType = 'type-vendor'; // mapping green to info

            html += `<div class="alert-item ${classType}">
                <span class="text-xs text-muted" style="color:#aaa">[${a.time}]</span><br>
                ${a.msg}
            </div>`;
        });
        feed.innerHTML = html;
        feed.scrollTop = 0; // Maintain scroll position at the top
    },

    renderSimulatedHeatmap(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '';
        for (const [id, z] of Object.entries(this.simulation.zones)) {
            let density = z.density / 100;
            let bgColor = `rgba(0, 255, 102, 0.2)`; 
            let shadow = `none`;
            let icon = '';
            let riskLevel = 'Low';
            let tooltipClass = 'text-green';
            let blinkClass = '';

            if(z.status === 'closed') {
                bgColor = `rgba(50, 50, 50, 0.8)`; 
                shadow = `inset 0 0 20px rgba(0,0,0,1)`;
                icon = '🚫';
                riskLevel = 'Closed';
                tooltipClass = 'text-muted';
            } else if (this.simulation.sensorFailureMode && id === 'Z-4') { 
                bgColor = `rgba(128, 128, 128, 0.5)`;
                icon = '📴';
                riskLevel = 'Unknown (Sensor Drop)';
                tooltipClass = 'text-muted';
                blinkClass = 'sensor-blink';
            } else if (this.simulation.emergencyMode && (id === 'Z-1' || id === 'Z-8' || id === 'Z-6')) {
                bgColor = `rgba(0, 255, 102, 0.6)`;
                shadow = `0 0 20px rgba(0,255,102,0.8)`;
                icon = '🏃';
                riskLevel = 'Evacuation Route';
            } else if (this.simulation.emergencyMode) {
                bgColor = `rgba(255, 51, 102, 0.4)`;
                icon = '🚨';
                riskLevel = 'Critical';
                tooltipClass = 'text-red';
            } else if (density > 0.85) {
                bgColor = `rgba(255, 51, 102, 0.6)`; 
                shadow = `0 0 20px rgba(255,51,102,0.8)`;
                icon = '🔥';
                riskLevel = 'High Risk';
                tooltipClass = 'text-red';
            } else if (density > 0.5) {
                bgColor = `rgba(255, 204, 0, 0.4)`; 
                riskLevel = 'Moderate';
                tooltipClass = 'text-warning'; 
            }

            html += `
                <div class="stadium-node ${blinkClass}" style="background: ${bgColor}; box-shadow: ${shadow}; transition: background 1s ease;">
                    <div class="node-status-icon">${icon}</div>
                    <div class="node-val">${z.status === 'closed' ? 'CLOSED' : z.density + '%'}</div>
                    <div class="node-name">${z.name}</div>
                    
                    <div class="tooltip">
                        <strong>${id}: ${z.name}</strong><br>
                        Crowd: ${z.status === 'closed' ? '0' : z.density}%<br>
                        Risk: <span class="${tooltipClass}" style="color: ${tooltipClass === 'text-warning' ? 'orange' : ''}">${riskLevel}</span>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        
        if(containerId === 'attendee-mini-map' && this.simulation.zones['Z-7'].status === 'closed') {
            document.querySelector('.ar-overlay-text').innerHTML = `Navigating to Z-6 (West) <br><span style="color:var(--c-neon-red)" class="text-sm route-status">⚠️ Z-7 Closed. Recalculating route...</span>`;
        } else if (containerId === 'attendee-mini-map') {
            document.querySelector('.ar-overlay-text').innerHTML = `Navigating to Z-7 (Main Concourse) <br><span class="text-sm route-status">Optimized for least crowded path.</span>`;
        }
    },

    renderVendorRecommendations() {
        // Randomize wait times slightly to feel live
        const vendors = [
            { name: 'Burger Point', location: 'Gate 2', queue_time_min: Math.floor(Math.random() * 5) + 3 },
            { name: 'Pizza Hub', location: 'Level 1', queue_time_min: Math.floor(Math.random() * 8) + 5 },
            { name: 'Beverage Stop', location: 'Section B', queue_time_min: Math.floor(Math.random() * 12) + 2 }
        ];

        let attendeeHTML = '';
        vendors.forEach(v => {
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
        });
        const container = document.getElementById('attendee-vendor-list');
        if (container) container.innerHTML = attendeeHTML;
    },

    updateVendorUI(overload = false) {
        if (overload) {
            document.getElementById('vendor-demand-state').textContent = 'CRITICAL OVERLOAD';
            document.getElementById('vendor-demand-state').style.color = 'var(--c-neon-red)';
            document.getElementById('vendor-inv-warning').style.display = 'block';
            document.getElementById('vendor-inv-index').textContent = '12%';
            document.getElementById('vendor-queue-time').textContent = '18m';
        } else {
            document.getElementById('vendor-demand-state').textContent = 'Stable';
            document.getElementById('vendor-demand-state').style.color = 'var(--c-neon-purple)';
            document.getElementById('vendor-inv-warning').style.display = 'none';
            document.getElementById('vendor-inv-index').textContent = '85%';
            document.getElementById('vendor-queue-time').textContent = '5m';
        }
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
            msg = 'Recalculating... Optimized for fastest travel time.';
        } else if (type === 'safe') {
            targetId = 'btn-route-safe';
            msg = 'Recalculating... Filtering for well-lit, family friendly zones only.';
        }
        
        document.getElementById(targetId).classList.add('active');
        
        const overlay = document.querySelector('.ar-overlay-text');
        overlay.innerHTML = `Calculating... <span style="color:yellow">Hold device steady.</span>`;
        
        setTimeout(() => {
            overlay.innerHTML = `Navigating to Objective <br><span class="text-sm route-status" style="color:var(--c-neon-green)">${msg}</span>`;
        }, 800);
    },

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
        if (this.simulation.zones[zId]) {
            this.simulation.zones[zId].status = 'closed';
            this.simulation.zones[zId].density = 0;
            this.addAlert(`Zone ${zId} closed for maintenance.`, 'warning');
            this.renderSimulatedHeatmap('ops-stadium-map');
            this.renderSimulatedHeatmap('attendee-mini-map');
        }
    },
    triggerEmergency() {
        this.simulation.emergencyMode = true;
        this.addAlert('🚨 EMERGENCY EVACUATION STARTED!', 'critical');
        document.getElementById('ops-network-status').textContent = 'EMERGENCY OVERRIDE';
        document.getElementById('ops-network-status').className = 'val text-red';
        document.getElementById('ops-evac-time').textContent = 'EVACUATING...';
        this.renderSimulatedHeatmap('ops-stadium-map');
        this.renderSimulatedHeatmap('attendee-mini-map');
    },
    triggerSurge(zId) {
        if (this.simulation.zones[zId]) {
            this.simulation.zones[zId].density = 98;
            this.addAlert(`📈 Crowd surge detected in ${this.simulation.zones[zId].name}!`, 'critical');
            this.renderSimulatedHeatmap('ops-stadium-map');
            this.renderSimulatedHeatmap('attendee-mini-map');
        }
    },
    triggerVendorOverload(vId) {
        this.addAlert(`Vendor overload reported at ${vId}! Delay expected.`, 'critical');
        this.updateVendorUI(true);
        if(this.chartInstance && this.currentRole === 'vendor') {
            this.updateVendorChart(10);
        }
    },
    triggerSensorFailure() {
        this.simulation.sensorFailureMode = true;
        this.addAlert(`📴 Sensor dropout array Z-4. Recalibrating...`, 'warning');
        this.renderSimulatedHeatmap('ops-stadium-map');
        this.renderSimulatedHeatmap('attendee-mini-map');
    },
    resolveEvents() {
        this.simulation.emergencyMode = false;
        this.simulation.sensorFailureMode = false;
        for (let key in this.simulation.zones) {
            this.simulation.zones[key].status = 'open';
            this.simulation.zones[key].density = Math.floor(Math.random() * 50) + 10;
        }
        document.getElementById('ops-network-status').textContent = 'Online';
        document.getElementById('ops-network-status').className = 'val pulse-text-green';
        document.getElementById('ops-evac-time').textContent = '3.2 Min';
        
        this.updateVendorUI(false);
        if(this.chartInstance && this.currentRole === 'vendor') {
            this.updateVendorChart(0);
        }

        this.addAlert(`✅ All systems resolved. Returning to baseline.`, 'info');
        this.renderSimulatedHeatmap('ops-stadium-map');
        this.renderSimulatedHeatmap('attendee-mini-map');
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
