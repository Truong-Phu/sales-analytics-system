// ============================================================
// FILE: Entities/Log.cs
// Map: bảng logs
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class Log
{
    public int LogId { get; set; }
    public int UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? TableName { get; set; }
    public int? RecordId { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
