// ============================================================
// FILE: src/pages/StatisticsPage.jsx
// Actor: Admin, Manager
// ============================================================
import { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { statisticsApi, downloadBlob } from '../services/api';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const scaleOpts = { grid: { color: 'rgba(26,42,26,.5)' }, ticks: { color: '#6b7280', font: { family: 'Space Mono', size: 10 } } };
const tooltipOpt = { backgroundColor: '#0d1409', borderColor: '#1a2a1a', borderWidth: 1, titleColor: '#e8f5e9', bodyColor: '#a7f3d0' };
const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('vi-VN');
const fmtAxis = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'tỷ' : n >= 1e6 ? (n / 1e6).toFixed(0) + 'tr' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(Math.round(n));

export default function StatisticsPage() {
    const { isManager } = useAuth();
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [channelId, setChannelId] = useState(''); // eslint-disable-line no-unused-vars
    const [revenueByMonth, setRevenueByMonth] = useState([]);
    const [revenueByChannel, setRevenueByChannel] = useState([]);
    const [revenueByCategory, setRevenueByCategory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState(null);
    const [dateRange, setDateRange] = useState(null); // {minDate, maxDate}
    const [selectedYear, setSelectedYear] = useState(null); // năm đang chọn để xem tháng/quý

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const loadData = async () => loadDataWith(fromDate, toDate);

    const loadDataWith = async (fd, td) => {
        setLoading(true);
        try {
            const params = { fromDate: fd, toDate: td, channelId: channelId || undefined };
            const [m, ch, cat, s] = await Promise.all([
                statisticsApi.getRevenueByMonth(params),
                statisticsApi.getRevenueByChannel(params),
                statisticsApi.getRevenueByCategory(params),
                statisticsApi.getSummaryReport(params),
            ]);
            setRevenueByMonth(m.data || []);
            setRevenueByChannel(ch.data || []);
            setRevenueByCategory(cat.data || []);
            setSummary(s.data);
        } catch { showToast('Lỗi tải dữ liệu thống kê', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Thống kê'; }
        if (!isManager) return;
        // Lấy khoảng ngày thực tế từ DB → dùng làm default filter
        statisticsApi.getDateRange().then(r => {
            const { minDate, maxDate } = r.data;
            setDateRange({ minDate, maxDate });
            setFromDate(minDate);
            setToDate(maxDate);
            loadDataWith(minDate, maxDate);
        }).catch(() => {
            // fallback nếu lỗi
            const fd = '2025-01-01', td = '2025-12-31';
            setFromDate(fd); setToDate(td);
            loadDataWith(fd, td);
        });
    }, [isManager]); // eslint-disable-line react-hooks/exhaustive-deps

    const exportExcel = async () => {
        setExporting(true);
        try {
            const r = await statisticsApi.exportExcel({ fromDate, toDate });
            downloadBlob(r.data, `BaoCao_${fromDate}_${toDate}.xlsx`);
            showToast('✓ Đã xuất báo cáo Excel');
        } catch { showToast('Lỗi xuất Excel', 'error'); }
        finally { setExporting(false); }
    };

    if (!isManager) return <div style={{ padding: 40, color: 'var(--red)' }}>⛔ Chỉ Admin và Manager mới xem được thống kê.</div>;

    const PALETTE = ['#22c55e', '#4ade80', '#86efac', '#16a34a', '#fbbf24', '#60a5fa'];

    const monthChart = {
        labels: revenueByMonth.map(r => r.monthLabel || `T${r.month}`),
        datasets: [
            { label: 'Doanh thu (đ)', data: revenueByMonth.map(r => r.totalRevenue), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.08)', borderWidth: 2, fill: true, tension: .4, pointRadius: 4, pointBackgroundColor: '#22c55e' },
            { label: 'Số đơn hàng', data: revenueByMonth.map(r => r.totalOrders), borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,.04)', borderWidth: 2, fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: '#60a5fa', yAxisID: 'y2' },
        ],
    };
    const channelChart = {
        labels: revenueByChannel.map(c => c.channelName),
        datasets: [{ data: revenueByChannel.map(c => c.totalRevenue), backgroundColor: PALETTE, borderColor: '#0d1409', borderWidth: 3 }],
    };
    const catChart = {
        labels: revenueByCategory.map(c => c.categoryName),
        datasets: [{ label: 'Doanh thu (đ)', data: revenueByCategory.map(c => c.totalRevenue), backgroundColor: 'rgba(34,197,94,.2)', borderColor: '#22c55e', borderWidth: 2, borderRadius: 4 }],
    };

    return (
        <div>
            {/* Filter bar */}
            <div className="card card-body" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Từ ngày</div>
                        <input type="date" className="form-input" style={{ width: 140 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div style={{ color: 'var(--dim)', marginTop: 16 }}>→</div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Đến ngày</div>
                        <input type="date" className="form-input" style={{ width: 140 }} value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={loadData} disabled={loading}>{loading ? '⟳ Đang tải...' : '🔄 Xem'}</button>
                        <button className="btn btn-export" onClick={exportExcel} disabled={exporting}>{exporting ? '⟳ Đang xuất...' : '⬇ Xuất Excel'}</button>
                    </div>
                </div>

                {/* Quick filter: chọn năm → hiện tháng/quý */}
                {(() => {
                    const minY = dateRange ? parseInt(dateRange.minDate.slice(0, 4)) : new Date().getFullYear();
                    const maxY = dateRange ? parseInt(dateRange.maxDate.slice(0, 4)) : new Date().getFullYear();
                    const years = [];
                    for (let y = minY; y <= maxY; y++) years.push(y);
                    const activeY = selectedYear || maxY;

                    // Tháng và quý của năm đang chọn (lọc theo data có trong DB)
                    const lastFeb = new Date(activeY, 2, 0).getDate();
                    const periods = [
                        [`Cả năm ${activeY}`, `${activeY}-01-01`, `${activeY}-12-31`],
                        [`T1`, `${activeY}-01-01`, `${activeY}-01-31`],
                        [`T2`, `${activeY}-02-01`, `${activeY}-02-${lastFeb}`],
                        [`T3`, `${activeY}-03-01`, `${activeY}-03-31`],
                        [`T4`, `${activeY}-04-01`, `${activeY}-04-30`],
                        [`T5`, `${activeY}-05-01`, `${activeY}-05-31`],
                        [`T6`, `${activeY}-06-01`, `${activeY}-06-30`],
                        [`T7`, `${activeY}-07-01`, `${activeY}-07-31`],
                        [`T8`, `${activeY}-08-01`, `${activeY}-08-31`],
                        [`T9`, `${activeY}-09-01`, `${activeY}-09-30`],
                        [`T10`, `${activeY}-10-01`, `${activeY}-10-31`],
                        [`T11`, `${activeY}-11-01`, `${activeY}-11-30`],
                        [`T12`, `${activeY}-12-01`, `${activeY}-12-31`],
                        [`Q1`, `${activeY}-01-01`, `${activeY}-03-31`],
                        [`Q2`, `${activeY}-04-01`, `${activeY}-06-30`],
                        [`Q3`, `${activeY}-07-01`, `${activeY}-09-30`],
                        [`Q4`, `${activeY}-10-01`, `${activeY}-12-31`],
                    ].filter(([, from, to]) => !dateRange || !(to < dateRange.minDate || from > dateRange.maxDate));

                    const isActive = (from, to) => fromDate === from && toDate === to;

                    return (
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                            {/* Hàng 1: chọn năm */}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, minWidth: 40 }}>Năm:</span>
                                {/* Nút Tất cả — khoảng toàn bộ DB */}
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{
                                        fontSize: 12, fontWeight: 700,
                                        background: selectedYear === 'all' ? 'rgba(96,180,250,.18)' : '',
                                        color: selectedYear === 'all' ? 'var(--blue)' : 'var(--text2)',
                                        border: selectedYear === 'all' ? '1px solid rgba(96,180,250,.4)' : '1px solid transparent',
                                    }}
                                    onClick={() => {
                                        setSelectedYear('all');
                                        const from = dateRange?.minDate || `${minY}-01-01`;
                                        const to = dateRange?.maxDate || `${maxY}-12-31`;
                                        setFromDate(from); setToDate(to);
                                        loadDataWith(from, to);
                                    }}>
                                    Tất cả
                                </button>
                                {years.map(y => (
                                    <button key={y}
                                        className="btn btn-ghost btn-sm"
                                        style={{
                                            fontSize: 12, fontWeight: 700,
                                            background: activeY === y && selectedYear !== 'all' ? 'rgba(34,197,94,.18)' : '',
                                            color: activeY === y && selectedYear !== 'all' ? 'var(--green)' : 'var(--text2)',
                                            border: activeY === y && selectedYear !== 'all' ? '1px solid rgba(34,197,94,.4)' : '1px solid transparent',
                                        }}
                                        onClick={() => setSelectedYear(y)}>
                                        {y}
                                    </button>
                                ))}
                            </div>
                            {/* Hàng 2: tháng và quý — ẩn khi đang xem Tất cả */}
                            {selectedYear !== 'all' && (
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, minWidth: 40 }}>Kỳ:</span>
                                    {periods.map(([label, from, to]) => (
                                        <button key={label}
                                            className="btn btn-ghost btn-sm"
                                            style={{
                                                fontSize: 12,
                                                background: isActive(from, to) ? 'rgba(34,197,94,.15)' : '',
                                                color: isActive(from, to) ? 'var(--green)' : '',
                                                border: isActive(from, to) ? '1px solid rgba(34,197,94,.3)' : '1px solid transparent',
                                            }}
                                            onClick={() => { setFromDate(from); setToDate(to); loadDataWith(from, to); }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* KPI summary */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                    {[
                        { label: 'Tổng doanh thu', val: fmt(summary.kpi.totalRevenue) + ' VNĐ', sub: `TB: ${fmt(summary.kpi.avgOrderValue)} VNĐ/đơn`, c: '#22c55e' },
                        { label: 'Tổng đơn hàng', val: summary.kpi.totalOrdersAll + ' đơn', sub: `Hoàn thành: ${summary.kpi.totalOrdersCompleted} đơn`, c: '#60a5fa' },
                        { label: 'Kênh hiệu quả nhất', val: revenueByChannel[0]?.channelName || '—', sub: `${fmt(revenueByChannel[0]?.totalRevenue)} VNĐ`, c: '#fbbf24' },
                    ].map((s, i) => (
                        <div key={i} className="card card-body" style={{ borderBottom: `3px solid ${s.c}` }}>
                            <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>{s.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{s.val}</div>
                            <div style={{ fontSize: 12, color: 'var(--dim)' }}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Charts row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="card card-body">
                    <div style={{ marginBottom: 12 }}>
                        <div className="card-title">Xu hướng doanh thu theo tháng</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{revenueByMonth.length} tháng trong kỳ</div>
                    </div>
                    <div style={{ height: 220 }}>
                        {revenueByMonth.length > 0 ? (
                            <Line data={monthChart} options={{
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { labels: { color: '#6b7280', font: { family: 'DM Sans', size: 11 } } }, tooltip: tooltipOpt },
                                scales: { x: scaleOpts, y: { ...scaleOpts, ticks: { ...scaleOpts.ticks, callback: v => fmtAxis(v) } }, y2: { grid: { display: false }, ticks: { ...scaleOpts.ticks }, position: 'right' } }
                            }} />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 13 }}>{loading ? 'Đang tải...' : 'Không có dữ liệu'}</div>
                        )}
                    </div>
                </div>
                <div className="card card-body">
                    <div style={{ marginBottom: 12 }}>
                        <div className="card-title">Phân bổ theo kênh bán</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{revenueByChannel.length} kênh bán hàng</div>
                    </div>
                    <div style={{ height: 220 }}>
                        {revenueByChannel.length > 0 ? (
                            <Pie data={channelChart} options={{
                                responsive: true, maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'right', labels: { color: '#9ca3af', font: { family: 'DM Sans', size: 11 }, boxWidth: 10, padding: 8 } },
                                    tooltip: { ...tooltipOpt, callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} VNĐ` } }
                                }
                            }} />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 13 }}>{loading ? 'Đang tải...' : 'Không có dữ liệu'}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Category bar */}
            <div className="card card-body" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 12 }}>
                    <div className="card-title">Doanh thu theo danh mục sản phẩm</div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{revenueByCategory.length} danh mục</div>
                </div>
                <div style={{ height: 180 }}>
                    {revenueByCategory.length > 0 ? (
                        <Bar data={catChart} options={{
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false }, tooltip: { ...tooltipOpt, callbacks: { label: ctx => ` ${fmt(ctx.raw)} VNĐ` } } },
                            scales: { x: { ...scaleOpts, grid: { display: false } }, y: { ...scaleOpts, ticks: { ...scaleOpts.ticks, callback: v => fmtAxis(v) } } }
                        }} />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 13 }}>{loading ? 'Đang tải...' : 'Không có dữ liệu'}</div>
                    )}
                </div>
            </div>

            {/* Export */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">📄 Xuất báo cáo</span>
                    <span style={{ fontSize: 12, color: 'var(--dim)' }}>Kỳ: {fromDate} → {toDate}</span>
                </div>
                {[
                    { icon: '📊', name: 'Báo cáo tổng hợp Excel', desc: 'Sheet: Đơn hàng · Doanh thu · Top sản phẩm · Theo kênh', action: exportExcel, label: exporting ? '⟳ Đang xuất...' : '⬇ Tải Excel', cls: 'btn-export', disabled: exporting },
                    { icon: '📋', name: 'Dữ liệu thô CSV', desc: 'Toàn bộ đơn hàng trong kỳ đã chọn', action: () => showToast('Tính năng đang phát triển', 'error'), label: '⬇ Tải CSV', cls: 'btn-ghost', disabled: false },
                ].map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(34,197,94,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{e.icon}</div>
                            <div><div style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</div><div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{e.desc}</div></div>
                        </div>
                        <button className={`btn ${e.cls}`} onClick={e.action} disabled={e.disabled}>{e.label}</button>
                    </div>
                ))}
            </div>

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
