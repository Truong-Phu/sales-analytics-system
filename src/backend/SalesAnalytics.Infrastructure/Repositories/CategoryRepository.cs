// ============================================================
// FILE: Repositories/CategoryRepository.cs
// Mục đích: Quản lý danh mục sản phẩm (hỗ trợ UC9)
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Categories;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly AppDbContext _db;

    public CategoryRepository(AppDbContext db) => _db = db;

    // ─── Lấy tất cả danh mục ────────────────────────────────
    public async Task<List<CategoryDto>> GetAllAsync()
        => await _db.Categories
                    .OrderBy(c => c.CategoryId)
                    .Select(c => new CategoryDto
                    {
                        CategoryId = c.CategoryId,
                        CategoryName = c.CategoryName,
                        Description = c.Description
                    })
                    .ToListAsync();

    // ─── Lấy 1 danh mục theo ID ─────────────────────────────
    public async Task<CategoryDto?> GetByIdAsync(int id)
        => await _db.Categories
                    .Where(c => c.CategoryId == id)
                    .Select(c => new CategoryDto
                    {
                        CategoryId = c.CategoryId,
                        CategoryName = c.CategoryName,
                        Description = c.Description
                    })
                    .FirstOrDefaultAsync();

    // ─── Tạo danh mục mới ───────────────────────────────────
    public async Task<Category> CreateAsync(Category category)
    {
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();
        return category;
    }

    // ─── Xóa danh mục ───────────────────────────────────────
    /// <summary>
    /// Lưu ý: nếu danh mục đang có sản phẩm liên kết,
    /// FK sẽ SET NULL (products.category_id = NULL).
    /// </summary>
    public async Task<bool> DeleteAsync(int id)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null) return false;

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return true;
    }
}
