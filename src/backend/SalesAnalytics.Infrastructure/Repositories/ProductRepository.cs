// ============================================================
// FILE: Repositories/ProductRepository.cs
// Mục đích: Quản lý sản phẩm — UC9: Quản lý sản phẩm
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Products;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly AppDbContext _db;

    public ProductRepository(AppDbContext db) => _db = db;

    // ─── Lấy danh sách sản phẩm (phân trang + tìm kiếm) ────
    public async Task<PagedProductsDto> GetAllAsync(
        int page, int pageSize, string? search, bool? isActive)
    {
        var q = _db.Products
                   .Include(p => p.Category)
                   .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(p => p.ProductName.ToLower().Contains(search.ToLower()));

        if (isActive.HasValue)
            q = q.Where(p => p.IsActive == isActive.Value);

        var total = await q.CountAsync();

        var items = await q
            .OrderBy(p => p.CategoryId)
            .ThenBy(p => p.ProductName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductDto
            {
                ProductId    = p.ProductId,
                ProductName  = p.ProductName,
                CategoryId   = p.CategoryId,
                CategoryName = p.Category != null ? p.Category.CategoryName : null,
                Price        = p.Price,
                Unit         = p.Unit,
                IsActive     = p.IsActive,
                CreatedAt    = p.CreatedAt
            })
            .ToListAsync();

        return new PagedProductsDto
        {
            Items      = items,
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize
        };
    }

    // ─── Lấy 1 sản phẩm theo ID ─────────────────────────────
    public async Task<ProductDto?> GetByIdAsync(int id)
        => await _db.Products
                    .Include(p => p.Category)
                    .Where(p => p.ProductId == id)
                    .Select(p => new ProductDto
                    {
                        ProductId    = p.ProductId,
                        ProductName  = p.ProductName,
                        CategoryId   = p.CategoryId,
                        CategoryName = p.Category != null ? p.Category.CategoryName : null,
                        Price        = p.Price,
                        Unit         = p.Unit,
                        IsActive     = p.IsActive,
                        CreatedAt    = p.CreatedAt
                    })
                    .FirstOrDefaultAsync();

    // ─── Lấy danh sách sản phẩm đang kinh doanh (cho form đơn hàng) ─
    public async Task<List<ProductDto>> GetActiveListAsync()
        => await _db.Products
                    .Include(p => p.Category)
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.ProductName)
                    .Select(p => new ProductDto
                    {
                        ProductId    = p.ProductId,
                        ProductName  = p.ProductName,
                        CategoryId   = p.CategoryId,
                        CategoryName = p.Category != null ? p.Category.CategoryName : null,
                        Price        = p.Price,
                        Unit         = p.Unit,
                        IsActive     = p.IsActive
                    })
                    .ToListAsync();

    // ─── Tạo sản phẩm mới ───────────────────────────────────
    public async Task<Product> CreateAsync(Product product)
    {
        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        return product;
    }

    // ─── Cập nhật sản phẩm ──────────────────────────────────
    public async Task<Product?> UpdateAsync(int id, UpdateProductDto dto)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null) return null;

        product.ProductName = dto.ProductName;
        product.CategoryId  = dto.CategoryId;
        product.Price       = dto.Price;
        product.Unit        = dto.Unit;
        product.IsActive    = dto.IsActive;
        product.UpdatedAt   = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return product;
    }

    // ─── Xóa sản phẩm ───────────────────────────────────────
    public async Task<bool> DeleteAsync(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null) return false;

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
        return true;
    }
}
