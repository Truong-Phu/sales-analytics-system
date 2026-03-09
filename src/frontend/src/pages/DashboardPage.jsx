// ============================================================
// FILE: src/pages/DashboardPage.jsx — UC5 + UC6
// Actor: Admin, Manager
// ============================================================
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { statisticsApi } from '../services/api';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

const SCALE  = { grid:{ color:'rgba(26,42,26,.5)' }, ticks:{ color:'#6b7280', font:{ family:'Space Mono', size:10 } } };
const TIP    = { backgroundColor:'#0d1409', borderColor:'#1a2a1a', borderWidth:1, titleColor:'#e8f5e9', bodyColor:'#a7f3d0' };
const fmt    = n => n >= 1e9 ? (n/1e9).toFixed(2)+' tỷ' : n >= 1e6 ? (n/1e6).toFixed(0)+'M' : n?.toLocaleString('vi-VN') ?? '—';

export default function DashboardPage() {
  const [kpi,            setKpi]            = useState(null);
  const [revenueByDay,   setRevenueByDay]   = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [revenueByChannel, setRevenueByChannel] = useState([]);
  const [topProducts,    setTopProducts]    = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    document.getElementById('page-title-slot').textContent = 'Dashboard';
    Promise.all([
      statisticsApi.getKpi(),
      statisticsApi.getRevenueByDay(),
      statisticsApi.getRevenueByMonth(),
      statisticsApi.getRevenueByChannel(),
      statisticsApi.getTopProducts({ limit: 5 }),
    ]).then(([k, rd, rm, rc, tp]) => {
      setKpi(k.data);
      setRevenueByDay(rd.data   || []);
      setRevenueByMonth(rm.data || []);
      setRevenueByChannel(rc.data || []);
      setTopProducts(tp.data  || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding:60, textAlign:'center', color:'var(--dim)', fontFamily:'Space Mono,monospace' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
      // Đang tải dữ liệu dashboard...
    </div>
  );

  // ── KPI cards config ────────────────────────────────────
  const kpiCards = [
    { label:'Tổng doanh thu',  val:fmt(kpi?.totalRevenue)+' đ',         sub:`TB ${fmt(kpi?.avgOrderValue)}đ/đơn`,  color:'#22c55e', icon:'💰' },
    { label:'Tổng đơn hàng',   val:kpi?.totalOrders ?? '—',              sub:`Tháng này: ${fmt(kpi?.revenueThisMonth)} đ`, color:'#fbbf24', icon:'📋' },
    { label:'Khách hàng',      val:kpi?.totalCustomers ?? '—',           sub:'Tổng số khách hàng',                  color:'#60a5fa', icon:'👥' },
    { label:'Sản phẩm',        val:kpi?.totalProducts  ?? '—',           sub:'Đang kinh doanh',                     color:'#a78bfa', icon:'📦' },
  ];

  // ── Chart: Doanh thu theo ngày (Line) ───────────────────
  const dayLineData = {
    labels: revenueByDay.map(d => d.dateLabel || d.date?.slice(5)),
    datasets: [{
      label: 'Doanh thu / ngày',
      data: revenueByDay.map(d => d.revenue),
      borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.1)',
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#22c55e',
      fill: true, tension: .4,
    }],
  };

  // ── Chart: Doanh thu theo tháng (Bar) ──────────────────
  const monthBarData = {
    labels: revenueByMonth.map(r => r.monthLabel || `T${r.month}`),
    datasets: [
      { label:'Doanh thu', data:revenueByMonth.map(r=>r.revenue), backgroundColor:'rgba(34,197,94,.25)', borderColor:'#22c55e', borderWidth:2, borderRadius:6 },
      { label:'Đơn hàng',  data:revenueByMonth.map(r=>r.orderCount), backgroundColor:'rgba(96,165,250,.2)', borderColor:'#60a5fa', borderWidth:2, borderRadius:6, yAxisID:'y2' },
    ],
  };

  // ── Chart: Doanh thu theo kênh (Doughnut) ──────────────
  const channelDoughnut = {
    labels: revenueByChannel.map(c => c.channelName),
    datasets: [{
      data: revenueByChannel.map(c => c.revenue),
      backgroundColor: ['#22c55e','#4ade80','#86efac','#16a34a','#fbbf24','#60a5fa'],
      borderColor: '#0d1409', borderWidth: 3,
    }],
  };

  return (
    <div>
      {/* ── KPI Row ───────────────────────────────────────── */}
      <div className="kpi-row">
        {kpiCards.map((k,i) => (
          <div key={i} className="card kpi" style={{'--kpi-color':k.color}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{color:k.color}}>{k.val}</div>
            <div className="kpi-sub" style={{color:'var(--dim)'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Line chart (revenue by day) ─────────────── */}
      <div className="card card-body" style={{marginBottom:12}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:14}}>
          <div>
            <div className="card-title">📈 Doanh thu theo ngày</div>
            <div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>UC6: Xu hướng trong kỳ — {revenueByDay.length} ngày có dữ liệu</div>
          </div>
          <span style={{fontSize:10,fontFamily:'Space Mono,monospace',background:'rgba(34,197,94,.1)',color:'var(--green)',border:'1px solid rgba(34,197,94,.2)',borderRadius:6,padding:'3px 8px',height:'fit-content'}}>
            dashboard/revenue-by-day
          </span>
        </div>
        <div style={{height:180}}>
          <Line data={dayLineData} options={{
            responsive:true, maintainAspectRatio:false,
            plugins:{legend:{labels:{color:'#6b7280',font:{family:'DM Sans',size:11}}}, tooltip:TIP},
            scales:{x:{...SCALE, grid:{display:false}}, y:SCALE},
          }}/>
        </div>
      </div>

      {/* ── Row 2: Bar + Doughnut ──────────────────────────── */}
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, marginBottom:12}}>
        <div className="card card-body">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:14}}>
            <div>
              <div className="card-title">📊 Doanh thu theo tháng</div>
              <div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>UC5: So sánh tháng</div>
            </div>
            <span style={{fontSize:10,fontFamily:'Space Mono,monospace',background:'rgba(34,197,94,.1)',color:'var(--green)',border:'1px solid rgba(34,197,94,.2)',borderRadius:6,padding:'3px 8px',height:'fit-content'}}>UC5</span>
          </div>
          <div style={{height:200}}>
            <Bar data={monthBarData} options={{
              responsive:true, maintainAspectRatio:false,
              plugins:{legend:{labels:{color:'#6b7280',font:{family:'DM Sans',size:11}}}, tooltip:TIP},
              scales:{x:SCALE, y:SCALE, y2:{grid:{display:false},ticks:{...SCALE.ticks},position:'right'}},
            }}/>
          </div>
        </div>
        <div className="card card-body">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:14}}>
            <div>
              <div className="card-title">🥧 Theo kênh bán</div>
              <div style={{fontSize:11,color:'var(--dim)',marginTop:2}}>UC6: Phân bổ %</div>
            </div>
            <span style={{fontSize:10,fontFamily:'Space Mono,monospace',background:'rgba(34,197,94,.1)',color:'var(--green)',border:'1px solid rgba(34,197,94,.2)',borderRadius:6,padding:'3px 8px',height:'fit-content'}}>UC6</span>
          </div>
          <div style={{height:200}}>
            <Doughnut data={channelDoughnut} options={{
              responsive:true, maintainAspectRatio:false,
              plugins:{
                legend:{position:'right',labels:{color:'#9ca3af',font:{family:'DM Sans',size:11},boxWidth:10,padding:8}},
                tooltip:TIP,
              },
              cutout:'65%',
            }}/>
          </div>
        </div>
      </div>

      {/* ── Row 3: Top products table ─────────────────────── */}
      <div className="card table-wrap">
        <div className="card-header">
          <span className="card-title">🏆 Top sản phẩm bán chạy</span>
          <span style={{fontSize:11,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>UC6 · {topProducts.length} sản phẩm</span>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Sản phẩm</th><th>Danh mục</th><th>SL bán</th><th>Doanh thu</th></tr>
          </thead>
          <tbody>
            {topProducts.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'var(--dim)',fontFamily:'Space Mono,monospace'}}>// Không có dữ liệu</td></tr>
            ) : topProducts.map((p,i) => (
              <tr key={i}>
                <td style={{fontFamily:'Space Mono,monospace',color:i===0?'var(--green)':'var(--dim)',fontSize:11}}>
                  {String(i+1).padStart(2,'0')}
                </td>
                <td style={{fontWeight:500}}>{p.productName}</td>
                <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:'rgba(96,165,250,.1)',color:'var(--blue)',fontFamily:'Space Mono,monospace'}}>{p.categoryName}</span></td>
                <td style={{fontFamily:'Space Mono,monospace'}}>{p.totalQuantity}</td>
                <td style={{color:'var(--green3)',fontFamily:'Space Mono,monospace',fontWeight:600}}>{fmt(p.totalRevenue)} đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
