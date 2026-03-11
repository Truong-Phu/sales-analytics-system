// ============================================================
// FILE: DTOs/Import/ImportDtos.cs
// Dùng cho UC3 mở rộng: Import đơn hàng từ file Excel/CSV
// Hỗ trợ 3 nguồn: Template chuẩn | Shopee Export | TikTok Shop Export
// ============================================================

namespace SalesAnalytics.Core.DTOs.Import;

// ─── Nguồn import ──────────────────────────────────────────
public enum ImportSource
{
    Template   = 1,   // File Excel/CSV theo mẫu của hệ thống
    Shopee     = 2,   // File xuất từ Shopee Seller Center
    TikTokShop = 3,   // File xuất từ TikTok Shop Seller Center
}

// ─── 1 dòng trong file — sau khi parse ─────────────────────
public class ImportRowDto
{
    public int    RowNumber       { get; set; }  // Số dòng trong file gốc
    public string ExternalOrderId { get; set; } = string.Empty; // Mã đơn từ sàn
    public string OrderDateRaw    { get; set; } = string.Empty; // Ngày gốc từ file
    public DateOnly? OrderDate    { get; set; }
    public string CustomerName    { get; set; } = string.Empty;
    public string? CustomerPhone  { get; set; }
    public string ChannelName     { get; set; } = string.Empty;
    public string ProductName     { get; set; } = string.Empty;
    public int    Quantity        { get; set; }
    public decimal UnitPrice      { get; set; }
    public decimal TotalAmount    { get; set; }
    public string Status          { get; set; } = "completed";
    public string? Note           { get; set; }

    // Kết quả validate
    public bool   IsValid         { get; set; } = true;
    public List<string> Errors    { get; set; } = new();
}

// ─── Kết quả preview (trả về sau khi upload) ───────────────
public class ImportPreviewDto
{
    public string   FileName       { get; set; } = string.Empty;
    public string   Source         { get; set; } = string.Empty;
    public int      TotalRows      { get; set; }
    public int      ValidRows      { get; set; }
    public int      InvalidRows    { get; set; }
    public int      DuplicateRows  { get; set; }
    public List<ImportRowDto> Rows { get; set; } = new();
    public string   SessionId      { get; set; } = string.Empty; // dùng để confirm
}

// ─── Request confirm import ─────────────────────────────────
public class ImportConfirmDto
{
    public string SessionId         { get; set; } = string.Empty;
    public bool   SkipInvalidRows   { get; set; } = true;  // bỏ qua dòng lỗi
    public bool   SkipDuplicates    { get; set; } = true;  // bỏ qua đơn trùng
}

// ─── Kết quả sau khi confirm ────────────────────────────────
public class ImportResultDto
{
    public int  ImportedOrders   { get; set; }
    public int  SkippedRows      { get; set; }
    public int  NewCustomers     { get; set; } // khách hàng mới được tạo tự động
    public List<string> Warnings { get; set; } = new();
    public string Message        { get; set; } = string.Empty;
}

// ─── 1 bản ghi lịch sử import ──────────────────────────────
public class ImportHistoryDto
{
    public int      ImportId       { get; set; }
    public string   FileName       { get; set; } = string.Empty;
    public string   Source         { get; set; } = string.Empty;
    public int      TotalRows      { get; set; }
    public int      ImportedRows   { get; set; }
    public int      SkippedRows    { get; set; }
    public string   ImportedBy     { get; set; } = string.Empty;
    public DateTime ImportedAt     { get; set; }
    public string   Status         { get; set; } = string.Empty;
}
