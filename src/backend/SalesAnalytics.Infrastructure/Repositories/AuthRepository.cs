// ============================================================
// FILE: Repositories/AuthRepository.cs
// Xác thực người dùng
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
    /// Tìm user theo username — chỉ trả về user đang active VÀ đã được duyệt.
    /// Tài khoản chờ duyệt sẽ không thể đăng nhập.
    /// </summary>
    public async Task<User?> GetByUsernameAsync(string username)
        => await _db.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Username == username
                                           && u.IsActive == true
                                           && u.IsApproved == true);

    /// <summary>Lấy user theo ID (bao gồm cả chưa duyệt — dùng cho admin)</summary>
    public async Task<User?> GetByIdAsync(int id)
        => await _db.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.UserId == id && u.IsActive == true);

    /// <summary>Kiểm tra username tồn tại (kể cả chưa duyệt)</summary>
    public async Task<bool> UsernameExistsAsync(string username)
        => await _db.Users.AnyAsync(u => u.Username == username);

    /// <summary>Lấy user chờ duyệt theo username (cho error message đăng nhập)</summary>
    public async Task<User?> GetPendingByUsernameAsync(string username)
        => await _db.Users
                    .FirstOrDefaultAsync(u => u.Username == username
                                           && u.IsActive == true
                                           && u.IsApproved == false);
}