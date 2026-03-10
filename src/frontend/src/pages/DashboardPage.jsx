// ============================================================
// FILE: src/pages/DashboardPage.jsx
// Actor: Admin, Manager
// ============================================================
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { statisticsApi } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const SCALE = { grid:{ color:'rgba(26,42,26,.5)' }, ticks:{ color:'#6b7280', font:{ family:'Space Mono', size:10 } } };
const TIP   = { backgroundColor:'#0d1409', borderColor:'#1a2a1a', borderWidth:1, titleColor:'#e8f5e9', bodyColor:'#a7f3d0' };
// Số tiền đầy đủ: 250,621,000 đ — dùng cho KPI cards và tooltip
const fmt      = n => n == null ? '—' : Math.round(n).toLocaleString('vi-VN');
// Số rút gọn cho trục Y biểu đồ: 250tr, 1.2 tỷ
const fmtAxis  = n => n >= 1e9 ? (n/1e9).toFixed(1)+'tỷ' : n >= 1e6 ? (n/1e6).toFixed(0)+'tr' : n >= 1e3 ? (n/1e3).toFixed(0)+'k' : String(Math.round(n));

export default function DashboardPage() {
  const [kpi,              setKpi]              = useState(null);
  const [revenueByDay,     setRevenueByDay]     = useState([]);
  const [revenueByMonth,   setRevenueByMonth]   = useState([]);
  const [revenueByChannel, setRevenueByChannel] = useState([]);
  const [topProducts,      setTopProducts]      = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');

  useEffect(() => {
    { const _t = document.getElementById('page-title-slot'); if (_t) _t.textContent = 'Dashboard'; }
    // Dùng range rộng: 2 năm trước đến hôm nay để bao phủ cả dữ liệu seed
    const today = new Date();
    const toDate   = today.toISOString().slice(0, 10);
    const fromDate = new Date(today.getFullYear() - 2, 0, 1).toISOString().slice(0, 10);

    Promise.all([
      statisticsApi.getKpi(),
      statisticsApi.getRevenueByDay({ fromDate, toDate }),
      statisticsApi.getRevenueByMonth({ fromDate, toDate }),
      statisticsApi.getRevenueByChannel({ fromDate, toDate }),
      statisticsApi.getTopProducts({ fromDate, toDate, limit: 5 }),
    ]).then(([k, rd, rm, rc, tp]) => {
      setKpi(k.data);
      setRevenueByDay(rd.data   || []);
      setRevenueByMonth(rm.data || []);
      setRevenueByChannel(rc.data || []);
      setTopProducts(tp.data    || []);
    }).catch(() => setError('Không thể tải dữ liệu. Kiểm tra kết nối với API.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding:60, textAlign:'center', color:'var(--dim)' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
      <div>Đang tải dữ liệu...</div>
    </div>
  );

  if (error) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
      <div style={{ color:'var(--red)', marginBottom:8 }}>{error}</div>
      <button className="btn btn-ghost" onClick={() => window.location.reload()}>Thử lại</button>
    </div>
  );

  const kpiCards = [
    { label:'Tổng doanh thu',  val:fmt(kpi?.totalRevenue)+' VNĐ',  sub:`Trung bình ${fmt(kpi?.avgOrderValue)} VNĐ/đơn`, color:'#22c55e', icon:'💰' },
    { label:'Tổng đơn hàng',   val:kpi?.totalOrdersAll ?? '—',       sub:`Doanh thu tháng này: ${fmt(kpi?.revenueThisMonth)} VNĐ`, color:'#fbbf24', icon:'📋' },
    { label:'Khách hàng',      val:kpi?.totalCustomers ?? '—',    sub:'Tổng số trong hệ thống',  color:'#60a5fa', icon:'👥' },
    { label:'Sản phẩm',        val:kpi?.totalProducts  ?? '—',    sub:'Đang kinh doanh',          color:'#a78bfa', icon:'📦' },
  ];

  const PALETTE = ['#22c55e','#4ade80','#86efac','#16a34a','#fbbf24','#60a5fa'];

  const dayLine = {
    labels: revenueByDay.map(d => d.dateLabel || ''),
    datasets: [{
      label: 'Doanh thu',
      data: revenueByDay.map(d => d.totalRevenue),
      borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.08)',
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#22c55e',
      fill: true, tension: .4,
    }],
  };

  const monthBar = {
    labels: revenueByMonth.map(r => r.monthLabel || `T${r.month}/${r.year||'25'}`),
    datasets: [
      { label:'Doanh thu (đ)', data:revenueByMonth.map(r=>r.totalRevenue), backgroundColor:'rgba(34,197,94,.25)', borderColor:'#22c55e', borderWidth:2, borderRadius:6, yAxisID:'y' },
      { label:'Đơn hàng',      data:revenueByMonth.map(r=>r.totalOrders), backgroundColor:'rgba(96,165,250,.2)', borderColor:'#60a5fa', borderWidth:2, borderRadius:6, yAxisID:'y2' },
    ],
  };

  const channelDoughnut = {
    labels: revenueByChannel.map(c => c.channelName),
    datasets: [{ data:revenueByChannel.map(c=>c.totalRevenue), backgroundColor:PALETTE, borderColor:'#0d1409', borderWidth:3 }],
  };

  return (
    <div>
      {/* KPI cards */}
      <div className="kpi-row">
        {kpiCards.map((k,i) => (
          <div key={i} className="card kpi" style={{'--kpi-color':k.color}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{color:k.color}}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Doanh thu theo ngày — line chart */}
      <div className="card card-body" style={{marginBottom:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14}}>
          <div>
            <div className="card-title">Doanh thu theo ngày</div>
            <div style={{fontSize:12,color:'var(--dim)',marginTop:2}}>
              {revenueByDay.length > 0
                ? `${revenueByDay.length} ngày có dữ liệu — từ ${revenueByDay[0]?.dateLabel} đến ${revenueByDay[revenueByDay.length-1]?.dateLabel}`
                : 'Chưa có dữ liệu trong kỳ này'}
            </div>
          </div>
        </div>
        <div style={{height:180}}>
          {revenueByDay.length > 0 ? (
            <Line data={dayLine} options={{
              responsive:true, maintainAspectRatio:false,
              plugins:{ legend:{display:false}, tooltip:{ ...TIP, callbacks:{ label: ctx => ` ${fmt(ctx.raw)} VNĐ` } } },
              scales:{ x:{...SCALE, grid:{display:false}}, y:{...SCALE, ticks:{...SCALE.ticks, callback: v => fmtAxis(v)}} },
            }}/>
          ) : (
            <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--dim)',fontSize:13}}>Không có dữ liệu để hiển thị</div>
          )}
        </div>
      </div>

      {/* Theo tháng + theo kênh */}
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:12}}>
        <div className="card card-body">
          <div style={{marginBottom:14}}>
            <div className="card-title">Doanh thu theo tháng</div>
            <div style={{fontSize:12,color:'var(--dim)',marginTop:2}}>{revenueByMonth.length} tháng có dữ liệu</div>
          </div>
          <div style={{height:200}}>
            {revenueByMonth.length > 0 ? (
              <Bar data={monthBar} options={{
                responsive:true, maintainAspectRatio:false,
                plugins:{ legend:{labels:{color:'#6b7280',font:{family:'DM Sans',size:11}}}, tooltip:TIP },
                scales:{ x:SCALE, y:{...SCALE, ticks:{...SCALE.ticks,callback:v=>fmtAxis(v)}}, y2:{grid:{display:false},ticks:{...SCALE.ticks},position:'right'} },
              }}/>
            ) : (
              <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--dim)',fontSize:13}}>Không có dữ liệu</div>
            )}
          </div>
        </div>
        <div className="card card-body">
          <div style={{marginBottom:14}}>
            <div className="card-title">Theo kênh bán</div>
            <div style={{fontSize:12,color:'var(--dim)',marginTop:2}}>{revenueByChannel.length} kênh</div>
          </div>
          <div style={{height:200}}>
            {revenueByChannel.length > 0 ? (
              <Doughnut data={channelDoughnut} options={{
                responsive:true, maintainAspectRatio:false, cutout:'65%',
                plugins:{
                  legend:{position:'right',labels:{color:'#9ca3af',font:{family:'DM Sans',size:10},boxWidth:10,padding:8}},
                  tooltip:{ ...TIP, callbacks:{ label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} VNĐ` } },
                },
              }}/>
            ) : (
              <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--dim)',fontSize:13}}>Không có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* Top sản phẩm */}
      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">🏆 Top sản phẩm bán chạy</span>
          <span style={{fontSize:12,color:'var(--dim)'}}>{topProducts.length} sản phẩm</span>
        </div>
        <table>
          <thead><tr><th>#</th><th>Sản phẩm</th><th>Danh mục</th><th>Số lượng bán</th><th>Doanh thu</th></tr></thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--dim)'}}>Không có dữ liệu</td></tr>
            ) : topProducts.map((p,i) => (
              <tr key={i}>
                <td style={{fontFamily:'Space Mono,monospace',color:i===0?'var(--green)':'var(--dim)',fontSize:12}}>{String(i+1).padStart(2,'0')}</td>
                <td style={{fontWeight:500}}>{p.productName}</td>
                <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:11,background:'rgba(96,165,250,.1)',color:'var(--blue)'}}>{p.categoryName}</span></td>
                <td style={{fontFamily:'Space Mono,monospace',fontSize:12}}>{p.totalQuantitySold?.toLocaleString()}</td>
                <td style={{color:'var(--green3)',fontFamily:'Space Mono,monospace',fontWeight:600}}>{fmt(p.totalRevenue)} VNĐ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
