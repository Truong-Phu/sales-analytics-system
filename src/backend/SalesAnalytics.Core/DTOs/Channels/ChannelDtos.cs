// ============================================================
// FILE: DTOs/Channels/ChannelDtos.cs
// DTOs cho UC10: Quản lý kênh bán hàng
// ============================================================
namespace SalesAnalytics.Core.DTOs.Channels;

public class ChannelDto
{
    public int ChannelId { get; set; }
    public string ChannelName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}

public class CreateChannelDto
{
    public string ChannelName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateChannelDto
{
    public string ChannelName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}
