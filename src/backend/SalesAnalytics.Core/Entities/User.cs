// ============================================================
// FILE: Entities/User.cs
// Map: bảng users trong PostgreSQL
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class User
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public int RoleId { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>
    /// TRUE  = Admin đã duyệt tài khoản
    /// FALSE = Chờ Admin/Manager duyệt (tài khoản tự đăng ký)
    /// </summary>
    public bool IsApproved { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Role Role { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Log> Logs { get; set; } = new List<Log>();
}
