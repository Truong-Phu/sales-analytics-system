// ============================================================
// FILE: Controllers/UsersController.cs
// UC2: Quản lý người dùng và phân quyền
// Quyền: Chỉ Admin
// ============================================================
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.DTOs.Users;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _repo;
    private readonly IAuthRepository _authRepo;
    private readonly ILogRepository _logRepo;

    public UsersController(
        IUserRepository repo,
        IAuthRepository authRepo,
        ILogRepository logRepo)
    {
        _repo = repo;
        _authRepo = authRepo;
        _logRepo = logRepo;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    private string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    // ─── GET /api/users ─────────────────────────────────────
    /// <summary>UC2: Xem danh sách người dùng</summary>
    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
        => Ok(await _repo.GetAllAsync(page, pageSize, search));

    // ─── GET /api/users/{id} ────────────────────────────────
    /// <summary>UC2: Xem chi tiết người dùng</summary>
    [HttpGet("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _repo.GetByIdAsync(id);
        return user == null
            ? NotFound(new { message = "Không tìm thấy người dùng." })
            : Ok(user);
    }

    // ─── POST /api/users ────────────────────────────────────
    /// <summary>UC2: Thêm người dùng mới</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Username và Password không được để trống." });

        if (await _authRepo.UsernameExistsAsync(dto.Username))
            return Conflict(new { message = $"Username '{dto.Username}' đã tồn tại." });

        var user = new User
        {
            Username = dto.Username.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName?.Trim(),
            Email = dto.Email?.Trim(),
            RoleId = dto.RoleId,
            IsActive = true
        };

        var created = await _repo.CreateAsync(user);
        await _logRepo.AddAsync(CurrentUserId, "CREATE_USER",
                                "users", created.UserId, ClientIp);

        return CreatedAtAction(nameof(GetById),
                               new { id = created.UserId },
                               await _repo.GetByIdAsync(created.UserId));
    }

    // ─── PUT /api/users/{id} ────────────────────────────────
    /// <summary>UC2: Sửa thông tin người dùng</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
    {
        var updated = await _repo.UpdateAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = "Không tìm thấy người dùng." });

        await _logRepo.AddAsync(CurrentUserId, "UPDATE_USER",
                                "users", id, ClientIp);
        return Ok(await _repo.GetByIdAsync(id));
    }

    // ─── DELETE /api/users/{id} ─────────────────────────────
    /// <summary>UC2: Xóa người dùng</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        if (id == CurrentUserId)
            return BadRequest(new
            {
                message = "Không thể tự xóa tài khoản đang đăng nhập."
            });

        var deleted = await _repo.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = "Không tìm thấy người dùng." });

        await _logRepo.AddAsync(CurrentUserId, "DELETE_USER",
                                "users", id, ClientIp);
        return NoContent();
    }

    // ─── PATCH /api/users/{id}/change-password ──────────────
    /// <summary>Đổi mật khẩu (user tự đổi)</summary>
    [HttpPatch("{id:int}/change-password")]
    public async Task<IActionResult> ChangePassword(
        int id, [FromBody] ChangePasswordDto dto)
    {
        // Chỉ cho phép đổi mật khẩu của chính mình
        if (id != CurrentUserId)
            return Forbid();

        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty;
        var user = await _authRepo.GetByUsernameAsync(username);

        if (user == null ||
            !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });

        var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _repo.ChangePasswordAsync(id, newHash);

        await _logRepo.AddAsync(CurrentUserId, "CHANGE_PASSWORD",
                                "users", id, ClientIp);
        return Ok(new { message = "Đổi mật khẩu thành công." });
    }
}
