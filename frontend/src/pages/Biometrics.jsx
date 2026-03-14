import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Fingerprint, ScanFace, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSettings } from '../api';

export default function Biometrics() {
    const { user, isManager } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [scanningStatus, setScanningStatus] = useState('idle'); // idle, scanning_finger, scanning_face, success, fail
    const [todayLogs, setTodayLogs] = useState([]);
    const [appConfig, setAppConfig] = useState(null);

    // Haversine formula to calculate distance in meters
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const p1 = lat1 * Math.PI / 180;
        const p2 = lat2 * Math.PI / 180;
        const dp = (lat2 - lat1) * Math.PI / 180;
        const dl = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const getGPS = () => new Promise((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: null, lng: null });
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: null, lng: null }),
            { timeout: 5000 }
        );
    });

    // Fetch config on mount
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await getSettings();
                setAppConfig(res.data);
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        loadConfig();
    }, []);

    // Simulate real-time clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Simulated Biometric Scan
    const handleScan = async (type) => {
        if (scanningStatus !== 'idle') return;

        // Perform GPS Check first
        toast.loading(`Verifying location...`, { id: 'scan_toast' });
        const { lat, lng } = await getGPS();
        
        if (lat && lng && appConfig) {
            const dist = getDistance(lat, lng, appConfig.pump_lat, appConfig.pump_lng);
            if (dist > appConfig.geofence_radius) {
                toast.error(`⚠️ OUT OF ZONE (${Math.round(dist)}m away from Pump)`, { id: 'scan_toast' });
                return; // Block scan if out of zone
            }
        } else {
            toast.error('⚠️ Could not get accurate GPS location', { id: 'scan_toast' });
            return;
        }

        setScanningStatus(`scanning_${type}`);
        toast.loading(`Scanning ${type === 'finger' ? 'Fingerprint' : 'Face'}...`, { id: 'scan_toast' });

        // Simulate a 3-second network/scan processing delay
        setTimeout(() => {
            // 85% chance of success for simulation
            const isSuccess = Math.random() > 0.15;

            if (isSuccess) {
                setScanningStatus('success');
                toast.success('Authentication Successful', { id: 'scan_toast' });

                // Add to today's mock log
                const newLog = {
                    id: Date.now(),
                    name: 'Test Employee (Local)',
                    time: new Date(),
                    method: type,
                    status: 'success'
                };
                setTodayLogs(prev => [newLog, ...prev]);
            } else {
                setScanningStatus('fail');
                toast.error('Authentication Failed. Please try again.', { id: 'scan_toast' });

                const newLog = {
                    id: Date.now(),
                    name: 'Unknown User',
                    time: new Date(),
                    method: type,
                    status: 'fail'
                };
                setTodayLogs(prev => [newLog, ...prev]);
            }

            // Reset back to idle after 2.5 seconds
            setTimeout(() => setScanningStatus('idle'), 2500);

        }, 3000);
    };

    // Device Mock Data
    const devices = [
        { id: 1, name: "Main Entrance", type: "Finger + Face", status: "online", uptime: 99.8, lastSync: "2 mins ago" },
        { id: 2, name: "Staff Room", type: "Fingerprint", status: "online", uptime: 98.5, lastSync: "5 mins ago" },
        { id: 3, name: "Back Gate", type: "Face Scan", status: "maintenance", uptime: 65.0, lastSync: "2 hrs ago" },
    ];

    return (
        <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1>Biometric Attendance</h1>
                    <p className="subtitle">Live Scanning & Device Management</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 350px', gap: 24, paddingBottom: 40, flex: 1 }}>

                {/* Left Column: Live Scanner & Devices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Live Scanner Widget */}
                    <div className="card" style={{ flexShrink: 0 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity className="text-primary" /> Live Scanner Simulator
                        </h2>

                        <div style={{
                            background: 'var(--bg-elevated)',
                            borderRadius: 12,
                            padding: 30,
                            border: '2px dashed var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Scanning Animation Overlay */}
                            {(scanningStatus.startsWith('scanning_')) && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(56, 189, 248, 0.05)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 10, backdropFilter: 'blur(2px)'
                                }}>
                                    <div className="loading-spinner" style={{ width: 40, height: 40, marginBottom: 16 }}></div>
                                    <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 16, animation: 'pulse 1.5s infinite' }}>
                                        {scanningStatus === 'scanning_finger' ? 'Scanning Fingerprint...' : 'Analyzing Facial Features...'}
                                    </div>
                                </div>
                            )}

                            {/* Result Overlay */}
                            {(scanningStatus === 'success' || scanningStatus === 'fail') && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: scanningStatus === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 10, backdropFilter: 'blur(2px)'
                                }}>
                                    {scanningStatus === 'success' ? (
                                        <>
                                            <CheckCircle size={56} className="text-success" style={{ marginBottom: 16 }} />
                                            <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>Identity Confirmed</div>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={56} className="text-danger" style={{ marginBottom: 16 }} />
                                            <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 18 }}>Match Failed</div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-1px', color: 'var(--text-color)', marginBottom: 8 }}>
                                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>

                            <div style={{ display: 'flex', gap: 20 }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '20px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 160 }}
                                    onClick={() => handleScan('finger')}
                                    disabled={scanningStatus !== 'idle'}
                                >
                                    <Fingerprint size={32} className="text-primary" />
                                    <span>Fingerprint</span>
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '20px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 160 }}
                                    onClick={() => handleScan('face')}
                                    disabled={scanningStatus !== 'idle'}
                                >
                                    <ScanFace size={32} className="text-info" />
                                    <span>Face Scan</span>
                                </button>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Right Column: Today's Log */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Today's Scans</h2>
                        <span className="badge badge-primary">{todayLogs.length} scans</span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {todayLogs.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40 }}>
                                <Fingerprint size={32} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
                                <p>No biometric scans yet today.</p>
                            </div>
                        ) : (
                            todayLogs.map(log => (
                                <div key={log.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    paddingBottom: 16, borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                        background: log.status === 'success' ? 'var(--success)' : 'var(--danger)',
                                        boxShadow: `0 0 8px ${log.status === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
                                    }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, fontSize: 14 }}>{log.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {log.method === 'finger' ? <Fingerprint size={12} /> : <ScanFace size={12} />}
                                            {log.method === 'finger' ? 'Fingerprint' : 'Face'} • {log.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                    </div>
                                    {log.status === 'success' ? (
                                        <CheckCircle size={16} className="text-success" />
                                    ) : (
                                        <XCircle size={16} className="text-danger" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
