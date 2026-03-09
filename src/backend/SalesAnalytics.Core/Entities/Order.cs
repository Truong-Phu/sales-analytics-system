// ============================================================
// FILE: Entities/Order.cs
// Map: bảng orders trong PostgreSQL
// Status hợp lệ: 'pending' | 'completed' | 'cancelled' | 'refunded'
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class Order
{
    public int OrderId { get; set; }
    public DateOnly OrderDate { get; set; } = DateOnly.FromDateTime(DateTime.Today);
    public int? CustomerId { get; set; }
    public int ChannelId { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "completed";
    public string? Note { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Customer? Customer { get; set; }
    public SalesChannel Channel { get; set; } = null!;
    public User? CreatedByUser { get; set; }
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
