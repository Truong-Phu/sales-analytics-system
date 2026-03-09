// ============================================================
// FILE: Controllers/ProductsController.cs
// UC9: Quản lý sản phẩm
// ============================================================
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.DTOs.Categories;
using SalesAnalytics.Core.DTOs.Products;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductRepository _repo;
    private readonly ICategoryRepository _catRepo;
    private readonly ILogRepository _logRepo;

    public ProductsController(
        IProductRepository repo,
        ICategoryRepository catRepo,
        ILogRepository logRepo)
    {
        _repo = repo;
        _catRepo = catRepo;
        _logRepo = logRepo;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    private string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    // ─── GET /api/products ──────────────────────────────────
    /// <summary>UC9: Danh sách sản phẩm (phân trang + tìm kiếm)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
        => Ok(await _repo.GetAllAsync(page, pageSize, search, isActive));

    // ─── GET /api/products/active ───────────────────────────
    /// <summary>Lấy sản phẩm đang kinh doanh (dùng cho form nhập đơn hàng)</summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveList()
        => Ok(await _repo.GetActiveListAsync());

    // ─── GET /api/products/{id} ─────────────────────────────
    /// <summary>UC9: Xem chi tiết sản phẩm</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _repo.GetByIdAsync(id);
        return product == null
            ? NotFound(new { message = "Không tìm thấy sản phẩm." })
            : Ok(product);
    }

    // ─── POST /api/products ─────────────────────────────────
    /// <summary>UC9: Thêm sản phẩm mới (Admin)</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        if (dto.Price < 0)
            return BadRequest(new { message = "Giá sản phẩm không được âm." });

        var product = new Product
        {
            ProductName = dto.ProductName.Trim(),
            CategoryId = dto.CategoryId,
            Price = dto.Price,
            Unit = dto.Unit?.Trim(),
            IsActive = true
        };

        var created = await _repo.CreateAsync(product);
        await _logRepo.AddAsync(CurrentUserId, "CREATE_PRODUCT",
                                "products", created.ProductId, ClientIp);

        return CreatedAtAction(nameof(GetById),
                               new { id = created.ProductId },
                               await _repo.GetByIdAsync(created.ProductId));
    }

    // ─── PUT /api/products/{id} ─────────────────────────────
    /// <summary>UC9: Sửa thông tin sản phẩm (Admin)</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto dto)
    {
        if (dto.Price < 0)
            return BadRequest(new { message = "Giá sản phẩm không được âm." });

        var updated = await _repo.UpdateAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = "Không tìm thấy sản phẩm." });

        await _logRepo.AddAsync(CurrentUserId, "UPDATE_PRODUCT",
                                "products", id, ClientIp);
        return Ok(await _repo.GetByIdAsync(id));
    }

    // ─── DELETE /api/products/{id} ──────────────────────────
    /// <summary>UC9: Xóa sản phẩm (Admin)</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _repo.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = "Không tìm thấy sản phẩm." });

        await _logRepo.AddAsync(CurrentUserId, "DELETE_PRODUCT",
                                "products", id, ClientIp);
        return NoContent();
    }

    // ============================================================
    // CATEGORIES — hỗ trợ quản lý sản phẩm
    // ============================================================

    // ─── GET /api/categories ────────────────────────────────
    /// <summary>Lấy danh sách tất cả danh mục</summary>
    [HttpGet("/api/categories")]
    public async Task<IActionResult> GetCategories()
        => Ok(await _catRepo.GetAllAsync());

    // ─── POST /api/categories ───────────────────────────────
    /// <summary>Thêm danh mục mới (Admin)</summary>
    [HttpPost("/api/categories")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CategoryName))
            return BadRequest(new { message = "Tên danh mục không được để trống." });

        var category = new Category
        {
            CategoryName = dto.CategoryName.Trim(),
            Description = dto.Description?.Trim()
        };

        var created = await _catRepo.CreateAsync(category);
        await _logRepo.AddAsync(CurrentUserId, "CREATE_CATEGORY",
                                "categories", created.CategoryId, ClientIp);

        return CreatedAtAction(nameof(GetCategories),
                               await _catRepo.GetByIdAsync(created.CategoryId));
    }

    // ─── DELETE /api/categories/{id} ────────────────────────
    /// <summary>Xóa danh mục (Admin)</summary>
    [HttpDelete("/api/categories/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var deleted = await _catRepo.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = "Không tìm thấy danh mục." });

        await _logRepo.AddAsync(CurrentUserId, "DELETE_CATEGORY",
                                "categories", id, ClientIp);
        return NoContent();
    }
}
