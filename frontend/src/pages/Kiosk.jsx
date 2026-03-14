import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { kioskScan, getAllAttendance } from '../api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Fuel, Camera, CircleUserRound, Search, Clock, LogOut, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Kiosk() {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [scannedId, setScannedId] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [recentLogs, setRecentLogs] = useState([]);
    const [manualId, setManualId] = useState('');
    const scannerRef = useRef(null);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load recent activity
    const loadRecent = async () => {
        try {
            const res = await getAllAttendance();
            const today = new Date().toLocaleDateString('en-CA');
            const todaysRecords = res.data.filter(r => r.date === today);

            // Format for recent activity log
            const logs = [];
            todaysRecords.forEach(r => {
                if (r.check_in) logs.push({ id: r.id + '_in', user: r.user_name, time: r.check_in, type: 'check_in' });
                if (r.check_out) logs.push({ id: r.id + '_out', user: r.user_name, time: r.check_out, type: 'check_out' });
            });
            // Sort by time descending
            logs.sort((a, b) => new Date(b.time) - new Date(a.time));
            setRecentLogs(logs.slice(0, 10)); // keep top 10 recent
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadRecent();
    }, []);

    // Scanner logic
    useEffect(() => {
        if (!isScanning) return;

        const scanner = new Html5QrcodeScanner("reader", {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1.0
        }, false);

        scannerRef.current = scanner;

        const onScanSuccess = async (decodedText) => {
            scanner.pause(true); // pause to prevent multiple scans

            // Assuming the QR code just contains the Staff ID (number string)
            const staffIdStr = decodedText.trim();
            const staffId = parseInt(staffIdStr, 10);

            if (isNaN(staffId)) {
                toast.error("Invalid QR Code Format.");
                setTimeout(() => scanner.resume(), 2000);
                return;
            }

            toast.loading("Processing...", { id: 'kiosk_scan' });
            try {
                const res = await kioskScan({ staff_id: staffId });
                toast.success(res.data.message || `Check-in/out successful!`, { id: 'kiosk_scan' });
                setScannedId('');
                loadRecent();
            } catch (err) {
                toast.error(err.response?.data?.detail || "Scan failed", { id: 'kiosk_scan' });
            }

            // Add a small delay before allowing next scan
            setTimeout(() => scanner.resume(), 3000);
        };

        scanner.render(onScanSuccess, (err) => {
            // Silent ignore generic scan errors (frame no QR etc)
        });

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(e => console.error(e));
                scannerRef.current = null;
            }
        };
    }, [isScanning]);

    // Manual Entry
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        const staffId = parseInt(manualId, 10);
        if (isNaN(staffId)) return toast.error("Enter a valid numeric Staff ID");

        const loadingId = toast.loading("Processing...");
        try {
            const res = await kioskScan({ staff_id: staffId });
            toast.success(res.data.message || `Check-in/out successful!`, { id: loadingId });
            setManualId('');
            loadRecent();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Manual entry failed", { id: loadingId });
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1>Scanner Kiosk</h1>
                    <p className="subtitle">Manager Attendance Terminal</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 350px', gap: 24, paddingBottom: 40 }}>

                {/* Left side - Scanner Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Time display Card */}
                    <div className="card" style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #1e1b4b 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontWeight: 500 }}>
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-2px', lineHeight: 1 }}>
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: 600 }}>
                            {currentTime.toLocaleTimeString('en-US', { second: '2-digit' })}
                        </div>
                    </div>

                    {/* Camera Scanner Card */}
                    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Camera size={20} className="text-primary" /> Camera Scanner
                            </h2>
                            <button
                                className={`btn ${isScanning ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => setIsScanning(!isScanning)}
                            >
                                {isScanning ? 'Stop Camera' : 'Start Camera'}
                            </button>
                        </div>

                        <div style={{
                            flex: 1,
                            minHeight: 300,
                            background: 'var(--bg-elevated)',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px dashed var(--border-color)',
                            overflow: 'hidden'
                        }}>
                            {!isScanning ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Camera size={48} style={{ opacity: 0.5, margin: '0 auto 12px auto' }} />
                                    <p>Click "Start Camera" to scan Staff ID QR codes</p>
                                </div>
                            ) : (
                                <div id="reader" style={{ width: '100%', height: '100%' }}></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right side - Manual & Logs Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Manual Entry Form */}
                    <div className="card">
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CircleUserRound size={20} className="text-secondary" /> Manual Entry
                        </h2>
                        <form onSubmit={handleManualSubmit}>
                            <div className="form-group mb-4">
                                <label>Staff ID Number</label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="E.g. 1"
                                        value={manualId}
                                        onChange={e => setManualId(e.target.value)}
                                        style={{ paddingLeft: 40 }}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                                Process Check-In / Out
                            </button>
                        </form>
                    </div>

                    {/* Recent Activity Mini-log */}
                    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={20} className="text-info" /> Recent Scans
                            </h2>
                            <button onClick={loadRecent} className="btn" style={{ padding: '4px 8px', fontSize: 12, background: 'var(--bg-elevated)' }}>
                                Refresh
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 350 }}>
                            {recentLogs.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, fontSize: 14 }}>No recent activity today.</p>
                            ) : (
                                recentLogs.map((log) => (
                                    <div key={log.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: 12,
                                        background: 'var(--bg-elevated)',
                                        borderRadius: 8,
                                        borderLeft: `4px solid ${log.type === 'check_in' ? 'var(--success)' : 'var(--danger)'}`
                                    }}>
                                        <div style={{
                                            width: 32, height: 32,
                                            borderRadius: '50%',
                                            background: log.type === 'check_in' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: log.type === 'check_in' ? 'var(--success)' : 'var(--danger)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {log.type === 'check_in' ? <CheckCircle size={16} /> : <LogOut size={16} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{log.user}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {log.type === 'check_in' ? 'Checked in' : 'Checked out'} at {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
