// ============================================================
// STATISTICS DTOs — UC5: Thống kê & phân tích dữ liệu bán hàng
//                   UC6: Dashboard trực quan
//                   UC7: Xuất báo cáo tổng hợp
// ============================================================
namespace SalesAnalytics.Core.DTOs.Statistics;

// --- UC6: Dashboard KPI ---
public class DashboardKpiDto
{
    public int TotalOrdersAll { get; set; }
    public int TotalOrdersCompleted { get; set; }
    public int TotalOrdersCancelled { get; set; }
    public int TotalOrdersRefunded { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AvgOrderValue { get; set; }
    public int OrdersThisMonth { get; set; }
    public decimal RevenueThisMonth { get; set; }
    public int OrdersToday { get; set; }
    public decimal RevenueToday { get; set; }
}

// --- UC5+UC6: Doanh thu theo kênh ---
public class RevenueByChannelDto
{
    public string ChannelName { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AvgOrderValue { get; set; }
}

// --- UC5+UC6: Doanh thu theo tháng ---
public class RevenueByMonthDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string YearMonth { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
}

// --- UC6: Doanh thu theo ngày (line chart) ---
public class RevenueByDayDto
{
    public DateOnly OrderDate { get; set; }
    public string DateLabel { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
}

// --- UC6: Sản phẩm bán chạy ---
public class TopProductDto
{
    public int Rank { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public long TotalQuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
}

// --- UC5: Doanh thu theo danh mục ---
public class RevenueByCategoryDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public long TotalQuantity { get; set; }
    public decimal TotalRevenue { get; set; }
}

// --- UC5: Query params thống kê ---
public class StatisticsQueryDto
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public int? ChannelId { get; set; }
    public int TopN { get; set; } = 10;
}

// --- UC7: Báo cáo tổng hợp ---
public class ReportSummaryDto
{
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public DashboardKpiDto Kpi { get; set; } = new();
    public List<RevenueByChannelDto> RevenueByChannel { get; set; } = new();
    public List<TopProductDto> TopProducts { get; set; } = new();
    public List<RevenueByMonthDto> RevenueByMonth { get; set; } = new();
    public List<RevenueByCategoryDto> RevenueByCategory { get; set; } = new();
}

