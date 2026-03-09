// ============================================================
// FILE: Entities/Role.cs
// Map: bảng roles trong PostgreSQL
// ============================================================
namespace SalesAnalytics.Core.Entities;

public class Role
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
}
