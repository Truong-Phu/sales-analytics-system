// ============================================================
// FILE: Controllers/AuthController.cs
// UC1: Đăng nhập hệ thống
// ============================================================
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using SalesAnalytics.Core.DTOs.Auth;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthRepository _authRepo;
    private readonly ILogRepository _logRepo;
    private readonly IConfiguration _config;

    public AuthController(IAuthRepository authRepo,
                          ILogRepository logRepo,
                          IConfiguration config)
    {
        _authRepo = authRepo;
        _logRepo = logRepo;
        _config = config;
    }

    // ─── POST /api/auth/login — UC1: Đăng nhập ─────────────
    /// <summary>UC1: Đăng nhập hệ thống</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Vui lòng nhập username và password." });

        // Kiểm tra user tồn tại
        var user = await _authRepo.GetByUsernameAsync(dto.Username);
        if (user == null)
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu." });

        // Xác thực password (BCrypt)
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu." });

        // Tạo JWT Token
        var token = GenerateJwtToken(user.UserId, user.Username, user.Role.RoleName);
        var expiresAt = DateTime.UtcNow.AddHours(
            double.Parse(_config["Jwt:ExpiresInHours"] ?? "8"));

        // Ghi log đăng nhập (UC8)
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _logRepo.AddAsync(user.UserId, "LOGIN", ipAddress: ip);

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

    // ─── GET /api/auth/me — Lấy thông tin user hiện tại ────
    /// <summary>Lấy thông tin người dùng đang đăng nhập</summary>
    [HttpGet("me")]
    [Authorize]
    public IActionResult GetMe()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var username = User.FindFirst(ClaimTypes.Name)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        return Ok(new { userId, username, role });
    }

    // ─── Helper: Tạo JWT Token ──────────────────────────────
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
