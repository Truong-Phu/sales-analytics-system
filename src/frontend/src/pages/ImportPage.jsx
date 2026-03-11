// ============================================================
// FILE: src/pages/ImportPage.jsx
// UC3 Mở rộng: Import đơn hàng từ file
// Actor: Admin, Staff
// Luồng: Chọn nguồn → Upload file → Xem trước → Xác nhận → Kết quả
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { importApi, downloadBlob } from '../services/api';

const SOURCE_OPTIONS = [
  {
    value: 'Template',
    label: 'File Excel mẫu',
    icon: '📋',
    desc: 'Tải file mẫu của hệ thống, điền dữ liệu rồi upload lại',
    color: '#22c55e',
    accept: '.xlsx,.csv',
  },
  {
    value: 'Shopee',
    label: 'Shopee Export',
    icon: '🛒',
    desc: 'File xuất từ Shopee Seller Center → Quản lý đơn hàng → Xuất file',
    color: '#f97316',
    accept: '.xlsx,.csv',
  },
  {
    value: 'TikTokShop',
    label: 'TikTok Shop Export',
    icon: '🎵',
    desc: 'File xuất từ TikTok Shop Seller Center → Order Management → Export',
    color: '#a855f7',
    accept: '.xlsx,.csv',
  },
];

const STEP = { SELECT: 1, UPLOAD: 2, PREVIEW: 3, RESULT: 4 };
const fmtMoney = n => n == null ? '—' : Math.round(n).toLocaleString('vi-VN');

