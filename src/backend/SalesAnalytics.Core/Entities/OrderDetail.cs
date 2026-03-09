// ============================================================
// FILE: Entities/OrderDetail.cs
// Map: bảng order_details trong PostgreSQL
// Cột subtotal: GENERATED ALWAYS AS STORED trong DB
//   = quantity * unit_price * (1 - discount / 100)
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class OrderDetail
{
    public int OrderDetailId { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; } = 0;

    // Được tính bởi PostgreSQL (GENERATED ALWAYS AS STORED)
    // EF Core chỉ đọc, không ghi
    public decimal Subtotal { get; set; }

    // Navigation properties
    public Order Order { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
