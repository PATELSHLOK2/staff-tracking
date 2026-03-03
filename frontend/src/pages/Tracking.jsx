import { useEffect, useState, useRef } from 'react';
import { getLiveLocations, getLocationHistory, updateLocation } from '../api';
import { useAuth } from '../context/AuthContext';
import { MapPin, RefreshCw, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

// Petrol pump center coordinates
const PUMP_LAT = 28.6139;
const PUMP_LNG = 77.2090;
const GEOFENCE_KM = 0.5;

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapPlaceholder({ liveData }) {
    // SVG-based mini map visualization (no external map API needed)
    const w = 600, h = 400;
    const cx = w / 2, cy = h / 2;
    const scale = 8000; // pixels per degree

    const toXY = (lat, lng) => ({
        x: cx + (lng - PUMP_LNG) * scale,
        y: cy - (lat - PUMP_LAT) * scale,
    });

    const pumpXY = toXY(PUMP_LAT, PUMP_LNG);
    const geofenceR = GEOFENCE_KM * scale / 111;

    return (
        <div style={{ background: '#0f172a', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ minHeight: 340 }}>
                {/* Background grid */}
                {Array.from({ length: 12 }, (_, i) => (
                    <line key={`hg${i}`} x1={0} y1={i * h / 11} x2={w} y2={i * h / 11} stroke="rgba(148,163,184,0.06)" strokeWidth={1} />
                ))}
                {Array.from({ length: 16 }, (_, i) => (
                    <line key={`vg${i}`} x1={i * w / 15} y1={0} x2={i * w / 15} y2={h} stroke="rgba(148,163,184,0.06)" strokeWidth={1} />
                ))}

                {/* Geofence ring */}
                <circle cx={pumpXY.x} cy={pumpXY.y} r={geofenceR} fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.4)" strokeWidth={2} strokeDasharray="6 4" />
                <circle cx={pumpXY.x} cy={pumpXY.y} r={geofenceR * 0.7} fill="rgba(245,158,11,0.03)" stroke="rgba(245,158,11,0.1)" strokeWidth={1} />

                {/* Pump location */}
                <circle cx={pumpXY.x} cy={pumpXY.y} r={16} fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth={2} />
                <text x={pumpXY.x} y={pumpXY.y + 5} textAnchor="middle" fontSize={14} fill="#f59e0b">⛽</text>
                <text x={pumpXY.x} y={pumpXY.y + 26} textAnchor="middle" fontSize={10} fill="#f59e0b" fontWeight="600">Petrol Pump</text>

                {/* Staff markers */}
                {liveData.filter(d => d.lat && d.lng).map((d, i) => {
                    const pos = toXY(d.lat, d.lng);
                    const color = d.is_in_zone ? '#22c55e' : '#ef4444';
                    return (
                        <g key={d.user_id}>
                            <circle cx={pos.x} cy={pos.y} r={10} fill={`${color}30`} stroke={color} strokeWidth={2} />
                            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={10} fill={color}>👤</text>
                            <text x={pos.x} y={pos.y + 22} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">
                                {d.user_name?.split(' ')[0]}
                            </text>
                        </g>
                    );
                })}

                {/* Geofence label */}
                <text x={pumpXY.x + geofenceR - 4} y={pumpXY.y - 6} fontSize={9} fill="rgba(245,158,11,0.6)">{GEOFENCE_KM}km zone</text>
            </svg>

            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                📍 Center: {PUMP_LAT.toFixed(4)}, {PUMP_LNG.toFixed(4)}
            </div>
        </div>
    );
}

export default function Tracking() {
    const { isManager, user } = useAuth();
    const [liveData, setLiveData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const watchRef = useRef(null);

    const load = async () => {
        if (!isManager) return;
        try {
            const r = await getLiveLocations();
            setLiveData(r.data || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        load();
        const interval = isManager ? setInterval(load, 30000) : null;
        return () => { if (interval) clearInterval(interval); };
    }, []);

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
                    <div className="stat-card" style={{ '--accent-color': '#f59e0b', '--icon-bg': 'rgba(245,158,11,0.1)' }}>
                        <div className="stat-value">{liveData.length}</div>
                        <div className="stat-label">👥 Total Staff</div>
                    </div>
                </div>

                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <div className="grid-2 gap-4">
                        <div>
                            <MapPlaceholder liveData={liveData} />
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                                🟡 = Geofence zone &nbsp; 🟢 = In zone &nbsp; 🔴 = Out of zone
                            </p>
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
                                            {haversine(d.lat, d.lng, PUMP_LAT, PUMP_LNG).toFixed(3)}km from pump
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
