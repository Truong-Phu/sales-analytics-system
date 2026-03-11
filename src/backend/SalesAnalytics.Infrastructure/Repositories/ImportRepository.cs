// ============================================================
// FILE: Repositories/ImportRepository.cs
// UC3 Mở rộng: Lưu batch đơn hàng import vào DB
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Import;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class ImportRepository : IImportRepository
{
    private readonly AppDbContext _db;

    public ImportRepository(AppDbContext db) => _db = db;

    // ─── Kiểm tra trùng đơn ────────────────────────────────
    public async Task<bool> IsOrderExistsAsync(string externalOrderId, int channelId)
    {
        if (string.IsNullOrWhiteSpace(externalOrderId)) return false;
        return await _db.Orders.AnyAsync(o =>
            o.ExternalOrderId == externalOrderId &&
            o.ChannelId == channelId);
    }

    // ─── Lấy hoặc tạo mới Customer ────────────────────────
    public async Task<int> GetOrCreateCustomerAsync(string name, string? phone)
    {
        var existing = await FindCustomerAsync(name, phone);
        if (existing != null) return existing.CustomerId;

        var customer = new Customer
        {
            CustomerName = string.IsNullOrWhiteSpace(name) ? "Khách lẻ" : name.Trim(),
            Phone        = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
            CreatedAt    = DateTime.UtcNow,
        };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return customer.CustomerId;
    }

    // ─── Tìm customer hiện có ─────────────────────────────
    private async Task<Customer?> FindCustomerAsync(string name, string? phone)
    {
        if (!string.IsNullOrWhiteSpace(phone))
        {
            var byPhone = await _db.Customers
                .FirstOrDefaultAsync(c => c.Phone == phone.Trim());
            if (byPhone != null) return byPhone;
        }
        if (!string.IsNullOrWhiteSpace(name))
        {
            return await _db.Customers
                .FirstOrDefaultAsync(c => c.CustomerName == name.Trim());
        }
        return null;
    }

    // ─── Lấy ChannelId theo tên ───────────────────────────
    public async Task<int?> GetChannelIdByNameAsync(string channelName)
    {
        var ch = await _db.SalesChannels
            .FirstOrDefaultAsync(c =>
                EF.Functions.ILike(c.ChannelName, channelName));
        return ch?.ChannelId;
    }

    // ─── Lấy ProductId theo tên (tìm gần đúng) ────────────
    public async Task<int?> GetProductIdByNameAsync(string productName)
    {
        if (string.IsNullOrWhiteSpace(productName)) return null;
        var prod = await _db.Products
            .FirstOrDefaultAsync(p =>
                EF.Functions.ILike(p.ProductName, $"%{productName}%"));
        return prod?.ProductId;
    }

    // ─── Lưu batch vào DB ──────────────────────────────────
    public async Task<ImportResultDto> SaveImportBatchAsync(
        List<ImportRowDto> rows,
        int importedByUserId,
        string source,
        string fileName)
    {
        var result = new ImportResultDto();
        var warnings = new List<string>();

        // Cache toàn bộ channels để tránh query lặp
        var channels = await _db.SalesChannels.ToListAsync();

        // Log danh sách kênh có trong DB để dễ debug
        var channelNames = string.Join(", ", channels.Select(c => $"'{c.ChannelName}'"));

        foreach (var row in rows.Where(r => r.IsValid))
        {
            try
            {
                // ── 1. Resolve channel ───────────────────────────
                var channel = channels.FirstOrDefault(c =>
                    string.Equals(c.ChannelName.Trim(), row.ChannelName.Trim(),
                        StringComparison.OrdinalIgnoreCase));

                if (channel == null)
                {
                    warnings.Add($"Dòng {row.RowNumber}: Kênh '{row.ChannelName}' không tồn tại trong DB. " +
                                 $"Các kênh hợp lệ: {channelNames}");
                    result.SkippedRows++;
                    continue;
                }

                // ── 2. Kiểm tra trùng đơn ───────────────────────
                if (!string.IsNullOrWhiteSpace(row.ExternalOrderId))
                {
                    var dup = await IsOrderExistsAsync(row.ExternalOrderId, channel.ChannelId);
                    if (dup)
                    {
                        warnings.Add($"Dòng {row.RowNumber}: Đơn '{row.ExternalOrderId}' đã tồn tại — bỏ qua.");
                        result.SkippedRows++;
                        continue;
                    }
                }

                // ── 3. Tạo / lấy Customer ────────────────────────
                bool isNewCustomer = false;
                var existingCustomer = await FindCustomerAsync(row.CustomerName, row.CustomerPhone);
                int customerId;
                if (existingCustomer == null)
                {
                    var newCust = new Customer
                    {
                        CustomerName = string.IsNullOrWhiteSpace(row.CustomerName) ? "Khách lẻ" : row.CustomerName.Trim(),
                        Phone        = string.IsNullOrWhiteSpace(row.CustomerPhone) ? null : row.CustomerPhone.Trim(),
                        CreatedAt    = DateTime.UtcNow,
                    };
                    _db.Customers.Add(newCust);
                    await _db.SaveChangesAsync();
                    customerId = newCust.CustomerId;
                    isNewCustomer = true;
                }
                else
                {
                    customerId = existingCustomer.CustomerId;
                }

                if (isNewCustomer) result.NewCustomers++;

                // ── 4. Resolve Product (không bắt buộc) ─────────
                int? productId = null;
                if (!string.IsNullOrWhiteSpace(row.ProductName))
                    productId = await GetProductIdByNameAsync(row.ProductName);

                // ── 5. Tính toán giá trị ─────────────────────────
                var totalAmount = row.TotalAmount > 0
                    ? row.TotalAmount
                    : row.Quantity * row.UnitPrice;

                if (totalAmount <= 0)
                {
                    warnings.Add($"Dòng {row.RowNumber}: Tổng tiền = 0, đơn vẫn được tạo.");
                }

                // ── 6. Tạo Order ─────────────────────────────────
                var order = new Order
                {
                    OrderDate       = row.OrderDate ?? DateOnly.FromDateTime(DateTime.Today),
                    CustomerId      = customerId,
                    ChannelId       = channel.ChannelId,
                    TotalAmount     = totalAmount,
                    Status          = NormalizeStatus(row.Status),
                    Note            = string.IsNullOrWhiteSpace(row.Note) ? null : row.Note.Trim(),
                    ExternalOrderId = string.IsNullOrWhiteSpace(row.ExternalOrderId) ? null : row.ExternalOrderId.Trim(),
                    CreatedBy       = importedByUserId,
                    CreatedAt       = DateTime.UtcNow,
                    UpdatedAt       = DateTime.UtcNow,
                };
                _db.Orders.Add(order);
                await _db.SaveChangesAsync();

                // ── 7. Tạo OrderDetail nếu có product ────────────
                if (productId.HasValue && row.Quantity > 0)
                {
                    var unitPrice = row.UnitPrice > 0
                        ? row.UnitPrice
                        : (row.Quantity > 0 ? totalAmount / row.Quantity : 0);

                    var detail = new OrderDetail
                    {
                        OrderId   = order.OrderId,
                        ProductId = productId.Value,
                        Quantity  = row.Quantity,
                        UnitPrice = unitPrice,
                        Discount  = 0,
                    };
                    _db.OrderDetails.Add(detail);
                    await _db.SaveChangesAsync();
                }

                result.ImportedOrders++;
            }
            catch (Exception ex)
            {
                // Lấy inner exception để rõ nguyên nhân thực sự
                var msg = ex.InnerException?.Message ?? ex.Message;
                warnings.Add($"Dòng {row.RowNumber} ('{row.CustomerName}'): Lỗi DB — {msg}");
                result.SkippedRows++;

                // Detach các entity lỗi để không ảnh hưởng dòng tiếp theo
                foreach (var entry in _db.ChangeTracker.Entries()
                    .Where(e => e.State == Microsoft.EntityFrameworkCore.EntityState.Added).ToList())
                    entry.State = Microsoft.EntityFrameworkCore.EntityState.Detached;
            }
        }

        // Ghi import_log
        var log = new ImportLog
        {
            FileName     = fileName,
            Source       = source,
            TotalRows    = rows.Count,
            ImportedRows = result.ImportedOrders,
            SkippedRows  = result.SkippedRows + rows.Count(r => !r.IsValid),
            Status       = result.ImportedOrders > 0 ? "completed" : "failed",
            ImportedBy   = importedByUserId,
            ImportedAt   = DateTime.UtcNow,
            Notes        = warnings.Count > 0
                         ? string.Join("; ", warnings.Take(10))
                         : null,
        };
        _db.ImportLogs.Add(log);
        await _db.SaveChangesAsync();

        result.Warnings = warnings;
        result.Message  = $"Đã import {result.ImportedOrders} đơn hàng. "
                        + $"Bỏ qua {result.SkippedRows} dòng.";
        return result;
    }

    // ─── Lịch sử import ────────────────────────────────────
    public async Task<List<ImportHistoryDto>> GetHistoryAsync(int page, int pageSize)
    {
        return await _db.ImportLogs
            .OrderByDescending(x => x.ImportedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ImportHistoryDto
            {
                ImportId     = x.ImportId,
                FileName     = x.FileName,
                Source       = x.Source,
                TotalRows    = x.TotalRows,
                ImportedRows = x.ImportedRows,
                SkippedRows  = x.SkippedRows,
                ImportedBy   = _db.Users
                    .Where(u => u.UserId == x.ImportedBy)
                    .Select(u => u.FullName ?? u.Username)
                    .FirstOrDefault() ?? "—",
                ImportedAt   = x.ImportedAt,
                Status       = x.Status,
            })
            .ToListAsync();
    }

    // ─── Helper: chuẩn hóa status ──────────────────────────
    private static string NormalizeStatus(string raw) => raw.ToLower() switch
    {
        "completed" or "hoàn thành" or "đã giao" or "delivered" or "success" => "completed",
        "cancelled" or "hủy" or "đã hủy" or "cancel"                         => "cancelled",
        "refunded"  or "hoàn hàng" or "hoàn tiền" or "returned"               => "refunded",
        _                                                                       => "completed",
    };
}
