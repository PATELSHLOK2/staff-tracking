import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    IndianRupee, TrendingUp, TrendingDown, Clock,
    FileText, Download, CheckCircle, AlertCircle, X, Printer, Activity, Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPayrollSummary, getSalarySheet, updateSalaryRecord, disburseSalaries } from '../api';

export default function Payroll() {
    const { isManager } = useAuth();
    const [activeTab, setActiveTab] = useState('sheet'); // sheet, deductions, history
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [editModalData, setEditModalData] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState('February 2026');
    const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, deductions: 0 });
    const [salaryData, setSalaryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const slipRef = useRef();

    useEffect(() => {
        if (!isManager) return;
        fetchData();
    }, [selectedMonth, isManager]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sumRes, sheetRes] = await Promise.all([
                getPayrollSummary(selectedMonth),
                getSalarySheet(selectedMonth)
            ]);
            setSummary(sumRes.data);
            setSalaryData(sheetRes.data);
        } catch (err) {
            toast.error("Failed to load payroll data");
        } finally {
            setLoading(false);
        }
    };

    if (!isManager) {
        return (
            <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <AlertCircle size={48} className="text-danger" style={{ marginBottom: 16 }} />
                <h2>Access Denied</h2>
                <p className="text-muted">Only managers can access the Payroll & Salary module.</p>
            </div>
        );
    }

    // Calculate percentages for progress bars
    const paidPercent = summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0;
    const pendingPercent = summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0;
    const deductionPercent = summary.total > 0 ? Math.round((summary.deductions / summary.total) * 100) : 0;

    const handlePrint = () => {
        window.print();
    };

    const handleGenerateSlip = (record) => {
        const netPay = record.basic + record.allowance + record.overtime - record.deductions;
        setSelectedSlip({ ...record, netPay });
    };

    const handleUpdateOt = async (recordId, field, value) => {
        const val = parseInt(value, 10);
        if (isNaN(val) || val < 0) return;

        try {
            await updateSalaryRecord(recordId, { [field]: val });
            fetchData(); // Silently refresh data to update calculated total
        } catch (err) {
            toast.error("Failed to update overtime");
        }
    };

    const handleDisburse = async () => {
        if (!window.confirm(`Are you sure you want to disburse all pending salaries for ${selectedMonth}?`)) return;

        try {
            toast.loading("Disbursing...", { id: "disburse" });
            const res = await disburseSalaries(selectedMonth);
            toast.success(res.data.message, { id: "disburse" });
            fetchData();
        } catch (err) {
            toast.error("Disbursement failed", { id: "disburse" });
        }
    };

    const handleEditSalary = (record) => {
        if (record.status === "Paid") {
            toast.error("Cannot edit a paid salary record.");
            return;
        }

        setEditModalData({
            ...record,
            editBasic: record.basic,
            editAllowances: record.allowance,
            editOtRate: record.overtime_rate || 100,
            editDeductions: record.deductions
        });
    };

    const saveEditModal = async () => {
        if (!editModalData) return;
        try {
            toast.loading("Updating record...", { id: "update" });
            const payload = {
                basic_pay: parseInt(editModalData.editBasic, 10) || 0,
                allowances: parseInt(editModalData.editAllowances, 10) || 0,
                overtime_rate: parseInt(editModalData.editOtRate, 10) || 0,
                deductions: parseInt(editModalData.editDeductions, 10) || 0
            };
            await updateSalaryRecord(editModalData.id, payload);
            toast.success("Updated successfully!", { id: "update" });
            setEditModalData(null);
            fetchData();
        } catch (err) {
            toast.error("Update failed", { id: "update" });
        }
    };

    return (
        <div className="page-enter employee-payroll-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24, flexShrink: 0 }}>
                <div>
                    <h1>Payroll & Salary</h1>
                    <p className="subtitle">Manage staff compensation and generate salary slips</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <select
                        className="form-control"
                        style={{ width: 180 }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option>March 2026</option>
                        <option>February 2026</option>
                        <option>January 2026</option>
                        <option>December 2025</option>
                    </select>
                    <button className="btn btn-primary" onClick={handleDisburse} disabled={summary.pending === 0}>
                        <IndianRupee size={18} /> Disburse Pending
                    </button>
                </div>
            </div>

            {/* 4 Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24, flexShrink: 0 }}>
                {/* Total Payroll */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Payroll</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-color)', marginTop: 4 }}>
                                ₹{summary.total.toLocaleString()}
                            </div>
                        </div>
                        <div style={{ padding: 10, background: 'rgba(56, 189, 248, 0.1)', borderRadius: 10, color: 'var(--primary)' }}>
                            <IndianRupee size={24} />
                        </div>
                    </div>
                </div>

                {/* Paid */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Paid</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                ₹{summary.paid.toLocaleString()}
                            </div>
                        </div>
                        <div style={{ padding: 10, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 10, color: 'var(--success)' }}>
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                        <span style={{ fontWeight: 600 }}>{paidPercent}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--success)', width: `${paidPercent}%`, borderRadius: 3 }}></div>
                    </div>
                </div>

                {/* Pending */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                ₹{summary.pending.toLocaleString()}
                            </div>
                        </div>
                        <div style={{ padding: 10, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 10, color: 'var(--warning)' }}>
                            <Clock size={20} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Remaining</span>
                        <span style={{ fontWeight: 600 }}>{pendingPercent}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--warning)', width: `${pendingPercent}%`, borderRadius: 3 }}></div>
                    </div>
                </div>

                {/* Deductions */}
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deductions</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                ₹{summary.deductions.toLocaleString()}
                            </div>
                        </div>
                        <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 10, color: 'var(--danger)' }}>
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Of Total</span>
                        <span style={{ fontWeight: 600 }}>{deductionPercent}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--danger)', width: `${deductionPercent}%`, borderRadius: 3 }}></div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div className="tabs" style={{ padding: '16px 20px 0 20px', margin: 0, borderBottom: '1px solid var(--border-color)' }}>
                    <button className={`tab ${activeTab === 'sheet' ? 'active' : ''}`} onClick={() => setActiveTab('sheet')}>Salary Sheet</button>
                    <button className={`tab ${activeTab === 'deductions' ? 'active' : ''}`} onClick={() => setActiveTab('deductions')}>Deductions Review</button>
                    <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Payment History</button>
                </div>

                <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'sheet' && (
                        <table>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                                <tr>
                                    <th>Employee</th>
                                    <th>Role</th>
                                    <th>Basic Pay</th>
                                    <th>Allowances</th>
                                    <th>OVERTIME (HRS)</th>
                                    <th>Deductions</th>
                                    <th>Net Salary</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                            <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
                                            Loading salary data...
                                        </td>
                                    </tr>
                                ) : salaryData.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                            No active staff found to generate salaries for this month.
                                        </td>
                                    </tr>
                                ) : salaryData.map((row) => {
                                    const netSalary = row.basic + row.allowance + row.overtime - row.deductions;
                                    return (
                                        <tr key={row.id}>
                                            <td style={{ fontWeight: 600 }}>{row.name}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.role}</td>
                                            <td>₹{row.basic.toLocaleString()}</td>
                                            <td style={{ color: 'var(--info)' }}>+₹{row.allowance.toLocaleString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <input
                                                        type="number"
                                                        style={{ 
                                                            width: 60, padding: '6px 8px', fontSize: 13, textAlign: 'center',
                                                            background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: 6, outline: 'none'
                                                        }}
                                                        value={row.overtime_hours || ''}
                                                        placeholder="0"
                                                        title="Overtime Hours"
                                                        onChange={(e) => handleUpdateOt(row.id, 'overtime_hours', e.target.value)}
                                                        disabled={row.status === 'Paid'}
                                                    />
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>hrs<br />@ ₹</div>
                                                    <input
                                                        type="number"
                                                        style={{ 
                                                            width: 65, padding: '6px 8px', fontSize: 13, textAlign: 'center',
                                                            background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: 6, outline: 'none'
                                                        }}
                                                        value={row.overtime_rate || 100}
                                                        step="10"
                                                        title="Overtime Rate (₹/hr)"
                                                        onChange={(e) => handleUpdateOt(row.id, 'overtime_rate', e.target.value)}
                                                        disabled={row.status === 'Paid'}
                                                    />
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/hr</div>
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--success)', marginTop: 6, fontWeight: 600 }}>
                                                    +₹{row.overtime.toLocaleString()}
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--danger)' }}>-₹{row.deductions.toLocaleString()}</td>
                                            <td style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-color)' }}>₹{netSalary.toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${row.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                    onClick={() => handleEditSalary(row)}
                                                    title="Edit Salary Components"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                    onClick={() => handleGenerateSlip(row)}
                                                    title="Generate Slip"
                                                >
                                                    <FileText size={14} /> Slip
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {activeTab !== 'sheet' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            <Activity size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                            <h3>No data available for this view</h3>
                            <p>Select the Salary Sheet tab to view current month records.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal Alternative Design */}
            {editModalData && (
                <div className="modal-overlay" onClick={() => setEditModalData(null)} style={{ 
                    zIndex: 9999,
                    backdropFilter: 'blur(8px)',
                    background: 'rgba(15, 23, 42, 0.7)'
                }}>
                    <div className="modal" style={{ 
                        maxWidth: 420, 
                        width: '90%',
                        padding: 0, 
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: 24,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ padding: '32px 32px 24px', position: 'relative' }}>
                            {/* Close Button */}
                            <button onClick={() => setEditModalData(null)} style={{ 
                                position: 'absolute', top: 20, right: 20,
                                background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', 
                                cursor: 'pointer', width: 36, height: 36, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                                backdropFilter: 'blur(4px)'
                            }} 
                            onMouseOver={e => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}>
                                <X size={18} />
                            </button>

                            {/* Header Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
                                <div style={{ 
                                    width: 64, height: 64, borderRadius: 20, 
                                    background: 'linear-gradient(135deg, var(--primary), #6366f1)',
                                    color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 28, fontWeight: 700, marginBottom: 16,
                                    boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
                                }}>
                                    {editModalData.name.charAt(0)}
                                </div>
                                <h2 style={{ fontSize: 22, margin: 0, fontWeight: 700, color: 'white' }}>{editModalData.name}</h2>
                                <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></div>
                                    {editModalData.role}
                                </div>
                            </div>
                            
                            {/* Input Fields Container */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                
                                {/* Basic & Allowance */}
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Basic Pay</label>
                                        <div style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: 4, fontSize: 18 }}>₹</span>
                                            <input 
                                                type="number" 
                                                value={editModalData.editBasic} 
                                                onChange={(e) => setEditModalData({...editModalData, editBasic: e.target.value})}
                                                style={{ 
                                                    background: 'transparent', border: 'none', color: 'white', 
                                                    fontSize: 20, fontWeight: 600, width: '100%', outline: 'none', padding: 0 
                                                }} 
                                            />
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Allowance</label>
                                        <div style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: 4, fontSize: 18 }}>₹</span>
                                            <input 
                                                type="number" 
                                                value={editModalData.editAllowances} 
                                                onChange={(e) => setEditModalData({...editModalData, editAllowances: e.target.value})}
                                                style={{ 
                                                    background: 'transparent', border: 'none', color: 'white', 
                                                    fontSize: 20, fontWeight: 600, width: '100%', outline: 'none', padding: 0 
                                                }} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Overtime Section */}
                                <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '16px', borderRadius: 16, border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--info)', fontWeight: 600, fontSize: 14 }}>
                                            <Clock size={16} /> Overtime Pay
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                            {editModalData.overtime_hours} hrs logged
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginRight: 6 }}>Rate (₹)</span>
                                            <input 
                                                type="number" 
                                                value={editModalData.editOtRate} 
                                                onChange={(e) => setEditModalData({...editModalData, editOtRate: e.target.value})}
                                                style={{ 
                                                    background: 'transparent', border: 'none', color: 'white', 
                                                    fontSize: 16, fontWeight: 600, width: '100%', outline: 'none', padding: 0, textAlign: 'right' 
                                                }} 
                                            />
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>=</div>
                                        <div style={{ flex: 1, padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 12, border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--success)', fontWeight: 700, fontSize: 16, textAlign: 'right' }}>
                                            + ₹{((parseInt(editModalData.editOtRate)||0) * editModalData.overtime_hours).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px 16px', borderRadius: 16, border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>Total Deductions</label>
                                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--danger)' }}>
                                        <span style={{ opacity: 0.7, marginRight: 4, fontSize: 18 }}>-₹</span>
                                        <input 
                                            type="number" 
                                            value={editModalData.editDeductions} 
                                            onChange={(e) => setEditModalData({...editModalData, editDeductions: e.target.value})}
                                            style={{ 
                                                background: 'transparent', border: 'none', color: 'var(--danger)', 
                                                fontSize: 20, fontWeight: 700, width: 80, outline: 'none', padding: 0, textAlign: 'right' 
                                            }} 
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer Action */}
                        <div style={{ padding: '0 32px 32px' }}>
                            <button onClick={saveEditModal} style={{ 
                                width: '100%', padding: '16px', 
                                background: 'linear-gradient(135deg, var(--primary), #6366f1)', 
                                border: 'none', borderRadius: 16, 
                                color: 'white', fontSize: 16, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                Confirm Updates
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Slip Modal */}
            {selectedSlip && (
                <div className="modal-overlay" onClick={() => setSelectedSlip(null)} style={{ zIndex: 9999 }}>
                    <div className="modal" style={{ maxWidth: 600, padding: 0 }} onClick={e => e.stopPropagation()}>

                        {/* Printable Area */}
                        <div id="salary-slip-printable" ref={slipRef} style={{ padding: 40, background: 'white', color: '#1e293b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: 20, marginBottom: 20 }}>
                                <div>
                                    <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' }}>Gayatri Petroleum</h2>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>123 Main Highway, City District</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px 0', color: '#0f172a', textTransform: 'uppercase' }}>Salary Slip</h2>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: 14, fontWeight: 500 }}>{selectedSlip.month}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, fontSize: 14 }}>
                                <div>
                                    <div style={{ marginBottom: 6 }}><strong style={{ display: 'inline-block', width: 120 }}>Employee Name:</strong> {selectedSlip.name}</div>
                                    <div style={{ marginBottom: 6 }}><strong style={{ display: 'inline-block', width: 120 }}>Employee ID:</strong> EMP-00{selectedSlip.id}</div>
                                </div>
                                <div>
                                    <div style={{ marginBottom: 6 }}><strong style={{ display: 'inline-block', width: 100 }}>Designation:</strong> {selectedSlip.role}</div>
                                    <div style={{ marginBottom: 6 }}><strong style={{ display: 'inline-block', width: 100 }}>Payment Status:</strong> {selectedSlip.status}</div>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', borderTop: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Earnings</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Amount (₹)</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderLeft: '1px solid #e2e8f0' }}>Deductions</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px' }}>Basic Salary</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{selectedSlip.basic.toLocaleString()}</td>
                                        <td style={{ padding: '12px 16px', borderLeft: '1px solid #e2e8f0' }}>Tax / PF / Absent</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{selectedSlip.deductions.toLocaleString()}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px' }}>Allowances</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{selectedSlip.allowance.toLocaleString()}</td>
                                        <td style={{ padding: '12px 16px', borderLeft: '1px solid #e2e8f0' }}></td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}></td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            Overtime Pay
                                            <br />
                                            <small style={{ color: '#22c55e' }}>({selectedSlip.overtime_hours || 0} hrs × ₹{selectedSlip.overtime_rate || 100}/hr)</small>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{selectedSlip.overtime.toLocaleString()}</td>
                                        <td style={{ padding: '12px 16px', borderLeft: '1px solid #e2e8f0' }}></td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}></td>
                                    </tr>
                                    <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                                        <td style={{ padding: '12px 16px' }}>Total Earnings</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(selectedSlip.basic + selectedSlip.allowance + selectedSlip.overtime).toLocaleString()}</td>
                                        <td style={{ padding: '12px 16px', borderLeft: '1px solid #e2e8f0' }}>Total Deductions</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{selectedSlip.deductions.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '20px 24px', borderRadius: 8, marginBottom: 40 }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Net Salary Payable</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>₹{selectedSlip.netPay.toLocaleString()}</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
                                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 8, width: 200, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Employer Signature</div>
                                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 8, width: 200, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Employee Signature</div>
                            </div>
                        </div>

                        {/* Non-printable modal action buttons */}
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: 20, background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-color)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                            <button className="btn btn-secondary" onClick={() => setSelectedSlip(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Printer size={18} /> Print Slip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS specific for printing */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #salary-slip-printable, #salary-slip-printable * {
                        visibility: visible;
                    }
                    #salary-slip-printable {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />
        </div>
    );
}
