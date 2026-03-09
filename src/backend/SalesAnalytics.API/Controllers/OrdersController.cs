// ============================================================
// FILE: Controllers/OrdersController.cs
// UC3: Thu thập dữ liệu bán hàng đa kênh
// UC4: Quản lý dữ liệu bán hàng (đơn hàng)
// ============================================================
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.DTOs.Orders;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Repositories;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderRepository _repo;
    private readonly ILogRepository _logRepo;

    public OrdersController(IOrderRepository repo, ILogRepository logRepo)
    {
        _repo = repo;
        _logRepo = logRepo;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    private string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    // ─── GET /api/orders ────────────────────────────────────
    /// <summary>UC4: Xem danh sách đơn hàng (lọc + phân trang)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] OrderQueryDto query)
        => Ok(await _repo.GetAllAsync(query));

    // ─── GET /api/orders/{id} ───────────────────────────────
    /// <summary>UC4: Xem chi tiết đơn hàng</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _repo.GetByIdAsync(id);
        return order == null
            ? NotFound(new { message = "Không tìm thấy đơn hàng." })
            : Ok(order);
    }

    // ─── POST /api/orders ───────────────────────────────────
    /// <summary>UC3: Tạo đơn hàng mới (nhập dữ liệu bán hàng)</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new
            {
                message = "Đơn hàng phải có ít nhất 1 sản phẩm."
            });

        if (!new[] { "pending", "completed", "cancelled", "refunded" }
                .Contains(dto.Status))
            return BadRequest(new
            {
                message = "Trạng thái không hợp lệ."
            });

        var order = new Order
        {
            OrderDate = dto.OrderDate,
            CustomerId = dto.CustomerId,
            ChannelId = dto.ChannelId,
            Status = dto.Status,
            Note = dto.Note,
            CreatedBy = CurrentUserId
        };

        var details = dto.Items.Select(i => new OrderDetail
        {
            ProductId = i.ProductId,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            Discount = i.Discount
        }).ToList();

        var created = await _repo.CreateAsync(order, details);

        await _logRepo.AddAsync(CurrentUserId, "CREATE_ORDER",
                                "orders", created.OrderId, ClientIp);

        return CreatedAtAction(nameof(GetById),
                               new { id = created.OrderId },
                               await _repo.GetByIdAsync(created.OrderId));
    }

    // ─── PUT /api/orders/{id} ───────────────────────────────
    /// <summary>UC4: Cập nhật đơn hàng</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOrderDto dto)
    {
        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new
            {
                message = "Đơn hàng phải có ít nhất 1 sản phẩm."
            });

        var updated = await _repo.UpdateAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = "Không tìm thấy đơn hàng." });

        await _logRepo.AddAsync(CurrentUserId, "UPDATE_ORDER",
                                "orders", id, ClientIp);
        return Ok(await _repo.GetByIdAsync(id));
    }

    // ─── DELETE /api/orders/{id} ────────────────────────────
    /// <summary>UC4: Xóa đơn hàng (Admin only)</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _repo.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = "Không tìm thấy đơn hàng." });

        await _logRepo.AddAsync(CurrentUserId, "DELETE_ORDER",
                                "orders", id, ClientIp);
        return NoContent();
    }
}
