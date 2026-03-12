// ============================================================
// FILE: Controllers/StatisticsController.cs
// UC5: Thống kê & phân tích | UC6: Dashboard | UC7: Xuất báo cáo
// ============================================================
using System.Security.Claims;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Statistics;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsRepository _repo;
    private readonly ILogRepository _logRepo;
    private readonly AppDbContext _db;

    public StatisticsController(IStatisticsRepository repo, ILogRepository logRepo, AppDbContext db)
    {
        _repo = repo;
        _logRepo = logRepo;
        _db = db;
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

    // ─── UC7: Dữ liệu báo cáo tổng hợp (JSON) ────────────
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

    // ─── UC7: Xuất báo cáo Excel ──────────────────────────
    [HttpGet("report/export/excel")]
    [Authorize(Policy = "ManagerOnly")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var from = fromDate ?? DateOnly.FromDateTime(new DateTime(DateTime.Today.Year, 1, 1));
        var to = toDate ?? DateOnly.FromDateTime(DateTime.Today);
        var rpt = await _repo.GetReportSummaryAsync(from, to);

        using var wb = new XLWorkbook();

        var cDark = XLColor.FromHtml("#0A1F0A");
        var cGreen = XLColor.FromHtml("#16A34A");
        var cAccent = XLColor.FromHtml("#22C55E");
        var cRow = XLColor.FromHtml("#F0FDF4");
        var cAmber = XLColor.FromHtml("#F59E0B");
        var cBlue = XLColor.FromHtml("#3B82F6");
        var cRed = XLColor.FromHtml("#EF4444");
        var cGray = XLColor.FromHtml("#6B7280");
        var cText = XLColor.FromHtml("#1F2937");
        var cPurple = XLColor.FromHtml("#8B5CF6");
        var cGreen2 = XLColor.FromHtml("#0D2B0D");
        var cGreenL = XLColor.FromHtml("#A7F3D0");

        // ── Helpers ──────────────────────────────────────
        void ApplyTitle(IXLCell c, string v, int sz = 14)
        {
            c.Value = v;
            c.Style.Font.Bold = true;
            c.Style.Font.FontSize = sz;
            c.Style.Font.FontColor = XLColor.White;
            c.Style.Fill.BackgroundColor = cDark;
            c.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            c.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        void ApplySub(IXLCell c, string v)
        {
            c.Value = v;
            c.Style.Font.FontSize = 9;
            c.Style.Font.Italic = true;
            c.Style.Font.FontColor = cGreenL;
            c.Style.Fill.BackgroundColor = cGreen2;
            c.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            c.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        void ApplySection(IXLCell c, string v)
        {
            c.Value = v;
            c.Style.Font.Bold = true;
            c.Style.Font.FontSize = 10;
            c.Style.Font.FontColor = cGreen;
            c.Style.Fill.BackgroundColor = XLColor.White;
            c.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        void ApplyH(IXLCell c, string v)
        {
            c.Value = v;
            c.Style.Font.Bold = true;
            c.Style.Font.FontSize = 10;
            c.Style.Font.FontColor = XLColor.White;
            c.Style.Fill.BackgroundColor = cGreen;
            c.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            c.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            c.Style.Alignment.WrapText = true;
            c.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
            c.Style.Border.BottomBorderColor = cAccent;
        }

        void ApplyD(IXLCell c, XLColor? bg = null,
                    bool bold = false,
                    XLAlignmentHorizontalValues align = XLAlignmentHorizontalValues.Left,
                    XLColor? fg = null)
        {
            c.Style.Font.Bold = bold;
            c.Style.Font.FontSize = 10;
            c.Style.Font.FontColor = fg ?? cText;
            c.Style.Fill.BackgroundColor = bg ?? XLColor.White;
            c.Style.Alignment.Horizontal = align;
            c.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            c.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            c.Style.Border.OutsideBorderColor = XLColor.FromHtml("#D1FAE5");
        }

        void ApplyTot(IXLCell c, string v, bool left = false)
        {
            c.Value = v;
            c.Style.Font.Bold = true;
            c.Style.Font.FontSize = 10;
            c.Style.Font.FontColor = XLColor.White;
            c.Style.Fill.BackgroundColor = cDark;
            c.Style.Alignment.Horizontal = left
                ? XLAlignmentHorizontalValues.Left
                : XLAlignmentHorizontalValues.Right;
            c.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        void KpiCard(IXLWorksheet ws, string c1, string c2, int row,
                     string label, string val, string unit, XLColor color)
        {
            // accent bar
            ws.Row(row).Height = 5;
            var bar = ws.Range($"{c1}{row}:{c2}{row}");
            bar.Merge();
            bar.Style.Fill.BackgroundColor = color;

            // label
            ws.Row(row + 1).Height = 16;
            var lr = ws.Range($"{c1}{row + 1}:{c2}{row + 1}");
            lr.Merge();
            lr.FirstCell().Value = label;
            lr.Style.Font.Bold = true;
            lr.Style.Font.FontSize = 8;
            lr.Style.Font.FontColor = cGray;
            lr.Style.Fill.BackgroundColor = XLColor.White;
            lr.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            lr.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            // value
            ws.Row(row + 2).Height = 28;
            ws.Row(row + 3).Height = 16;
            var vr = ws.Range($"{c1}{row + 2}:{c2}{row + 3}");
            vr.Merge();
            vr.FirstCell().Value = $"{val}\n{unit}";
            vr.Style.Font.Bold = true;
            vr.Style.Font.FontSize = 14;
            vr.Style.Font.FontColor = color;
            vr.Style.Fill.BackgroundColor = XLColor.White;
            vr.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            vr.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            vr.Style.Alignment.WrapText = true;
        }

        // ══════════════════════════════════════════════════
        // SHEET 1: DASHBOARD
        // ══════════════════════════════════════════════════
        var ws1 = wb.Worksheets.Add("Dashboard");
        ws1.ShowGridLines = false;
        ws1.TabColor = cGreen;
        ws1.Column(1).Width = 3;
        ws1.Column(2).Width = 22; ws1.Column(3).Width = 18;
        ws1.Column(4).Width = 22; ws1.Column(5).Width = 18;
        ws1.Column(6).Width = 22; ws1.Column(7).Width = 18;

        ws1.Row(2).Height = 30; ws1.Row(3).Height = 30;
        ws1.Range("B2:G3").Merge();
        ApplyTitle(ws1.Cell("B2"), "BÁO CÁO DOANH THU BÁN HÀNG ĐA KÊNH", 16);

        ws1.Row(4).Height = 18;
        ws1.Range("B4:G4").Merge();
        ApplySub(ws1.Cell("B4"), $"Kỳ báo cáo: {from:dd/MM/yyyy} – {to:dd/MM/yyyy}");

        ws1.Row(6).Height = 20;
        ws1.Range("B6:G6").Merge();
        ApplySection(ws1.Cell("B6"), "▌ CHỈ SỐ KINH DOANH TỔNG QUAN");

        // KPI row 1
        KpiCard(ws1, "B", "C", 7, "TỔNG ĐƠN HÀNG",
            rpt.Kpi.TotalOrdersAll.ToString(), "tất cả trạng thái", cGreen);
        KpiCard(ws1, "D", "E", 7, "TỔNG DOANH THU",
            $"{rpt.Kpi.TotalRevenue:N0}", "đồng (VNĐ)", cAmber);
        KpiCard(ws1, "F", "G", 7, "GIÁ TRỊ TB/ĐƠN",
            $"{rpt.Kpi.AvgOrderValue:N0}", "đồng/đơn", cBlue);

        // KPI row 2
        double pct = rpt.Kpi.TotalOrdersAll > 0
            ? (double)rpt.Kpi.TotalOrdersCompleted / rpt.Kpi.TotalOrdersAll * 100 : 0;
        KpiCard(ws1, "B", "C", 12, "ĐƠN HOÀN THÀNH",
            rpt.Kpi.TotalOrdersCompleted.ToString(), "đơn completed", cAccent);
        KpiCard(ws1, "D", "E", 12, "ĐƠN HỦY",
            rpt.Kpi.TotalOrdersCancelled.ToString(), "đơn cancelled", cRed);
        KpiCard(ws1, "F", "G", 12, "TỶ LỆ THÀNH CÔNG",
            $"{pct:F1}%", "hoàn thành / tổng", cPurple);

        // Section: Doanh thu theo kênh
        int chRow = 18;
        ws1.Row(chRow).Height = 20;
        ws1.Range($"B{chRow}:G{chRow}").Merge();
        ApplySection(ws1.Cell($"B{chRow}"), "▌ DOANH THU THEO KÊNH BÁN HÀNG");

        chRow++;
        ws1.Row(chRow).Height = 22;
        ApplyH(ws1.Cell($"B{chRow}"), "Kênh bán hàng");
        ApplyH(ws1.Cell($"C{chRow}"), "Số đơn");
        ApplyH(ws1.Cell($"D{chRow}"), "Doanh thu (VNĐ)");
        ApplyH(ws1.Cell($"E{chRow}"), "TB/đơn (VNĐ)");
        ApplyH(ws1.Cell($"F{chRow}"), "Tỷ trọng (%)");

        decimal totalChRev = rpt.RevenueByChannel.Sum(c => c.TotalRevenue);
        for (int i = 0; i < rpt.RevenueByChannel.Count; i++)
        {
            var ch = rpt.RevenueByChannel[i];
            var bg = i % 2 == 0 ? cRow : XLColor.White;
            int r = chRow + 1 + i;
            ws1.Row(r).Height = 18;
            ApplyD(ws1.Cell($"B{r}"), bg, bold: true, fg: cDark);
            ws1.Cell($"B{r}").Value = ch.ChannelName;
            ApplyD(ws1.Cell($"C{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws1.Cell($"C{r}").Value = ch.TotalOrders;
            ApplyD(ws1.Cell($"D{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws1.Cell($"D{r}").Value = ch.TotalRevenue;
            ws1.Cell($"D{r}").Style.NumberFormat.Format = "#,##0";
            ApplyD(ws1.Cell($"E{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws1.Cell($"E{r}").Value = ch.AvgOrderValue;
            ws1.Cell($"E{r}").Style.NumberFormat.Format = "#,##0";
            ApplyD(ws1.Cell($"F{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws1.Cell($"F{r}").Value = totalChRev > 0
                ? $"{ch.TotalRevenue / totalChRev * 100:F1}%" : "—";
        }
        int chTot = chRow + 1 + rpt.RevenueByChannel.Count;
        ws1.Row(chTot).Height = 20;
        int chTotOrd = rpt.RevenueByChannel.Sum(c => c.TotalOrders);
        ApplyTot(ws1.Cell($"B{chTot}"), "TỔNG CỘNG", true);
        ApplyTot(ws1.Cell($"C{chTot}"), chTotOrd.ToString());
        ApplyTot(ws1.Cell($"D{chTot}"), $"{totalChRev:N0}");
        ApplyTot(ws1.Cell($"E{chTot}"), chTotOrd > 0 ? $"{totalChRev / chTotOrd:N0}" : "—");
        ApplyTot(ws1.Cell($"F{chTot}"), "100.0%");

        // ══════════════════════════════════════════════════
        // SHEET 2: THEO THÁNG
        // ══════════════════════════════════════════════════
        var ws2 = wb.Worksheets.Add("Theo tháng");
        ws2.ShowGridLines = false;
        ws2.TabColor = cAccent;
        ws2.Column(1).Width = 3; ws2.Column(2).Width = 20; ws2.Column(3).Width = 14;
        ws2.Column(4).Width = 22; ws2.Column(5).Width = 20; ws2.Column(6).Width = 16;

        ws2.Row(2).Height = 30; ws2.Row(3).Height = 30;
        ws2.Range("B2:F3").Merge();
        ApplyTitle(ws2.Cell("B2"), "DOANH THU THEO THÁNG");

        ws2.Row(4).Height = 18;
        ws2.Range("B4:F4").Merge();
        ApplySub(ws2.Cell("B4"), $"Kỳ: {from:dd/MM/yyyy} – {to:dd/MM/yyyy}");

        ws2.Row(6).Height = 22;
        ApplyH(ws2.Cell("B6"), "Tháng");
        ApplyH(ws2.Cell("C6"), "Số đơn");
        ApplyH(ws2.Cell("D6"), "Doanh thu (VNĐ)");
        ApplyH(ws2.Cell("E6"), "TB/đơn (VNĐ)");
        ApplyH(ws2.Cell("F6"), "Tăng trưởng");

        decimal? prevRev = null;
        for (int i = 0; i < rpt.RevenueByMonth.Count; i++)
        {
            var m = rpt.RevenueByMonth[i];
            var bg = i % 2 == 0 ? cRow : XLColor.White;
            int r = 7 + i;
            ws2.Row(r).Height = 20;

            string growth = prevRev.HasValue && prevRev > 0
                ? $"{(m.TotalRevenue - prevRev.Value) / prevRev.Value * 100:+0.0;-0.0}%"
                : "—";
            var gc = growth.StartsWith("+") ? cGreen
                   : growth.StartsWith("-") ? cRed
                   : cGray;

            ApplyD(ws2.Cell($"B{r}"), bg, bold: true, fg: cDark);
            ws2.Cell($"B{r}").Value = $"Tháng {m.Month}/{m.Year}";
            ApplyD(ws2.Cell($"C{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws2.Cell($"C{r}").Value = m.TotalOrders;
            ApplyD(ws2.Cell($"D{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws2.Cell($"D{r}").Value = m.TotalRevenue;
            ws2.Cell($"D{r}").Style.NumberFormat.Format = "#,##0";
            ApplyD(ws2.Cell($"E{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws2.Cell($"E{r}").Value = m.TotalOrders > 0 ? m.TotalRevenue / m.TotalOrders : 0;
            ws2.Cell($"E{r}").Style.NumberFormat.Format = "#,##0";
            ApplyD(ws2.Cell($"F{r}"), bg, align: XLAlignmentHorizontalValues.Center, fg: gc);
            ws2.Cell($"F{r}").Value = growth;
            ws2.Cell($"F{r}").Style.Font.Bold = true;
            ws2.Cell($"F{r}").Style.Font.FontColor = gc;

            prevRev = m.TotalRevenue;
        }
        int mTotRow = 7 + rpt.RevenueByMonth.Count;
        ws2.Row(mTotRow).Height = 22;
        int mTotO = rpt.RevenueByMonth.Sum(m => m.TotalOrders);
        decimal mTotR = rpt.RevenueByMonth.Sum(m => m.TotalRevenue);
        ApplyTot(ws2.Cell($"B{mTotRow}"), "TỔNG CỘNG", true);
        ApplyTot(ws2.Cell($"C{mTotRow}"), mTotO.ToString());
        ApplyTot(ws2.Cell($"D{mTotRow}"), $"{mTotR:N0}");
        ApplyTot(ws2.Cell($"E{mTotRow}"), mTotO > 0 ? $"{mTotR / mTotO:N0}" : "—");
        ApplyTot(ws2.Cell($"F{mTotRow}"), "");

        // ══════════════════════════════════════════════════
        // SHEET 3: TOP SẢN PHẨM
        // ══════════════════════════════════════════════════
        var ws3 = wb.Worksheets.Add("Top sản phẩm");
        ws3.ShowGridLines = false;
        ws3.TabColor = cAmber;
        ws3.Column(1).Width = 3; ws3.Column(2).Width = 6; ws3.Column(3).Width = 30;
        ws3.Column(4).Width = 18; ws3.Column(5).Width = 14; ws3.Column(6).Width = 20;
        ws3.Column(7).Width = 16;

        ws3.Row(2).Height = 30; ws3.Row(3).Height = 30;
        ws3.Range("B2:G3").Merge();
        ApplyTitle(ws3.Cell("B2"), "TOP SẢN PHẨM BÁN CHẠY");

        ws3.Row(5).Height = 22;
        ApplyH(ws3.Cell("B5"), "#");
        ApplyH(ws3.Cell("C5"), "Tên sản phẩm");
        ApplyH(ws3.Cell("D5"), "Danh mục");
        ApplyH(ws3.Cell("E5"), "SL bán");
        ApplyH(ws3.Cell("F5"), "Doanh thu (VNĐ)");
        ApplyH(ws3.Cell("G5"), "% tổng DT");

        decimal totalPR = rpt.TopProducts.Sum(p => p.TotalRevenue);
        string[] rankHex = { "#F59E0B", "#9CA3AF", "#CD7F32" };
        for (int i = 0; i < rpt.TopProducts.Count; i++)
        {
            var p = rpt.TopProducts[i];
            var bg = i % 2 == 0 ? cRow : XLColor.White;
            int r = 6 + i;
            ws3.Row(r).Height = 20;
            var rc = i < 3 ? XLColor.FromHtml(rankHex[i]) : cGray;

            ApplyD(ws3.Cell($"B{r}"), bg, bold: true,
                align: XLAlignmentHorizontalValues.Center, fg: rc);
            ws3.Cell($"B{r}").Value = p.Rank;
            ApplyD(ws3.Cell($"C{r}"), bg, bold: true, fg: cDark);
            ws3.Cell($"C{r}").Value = p.ProductName;
            ApplyD(ws3.Cell($"D{r}"), bg);
            ws3.Cell($"D{r}").Value = p.CategoryName;
            ApplyD(ws3.Cell($"E{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws3.Cell($"E{r}").Value = p.TotalQuantitySold;
            ApplyD(ws3.Cell($"F{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws3.Cell($"F{r}").Value = p.TotalRevenue;
            ws3.Cell($"F{r}").Style.NumberFormat.Format = "#,##0";
            ApplyD(ws3.Cell($"G{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws3.Cell($"G{r}").Value = totalPR > 0
                ? $"{p.TotalRevenue / totalPR * 100:F1}%" : "—";
        }

        // ══════════════════════════════════════════════════
        // SHEET 4: THEO DANH MỤC
        // ══════════════════════════════════════════════════
        var ws4 = wb.Worksheets.Add("Theo danh mục");
        ws4.ShowGridLines = false;
        ws4.TabColor = cBlue;
        ws4.Column(1).Width = 3; ws4.Column(2).Width = 24; ws4.Column(3).Width = 14;
        ws4.Column(4).Width = 16; ws4.Column(5).Width = 22;

        ws4.Row(2).Height = 30; ws4.Row(3).Height = 30;
        ws4.Range("B2:E3").Merge();
        ApplyTitle(ws4.Cell("B2"), "DOANH THU THEO DANH MỤC SẢN PHẨM");

        ws4.Row(5).Height = 22;
        ApplyH(ws4.Cell("B5"), "Danh mục");
        ApplyH(ws4.Cell("C5"), "Số đơn");
        ApplyH(ws4.Cell("D5"), "Số lượng");
        ApplyH(ws4.Cell("E5"), "Doanh thu (VNĐ)");

        for (int i = 0; i < rpt.RevenueByCategory.Count; i++)
        {
            var cat = rpt.RevenueByCategory[i];
            var bg = i % 2 == 0 ? cRow : XLColor.White;
            int r = 6 + i;
            ws4.Row(r).Height = 18;
            ApplyD(ws4.Cell($"B{r}"), bg, bold: true, fg: cDark);
            ws4.Cell($"B{r}").Value = cat.CategoryName;
            ApplyD(ws4.Cell($"C{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws4.Cell($"C{r}").Value = cat.TotalOrders;
            ApplyD(ws4.Cell($"D{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws4.Cell($"D{r}").Value = cat.TotalQuantity;
            ApplyD(ws4.Cell($"E{r}"), bg, align: XLAlignmentHorizontalValues.Right);
            ws4.Cell($"E{r}").Value = cat.TotalRevenue;
            ws4.Cell($"E{r}").Style.NumberFormat.Format = "#,##0";
        }
        int catTot = 6 + rpt.RevenueByCategory.Count;
        ws4.Row(catTot).Height = 22;
        ApplyTot(ws4.Cell($"B{catTot}"), "TỔNG CỘNG", true);
        ApplyTot(ws4.Cell($"C{catTot}"), rpt.RevenueByCategory.Sum(c => c.TotalOrders).ToString());
        ApplyTot(ws4.Cell($"D{catTot}"), rpt.RevenueByCategory.Sum(c => c.TotalQuantity).ToString());
        ApplyTot(ws4.Cell($"E{catTot}"), $"{rpt.RevenueByCategory.Sum(c => c.TotalRevenue):N0}");

        await _logRepo.AddAsync(CurrentUserId, "EXPORT_REPORT_EXCEL",
            ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString());

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;
        var fileName = $"BaoCao_{from:yyyyMMdd}_{to:yyyyMMdd}.xlsx";
        return File(stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }
}