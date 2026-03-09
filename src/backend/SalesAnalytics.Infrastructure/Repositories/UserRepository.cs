// ============================================================
// FILE: Repositories/UserRepository.cs
// Mục đích: Quản lý người dùng — UC2: Quản lý người dùng và phân quyền
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Users;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db) => _db = db;

    // ─── Lấy danh sách users (phân trang + tìm kiếm) ───────
    public async Task<PagedUsersDto> GetAllAsync(int page, int pageSize, string? search)
    {
        var q = _db.Users
                   .Include(u => u.Role)
                   .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => u.Username.ToLower().Contains(search.ToLower())
                          || (u.FullName != null && u.FullName.ToLower().Contains(search.ToLower()))
                          || (u.Email != null && u.Email.ToLower().Contains(search.ToLower())));

        var total = await q.CountAsync();

        var items = await q
            .OrderBy(u => u.UserId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                RoleId = u.RoleId,
                RoleName = u.Role.RoleName,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return new PagedUsersDto
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    // ─── Lấy 1 user theo ID ─────────────────────────────────
    public async Task<UserDto?> GetByIdAsync(int id)
        => await _db.Users
                    .Include(u => u.Role)
                    .Where(u => u.UserId == id)
                    .Select(u => new UserDto
                    {
                        UserId = u.UserId,
                        Username = u.Username,
                        FullName = u.FullName,
                        Email = u.Email,
                        RoleId = u.RoleId,
                        RoleName = u.Role.RoleName,
                        IsActive = u.IsActive,
                        CreatedAt = u.CreatedAt
                    })
                    .FirstOrDefaultAsync();

    // ─── Tạo user mới ───────────────────────────────────────
    public async Task<User> CreateAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    // ─── Cập nhật thông tin user ────────────────────────────
    public async Task<User?> UpdateAsync(int id, UpdateUserDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return null;

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.RoleId = dto.RoleId;
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return user;
    }

    // ─── Xóa user ───────────────────────────────────────────
    public async Task<bool> DeleteAsync(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return false;

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Đổi mật khẩu ───────────────────────────────────────
    public async Task<bool> ChangePasswordAsync(int id, string newPasswordHash)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return false;

        user.PasswordHash = newPasswordHash;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }
}
