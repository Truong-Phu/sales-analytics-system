// ============================================================
// PRODUCT DTOs — UC9: Quản lý sản phẩm
// ============================================================
namespace SalesAnalytics.Core.DTOs.Products;

public class ProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public decimal Price { get; set; }
    public string? Unit { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateProductDto
{
    public string ProductName { get; set; } = string.Empty;
    public int? CategoryId { get; set; }
    public decimal Price { get; set; }
    public string? Unit { get; set; }
}

public class UpdateProductDto
{
    public string ProductName { get; set; } = string.Empty;
    public int? CategoryId { get; set; }
    public decimal Price { get; set; }
    public string? Unit { get; set; }
    public bool IsActive { get; set; }
}

public class PagedProductsDto
{
    public List<ProductDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
