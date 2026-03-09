// ============================================================
// FILE: src/pages/StatisticsPage.jsx — UC5 + UC7
// ============================================================
import { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { statisticsApi, downloadBlob } from '../services/api';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const scaleOpts = { grid:{color:'rgba(26,42,26,.5)'}, ticks:{color:'#6b7280',font:{family:'Space Mono',size:10}} };
const tooltipOpt = { backgroundColor:'#0d1409', borderColor:'#1a2a1a', borderWidth:1, titleColor:'#e8f5e9', bodyColor:'#a7f3d0' };
const fmt = n => n >= 1e9 ? (n/1e9).toFixed(2)+' tỷ' : n >= 1e6 ? (n/1e6).toFixed(0)+'M' : n?.toLocaleString('vi-VN') ?? '—';

export default function StatisticsPage() {
  const { isManager } = useAuth();
  const [fromDate, setFromDate] = useState('2025-01-01');
  const [toDate, setToDate]     = useState('2025-03-31');
  const [channelId, setChannelId] = useState('');
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [revenueByChannel, setRevenueByChannel] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { fromDate, toDate, channelId: channelId||undefined };
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
    } catch { showToast('Lỗi tải dữ liệu thống kê','error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    document.getElementById('page-title-slot').textContent = 'Thống kê & Báo cáo';
    if (isManager) loadData();
  }, [isManager]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const r = await statisticsApi.exportExcel({ fromDate, toDate });
      downloadBlob(r.data, `BaoCao_${fromDate}_${toDate}.xlsx`);
      showToast('✓ Đã xuất báo cáo Excel');
    } catch { showToast('Lỗi xuất Excel','error'); }
    finally { setExporting(false); }
  };

  if (!isManager) return <div style={{padding:40,color:'var(--red)'}}>⛔ Chỉ Admin và Manager mới xem được thống kê.</div>;

  const monthChart = {
    labels: revenueByMonth.map(r => r.monthLabel || `T${r.month}`),
    datasets: [
      { label:'Doanh thu', data:revenueByMonth.map(r=>r.revenue), borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.1)', borderWidth:2, fill:true, tension:.4, pointRadius:4, pointBackgroundColor:'#22c55e' },
      { label:'Đơn hàng',  data:revenueByMonth.map(r=>r.orderCount), borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,.05)', borderWidth:2, fill:true, tension:.4, pointRadius:3, pointBackgroundColor:'#60a5fa', yAxisID:'y2' },
    ]
  };
  const channelChart = {
    labels: revenueByChannel.map(c=>c.channelName),
    datasets: [{ data:revenueByChannel.map(c=>c.revenue), backgroundColor:['#22c55e','#4ade80','#86efac','#16a34a','#fbbf24','#60a5fa'], borderColor:'#0d1409', borderWidth:3 }]
  };
  const catChart = {
    labels: revenueByCategory.map(c=>c.categoryName),
    datasets: [{ label:'Doanh thu', data:revenueByCategory.map(c=>c.revenue), backgroundColor:'rgba(34,197,94,.2)', borderColor:'#22c55e', borderWidth:2, borderRadius:4 }]
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="card card-body" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <span style={{fontSize:10,color:'var(--dim)',fontFamily:'Space Mono,monospace',letterSpacing:'.8px',textTransform:'uppercase'}}>Kỳ:</span>
          <input type="date" className="form-input" style={{width:140}} value={fromDate} onChange={e=>setFromDate(e.target.value)}/>
          <span style={{color:'var(--dim)'}}>→</span>
          <input type="date" className="form-input" style={{width:140}} value={toDate} onChange={e=>setToDate(e.target.value)}/>
          <button className="btn btn-primary" onClick={loadData} disabled={loading} style={{marginLeft:'auto'}}>{loading?'⟳ Đang tải...':'🔄 Cập nhật'}</button>
          <button className="btn btn-export" onClick={exportExcel} disabled={exporting}>{exporting?'⟳ Đang xuất...':'⬇ Xuất Excel'}</button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid-3" style={{marginBottom:16}}>
          {[
            {label:'Tổng doanh thu',val:fmt(summary.totalRevenue)+' đ',sub:`TB: ${fmt(summary.avgOrderValue)}đ/đơn`,c:'#22c55e'},
            {label:'Tổng đơn hàng',val:summary.totalOrders+' đơn',sub:`Hoàn thành: ${summary.completedOrders}`,c:'#60a5fa'},
            {label:'Kênh hiệu quả nhất',val:revenueByChannel[0]?.channelName||'—',sub:`${fmt(revenueByChannel[0]?.revenue)} đ`,c:'#fbbf24'},
          ].map((s,i)=>(
            <div key={i} className="card card-body" style={{borderBottom:`2px solid ${s.c}`,paddingBottom:14}}>
              <div style={{fontSize:10,color:'var(--dim)',fontFamily:'Space Mono,monospace',letterSpacing:'.8px',textTransform:'uppercase',marginBottom:6}}>{s.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:'var(--text)',marginBottom:4}}>{s.val}</div>
              <div style={{fontSize:11,color:'var(--dim)'}}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:16}}>
        <div className="card card-body">
          <div style={{marginBottom:12}}>
            <div className="card-title">Xu hướng doanh thu theo tháng</div>
            <div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>UC5: Thống kê mô tả</div>
          </div>
          <div style={{height:220}}>
            <Line data={monthChart} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#6b7280',font:{family:'DM Sans',size:11}}},tooltip:tooltipOpt},scales:{x:scaleOpts,y:scaleOpts,y2:{grid:{display:false},ticks:{...scaleOpts.ticks},position:'right'}}}}/>
          </div>
        </div>
        <div className="card card-body">
          <div style={{marginBottom:12}}>
            <div className="card-title">Phân bổ theo kênh bán</div>
            <div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>UC5</div>
          </div>
          <div style={{height:220}}>
            <Pie data={channelChart} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#9ca3af',font:{family:'DM Sans',size:11},boxWidth:10,padding:8}},tooltip:tooltipOpt}}}/>
          </div>
        </div>
      </div>

      {/* Category chart */}
      <div className="card card-body" style={{marginBottom:16}}>
        <div style={{marginBottom:12}}>
          <div className="card-title">Doanh thu theo danh mục sản phẩm</div>
          <div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>UC5: Phân tích theo nhóm</div>
        </div>
        <div style={{height:180}}>
          <Bar data={catChart} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tooltipOpt},scales:{x:{...scaleOpts,grid:{display:false}},y:scaleOpts}}}/>
        </div>
      </div>

      {/* Export card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📄 Xuất báo cáo — UC7</span>
          <span style={{fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>// Tạo báo cáo tổng hợp</span>
        </div>
        {[
          {icon:'📊',name:'Báo cáo tổng hợp Excel',desc:'Sheet: Đơn hàng · Doanh thu · Top sản phẩm · Theo kênh',action:exportExcel,label:'⬇ Tải Excel',cls:'btn-export'},
          {icon:'📋',name:'Dữ liệu thô CSV',desc:'Toàn bộ đơn hàng trong kỳ đã chọn',action:()=>showToast('Tính năng đang phát triển','error'),label:'⬇ Tải CSV',cls:'btn-ghost'},
        ].map((e,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom: i===0?'1px solid var(--border)':'none'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:8,background:'rgba(34,197,94,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{e.icon}</div>
              <div><div style={{fontSize:13,fontWeight:500}}>{e.name}</div><div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>{e.desc}</div></div>
            </div>
            <button className={`btn ${e.cls}`} onClick={e.action}>{e.label}</button>
          </div>
        ))}
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
