// ============================================================
// FILE: DTOs/Logs/LogDtos.cs
// DTOs cho UC8: Ghi log và theo dõi hoạt động hệ thống
// ============================================================
namespace SalesAnalytics.Core.DTOs.Logs;

public class LogDto
{
    public int LogId { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? TableName { get; set; }
    public int? RecordId { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PagedLogsDto
{
    public List<LogDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
