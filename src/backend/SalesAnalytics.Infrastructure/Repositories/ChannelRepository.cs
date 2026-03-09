// ============================================================
// FILE: Repositories/ChannelRepository.cs
// Mục đích: Quản lý kênh bán hàng — UC10: Quản lý kênh bán hàng
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Channels;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class ChannelRepository : IChannelRepository
{
    private readonly AppDbContext _db;

    public ChannelRepository(AppDbContext db) => _db = db;

    // ─── Lấy danh sách kênh bán ─────────────────────────────
    public async Task<List<ChannelDto>> GetAllAsync(bool? isActive)
    {
        var q = _db.SalesChannels.AsQueryable();

        if (isActive.HasValue)
            q = q.Where(c => c.IsActive == isActive.Value);

        return await q
            .OrderBy(c => c.ChannelId)
            .Select(c => new ChannelDto
            {
                ChannelId = c.ChannelId,
                ChannelName = c.ChannelName,
                Description = c.Description,
                IsActive = c.IsActive
            })
            .ToListAsync();
    }

    // ─── Lấy 1 kênh bán theo ID ─────────────────────────────
    public async Task<ChannelDto?> GetByIdAsync(int id)
        => await _db.SalesChannels
                    .Where(c => c.ChannelId == id)
                    .Select(c => new ChannelDto
                    {
                        ChannelId = c.ChannelId,
                        ChannelName = c.ChannelName,
                        Description = c.Description,
                        IsActive = c.IsActive
                    })
                    .FirstOrDefaultAsync();

    // ─── Tạo kênh bán mới ───────────────────────────────────
    public async Task<SalesChannel> CreateAsync(SalesChannel channel)
    {
        _db.SalesChannels.Add(channel);
        await _db.SaveChangesAsync();
        return channel;
    }

    // ─── Cập nhật kênh bán ──────────────────────────────────
    public async Task<SalesChannel?> UpdateAsync(int id, UpdateChannelDto dto)
    {
        var channel = await _db.SalesChannels.FindAsync(id);
        if (channel == null) return null;

        channel.ChannelName = dto.ChannelName;
        channel.Description = dto.Description;
        channel.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return channel;
    }

    // ─── Xóa kênh bán ───────────────────────────────────────
    public async Task<bool> DeleteAsync(int id)
    {
        var channel = await _db.SalesChannels.FindAsync(id);
        if (channel == null) return false;

        _db.SalesChannels.Remove(channel);
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Kiểm tra tên kênh đã tồn tại chưa ─────────────────
    /// <summary>
    /// Dùng khi tạo/sửa kênh để tránh trùng tên.
    /// excludeId: bỏ qua record hiện tại khi kiểm tra (dùng cho Update).
    /// </summary>
    public async Task<bool> NameExistsAsync(string name, int? excludeId = null)
        => await _db.SalesChannels
                    .AnyAsync(c => c.ChannelName == name
                               && (excludeId == null || c.ChannelId != excludeId));
}
