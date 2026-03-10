// ============================================================
// FILE: DTOs/Categories/CategoryDtos.cs
// DTOs cho quản lý danh mục sản phẩm (hỗ trợ UC9)
// ============================================================
namespace SalesAnalytics.Core.DTOs.Categories;

public class CategoryDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateCategoryDto
{
    public string CategoryName { get; set; } = string.Empty;
    public string? Description { get; set; }
}
