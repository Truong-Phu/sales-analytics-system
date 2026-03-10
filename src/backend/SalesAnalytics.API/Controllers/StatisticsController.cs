// ============================================================
// FILE: Controllers/StatisticsController.cs
// UC5: Thống kê & phân tích | UC6: Dashboard | UC7: Xuất báo cáo
// ============================================================
using System.Security.Claims;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.DTOs.Statistics;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsRepository _repo;
    private readonly ILogRepository _logRepo;

    public StatisticsController(IStatisticsRepository repo, ILogRepository logRepo)
    {
        _repo = repo;
        _logRepo = logRepo;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    // ─── UC6: Dashboard KPI ────────────────────────────────
    /// <summary>Lấy khoảng ngày min/max của đơn hàng trong DB — dùng để init filter</summary>
    [HttpGet("date-range")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetDateRange()
    {
        var (min, max) = await _repo.GetOrderDateRangeAsync();
        return Ok(new { minDate = min.ToString("yyyy-MM-dd"), maxDate = max.ToString("yyyy-MM-dd") });
    }

    /// <summary>UC6: Lấy KPI tổng hợp cho Dashboard</summary>
    [HttpGet("dashboard/kpi")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetDashboardKpi()
    {
        var kpi = await _repo.GetDashboardKpiAsync();
        await _logRepo.AddAsync(CurrentUserId, "VIEW_DASHBOARD",
                                ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok(kpi);
    }

    // ─── UC6: Biểu đồ doanh thu theo kênh bán ─────────────
    /// <summary>UC6: Doanh thu theo kênh bán (pie/bar chart)</summary>
    [HttpGet("dashboard/revenue-by-channel")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetRevenueByChannel(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
        => Ok(await _repo.GetRevenueByChannelAsync(fromDate, toDate));

    // ─── UC6: Biểu đồ doanh thu theo ngày ─────────────────
    /// <summary>UC6: Doanh thu theo ngày (line chart)</summary>
    [HttpGet("dashboard/revenue-by-day")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetRevenueByDay(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var from = fromDate ?? DateOnly.FromDateTime(DateTime.Today.AddDays(-30));
        var to = toDate ?? DateOnly.FromDateTime(DateTime.Today);
        return Ok(await _repo.GetRevenueByDayAsync(from, to));
    }

    // ─── UC6: Sản phẩm bán chạy ────────────────────────────
    /// <summary>UC6: Top sản phẩm bán chạy (bar chart)</summary>
    [HttpGet("dashboard/top-products")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetTopProducts(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        [FromQuery] int topN = 10)
        => Ok(await _repo.GetTopProductsAsync(fromDate, toDate, topN));

    // ─── UC5: Thống kê theo tháng ─────────────────────────
    /// <summary>UC5: Doanh thu theo tháng — nhận fromDate/toDate</summary>
    [HttpGet("revenue-by-month")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetRevenueByMonth(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var from = fromDate ?? new DateOnly(DateTime.Today.Year, 1, 1);
        var to = toDate ?? DateOnly.FromDateTime(DateTime.Today);
        return Ok(await _repo.GetRevenueByMonthAsync(from, to));
    }

    // ─── UC5: Doanh thu theo danh mục ─────────────────────
    /// <summary>UC5: Doanh thu theo danh mục sản phẩm</summary>
    [HttpGet("revenue-by-category")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetRevenueByCategory(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
        => Ok(await _repo.GetRevenueByCategoryAsync(fromDate, toDate));

    // ─── UC7: Xuất báo cáo Excel ──────────────────────────
    /// <summary>UC7: Xuất báo cáo tổng hợp dạng Excel</summary>
    [HttpGet("report/export/excel")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var from = fromDate ?? DateOnly.FromDateTime(new DateTime(DateTime.Today.Year, 1, 1));
        var to = toDate ?? DateOnly.FromDateTime(DateTime.Today);

        var report = await _repo.GetReportSummaryAsync(from, to);

        using var workbook = new XLWorkbook();

        // ── Sheet 1: KPI tổng hợp ──
        var wsKpi = workbook.Worksheets.Add("Tổng quan");
        wsKpi.Cell("A1").Value = "BÁO CÁO DOANH THU BÁN HÀNG ĐA KÊNH";
        wsKpi.Cell("A1").Style.Font.Bold = true;
        wsKpi.Cell("A1").Style.Font.FontSize = 14;
        wsKpi.Cell("A2").Value = $"Từ ngày {from:dd/MM/yyyy} đến {to:dd/MM/yyyy}";
        wsKpi.Cell("A4").Value = "Chỉ số"; wsKpi.Cell("B4").Value = "Giá trị";
        wsKpi.Cell("A4").Style.Font.Bold = true; wsKpi.Cell("B4").Style.Font.Bold = true;

        // Ghi từng dòng KPI trực tiếp — tránh lỗi type 'object' với ClosedXML
        wsKpi.Cell(5, 1).Value = "Tổng đơn hàng"; wsKpi.Cell(5, 2).Value = report.Kpi.TotalOrdersAll;
        wsKpi.Cell(6, 1).Value = "Đơn hoàn thành"; wsKpi.Cell(6, 2).Value = report.Kpi.TotalOrdersCompleted;
        wsKpi.Cell(7, 1).Value = "Đơn hủy"; wsKpi.Cell(7, 2).Value = report.Kpi.TotalOrdersCancelled;
        wsKpi.Cell(8, 1).Value = "Tổng doanh thu (VNĐ)"; wsKpi.Cell(8, 2).Value = report.Kpi.TotalRevenue;
        wsKpi.Cell(9, 1).Value = "Giá trị TB đơn hàng"; wsKpi.Cell(9, 2).Value = report.Kpi.AvgOrderValue;

        wsKpi.Columns().AdjustToContents();

        // ── Sheet 2: Doanh thu theo kênh ──
        var wsCh = workbook.Worksheets.Add("Theo kênh bán");
        wsCh.Cell("A1").Value = "Kênh bán hàng";
        wsCh.Cell("B1").Value = "Số đơn";
        wsCh.Cell("C1").Value = "Doanh thu (VNĐ)";
        wsCh.Cell("D1").Value = "TB đơn hàng";
        wsCh.Row(1).Style.Font.Bold = true;
        for (int i = 0; i < report.RevenueByChannel.Count; i++)
        {
            var r = report.RevenueByChannel[i];
            wsCh.Cell(2 + i, 1).Value = r.ChannelName;
            wsCh.Cell(2 + i, 2).Value = r.TotalOrders;
            wsCh.Cell(2 + i, 3).Value = r.TotalRevenue;
            wsCh.Cell(2 + i, 4).Value = r.AvgOrderValue;
        }
        wsCh.Columns().AdjustToContents();

        // ── Sheet 3: Top sản phẩm ──
        var wsTop = workbook.Worksheets.Add("Sản phẩm bán chạy");
        wsTop.Cell("A1").Value = "Hạng";
        wsTop.Cell("B1").Value = "Sản phẩm";
        wsTop.Cell("C1").Value = "Danh mục";
        wsTop.Cell("D1").Value = "Số lượng bán";
        wsTop.Cell("E1").Value = "Doanh thu (VNĐ)";
        wsTop.Row(1).Style.Font.Bold = true;
        for (int i = 0; i < report.TopProducts.Count; i++)
        {
            var p = report.TopProducts[i];
            wsTop.Cell(2 + i, 1).Value = p.Rank;
            wsTop.Cell(2 + i, 2).Value = p.ProductName;
            wsTop.Cell(2 + i, 3).Value = p.CategoryName;
            wsTop.Cell(2 + i, 4).Value = p.TotalQuantitySold;
            wsTop.Cell(2 + i, 5).Value = p.TotalRevenue;
        }
        wsTop.Columns().AdjustToContents();

        await _logRepo.AddAsync(CurrentUserId, "EXPORT_REPORT_EXCEL",
                                ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString());

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        var fileName = $"BaoCao_{from:yyyyMMdd}_{to:yyyyMMdd}.xlsx";
        return File(stream.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileName);
    }

    // ─── UC7: Dữ liệu báo cáo (JSON — dùng để xuất PDF phía Frontend) ─
    /// <summary>UC7: Lấy dữ liệu báo cáo tổng hợp (JSON)</summary>
    [HttpGet("report/summary")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> GetReportSummary(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var from = fromDate ?? DateOnly.FromDateTime(new DateTime(DateTime.Today.Year, 1, 1));
        var to = toDate ?? DateOnly.FromDateTime(DateTime.Today);
        var report = await _repo.GetReportSummaryAsync(from, to);
        await _logRepo.AddAsync(CurrentUserId, "VIEW_REPORT",
                                ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString());
        return Ok(report);
    }
}

// ============================================================
// FILE: Controllers/LogsController.cs
// UC8: Ghi log và theo dõi hoạt động hệ thống (Admin only)
