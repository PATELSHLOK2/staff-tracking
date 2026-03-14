import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkIn, checkOut, getTodayAttendance, getAllAttendance, getMyHistory, getSettings } from '../api';
import { Clock, MapPin, CheckCircle, LogOut, Camera, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
    const map = { present: 'badge-success', late: 'badge-warning', absent: 'badge-danger', half_day: 'badge-info' };
    return <span className={`badge ${map[status] || 'badge-muted'}`}>{status?.replace('_', ' ') || '—'}</span>;
}

export default function Attendance() {
    const { user, isManager } = useAuth();
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
    const [todayRecord, setTodayRecord] = useState(null);
    const [allRecords, setAllRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('today');
    const [gpsStatus, setGpsStatus] = useState('');
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (!showScanner) return;

        let scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);

        const onScanSuccess = async (decodedText) => {
            scanner.clear();
            setShowScanner(false);

            if (!todayRecord?.check_in) {
                await handleCheckIn(decodedText);
            } else if (todayRecord?.check_in && !todayRecord?.check_out) {
                await handleCheckOut(decodedText);
            }
        };

        scanner.render(onScanSuccess, (err) => { });

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [showScanner, todayRecord]);

    const load = async () => {
        setLoading(true);
        try {
            // Load global app configuration first for the Geofence limits
            const configRes = await getSettings();
            setAppConfig(configRes.data);

            const r1 = await getTodayAttendance();
            if (isManager) {
                setAllRecords(Array.isArray(r1.data) ? r1.data : []);
            } else {
                setTodayRecord(r1.data);
                if (tab === 'history') {
                    const r2 = await getMyHistory();
                    setAllRecords(r2.data || []);
                }
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [tab]);

    const getGPS = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) return resolve({ lat: null, lng: null });
        setGpsStatus('📍 Getting location...');
        navigator.geolocation.getCurrentPosition(
            pos => { setGpsStatus(''); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
            () => { setGpsStatus(''); resolve({ lat: null, lng: null }); },
            { timeout: 5000 }
        );
    });

    const handleCheckIn = async (qrData) => {
        const { lat, lng } = await getGPS();
        if (lat && lng && appConfig) {
            const dist = getDistance(lat, lng, appConfig.pump_lat, appConfig.pump_lng);
            if (dist > appConfig.geofence_radius) {
                toast.error(`⚠️ OUT OF ZONE (${Math.round(dist)}m away from Pump)`);
                setGpsStatus(`⚠️ OUT OF ZONE (${Math.round(dist)}m away)`);
                return; // Block check-in
            } else {
                toast.success('✅ IN ZONE');
                setGpsStatus('✅ IN ZONE');
            }
        } else {
            toast.error('⚠️ Could not get accurate GPS location');
            return;
        }

        const notes = typeof qrData === 'string' && qrData ? `Scanned QR: ${qrData}` : "";
        try {
            const res = await checkIn({ lat, lng, notes });
            setTodayRecord(res.data);
            toast.success('✅ Checked in successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Check-in failed');
        }
    };

    const handleCheckOut = async (qrData) => {
        const { lat, lng } = await getGPS();
        if (lat && lng && appConfig) {
            const dist = getDistance(lat, lng, appConfig.pump_lat, appConfig.pump_lng);
            if (dist > appConfig.geofence_radius) {
                toast.error(`⚠️ OUT OF ZONE (${Math.round(dist)}m away from Pump)`);
                setGpsStatus(`⚠️ OUT OF ZONE (${Math.round(dist)}m away)`);
                return; // Block check-out
            } else {
                toast.success('✅ IN ZONE');
                setGpsStatus('✅ IN ZONE');
            }
        } else {
            toast.error('⚠️ Could not get accurate GPS location');
            return;
        }

        try {
            const res = await checkOut({ lat, lng });
            if (typeof qrData === 'string' && qrData) {
                toast.success(`👋 Scanned checkout QR.`);
            }
            setTodayRecord(res.data);
            toast.success('👋 Checked out successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Check-out failed');
        }
    };

    const hoursWorked = (r) => {
        if (!r?.check_in || !r?.check_out) return '—';
        const diff = (new Date(r.check_out) - new Date(r.check_in)) / 3600000;
        return `${Math.floor(diff)}h ${Math.round((diff % 1) * 60)}m`;
    };

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>{isManager ? 'Attendance Management' : 'My Attendance'}</h1>
                    <p className="subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            <div className="page-container">
                {isManager && (
                    <div className="alert alert-info" style={{ marginBottom: 20 }}>
                        <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={16} /> Configure Pump GPS Location
                        </h4>
                        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--info)' }}>
                            <li>Open Google Maps and search for your Petrol Pump.</li>
                            <li>Right-click the location (or long-press on mobile).</li>
                            <li>Click the coordinates (e.g. 28.6139, 77.2090) to copy them.</li>
                            <li>Open `frontend/src/pages/Attendance.jsx` and replace `PUMP_LOCATION` with those coordinates!</li>
                        </ol>
                    </div>
                )}
                {/* Staff Check-In Panel */}
                {!isManager && (
                    <div className="card mb-4" style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Today's Status</h2>
                                {todayRecord ? (
                                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status</div>
                                            <StatusBadge status={todayRecord.status} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Check In</div>
                                            <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                                                {todayRecord.check_in ? new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Check Out</div>
                                            <div style={{ fontWeight: 600, color: 'var(--danger)' }}>
                                                {todayRecord.check_out ? new Date(todayRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hours Worked</div>
                                            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{hoursWorked(todayRecord)}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>You haven't checked in today yet.</p>
                                )}
                                {gpsStatus && <p style={{ color: 'var(--info)', fontSize: 13, marginTop: 8 }}>{gpsStatus}</p>}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {(!todayRecord?.check_in || (!todayRecord?.check_out && todayRecord?.check_in)) && (
                                    <button className="btn btn-secondary" onClick={() => setShowScanner(true)} style={{ padding: '12px 24px', fontSize: 15 }}>
                                        <Camera size={18} /> Scan QR
                                    </button>
                                )}
                                {!todayRecord?.check_in && (
                                    <button className="btn btn-success" onClick={handleCheckIn} style={{ padding: '12px 24px', fontSize: 15 }}>
                                        <CheckCircle size={18} /> Check In
                                    </button>
                                )}
                                {todayRecord?.check_in && !todayRecord?.check_out && (
                                    <button className="btn btn-danger" onClick={handleCheckOut} style={{ padding: '12px 24px', fontSize: 15 }}>
                                        <LogOut size={18} /> Check Out
                                    </button>
                                )}
                                {todayRecord?.check_out && (
                                    <div className="alert alert-success" style={{ margin: 0 }}><CheckCircle size={16} /> Shift complete!</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="tabs">
                    {isManager ? (
                        <>
                            <button className={`tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
                            <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Records</button>
                        </>
                    ) : (
                        <>
                            <button className={`tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
                            <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>My History</button>
                        </>
                    )}
                </div>

                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    {isManager && <th>Staff Name</th>}
                                    <th>Date</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Hours</th>
                                    <th>Status</th>
                                    {isManager && <th>GPS</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(tab === 'today' && isManager ? allRecords : tab === 'today' && !isManager ? (todayRecord ? [todayRecord] : []) : allRecords).map((r, i) => (
                                    <tr key={r.id || i}>
                                        {isManager && <td style={{ fontWeight: 600 }}>{r.user_name}</td>}
                                        <td>{r.date}</td>
                                        <td style={{ color: 'var(--success)' }}>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                        <td style={{ color: 'var(--danger)' }}>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                        <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{hoursWorked(r)}</td>
                                        <td><StatusBadge status={r.status} /></td>
                                        {isManager && <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {r.check_in_lat ? <span><MapPin size={12} /> {r.check_in_lat?.toFixed(4)}, {r.check_in_lng?.toFixed(4)}</span> : '—'}
                                        </td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {allRecords.length === 0 && !todayRecord && <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No Records Found</h3></div>}
                    </div>
                )}
            </div>

            {showScanner && (
                <div className="modal-overlay" onClick={() => setShowScanner(false)}>
                    <div className="modal" style={{ maxWidth: 400, padding: 20 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Scan QR Code</h2>
                            <button className="modal-close" onClick={() => setShowScanner(false)}><X size={16} /></button>
                        </div>
                        <div id="reader" style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }}></div>
                        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
                            Point your camera at the station's QR code to mark your attendance.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
