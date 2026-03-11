// ============================================================
// FILE: src/pages/ReportsPage.jsx 
// Actor: Admin, Manager
// Trang riêng cho chức năng xuất báo cáo — tách khỏi Thống kê
// ============================================================
import { useState, useEffect } from 'react';
import { statisticsApi, downloadBlob } from '../services/api';

const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('vi-VN');

export default function ReportsPage() {
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(null);
  const [toast,     setToast]     = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

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
      action: () => showToast('Tính năng xuất CSV đang phát triển', 'error'),
      btnClass: 'btn-ghost',
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
      action: () => showToast('Tính năng xuất PDF đang phát triển', 'error'),
      btnClass: 'btn-ghost',
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
          <strong style={{ color:"var(--text)" }}>Xuất báo cáo tổng hợp theo kỳ</strong>
          {' '}— Tạo và tải về báo cáo tình hình kinh doanh theo kỳ thời gian được chọn.
        </span>
      </div>

      {/* Date range picker */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>
          // Chọn kỳ báo cáo
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:10, color:'var(--dim)', fontFamily:'Space Mono,monospace', marginBottom:5 }}>Từ ngày</div>
            <input type="date" className="form-input" style={{ width:160 }} value={fromDate}
              onChange={e => setFromDate(e.target.value)} />
          </div>
          <div style={{ color:'var(--dim)', marginTop:18 }}>→</div>
          <div>
            <div style={{ fontSize:10, color:'var(--dim)', fontFamily:'Space Mono,monospace', marginBottom:5 }}>Đến ngày</div>
            <input type="date" className="form-input" style={{ width:160 }} value={toDate}
              onChange={e => setToDate(e.target.value)} />
          </div>
          <div style={{ marginTop:18 }}>
            <button className="btn btn-ghost" onClick={loadSummary} disabled={loading}>
              {loading ? '⟳ Đang tải...' : '🔄 Xem trước'}
            </button>
          </div>

          {/* Quick ranges — tự sinh từ khoảng ngày trong DB */}
          <div style={{ marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap' }}>
            {(() => {
              const minY = dateRange ? parseInt(dateRange.minDate.slice(0,4)) : new Date().getFullYear();
              const maxY = dateRange ? parseInt(dateRange.maxDate.slice(0,4)) : new Date().getFullYear();
              const buttons = [];
              for (let y = minY; y <= maxY; y++) {
                const yr = String(y).slice(2);
                const lastFeb = new Date(y, 2, 0).getDate();
                [
                  [`T1/${yr}`,`${y}-01-01`,`${y}-01-31`],[`T2/${yr}`,`${y}-02-01`,`${y}-02-${lastFeb}`],
                  [`T3/${yr}`,`${y}-03-01`,`${y}-03-31`],[`T4/${yr}`,`${y}-04-01`,`${y}-04-30`],
                  [`T5/${yr}`,`${y}-05-01`,`${y}-05-31`],[`T6/${yr}`,`${y}-06-01`,`${y}-06-30`],
                  [`T7/${yr}`,`${y}-07-01`,`${y}-07-31`],[`T8/${yr}`,`${y}-08-01`,`${y}-08-31`],
                  [`T9/${yr}`,`${y}-09-01`,`${y}-09-30`],[`T10/${yr}`,`${y}-10-01`,`${y}-10-31`],
                  [`T11/${yr}`,`${y}-11-01`,`${y}-11-30`],[`T12/${yr}`,`${y}-12-01`,`${y}-12-31`],
                  [`Q1/${yr}`,`${y}-01-01`,`${y}-03-31`],[`Q2/${yr}`,`${y}-04-01`,`${y}-06-30`],
                  [`Q3/${yr}`,`${y}-07-01`,`${y}-09-30`],[`Q4/${yr}`,`${y}-10-01`,`${y}-12-31`],
                  [`${y}`,`${y}-01-01`,`${y}-12-31`],
                ].forEach(([label, from, to]) => {
                  if (dateRange && (to < dateRange.minDate || from > dateRange.maxDate)) return;
                  buttons.push({ label, from, to });
                });
              }
              return buttons;
            })().map(q => (
              <button key={q.label} className="btn btn-ghost btn-sm"
                style={{ fontSize:10, padding:'4px 10px',
                  background: fromDate===q.from && toDate===q.to ? 'rgba(34,197,94,.15)' : '',
                  color:      fromDate===q.from && toDate===q.to ? 'var(--green)' : '',
                }}
                onClick={() => { setFromDate(q.from); setToDate(q.to); loadSummaryWith(q.from, q.to); }}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary preview */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Tổng doanh thu',  val:fmt(summary.kpi.totalRevenue)+' VNĐ',  color:'var(--green3)' },
            { label:'Tổng đơn hàng',   val:summary.kpi.totalOrdersAll+' đơn',      color:'var(--blue)' },
            { label:'Đơn hoàn thành',  val:summary.kpi.totalOrdersCompleted+' đơn',  color:'var(--green)' },
            { label:'Giá trị TB/đơn',  val:fmt(summary.kpi.avgOrderValue)+' VNĐ', color:'var(--amber)' },
          ].map((s,i) => (
            <div key={i} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:10, color:'var(--dim)', fontFamily:'Space Mono,monospace', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:16, fontWeight:700, color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Report types */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Chọn định dạng báo cáo</span>
          <span style={{ fontSize:10, fontFamily:'Space Mono,monospace', color:'var(--dim)' }}>
            Kỳ: {fromDate} → {toDate}
          </span>
        </div>
        {reportTypes.map((r, i) => (
          <div key={r.id} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'18px 20px',
            borderBottom: i < reportTypes.length-1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{
                width:44, height:44, borderRadius:10,
                background:r.color, border:`1px solid ${r.borderColor}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
              }}>{r.icon}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{r.title}</div>
                <div style={{ fontSize:12, color:'var(--dim)' }}>{r.desc}</div>
                <div style={{ fontSize:10, color:'var(--dim2)', fontFamily:'Space Mono,monospace', marginTop:4 }}>Định dạng: {r.format}</div>
              </div>
            </div>
            <button className={`btn ${r.btnClass}`} onClick={r.action} disabled={exporting===r.id}
              style={{ minWidth:160, justifyContent:'center' }}>
              {exporting===r.id ? '⟳ Đang xuất...' : r.btnLabel}
            </button>
          </div>
        ))}
      </div>

      {/* History note */}
      <div className="card card-body" style={{ opacity:.7 }}>
        <div style={{ fontSize:11, color:'var(--dim)', fontFamily:'Space Mono,monospace', marginBottom:8 }}>
          // Lịch sử xuất báo cáo
        </div>
        <div style={{ fontSize:12, color:'var(--dim)' }}>
          Tính năng lưu lịch sử xuất báo cáo sẽ được phát triển trong Giai đoạn 2 (Luận văn tốt nghiệp).
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
