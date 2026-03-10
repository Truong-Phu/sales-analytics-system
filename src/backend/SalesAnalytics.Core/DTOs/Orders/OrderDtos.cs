// ============================================================
// ORDER DTOs — UC3+UC4: Thu thập và quản lý dữ liệu bán hàng
// ============================================================
namespace SalesAnalytics.Core.DTOs.Orders;

public class OrderDetailDto
{
    public int OrderDetailId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; }
    public decimal Subtotal { get; set; }
}

public class OrderDto
{
    public int OrderId { get; set; }
    public DateOnly OrderDate { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int ChannelId { get; set; }
    public string ChannelName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OrderDetailDto> OrderDetails { get; set; } = new();
}

public class CreateOrderDetailDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; } = 0;
}

public class CreateOrderDto
{
    public DateOnly OrderDate { get; set; } = DateOnly.FromDateTime(DateTime.Today);
    public int? CustomerId { get; set; }
    public int ChannelId { get; set; }
    public string Status { get; set; } = "completed";
    public string? Note { get; set; }
    public List<CreateOrderDetailDto> Items { get; set; } = new();
}

public class UpdateOrderDto
{
    public DateOnly OrderDate { get; set; }
    public int? CustomerId { get; set; }
    public int ChannelId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public List<CreateOrderDetailDto> Items { get; set; } = new();
}

public class OrderQueryDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public int? ChannelId { get; set; }
    public string? Status { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}

public class PagedOrdersDto
{
    public List<OrderDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
