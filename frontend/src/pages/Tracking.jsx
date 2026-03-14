import { useEffect, useState, useRef } from 'react';
import { getLiveLocations, getLocationHistory, updateLocation } from '../api';
import { useAuth } from '../context/AuthContext';
import { MapPin, RefreshCw, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
// Petrol pump center coordinates
const PUMP_LAT = 28.6139;
const PUMP_LNG = 77.2090;
const GEOFENCE_KM = 0.5;





export default function Tracking() {
    const { isManager } = useAuth();
    const [liveData, setLiveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [appConfig, setAppConfig] = useState({ pump_lat: 28.6139, pump_lng: 77.2090, geofence_radius: 200 });
    const watchRef = useRef(null);
    const prevDataRef = useRef([]);

    const load = async () => {
        if (!isManager) return;
        try {
            // Get Global Config
            const { getSettings } = await import('../api');
            const conf = await getSettings();
            setAppConfig(conf.data);

            const r = await getLiveLocations();
            const newData = r.data || [];

            // ALERT LOGIC: Compare new data with previous polling data
            if (prevDataRef.current.length > 0) {
                newData.forEach(worker => {
                    const previousState = prevDataRef.current.find(p => p.user_id === worker.user_id);
                    // If they just transitioned from In Zone (true) to Out of Zone (false)
                    if (previousState && previousState.is_in_zone === true && worker.is_in_zone === false) {
                        toast.error(`🚨 ALERT: ${worker.user_name} has left the petrol pump zone!`, {
                            duration: 8000,
                            icon: '🏃‍♂️',
                            style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
                        });
                    }
                });
            }

            prevDataRef.current = newData;
            setLiveData(newData);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        load();
        const interval = isManager ? setInterval(load, 15000) : null; // Poll faster (15s) for tighter alerts
        return () => { if (interval) clearInterval(interval); };
    }, [isManager]);

    const startSharing = () => {
        if (!navigator.geolocation) { toast.error('GPS not supported'); return; }
        setSharing(true);
        toast.success('📍 Location sharing started');
        watchRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
                try {
                    const result = await updateLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    });
                    if (result.data.alert) {
                        toast.error('⚠️ You have left the petrol pump zone!', { duration: 5000, id: 'geofence-alert' });
                    }
                } catch { }
            },
            (err) => { toast.error('GPS error: ' + err.message); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const stopSharing = () => {
        if (watchRef.current) {
            navigator.geolocation.clearWatch(watchRef.current);
            watchRef.current = null;
        }
        setSharing(false);
        toast('Location sharing stopped');
    };

    const inZone = liveData.filter(d => d.lat && d.is_in_zone).length;
    const outZone = liveData.filter(d => d.lat && !d.is_in_zone).length;
    const noData = liveData.filter(d => !d.lat).length;

    if (!isManager) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <h1>Location Sharing</h1>
                    <p className="subtitle">Share your GPS location during your shift</p>
                </div>
                <div className="page-container">
                    <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>📍</div>
                        <h2 style={{ marginBottom: 8 }}>GPS Location Sharing</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                            Share your real-time location with your manager during shift hours. You'll get an alert if you leave the petrol pump zone.
                        </p>
                        {!sharing ? (
                            <button className="btn btn-primary btn-lg" onClick={startSharing} style={{ width: '100%' }}>
                                <Navigation size={18} /> Start Sharing Location
                            </button>
                        ) : (
                            <div>
                                <div className="alert alert-success" style={{ marginBottom: 16 }}>
                                    <span style={{ animation: 'pulse 1s ease infinite', display: 'inline-block', marginRight: 8 }}>🟢</span>
                                    Location sharing is active
                                </div>
                                <button className="btn btn-danger btn-lg" onClick={stopSharing} style={{ width: '100%' }}>
                                    Stop Sharing
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>Worker Tracking</h1>
                    <p className="subtitle">Real-time GPS monitoring — updates every 30 seconds</p>
                </div>
                <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>
            </div>

            <div className="page-container">
                <div className="stats-grid mb-4">
                    <div className="stat-card" style={{ '--accent-color': '#22c55e', '--icon-bg': 'rgba(34,197,94,0.1)' }}>
                        <div className="stat-value">{inZone}</div>
                        <div className="stat-label">✅ In Zone</div>
                    </div>
                    <div className="stat-card" style={{ '--accent-color': '#ef4444', '--icon-bg': 'rgba(239,68,68,0.1)' }}>
                        <div className="stat-value">{outZone}</div>
                        <div className="stat-label">🚨 Out of Zone</div>
                    </div>
                    <div className="stat-card" style={{ '--accent-color': '#64748b', '--icon-bg': 'rgba(100,116,139,0.1)' }}>
                        <div className="stat-value">{noData}</div>
                        <div className="stat-label">📵 No Signal</div>
                    </div>
                    <div className="stat-card" style={{ '--accent-color': '#3b82f6', '--icon-bg': 'rgba(59,130,246,0.1)' }}>
                        <div className="stat-value">{liveData.length}</div>
                        <div className="stat-label">👥 Total Staff</div>
                    </div>
                </div>

                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <div className="grid-2 gap-4">
                        <div style={{ height: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <MapContainer
                                center={[appConfig.pump_lat, appConfig.pump_lng]}
                                zoom={17}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; <a href="https://carto.com/">Carto</a>'
                                />

                                {/* Petrol Pump Center */}
                                <Marker position={[appConfig.pump_lat, appConfig.pump_lng]}>
                                    <Popup><strong>⛽ Petrol Pump HQ</strong></Popup>
                                </Marker>

                                {/* Geofence Radius Area */}
                                <Circle
                                    center={[appConfig.pump_lat, appConfig.pump_lng]}
                                    radius={appConfig.geofence_radius}
                                    pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.1 }}
                                />

                                {/* Staff Makers */}
                                {liveData.filter(d => d.lat !== null && d.lng !== null).map(worker => (
                                    <Marker
                                        key={worker.user_id}
                                        position={[worker.lat, worker.lng]}
                                        icon={worker.is_in_zone ? greenIcon : redIcon}
                                    >
                                        <Popup>
                                            <div style={{ textAlign: 'center' }}>
                                                <strong>{worker.user_name}</strong><br />
                                                {worker.shift} shift<br />
                                                Last seen: {new Date(worker.timestamp).toLocaleTimeString()}
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                            {outZone > 0 && (
                                <div className="alert alert-danger">
                                    <span>🚨</span> {outZone} staff member(s) are out of the pump zone!
                                </div>
                            )}
                            {liveData.map(d => (
                                <div key={d.user_id} className="card" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div className="avatar" style={{ background: d.is_in_zone === true ? 'rgba(34,197,94,0.2)' : d.is_in_zone === false ? 'rgba(239,68,68,0.2)' : 'var(--bg-elevated)', color: d.is_in_zone === true ? '#22c55e' : d.is_in_zone === false ? '#ef4444' : 'var(--text-muted)', border: `2px solid ${d.is_in_zone === true ? '#22c55e' : d.is_in_zone === false ? '#ef4444' : 'var(--border)'}`, fontSize: 13 }}>
                                        {d.user_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.user_name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {d.shift} shift &nbsp;•&nbsp;
                                            {d.lat ? (
                                                <span style={{ color: d.is_in_zone ? '#22c55e' : '#ef4444' }}>
                                                    {d.is_in_zone ? '✅ In Zone' : '🚨 Out of Zone'}
                                                </span>
                                            ) : '📵 No location data'}
                                        </div>
                                        {d.lat && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {d.lat.toFixed(5)}, {d.lng.toFixed(5)} &nbsp;•&nbsp;
                                            {/* Distance omitted for space, easily visible on map popup now */}
                                        </div>}
                                        {d.timestamp && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated: {new Date(d.timestamp).toLocaleTimeString()}</div>}
                                    </div>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.lat ? (d.is_in_zone ? '#22c55e' : '#ef4444') : '#64748b', boxShadow: d.lat && !d.is_in_zone ? '0 0 8px #ef4444' : 'none' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
