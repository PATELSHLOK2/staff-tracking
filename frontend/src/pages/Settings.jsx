import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSettings, updateSettings } from '../api';
import toast from 'react-hot-toast';
import { MapPin, Settings as SettingsIcon, Save, CircleDot } from 'lucide-react';

export default function Settings() {
    const { isManager } = useAuth();
    const [settings, setSettings] = useState({ pump_name: "Petrol Pump Staff Management", pump_lat: 28.6139, pump_lng: 77.2090, geofence_radius: 200 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await getSettings();
            setSettings(res.data);
        } catch (err) {
            toast.error("Failed to load settings");
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                pump_name: settings.pump_name,
                pump_lat: parseFloat(settings.pump_lat),
                pump_lng: parseFloat(settings.pump_lng),
                geofence_radius: parseInt(settings.geofence_radius)
            };
            const res = await updateSettings(data);
            setSettings({
                pump_name: res.data.pump_name,
                pump_lat: res.data.pump_lat,
                pump_lng: res.data.pump_lng,
                geofence_radius: res.data.geofence_radius
            });
            toast.success("Settings saved successfully!");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to save settings");
        }
        setSaving(false);
    };

    if (!isManager) {
        return <div className="page-container"><p>Access Denied. Managers only.</p></div>;
    }

    if (loading) return <div className="loading-overlay"><div className="loading-spinner"></div></div>;

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1><SettingsIcon size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--primary)' }} />App Settings</h1>
                    <p className="subtitle">Configure global application parameters</p>
                </div>
            </div>

            <div className="page-container" style={{ maxWidth: 800 }}>
                <div className="card">
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={20} className="text-primary" /> GPS Geofence Configuration
                    </h2>

                    <div className="alert alert-info" style={{ marginBottom: 24, fontSize: 13 }}>
                        <strong>How to find your coordinates:</strong> Open Google Maps, find your Petrol Pump, and right-click (or long press) the map pin. Click the numbers string at the top of the menu (e.g. <code>28.6139, 77.2090</code>) to copy them.
                    </div>

                    <form onSubmit={handleSave}>
                        <div style={{ marginBottom: 20 }}>
                            <div className="form-group">
                                <label>Petrol Pump Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={settings.pump_name || ""}
                                    onChange={e => setSettings({ ...settings, pump_name: e.target.value })}
                                    required
                                    placeholder="Enter your petrol pump's name"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 20 }}>
                            <div className="form-group">
                                <label>Petrol Pump Latitude</label>
                                <input
                                    type="number"
                                    step="0.00000001"
                                    className="form-control"
                                    value={settings.pump_lat}
                                    onChange={e => setSettings({ ...settings, pump_lat: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Petrol Pump Longitude</label>
                                <input
                                    type="number"
                                    step="0.00000001"
                                    className="form-control"
                                    value={settings.pump_lng}
                                    onChange={e => setSettings({ ...settings, pump_lng: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 30, maxWidth: 300 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CircleDot size={16} /> Allowed Radius (Meters)
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="5000"
                                className="form-control"
                                value={settings.geofence_radius}
                                onChange={e => setSettings({ ...settings, geofence_radius: e.target.value })}
                                required
                            />
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                                How far away a staff member can be to successfully Check In. Recommended: 100-200.
                            </small>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
