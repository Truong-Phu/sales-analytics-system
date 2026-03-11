// ============================================================
// FILE: Entities/ImportLog.cs
// Map: bảng import_logs — lịch sử mỗi lần import file
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class ImportLog
{
    public int      ImportId     { get; set; }
    public string   FileName     { get; set; } = string.Empty;
    public string   Source       { get; set; } = string.Empty;
    public int      TotalRows    { get; set; }
    public int      ImportedRows { get; set; }
    public int      SkippedRows  { get; set; }
    public string   Status       { get; set; } = "completed";
    public int      ImportedBy   { get; set; }
    public DateTime ImportedAt   { get; set; } = DateTime.UtcNow;
    public string?  Notes        { get; set; }
}
