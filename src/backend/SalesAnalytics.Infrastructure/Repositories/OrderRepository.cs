// ============================================================
// FILE: Repositories/OrderRepository.cs
// UC3 + UC4: Thu thập và quản lý dữ liệu bán hàng
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Orders;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public OrderRepository(AppDbContext db) => _db = db;

    // ─── Lấy danh sách đơn hàng (có phân trang + lọc) ─────
    public async Task<PagedOrdersDto> GetAllAsync(OrderQueryDto query)
    {
        var q = _db.Orders
            .Include(o => o.Customer)
            .Include(o => o.Channel)
            .Include(o => o.CreatedByUser)
            .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
            .AsQueryable();

        // Lọc theo kênh
        if (query.ChannelId.HasValue)
            q = q.Where(o => o.ChannelId == query.ChannelId);

        // Lọc theo trạng thái
        if (!string.IsNullOrEmpty(query.Status))
            q = q.Where(o => o.Status == query.Status);

        // Lọc theo khoảng ngày
        if (query.FromDate.HasValue)
            q = q.Where(o => o.OrderDate >= query.FromDate);
        if (query.ToDate.HasValue)
            q = q.Where(o => o.OrderDate <= query.ToDate);

        // Tìm kiếm theo tên khách hàng
        if (!string.IsNullOrEmpty(query.Search))
            q = q.Where(o => o.Customer != null &&
                             o.Customer.CustomerName.ToLower()
                              .Contains(query.Search.ToLower()));

        var total = await q.CountAsync();

        var orders = await q
            .OrderByDescending(o => o.OrderDate)
            .ThenByDescending(o => o.OrderId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedOrdersDto
        {
            Items = orders.Select(MapToDto).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    // ─── Lấy 1 đơn hàng theo ID ────────────────────────────
    public async Task<OrderDto?> GetByIdAsync(int id)
    {
        var order = await _db.Orders
            .Include(o => o.Customer)
            .Include(o => o.Channel)
            .Include(o => o.CreatedByUser)
            .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        return order == null ? null : MapToDto(order);
    }

    // ─── UC3: Tạo đơn hàng mới ─────────────────────────────
    public async Task<Order> CreateAsync(Order order, List<OrderDetail> details)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            _db.Orders.Add(order);
            await _db.SaveChangesAsync();

            foreach (var detail in details)
            {
                detail.OrderId = order.OrderId;
                _db.OrderDetails.Add(detail);
            }
            await _db.SaveChangesAsync();

            // total_amount được cập nhật bởi trigger trong DB
            await _db.Entry(order).ReloadAsync();

            await transaction.CommitAsync();
            return order;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // ─── UC4: Cập nhật đơn hàng ────────────────────────────
    public async Task<Order?> UpdateAsync(int id, UpdateOrderDto dto)
    {
        var order = await _db.Orders
            .Include(o => o.OrderDetails)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        if (order == null) return null;

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            order.OrderDate = dto.OrderDate;
            order.CustomerId = dto.CustomerId;
            order.ChannelId = dto.ChannelId;
            order.Status = dto.Status;
            order.Note = dto.Note;
            order.UpdatedAt = DateTime.UtcNow;

            // Xóa order_details cũ → thêm mới
            _db.OrderDetails.RemoveRange(order.OrderDetails);
            await _db.SaveChangesAsync();

            foreach (var item in dto.Items)
            {
                _db.OrderDetails.Add(new OrderDetail
                {
                    OrderId = id,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    Discount = item.Discount
                });
            }
            await _db.SaveChangesAsync();

            // Reload để lấy total_amount đã được trigger cập nhật
            await _db.Entry(order).ReloadAsync();

            await transaction.CommitAsync();
            return order;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // ─── UC4: Xóa đơn hàng ─────────────────────────────────
    public async Task<bool> DeleteAsync(int id)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null) return false;

        _db.Orders.Remove(order);
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Helper: Map Entity → DTO ──────────────────────────
    private static OrderDto MapToDto(Order o) => new()
    {
        OrderId = o.OrderId,
        OrderDate = o.OrderDate,
        CustomerId = o.CustomerId,
        CustomerName = o.Customer?.CustomerName,
        ChannelId = o.ChannelId,
        ChannelName = o.Channel?.ChannelName ?? string.Empty,
        TotalAmount = o.TotalAmount,
        Status = o.Status,
        Note = o.Note,
        CreatedByName = o.CreatedByUser?.FullName,
        CreatedAt = o.CreatedAt,
        OrderDetails = o.OrderDetails.Select(od => new OrderDetailDto
        {
            OrderDetailId = od.OrderDetailId,
            ProductId = od.ProductId,
            ProductName = od.Product?.ProductName ?? string.Empty,
            Quantity = od.Quantity,
            UnitPrice = od.UnitPrice,
            Discount = od.Discount,
            Subtotal = od.Subtotal
        }).ToList()
    };
}
