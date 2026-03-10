// ============================================================
// FILE: Controllers/AuthController.cs
// UC1: Đăng nhập, Đăng xuất, Đăng ký tự đăng ký, Đổi mật khẩu
// ============================================================
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using SalesAnalytics.Core.DTOs.Auth;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthRepository _authRepo;
    private readonly IUserRepository _userRepo;
    private readonly ILogRepository _logRepo;
    private readonly IConfiguration _config;

    public AuthController(IAuthRepository authRepo,
                          IUserRepository userRepo,
                          ILogRepository logRepo,
                          IConfiguration config)
    {
        _authRepo = authRepo;
        _userRepo = userRepo;
        _logRepo = logRepo;
        _config = config;
    }

    // ─── POST /api/auth/login — UC1 ────────────────────────
    /// <summary>Đăng nhập hệ thống, nhận JWT token</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Vui lòng nhập username và password." });

        var user = await _authRepo.GetByUsernameAsync(dto.Username);
        if (user == null)
        {
            // Check if username exists but account is pending approval
            var pendingUser = await _authRepo.GetPendingByUsernameAsync(dto.Username);
            if (pendingUser != null)
                return Unauthorized(new { message = "Tài khoản đang chờ Admin phê duyệt. Vui lòng liên hệ quản trị viên." });
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu." });
        }
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu." });

        var token = GenerateJwtToken(user.UserId, user.Username, user.Role.RoleName);
        var expiresAt = DateTime.UtcNow.AddHours(
            double.Parse(_config["Jwt:ExpiresInHours"] ?? "8"));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _logRepo.AddAsync(user.UserId, $"LOGIN: {user.Username}", ipAddress: ip);

        return Ok(new LoginResponseDto
        {
            Token = token,
            UserId = user.UserId,
            Username = user.Username,
            FullName = user.FullName ?? user.Username,
            Role = user.Role.RoleName,
            ExpiresAt = expiresAt
        });
    }

    // ─── POST /api/auth/logout — UC1 ───────────────────────
    /// <summary>Đăng xuất — ghi log, client xóa token</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "";
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        await _logRepo.AddAsync(userId, $"LOGOUT: {username}", ipAddress: ip);
        // JWT là stateless — client tự xóa token
        return Ok(new LogoutResponseDto { Message = "Đăng xuất thành công." });
    }

    // ─── POST /api/auth/register — Tự đăng ký ─────────────
    /// <summary>
    /// Tự đăng ký tài khoản Staff mới.
    /// Tài khoản mới luôn có role = Staff, chờ Admin kích hoạt nếu cần.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Username và mật khẩu là bắt buộc." });

        if (dto.Password.Length < 8)
            return BadRequest(new { message = "Mật khẩu phải có ít nhất 8 ký tự." });

        if (await _authRepo.UsernameExistsAsync(dto.Username))
            return Conflict(new { message = "Username đã tồn tại, vui lòng chọn tên khác." });

        // Tạo user mới với role Staff (roleId = 2)
        var newUser = new User
        {
            Username = dto.Username.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName?.Trim() ?? dto.Username,
            Email = dto.Email?.Trim(),
            RoleId = 2, // Staff
            IsActive = true,
            IsApproved = false, // Chờ Admin duyệt
            CreatedAt = DateTime.UtcNow,
        };

        var created = await _userRepo.CreateAsync(newUser);

        await _logRepo.AddAsync(created.UserId,
            $"REGISTER: tài khoản mới '{created.Username}' (Staff)",
            ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString());

        return CreatedAtAction(nameof(Login), new
        {
            message = "Đăng ký thành công! Tài khoản đang chờ Admin phê duyệt.",
            username = created.Username,
            role = "Staff"
        });
    }

    // ─── POST /api/auth/change-password ────────────────────
    /// <summary>Đổi mật khẩu cho tài khoản đang đăng nhập</summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CurrentPassword) ||
            string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest(new { message = "Vui lòng nhập đầy đủ thông tin." });

        if (dto.NewPassword.Length < 8)
            return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 8 ký tự." });

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var user = await _authRepo.GetByIdAsync(userId);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return Unauthorized(new { message = "Mật khẩu hiện tại không đúng." });

        var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _userRepo.ChangePasswordAsync(userId, newHash);

        await _logRepo.AddAsync(userId, $"CHANGE_PASSWORD: {user.Username}",
            ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString());

        return Ok(new { message = "Đổi mật khẩu thành công." });
    }

    // ─── GET /api/auth/me ───────────────────────────────────
    /// <summary>Lấy thông tin user đang đăng nhập</summary>
    [HttpGet("me")]
    [Authorize]
    public IActionResult GetMe()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var username = User.FindFirst(ClaimTypes.Name)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        return Ok(new { userId, username, role });
    }

    // ─── Private: Tạo JWT ──────────────────────────────────
    private string GenerateJwtToken(int userId, string username, string role)
    {
        var key = new SymmetricSecurityKey(
                          Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddHours(
                          double.Parse(_config["Jwt:ExpiresInHours"] ?? "8"));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name,           username),
            new Claim(ClaimTypes.Role,           role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
