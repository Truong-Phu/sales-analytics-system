// ============================================================
// FILE: Controllers/ChannelsController.cs
// UC10: Quản lý kênh bán hàng
// ============================================================
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.DTOs.Channels;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChannelsController : ControllerBase
{
    private readonly IChannelRepository _repo;
    private readonly ILogRepository _logRepo;

    public ChannelsController(
        IChannelRepository repo,
        ILogRepository logRepo)
    {
        _repo = repo;
        _logRepo = logRepo;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    private string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    // ─── GET /api/channels ──────────────────────────────────
    /// <summary>UC10: Xem danh sách kênh bán hàng</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? isActive = null)
        => Ok(await _repo.GetAllAsync(isActive));

    // ─── GET /api/channels/{id} ─────────────────────────────
    /// <summary>UC10: Xem chi tiết kênh bán hàng</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var channel = await _repo.GetByIdAsync(id);
        return channel == null
            ? NotFound(new { message = "Không tìm thấy kênh bán hàng." })
            : Ok(channel);
    }

    // ─── POST /api/channels ─────────────────────────────────
    /// <summary>UC10: Thêm kênh bán hàng mới (Admin)</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateChannelDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ChannelName))
            return BadRequest(new { message = "Tên kênh bán không được để trống." });

        // Kiểm tra trùng tên (theo tài liệu UC10: "Nếu tên kênh bị trùng → hệ thống báo lỗi")
        if (await _repo.NameExistsAsync(dto.ChannelName))
            return Conflict(new
            {
                message = $"Kênh bán hàng '{dto.ChannelName}' đã tồn tại."
            });

        var channel = new SalesChannel
        {
            ChannelName = dto.ChannelName.Trim(),
            Description = dto.Description?.Trim(),
            IsActive = true
        };

        var created = await _repo.CreateAsync(channel);
        await _logRepo.AddAsync(CurrentUserId, "CREATE_CHANNEL",
                                "sales_channels", created.ChannelId, ClientIp);

        return CreatedAtAction(nameof(GetById),
                               new { id = created.ChannelId },
                               await _repo.GetByIdAsync(created.ChannelId));
    }

    // ─── PUT /api/channels/{id} ─────────────────────────────
    /// <summary>UC10: Sửa kênh bán hàng (Admin)</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateChannelDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ChannelName))
            return BadRequest(new { message = "Tên kênh bán không được để trống." });

        // Kiểm tra trùng tên (bỏ qua chính nó)
        if (await _repo.NameExistsAsync(dto.ChannelName, excludeId: id))
            return Conflict(new
            {
                message = $"Tên kênh '{dto.ChannelName}' đã tồn tại."
            });

        var updated = await _repo.UpdateAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = "Không tìm thấy kênh bán hàng." });

        await _logRepo.AddAsync(CurrentUserId, "UPDATE_CHANNEL",
                                "sales_channels", id, ClientIp);
        return Ok(await _repo.GetByIdAsync(id));
    }

    // ─── DELETE /api/channels/{id} ──────────────────────────
    /// <summary>UC10: Xóa kênh bán hàng (Admin)</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _repo.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = "Không tìm thấy kênh bán hàng." });

        await _logRepo.AddAsync(CurrentUserId, "DELETE_CHANNEL",
                                "sales_channels", id, ClientIp);
        return NoContent();
    }
}
