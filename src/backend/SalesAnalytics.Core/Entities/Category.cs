// ============================================================
// FILE: Entities/Category.cs
// Map: bảng categories
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class Category
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
