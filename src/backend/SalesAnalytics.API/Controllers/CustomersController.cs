// ============================================================
// FILE: Controllers/CustomersController.cs
// UC11: Quản lý khách hàng
// ============================================================
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.DTOs.Customers;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerRepository _repo;
    private readonly ILogRepository      _logRepo;

    public CustomersController(
        ICustomerRepository repo,
        ILogRepository      logRepo)
    {
        _repo    = repo;
        _logRepo = logRepo;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    private string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    // ─── GET /api/customers ─────────────────────────────────
    /// <summary>UC11: Xem danh sách khách hàng</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20,
        [FromQuery] string? search   = null)
        => Ok(await _repo.GetAllAsync(page, pageSize, search));

    // ─── GET /api/customers/{id} ────────────────────────────
    /// <summary>UC11: Xem chi tiết khách hàng</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var customer = await _repo.GetByIdAsync(id);
        return customer == null
            ? NotFound(new { message = "Không tìm thấy khách hàng." })
            : Ok(customer);
    }

    // ─── POST /api/customers ────────────────────────────────
    /// <summary>UC11: Thêm khách hàng mới</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Create([FromBody] CreateCustomerDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            return BadRequest(new { message = "Tên khách hàng không được để trống." });

        var customer = new Customer
        {
            CustomerName = dto.CustomerName.Trim(),
            Phone        = dto.Phone?.Trim(),
            Email        = dto.Email?.Trim(),
            Address      = dto.Address?.Trim()
        };

        var created = await _repo.CreateAsync(customer);
        await _logRepo.AddAsync(CurrentUserId, "CREATE_CUSTOMER",
                                "customers", created.CustomerId, ClientIp);

        return CreatedAtAction(nameof(GetById),
                               new { id = created.CustomerId },
                               await _repo.GetByIdAsync(created.CustomerId));
    }

    // ─── PUT /api/customers/{id} ────────────────────────────
    /// <summary>UC11: Sửa thông tin khách hàng</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCustomerDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            return BadRequest(new { message = "Tên khách hàng không được để trống." });

        var updated = await _repo.UpdateAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = "Không tìm thấy khách hàng." });

        await _logRepo.AddAsync(CurrentUserId, "UPDATE_CUSTOMER",
                                "customers", id, ClientIp);
        return Ok(await _repo.GetByIdAsync(id));
    }

    // ─── DELETE /api/customers/{id} ─────────────────────────
    /// <summary>UC11: Xóa khách hàng (Admin only)</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _repo.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = "Không tìm thấy khách hàng." });

        await _logRepo.AddAsync(CurrentUserId, "DELETE_CUSTOMER",
                                "customers", id, ClientIp);
        return NoContent();
    }
}
