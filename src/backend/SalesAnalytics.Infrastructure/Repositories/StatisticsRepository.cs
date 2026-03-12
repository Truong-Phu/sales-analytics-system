// ============================================================
// FILE: Repositories/StatisticsRepository.cs
// UC5: Thống kê & phân tích | UC6: Dashboard | UC7: Báo cáo
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Statistics;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class StatisticsRepository : IStatisticsRepository
{
    private readonly AppDbContext _db;
    public StatisticsRepository(AppDbContext db) => _db = db;

    // ─── UC6: KPI Dashboard (toàn bộ DB) ──────────────────
    public async Task<DashboardKpiDto> GetDashboardKpiAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var thisMonth = today.Month;
        var thisYear = today.Year;

        var orders = await _db.Orders.ToListAsync();
        var totalCustomers = await _db.Customers.CountAsync();
        var totalProducts = await _db.Products.CountAsync();

        return new DashboardKpiDto
        {
            TotalOrdersAll = orders.Count,
            TotalOrdersCompleted = orders.Count(o => o.Status == "completed"),
            TotalOrdersCancelled = orders.Count(o => o.Status == "cancelled"),
            TotalOrdersRefunded = orders.Count(o => o.Status == "refunded"),
            TotalRevenue = orders.Where(o => o.Status == "completed")
                                         .Sum(o => o.TotalAmount),
            AvgOrderValue = orders.Any(o => o.Status == "completed")
                                       ? orders.Where(o => o.Status == "completed")
                                               .Average(o => o.TotalAmount)
                                       : 0,
            OrdersThisMonth = orders.Count(o => o.Status == "completed"
                                                   && o.OrderDate.Month == thisMonth
                                                   && o.OrderDate.Year == thisYear),
            RevenueThisMonth = orders.Where(o => o.Status == "completed"
                                                   && o.OrderDate.Month == thisMonth
                                                   && o.OrderDate.Year == thisYear)
                                         .Sum(o => o.TotalAmount),
            OrdersToday = orders.Count(o => o.Status == "completed"
                                                   && o.OrderDate == today),
            RevenueToday = orders.Where(o => o.Status == "completed"
                                                   && o.OrderDate == today)
                                         .Sum(o => o.TotalAmount),
            TotalCustomers = totalCustomers,
            TotalProducts = totalProducts,
        };
    }

    // ─── UC5+UC7: KPI theo kỳ (có lọc fromDate/toDate) ────
    public async Task<DashboardKpiDto> GetKpiByPeriodAsync(DateOnly from, DateOnly to)
    {
        var orders = await _db.Orders
            .Where(o => o.OrderDate >= from && o.OrderDate <= to)
            .ToListAsync();

        var completed = orders.Where(o => o.Status == "completed").ToList();

        return new DashboardKpiDto
        {
            TotalOrdersAll = orders.Count,
            TotalOrdersCompleted = completed.Count,
            TotalOrdersCancelled = orders.Count(o => o.Status == "cancelled"),
            TotalOrdersRefunded = orders.Count(o => o.Status == "refunded"),
            TotalRevenue = completed.Sum(o => o.TotalAmount),
            AvgOrderValue = completed.Any()
                                       ? completed.Average(o => o.TotalAmount)
                                       : 0,
            // Trong kỳ không có khái niệm "tháng này/hôm nay" — để 0
            OrdersThisMonth = 0,
            RevenueThisMonth = 0,
            OrdersToday = 0,
            RevenueToday = 0,
        };
    }

    // ─── UC5+UC6: Doanh thu theo kênh bán ─────────────────
    public async Task<List<RevenueByChannelDto>> GetRevenueByChannelAsync(
        DateOnly? from, DateOnly? to)
    {
        var q = _db.Orders
            .Include(o => o.Channel)
            .Where(o => o.Status == "completed");

        if (from.HasValue) q = q.Where(o => o.OrderDate >= from);
        if (to.HasValue) q = q.Where(o => o.OrderDate <= to);

        var result = await q
            .GroupBy(o => o.Channel.ChannelName)
            .Select(g => new RevenueByChannelDto
            {
                ChannelName = g.Key,
                TotalOrders = g.Count(),
                TotalRevenue = g.Sum(o => o.TotalAmount),
                AvgOrderValue = g.Average(o => o.TotalAmount)
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToListAsync();

        return result;
    }

    // ─── UC5: Doanh thu theo tháng ─────────────────────────
    public async Task<List<RevenueByMonthDto>> GetRevenueByMonthAsync(DateOnly from, DateOnly to)
    {
        var result = await _db.Orders
            .Where(o => o.Status == "completed"
                     && o.OrderDate >= from
                     && o.OrderDate <= to)
            .GroupBy(o => new { o.OrderDate.Year, o.OrderDate.Month })
            .Select(g => new RevenueByMonthDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                YearMonth = $"{g.Key.Year}-{g.Key.Month:D2}",
                TotalOrders = g.Count(),
                TotalRevenue = g.Sum(o => o.TotalAmount)
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync();

        return result;
    }

    // ─── UC6: Doanh thu theo ngày (line chart) ─────────────
    public async Task<List<RevenueByDayDto>> GetRevenueByDayAsync(
        DateOnly from, DateOnly to)
    {
        var result = await _db.Orders
            .Where(o => o.Status == "completed"
                     && o.OrderDate >= from
                     && o.OrderDate <= to)
            .GroupBy(o => o.OrderDate)
            .Select(g => new RevenueByDayDto
            {
                OrderDate = g.Key,
                DateLabel = g.Key.ToString("dd/MM/yyyy"),
                TotalOrders = g.Count(),
                TotalRevenue = g.Sum(o => o.TotalAmount)
            })
            .OrderBy(x => x.OrderDate)
            .ToListAsync();

        return result;
    }

    // ─── UC6: Top N sản phẩm bán chạy ─────────────────────
    public async Task<List<TopProductDto>> GetTopProductsAsync(
        DateOnly? from, DateOnly? to, int topN = 10)
    {
        var q = _db.OrderDetails
            .Include(od => od.Order)
            .Include(od => od.Product)
                .ThenInclude(p => p.Category)
            .Where(od => od.Order.Status == "completed");

        if (from.HasValue) q = q.Where(od => od.Order.OrderDate >= from);
        if (to.HasValue) q = q.Where(od => od.Order.OrderDate <= to);

        var grouped = await q
            .GroupBy(od => new
            {
                od.Product.ProductId,
                od.Product.ProductName,
                CategoryName = od.Product.Category != null
                    ? od.Product.Category.CategoryName : "Chưa phân loại"
            })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.ProductName,
                g.Key.CategoryName,
                TotalQuantitySold = (long)g.Sum(od => od.Quantity),
                TotalRevenue = g.Sum(od => od.Quantity * od.UnitPrice * (1 - od.Discount / 100)),
                TotalOrders = g.Select(od => od.OrderId).Distinct().Count()
            })
            .OrderByDescending(x => x.TotalQuantitySold)  // Bán chạy = số lượng bán nhiều nhất
            .ThenByDescending(x => x.TotalRevenue)         // Cùng số lượng thì ưu tiên doanh thu cao hơn
            .Take(topN)
            .ToListAsync();

        return grouped.Select((x, i) => new TopProductDto
        {
            Rank = i + 1,
            ProductId = x.ProductId,
            ProductName = x.ProductName,
            CategoryName = x.CategoryName,
            TotalQuantitySold = x.TotalQuantitySold,
            TotalRevenue = x.TotalRevenue,
            TotalOrders = x.TotalOrders
        }).ToList();
    }

    // ─── UC5: Doanh thu theo danh mục ──────────────────────
    public async Task<List<RevenueByCategoryDto>> GetRevenueByCategoryAsync(
        DateOnly? from, DateOnly? to)
    {
        var q = _db.OrderDetails
            .Include(od => od.Order)
            .Include(od => od.Product).ThenInclude(p => p.Category)
            .Where(od => od.Order.Status == "completed");

        if (from.HasValue) q = q.Where(od => od.Order.OrderDate >= from);
        if (to.HasValue) q = q.Where(od => od.Order.OrderDate <= to);

        var result = await q
            .GroupBy(od => new
            {
                CategoryId = od.Product.CategoryId ?? 0,
                CategoryName = od.Product.Category != null
                    ? od.Product.Category.CategoryName : "Chưa phân loại"
            })
            .Select(g => new RevenueByCategoryDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.CategoryName,
                TotalOrders = g.Select(od => od.OrderId).Distinct().Count(),
                TotalQuantity = (long)g.Sum(od => od.Quantity),
                TotalRevenue = g.Sum(od => od.Quantity * od.UnitPrice * (1 - od.Discount / 100))
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToListAsync();

        return result;
    }

    // ─── Lấy khoảng ngày min/max của đơn hàng trong DB ────
    public async Task<(DateOnly MinDate, DateOnly MaxDate)> GetOrderDateRangeAsync()
    {
        var any = await _db.Orders.AnyAsync();
        if (!any)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            return (new DateOnly(today.Year, 1, 1), today);
        }
        var min = await _db.Orders.MinAsync(o => o.OrderDate);
        var max = await _db.Orders.MaxAsync(o => o.OrderDate);
        return (min, max);
    }

    // ─── UC7: Báo cáo tổng hợp ────────────────────────────
    public async Task<ReportSummaryDto> GetReportSummaryAsync(
        DateOnly from, DateOnly to)
    {
        var kpi = await GetKpiByPeriodAsync(from, to);   // KPI theo kỳ
        var byChannel = await GetRevenueByChannelAsync(from, to);
        var topProducts = await GetTopProductsAsync(from, to, 10);
        var byMonth = await GetRevenueByMonthAsync(from, to);
        var byCategory = await GetRevenueByCategoryAsync(from, to);

        return new ReportSummaryDto
        {
            FromDate = from,
            ToDate = to,
            Kpi = kpi,
            RevenueByChannel = byChannel,
            TopProducts = topProducts,
            RevenueByMonth = byMonth,
            RevenueByCategory = byCategory
        };
    }
}