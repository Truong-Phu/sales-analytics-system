// ============================================================
// FILE: Entities/SalesChannel.cs
// Map: bảng sales_channels
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class SalesChannel
{
    public int ChannelId { get; set; }
    public string ChannelName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
