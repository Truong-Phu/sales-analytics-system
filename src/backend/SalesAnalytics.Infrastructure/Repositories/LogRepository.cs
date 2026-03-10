// ============================================================
// FILE: Repositories/LogRepository.cs
// Mục đích: Ghi và xem nhật ký — UC8: Ghi log hoạt động hệ thống
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Logs;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class LogRepository : ILogRepository
{
    private readonly AppDbContext _db;

    public LogRepository(AppDbContext db) => _db = db;

    // ─── Ghi 1 bản ghi log ──────────────────────────────────
    /// <summary>
    /// Được gọi tự động ở tất cả Controllers sau mỗi thao tác.
    /// action ví dụ: "LOGIN", "CREATE_ORDER", "UPDATE_PRODUCT"...
    /// </summary>
    public async Task AddAsync(
        int userId,
        string action,
        string? tableName  = null,
        int?    recordId   = null,
        string? ipAddress  = null)
    {
        _db.Logs.Add(new Log
        {
            UserId     = userId,
            Action     = action,
            TableName  = tableName,
            RecordId   = recordId,
            IpAddress  = ipAddress,
            CreatedAt  = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    // ─── Lấy danh sách log (phân trang, lọc theo user) ──────
    public async Task<PagedLogsDto> GetAllAsync(int page, int pageSize, int? userId)
    {
        var q = _db.Logs
                   .Include(l => l.User)
                   .AsQueryable();

        if (userId.HasValue)
            q = q.Where(l => l.UserId == userId.Value);

        var total = await q.CountAsync();

        var items = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new LogDto
            {
                LogId      = l.LogId,
                UserId     = l.UserId,
                Username   = l.User.Username,
                FullName   = l.User.FullName ?? l.User.Username,
                Action     = l.Action,
                TableName  = l.TableName,
                RecordId   = l.RecordId,
                IpAddress  = l.IpAddress,
                CreatedAt  = l.CreatedAt
            })
            .ToListAsync();

        return new PagedLogsDto
        {
            Items      = items,
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize
        };
    }
}
