// ============================================================
// FILE: Repositories/AuthRepository.cs
// Mục đích: Xác thực người dùng — UC1: Đăng nhập hệ thống
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class AuthRepository : IAuthRepository
{
    private readonly AppDbContext _db;

    public AuthRepository(AppDbContext db) => _db = db;

    /// <summary>
    /// Tìm user theo username (chỉ lấy user đang active).
    /// Include Role để lấy tên vai trò khi tạo JWT.
    /// </summary>
    public async Task<User?> GetByUsernameAsync(string username)
        => await _db.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Username == username
                                           && u.IsActive == true);

    /// <summary>
    /// Kiểm tra username đã tồn tại chưa (dùng khi tạo user mới — UC2).
    /// </summary>
    public async Task<bool> UsernameExistsAsync(string username)
        => await _db.Users.AnyAsync(u => u.Username == username);
}
