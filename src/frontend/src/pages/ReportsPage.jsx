// ============================================================
// FILE: src/pages/ReportsPage.jsx 
// Actor: Admin, Manager
// Trang riêng cho chức năng xuất báo cáo — tách khỏi Thống kê
// ============================================================
import { useState, useEffect } from 'react';
import { statisticsApi, ordersApi, downloadBlob } from '../services/api';

const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('vi-VN');

export default function ReportsPage() {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(null);
    const [toast, setToast] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);

    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

    useEffect(() => {
        { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Xuất báo cáo'; }
        statisticsApi.getDateRange().then(r => {
            const { minDate, maxDate } = r.data;
            setDateRange({ minDate, maxDate });
            setFromDate(minDate);
            setToDate(maxDate);
            loadSummaryWith(minDate, maxDate);
        }).catch(() => {
            const fd = '2025-01-01', td = '2025-12-31';
            setFromDate(fd); setToDate(td);
            loadSummaryWith(fd, td);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadSummary = async () => loadSummaryWith(fromDate, toDate);

    const loadSummaryWith = async (fd, td) => {
        setLoading(true);
        try {
            const r = await statisticsApi.getSummaryReport({ fromDate: fd, toDate: td });
            setSummary(r.data);
        } catch { showToast('Không tải được dữ liệu tóm tắt', 'error'); }
        finally { setLoading(false); }
    };

    const exportExcel = async () => {
        setExporting('excel');
        try {
            const r = await statisticsApi.exportExcel({ fromDate, toDate });
            downloadBlob(r.data, `BaoCao_DoanhThu_${fromDate}_${toDate}.xlsx`);
            showToast('✓ Đã tải báo cáo Excel thành công');
        } catch { showToast('Lỗi xuất Excel — kiểm tra kết nối API', 'error'); }
        finally { setExporting(null); }
    };

    // ── Xuất CSV: lấy toàn bộ đơn hàng trong kỳ → build CSV client-side
    const exportCsv = async () => {
        if (!summary) { showToast('Vui lòng nhấn Xem trước trước', 'error'); return; }
        setExporting('csv');
        try {
            // Lấy tối đa 2000 đơn trong kỳ
            const r = await ordersApi.getAll({ page: 1, pageSize: 2000, fromDate, toDate });
            const orders = r.data?.items || r.data || [];
            if (orders.length === 0) { showToast('Không có dữ liệu trong kỳ này', 'error'); return; }

            // Build CSV
            const header = ['Mã ĐH', 'Ngày đặt', 'Khách hàng', 'Kênh bán', 'Tổng tiền', 'Trạng thái'];
            const rows = orders.map(o => [
                o.orderId,
                o.orderDate?.slice(0, 10) || '',
                (o.customerName || 'Khách lẻ').replace(/,/g, ' '),
                (o.channelName || '').replace(/,/g, ' '),
                o.totalAmount || 0,
                o.status || '',
            ]);
            const bom = '\uFEFF'; // BOM để Excel đọc UTF-8 đúng
            const csv = bom + [header, ...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `DonHang_${fromDate}_${toDate}.csv`;
            a.click(); URL.revokeObjectURL(url);
            showToast(`✓ Đã xuất ${orders.length} đơn hàng ra CSV`);
        } catch { showToast('Lỗi xuất CSV', 'error'); }
        finally { setExporting(null); }
    };

    // ── Xuất PDF: build HTML → window.print()
    const exportPdf = () => {
        if (!summary) { showToast('Vui lòng nhấn Xem trước trước', 'error'); return; }
        const kpi = summary.kpi || {};
        const channels = summary.revenueByChannel || [];
        const topProds = summary.topProducts || [];
        const byMonth = summary.revenueByMonth || [];

        const fmtN = n => n == null ? '—' : Math.round(n).toLocaleString('vi-VN');
        const channelRows = channels.map((c, i) => `
      <tr>
        <td>${i + 1}</td><td>${c.channelName}</td>
        <td style="text-align:right">${fmtN(c.totalRevenue)} ₫</td>
        <td style="text-align:right">${c.totalOrders}</td>
        <td style="text-align:right">${fmtN(c.avgOrderValue)} ₫</td>
      </tr>`).join('');
        const productRows = topProds.slice(0, 10).map((p, i) => `
      <tr>
        <td>${i + 1}</td><td>${p.productName}</td>
        <td style="text-align:right">${p.totalQuantitySold}</td>
        <td style="text-align:right">${fmtN(p.totalRevenue)} ₫</td>
      </tr>`).join('');
        const monthRows = byMonth.map(m => `
      <tr>
        <td>${m.month}</td>
        <td style="text-align:right">${fmtN(m.totalRevenue)} ₫</td>
        <td style="text-align:right">${m.totalOrders}</td>
      </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8">
<title>Báo cáo doanh thu ${fromDate} → ${toDate}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 20px; margin-bottom: 4px; color: #166534; }
  .subtitle { font-size: 12px; color: #555; margin-bottom: 24px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .kpi-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px 16px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #666; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #166534; }
  .kpi-sub { font-size: 10px; color: #888; margin-top: 2px; }
  h2 { font-size: 14px; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #166534; color: #166534; }
  section { margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #166534; color: #fff; padding: 7px 10px; text-align: left; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { margin-top: 32px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
  <h1>📊 Báo cáo Doanh thu Bán hàng</h1>
  <div class="subtitle">Kỳ báo cáo: <strong>${fromDate}</strong> → <strong>${toDate}</strong> &nbsp;|&nbsp; Xuất lúc: ${new Date().toLocaleString('vi-VN')}</div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Tổng doanh thu</div>
      <div class="kpi-value">${fmtN(kpi.totalRevenue)} ₫</div>
      <div class="kpi-sub">TB: ${fmtN(kpi.avgOrderValue)} ₫/đơn</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tổng đơn hàng</div>
      <div class="kpi-value">${kpi.totalOrdersAll || 0}</div>
      <div class="kpi-sub">Hoàn thành: ${kpi.totalOrdersCompleted || 0}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Kênh hiệu quả nhất</div>
      <div class="kpi-value" style="font-size:15px">${channels[0]?.channelName || '—'}</div>
      <div class="kpi-sub">${fmtN(channels[0]?.totalRevenue)} ₫</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Sản phẩm bán chạy</div>
      <div class="kpi-value" style="font-size:15px">${topProds[0]?.productName || '—'}</div>
      <div class="kpi-sub">${topProds[0]?.totalQuantitySold || 0} sp đã bán</div>
    </div>
  </div>

  <section>
    <h2>Doanh thu theo kênh bán hàng</h2>
    <table>
      <thead><tr><th>#</th><th>Kênh</th><th>Doanh thu</th><th>Đơn hàng</th><th>TB/đơn</th></tr></thead>
      <tbody>${channelRows}</tbody>
    </table>
  </section>

  <section>
    <h2>Top 10 sản phẩm bán chạy</h2>
    <table>
      <thead><tr><th>#</th><th>Sản phẩm</th><th>Số lượng</th><th>Doanh thu</th></tr></thead>
      <tbody>${productRows}</tbody>
    </table>
  </section>

  <section>
    <h2>Doanh thu theo tháng</h2>
    <table>
      <thead><tr><th>Tháng</th><th>Doanh thu</th><th>Số đơn</th></tr></thead>
      <tbody>${monthRows}</tbody>
    </table>
  </section>

  <div class="footer">SalesAnalytics — Báo cáo được tạo tự động bởi hệ thống</div>
</body></html>`;

        const w = window.open('', '_blank', 'width=900,height=700');
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 600);
        showToast('✓ Đã mở cửa sổ in PDF');
    };

    const reportTypes = [
        {
            id: 'excel',
            icon: '📊',
            color: 'rgba(34,197,94,.1)',
            borderColor: 'rgba(34,197,94,.25)',
            title: 'Báo cáo tổng hợp Excel',
            desc: 'Bao gồm 4 sheet: Đơn hàng, Doanh thu theo tháng, Top sản phẩm, Doanh thu theo kênh',
            format: '.xlsx',
            action: exportExcel,
            btnClass: 'btn-primary',
            btnLabel: '⬇ Tải xuống Excel',
        },
        {
            id: 'csv',
            icon: '📋',
            color: 'rgba(96,165,250,.1)',
            borderColor: 'rgba(96,165,250,.2)',
            title: 'Dữ liệu thô CSV',
            desc: 'Toàn bộ đơn hàng trong kỳ chọn — dùng để nhập vào Excel hoặc phân tích thêm',
            format: '.csv',
            action: exportCsv,
            btnClass: 'btn-blue',
            btnLabel: '⬇ Tải xuống CSV',
        },
        {
            id: 'pdf',
            icon: '📄',
            color: 'rgba(248,113,113,.1)',
            borderColor: 'rgba(248,113,113,.2)',
            title: 'Báo cáo tóm tắt PDF',
            desc: 'Tóm tắt KPI chính, biểu đồ doanh thu và nhận xét tổng hợp theo kỳ',
            format: '.pdf',
            action: exportPdf,
            btnClass: 'btn-red',
            btnLabel: '⬇ Tải xuống PDF',
        },
    ];

    return (
        <div>
            {/* Page description */}
            <div style={{
                padding: '14px 18px', marginBottom: 20,
                background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.1)',
                borderRadius: 10, fontSize: 13, color: 'var(--dim)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <span>
                    <strong style={{ color: "var(--text)" }}>Xuất báo cáo tổng hợp theo kỳ</strong>
                    {' '}— Tạo và tải về báo cáo tình hình kinh doanh theo kỳ thời gian được chọn.
                </span>
            </div>

            {/* Date range picker */}
            <div className="card card-body" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'Space Mono,monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                    {/* Chọn kỳ báo cáo */}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'Space Mono,monospace', marginBottom: 5 }}>Từ ngày</div>
                        <input type="date" className="form-input" style={{ width: 160 }} value={fromDate}
                            onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div style={{ color: 'var(--dim)', marginTop: 18 }}>→</div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'Space Mono,monospace', marginBottom: 5 }}>Đến ngày</div>
                        <input type="date" className="form-input" style={{ width: 160 }} value={toDate}
                            onChange={e => setToDate(e.target.value)} />
                    </div>
                    <div style={{ marginTop: 18 }}>
                        <button className="btn btn-ghost" onClick={loadSummary} disabled={loading}>
                            {loading ? '⟳ Đang tải...' : '🔄 Xem trước'}
                        </button>
                    </div>

                </div>

                {/* Quick filter: chọn năm → hiện tháng/quý */}
                {(() => {
                    const minY = dateRange ? parseInt(dateRange.minDate.slice(0, 4)) : new Date().getFullYear();
                    const maxY = dateRange ? parseInt(dateRange.maxDate.slice(0, 4)) : new Date().getFullYear();
                    const years = [];
                    for (let y = minY; y <= maxY; y++) years.push(y);
                    const activeY = selectedYear || maxY;
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
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, minWidth: 40 }}>Năm:</span>
                                {/* Nút Tất cả */}
                                <button className="btn btn-ghost btn-sm"
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
                                        loadSummaryWith(from, to);
                                    }}>
                                    Tất cả
                                </button>
                                {years.map(y => (
                                    <button key={y} className="btn btn-ghost btn-sm"
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
                            {selectedYear !== 'all' && (
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, minWidth: 40 }}>Kỳ:</span>
                                    {periods.map(([label, from, to]) => (
                                        <button key={label} className="btn btn-ghost btn-sm"
                                            style={{
                                                fontSize: 12,
                                                background: isActive(from, to) ? 'rgba(34,197,94,.15)' : '',
                                                color: isActive(from, to) ? 'var(--green)' : '',
                                                border: isActive(from, to) ? '1px solid rgba(34,197,94,.3)' : '1px solid transparent',
                                            }}
                                            onClick={() => { setFromDate(from); setToDate(to); loadSummaryWith(from, to); }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Summary preview */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                        { label: 'Tổng doanh thu', val: fmt(summary.kpi.totalRevenue) + ' VNĐ', color: 'var(--green3)' },
                        { label: 'Tổng đơn hàng', val: summary.kpi.totalOrdersAll + ' đơn', color: 'var(--blue)' },
                        { label: 'Đơn hoàn thành', val: summary.kpi.totalOrdersCompleted + ' đơn', color: 'var(--green)' },
                        { label: 'Giá trị TB/đơn', val: fmt(summary.kpi.avgOrderValue) + ' VNĐ', color: 'var(--amber)' },
                    ].map((s, i) => (
                        <div key={i} className="card" style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'Space Mono,monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>{s.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.val}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Report types */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <span className="card-title">Chọn định dạng báo cáo</span>
                    <span style={{ fontSize: 10, fontFamily: 'Space Mono,monospace', color: 'var(--dim)' }}>
                        Kỳ: {fromDate} → {toDate}
                    </span>
                </div>
                {reportTypes.map((r, i) => (
                    <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '18px 20px',
                        borderBottom: i < reportTypes.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 10,
                                background: r.color, border: `1px solid ${r.borderColor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                            }}>{r.icon}</div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{r.desc}</div>
                                <div style={{ fontSize: 10, color: 'var(--dim2)', fontFamily: 'Space Mono,monospace', marginTop: 4 }}>Định dạng: {r.format}</div>
                            </div>
                        </div>
                        <button className={`btn ${r.btnClass}`} onClick={r.action} disabled={exporting === r.id}
                            style={{ minWidth: 160, justifyContent: 'center' }}>
                            {exporting === r.id ? '⟳ Đang xuất...' : r.btnLabel}
                        </button>
                    </div>
                ))}
            </div>

          {/*  */}{/* History note */}
          {/*  <div className="card card-body" style={{ opacity: .7 }}>*/}
          {/*      <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'Space Mono,monospace', marginBottom: 8 }}>*/}
          {/*// Lịch sử xuất báo cáo*/}
          {/*      </div>*/}
          {/*      <div style={{ fontSize: 12, color: 'var(--dim)' }}>*/}
          {/*          Tính năng lưu lịch sử xuất báo cáo sẽ được phát triển trong Giai đoạn 2 (Luận văn tốt nghiệp).*/}
          {/*      </div>*/}
          {/*  </div>*/}

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