export default function ImportPage() {
  const [step,       setStep]       = useState(STEP.SELECT);
  const [source,     setSource]     = useState(null);
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tab,        setTab]        = useState('valid'); // 'valid' | 'invalid' | 'history'
  const [history,    setHistory]    = useState([]);
  const [toast,      setToast]      = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    const _t = document.getElementById('page-title-slot');
    if (_t) _t.textContent = 'Import dữ liệu';
    loadHistory();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadHistory = async () => {
    try {
      const r = await importApi.getHistory({ page: 1, pageSize: 20 });
      setHistory(r.data || []);
    } catch {}
  };

  // ── Tải file mẫu ──────────────────────────────────────────
  const downloadTemplate = async () => {
    setLoading(true);
    try {
      const r = await importApi.downloadTemplate();
      downloadBlob(r.data, 'Template_NhapDonHang.xlsx');
      showToast('✓ Đã tải file mẫu');
    } catch { showToast('Lỗi tải file mẫu', 'error'); }
    finally { setLoading(false); }
  };

  // ── Upload & preview ───────────────────────────────────────
  const handleUpload = async () => {
    if (!file) { showToast('Vui lòng chọn file', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('source', source.value);
      const r = await importApi.preview(fd);
      setPreview(r.data);
      setStep(STEP.PREVIEW);
    } catch (e) {
      showToast(e?.response?.data?.message || 'Lỗi đọc file. Kiểm tra định dạng.', 'error');
    } finally { setUploading(false); }
  };

  // ── Confirm import ─────────────────────────────────────────
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const r = await importApi.confirm({
        sessionId: preview.sessionId,
        skipInvalidRows: true,
        skipDuplicates: true,
      });
      setResult(r.data);
      setStep(STEP.RESULT);
      loadHistory();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Lỗi khi import', 'error');
    } finally { setConfirming(false); }
  };

  const reset = () => {
    setStep(STEP.SELECT); setSource(null); setFile(null);
    setPreview(null); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ════════════════ RENDER ════════════════════════════════════
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '10px 20px', borderRadius: 8, fontFamily: 'Space Mono,monospace', fontSize: 13,
          background: toast.type === 'error' ? '#7f1d1d' : '#14532d',
          border: `1px solid ${toast.type === 'error' ? '#dc2626' : '#16a34a'}`,
          color: '#e8f5e9', boxShadow: '0 4px 20px rgba(0,0,0,.4)',
        }}>{toast.msg}</div>
      )}

      {/* Thanh bước */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--card)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {[
          { n: STEP.SELECT,  label: '1. Chọn nguồn' },
          { n: STEP.UPLOAD,  label: '2. Upload file' },
          { n: STEP.PREVIEW, label: '3. Xem trước' },
          { n: STEP.RESULT,  label: '4. Kết quả' },
        ].map(s => (
          <div key={s.n} style={{
            flex: 1, padding: '12px 8px', textAlign: 'center', fontSize: 12,
            fontFamily: 'Space Mono,monospace',
            background: step === s.n ? 'rgba(34,197,94,.15)' : 'transparent',
            color: step === s.n ? 'var(--green)' : step > s.n ? 'var(--green3)' : 'var(--dim)',
            borderRight: '1px solid var(--border)',
            fontWeight: step === s.n ? 700 : 400,
          }}>
            {step > s.n ? '✓ ' : ''}{s.label}
          </div>
        ))}
      </div>

      {/* ── BƯỚC 1: Chọn nguồn ─────────────────────────────── */}
      {step === STEP.SELECT && (
        <div>
          <div style={{ marginBottom: 16, color: 'var(--dim)', fontSize: 13 }}>
            Chọn nguồn dữ liệu muốn import vào hệ thống:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {SOURCE_OPTIONS.map(opt => (
              <div key={opt.value}
                className="card"
                onClick={() => setSource(opt)}
                style={{
                  padding: 20, cursor: 'pointer',
                  border: `2px solid ${source?.value === opt.value ? opt.color : 'var(--border)'}`,
                  background: source?.value === opt.value ? `${opt.color}18` : 'var(--card)',
                  transition: 'all .2s',
                }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{opt.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 4, color: opt.color }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>{opt.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary"
              disabled={!source}
              onClick={() => setStep(STEP.UPLOAD)}>
              Tiếp theo →
            </button>
            {source?.value === 'Template' && (
              <button className="btn btn-ghost" onClick={downloadTemplate} disabled={loading}>
                {loading ? '⟳' : '⬇'} Tải file mẫu (.xlsx)
              </button>
            )}
          </div>

          {/* Hướng dẫn */}
          {source && (
            <div className="card card-body" style={{ marginTop: 20, fontSize: 12, color: 'var(--dim)', lineHeight: 1.8 }}>
              {source.value === 'Template' && <>
                <strong style={{ color: 'var(--text)' }}>Hướng dẫn dùng file mẫu:</strong><br/>
                1. Tải file mẫu bằng nút bên trên<br/>
                2. Điền dữ liệu đơn hàng vào file (giữ nguyên header)<br/>
                3. Lưu file và upload ở bước tiếp theo
              </>}
              {source.value === 'Shopee' && <>
                <strong style={{ color: 'var(--text)' }}>Hướng dẫn xuất file từ Shopee:</strong><br/>
                1. Đăng nhập Shopee Seller Center → <strong>Quản lý đơn hàng</strong><br/>
                2. Lọc khoảng thời gian muốn xuất<br/>
                3. Nhấn <strong>Xuất file</strong> → Tải về file .xlsx<br/>
                4. Upload file đó ở bước tiếp theo
              </>}
              {source.value === 'TikTokShop' && <>
                <strong style={{ color: 'var(--text)' }}>Hướng dẫn xuất file từ TikTok Shop:</strong><br/>
                1. Đăng nhập TikTok Shop Seller Center → <strong>Order Management</strong><br/>
                2. Chọn khoảng thời gian → <strong>Export</strong><br/>
                3. Tải file .xlsx về máy<br/>
                4. Upload file đó ở bước tiếp theo
              </>}
            </div>
          )}
        </div>
      )}

      {/* ── BƯỚC 2: Upload file ─────────────────────────────── */}
      {step === STEP.UPLOAD && (
        <div>
          <div className="card card-body" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{source?.icon}</span>
              <div>
                <div style={{ fontWeight: 700 }}>{source?.label}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)' }}>Chấp nhận: {source?.accept}</div>
              </div>
            </div>

            {/* Drop zone */}
            <label style={{
              display: 'block', padding: '40px 20px', textAlign: 'center',
              border: `2px dashed ${file ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 8, cursor: 'pointer',
              background: file ? 'rgba(34,197,94,.05)' : 'transparent',
              transition: 'all .2s',
            }}>
              <input ref={fileRef} type="file" accept={source?.accept}
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0] || null)} />
              {file ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div style={{ color: 'var(--green)', fontWeight: 600 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB — Nhấn để chọn file khác
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
                  <div style={{ color: 'var(--dim)' }}>Kéo thả file hoặc <span style={{ color: 'var(--green)' }}>nhấn để chọn</span></div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Hỗ trợ .xlsx và .csv, tối đa 10MB</div>
                </div>
              )}
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(STEP.SELECT)}>← Quay lại</button>
            <button className="btn btn-primary" disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? '⟳ Đang đọc file...' : '🔍 Đọc & xem trước'}
            </button>
          </div>
        </div>
      )}

      {/* ── BƯỚC 3: Preview ─────────────────────────────────── */}
      {step === STEP.PREVIEW && preview && (
        <div>
          {/* Tóm tắt */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Tổng dòng',   val: preview.totalRows,   color: 'var(--dim)' },
              { label: 'Hợp lệ',      val: preview.validRows,   color: 'var(--green)' },
              { label: 'Lỗi',         val: preview.invalidRows, color: preview.invalidRows > 0 ? '#ef4444' : 'var(--dim)' },
              { label: 'Trùng lặp',   val: preview.duplicateRows, color: 'var(--amber)' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Tab valid / invalid */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[
              { key: 'valid',   label: `✓ Hợp lệ (${preview.validRows})` },
              { key: 'invalid', label: `✗ Lỗi (${preview.invalidRows})` },
            ].map(t => (
              <button key={t.key}
                className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Bảng preview */}
          <div className="card" style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(34,197,94,.08)' }}>
                  {['Dòng','Mã đơn','Ngày','Khách hàng','Kênh','Sản phẩm','SL','Tổng tiền','Trạng thái','Lỗi'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--dim)',
                      fontFamily: 'Space Mono,monospace', fontSize: 10, borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter(r => tab === 'valid' ? r.isValid : !r.isValid)
                  .slice(0, 50)
                  .map((row, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid var(--border)',
                      background: !row.isValid ? 'rgba(239,68,68,.05)' : 'transparent',
                    }}>
                      <td style={{ padding: '7px 10px', color: 'var(--dim)' }}>{row.rowNumber}</td>
                      <td style={{ padding: '7px 10px', fontFamily: 'Space Mono,monospace', fontSize: 11 }}>
                        {row.externalOrderId || '—'}
                      </td>
                      <td style={{ padding: '7px 10px' }}>{row.orderDateRaw}</td>
                      <td style={{ padding: '7px 10px' }}>{row.customerName}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10,
                          background: 'rgba(34,197,94,.1)', color: 'var(--green)' }}>
                          {row.channelName}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', maxWidth: 160, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.productName || '—'}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>{row.quantity || '—'}</td>
                      <td style={{ padding: '7px 10px', fontFamily: 'Space Mono,monospace', color: 'var(--green3)' }}>
                        {fmtMoney(row.totalAmount)} VNĐ
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10,
                          background: row.status === 'completed' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                          color: row.status === 'completed' ? 'var(--green)' : '#ef4444' }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: '#ef4444', fontSize: 11 }}>
                        {row.errors?.join(', ') || ''}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {preview.rows.filter(r => tab === 'valid' ? r.isValid : !r.isValid).length > 50 && (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--dim)', textAlign: 'center' }}>
                Hiển thị 50/{preview.rows.filter(r => tab === 'valid' ? r.isValid : !r.isValid).length} dòng
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={() => setStep(STEP.UPLOAD)}>← Quay lại</button>
            <button className="btn btn-primary"
              disabled={preview.validRows === 0 || confirming}
              onClick={handleConfirm}>
              {confirming ? '⟳ Đang import...' : `✓ Xác nhận import ${preview.validRows} đơn hàng`}
            </button>
            {preview.invalidRows > 0 && (
              <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                {preview.invalidRows} dòng lỗi sẽ bị bỏ qua tự động
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── BƯỚC 4: Kết quả ─────────────────────────────────── */}
      {step === STEP.RESULT && result && (
        <div>
          <div className="card card-body" style={{ textAlign: 'center', padding: '40px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>
              {result.importedOrders > 0 ? '✅' : '⚠️'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--green)' }}>
              {result.message}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20 }}>
              {[
                { label: 'Đơn hàng đã import', val: result.importedOrders, c: 'var(--green)' },
                { label: 'Dòng bỏ qua',        val: result.skippedRows,    c: 'var(--dim)' },
                { label: 'Khách hàng mới',      val: result.newCustomers,   c: 'var(--blue,#60a5fa)' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: s.c }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {result.warnings?.length > 0 && (
            <div className="card card-body" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#fbbf24' }}>
                ⚠️ Cảnh báo ({result.warnings.length})
              </div>
              {result.warnings.slice(0, 10).map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--dim)', padding: '3px 0',
                  borderBottom: '1px solid var(--border)' }}>
                  {w}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={reset}>+ Import file khác</button>
            <a href="/orders" className="btn btn-ghost">Xem danh sách đơn hàng →</a>
          </div>
          {result.importedOrders > 0 && (
            <div className="card card-body" style={{ marginTop: 16, fontSize: 12, color: 'var(--dim)' }}>
              💡 <strong style={{ color: 'var(--text)' }}>Không thấy đơn mới?</strong> — Trang Đơn hàng lọc theo khoảng thời gian.
              Vào <strong>Đơn hàng</strong> và điều chỉnh bộ lọc ngày để bao phủ ngày trong file vừa import.
            </div>
          )}
        </div>
      )}

      {/* ── Lịch sử import ────────────────────────────────────── */}
      {step === STEP.SELECT && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--dim)',
            fontFamily: 'Space Mono,monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px' }}>
            Lịch sử import gần đây
          </div>
          {history.length === 0 ? (
            <div className="card card-body" style={{ textAlign: 'center', color: 'var(--dim)', padding: 30 }}>
              Chưa có lịch sử import nào
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(34,197,94,.08)' }}>
                    {['Tên file','Nguồn','Tổng dòng','Đã import','Bỏ qua','Người thực hiện','Thời gian','Trạng thái'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--dim)',
                        fontFamily: 'Space Mono,monospace', fontSize: 10, borderBottom: '1px solid var(--border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 10px', maxWidth: 200, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📄 {h.fileName}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'Space Mono,monospace',
                          background: 'rgba(34,197,94,.1)', color: 'var(--green)' }}>
                          {h.source}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>{h.totalRows}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{h.importedRows}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--dim)' }}>{h.skippedRows}</td>
                      <td style={{ padding: '7px 10px' }}>{h.importedBy}</td>
                      <td style={{ padding: '7px 10px', fontFamily: 'Space Mono,monospace', fontSize: 10, color: 'var(--dim)' }}>
                        {new Date(h.importedAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10,
                          background: h.status === 'completed' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                          color: h.status === 'completed' ? 'var(--green)' : '#ef4444' }}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
