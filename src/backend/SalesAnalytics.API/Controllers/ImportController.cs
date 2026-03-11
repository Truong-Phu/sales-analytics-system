// ============================================================
// FILE: Controllers/ImportController.cs
// UC3 Mở rộng: Import đơn hàng từ file
//
// Endpoints:
//   GET  /api/import/template/excel   — Tải file Excel mẫu
//   POST /api/import/preview          — Upload file, trả về preview
//   POST /api/import/confirm          — Xác nhận lưu vào DB
//   GET  /api/import/history          — Lịch sử import
// ============================================================
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.DTOs.Import;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ImportController : ControllerBase
{
    private readonly IImportRepository _repo;
    private readonly ILogRepository _logRepo;

    // Lưu tạm session preview trong memory (đủ cho đồ án)
    private static readonly ConcurrentDictionary<string, List<ImportRowDto>>
        _sessions = new();

    public ImportController(IImportRepository repo, ILogRepository logRepo)
    {
        _repo = repo;
        _logRepo = logRepo;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    private string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString();

    // ════════════════════════════════════════════════════════
    // GET /api/import/template/excel — Tải file Excel mẫu
    // ════════════════════════════════════════════════════════
    [HttpGet("template/excel")]
    public IActionResult DownloadTemplate()
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("DonHang");

        // Header
        var headers = new[]
        {
            "Mã đơn hàng (*)","Ngày đặt (*) yyyy-MM-dd","Tên khách hàng (*)","Số điện thoại",
            "Kênh bán (*) Offline/Shopee/TikTok Shop/Website/Lazada",
            "Tên sản phẩm","Số lượng","Đơn giá (VNĐ)","Tổng tiền (*) VNĐ",
            "Trạng thái completed/cancelled/refunded","Ghi chú"
        };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
            ws.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#16a34a");
            ws.Cell(1, i + 1).Style.Font.FontColor = XLColor.White;
        }

        // Dữ liệu mẫu
        object[,] sample =
        {
            { "DH-2025-001", "2025-01-15", "Nguyễn Văn A", "0901234567", "Offline",    "Áo thun nam", 2, 150000, 300000, "completed", "" },
            { "DH-2025-002", "2025-01-16", "Trần Thị B",   "0912345678", "Shopee",     "Quần jeans",  1, 450000, 450000, "completed", "Giao nhanh" },
            { "DH-2025-003", "2025-01-17", "Lê Văn C",     "",           "TikTok Shop","Váy hoa",     3, 200000, 600000, "completed", "" },
        };
        for (int r = 0; r < sample.GetLength(0); r++)
            for (int c = 0; c < sample.GetLength(1); c++)
                ws.Cell(r + 2, c + 1).Value = XLCellValue.FromObject(sample[r, c]);

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;
        return File(stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Template_NhapDonHang.xlsx");
    }

    // ════════════════════════════════════════════════════════
    // POST /api/import/preview — Upload file → preview
    // Form: file (IFormFile), source (string)
    // ════════════════════════════════════════════════════════
    [HttpPost("preview")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<IActionResult> Preview(
        [FromForm] IFormFile file,
        [FromForm] string source = "Template")
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file để upload." });

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext != ".xlsx" && ext != ".csv")
            return BadRequest(new { message = "Chỉ hỗ trợ file .xlsx hoặc .csv" });

        if (!Enum.TryParse<ImportSource>(source, true, out var src))
            src = ImportSource.Template;

        List<ImportRowDto> rows;
        try
        {
            using var stream = file.OpenReadStream();
            rows = ext == ".csv"
                ? ParseCsv(stream, src)
                : ParseExcel(stream, src);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Lỗi đọc file: {ex.Message}" });
        }

        // Validate từng dòng
        foreach (var row in rows)
            ValidateRow(row);

        // Tạo session
        var sessionId = Guid.NewGuid().ToString("N");
        _sessions[sessionId] = rows;
        _sessionFileNames[sessionId] = $"{file.FileName}|{src}";  // lưu cả fileName và source

        // Xóa session cũ sau 30 phút
        _ = Task.Delay(TimeSpan.FromMinutes(30))
              .ContinueWith(t => {
                  _sessions.TryRemove(sessionId, out _);
                  _sessionFileNames.TryRemove(sessionId, out _);
              });

        var preview = new ImportPreviewDto
        {
            FileName = file.FileName,
            Source = src.ToString(),
            TotalRows = rows.Count,
            ValidRows = rows.Count(r => r.IsValid),
            InvalidRows = rows.Count(r => !r.IsValid),
            DuplicateRows = 0,
            Rows = rows,
            SessionId = sessionId,
        };

        return Ok(preview);
    }

    // ════════════════════════════════════════════════════════
    // POST /api/import/confirm — Lưu vào DB sau khi user xem trước
    // ════════════════════════════════════════════════════════
    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ImportConfirmDto dto)
    {
        if (!_sessions.TryGetValue(dto.SessionId, out var rows))
            return BadRequest(new { message = "Phiên import đã hết hạn. Vui lòng upload lại file." });

        var validRows = dto.SkipInvalidRows
            ? rows.Where(r => r.IsValid).ToList()
            : rows;

        if (!validRows.Any())
            return BadRequest(new { message = "Không có dòng hợp lệ để import." });

        // Lấy fileName và source từ session
        var sessionMeta = _sessionFileNames.GetValueOrDefault(dto.SessionId, "unknown.xlsx|Template");
        var metaParts = sessionMeta.Split('|', 2);
        var fileName = metaParts[0];
        var source = metaParts.Length > 1 ? metaParts[1] : "Template";

        var result = await _repo.SaveImportBatchAsync(
            validRows, CurrentUserId, source, fileName);

        _sessions.TryRemove(dto.SessionId, out _);
        _sessionFileNames.TryRemove(dto.SessionId, out _);

        await _logRepo.AddAsync(CurrentUserId,
            $"IMPORT {result.ImportedOrders} đơn hàng từ file",
            "orders", null, ClientIp);

        return Ok(result);
    }

    // Session file names (lưu kèm khi preview)
    private static readonly ConcurrentDictionary<string, string>
        _sessionFileNames = new();

    // ════════════════════════════════════════════════════════
    // GET /api/import/history — Lịch sử import
    // ════════════════════════════════════════════════════════
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
        => Ok(await _repo.GetHistoryAsync(page, pageSize));

    // ════════════════════════════════════════════════════════
    // PARSE EXCEL — Template / Shopee / TikTok
    // ════════════════════════════════════════════════════════
    private List<ImportRowDto> ParseExcel(Stream stream, ImportSource source)
    {
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();
        return source switch
        {
            ImportSource.Shopee => ParseShopeeSheet(ws),
            ImportSource.TikTokShop => ParseTikTokSheet(ws),
            _ => ParseTemplateSheet(ws),
        };
    }

    // ─── Parse file Template chuẩn ─────────────────────────
    private List<ImportRowDto> ParseTemplateSheet(IXLWorksheet ws)
    {
        var rows = new List<ImportRowDto>();

        // Template có thể có dòng tiêu đề và lưu ý trước header thật
        // Tìm dòng header thật bằng cách tìm "Mã đơn hàng"
        int headerRow = FindHeaderRow(ws, "Mã đơn hàng (*)", "Mã đơn hàng", "Order ID");
        if (headerRow < 0) headerRow = 1; // fallback

        int rowNum = headerRow + 1; // bắt đầu đọc data từ dòng sau header

        var colMap = BuildColumnMap(ws, headerRow);

        while (true)
        {
            // Lấy mã đơn từ cột "Mã đơn hàng (*)" hoặc "Mã đơn hàng"
            var orderId = GetCell(ws, rowNum, colMap,
                "Mã đơn hàng (*)", "Mã đơn hàng", "Order ID");
            if (string.IsNullOrWhiteSpace(orderId)) break;

            var dateRaw = GetCell(ws, rowNum, colMap,
                "Ngày đặt (*)\nyyyy-MM-dd", "Ngày đặt (*)", "Ngày đặt", "Order Date");
            // fallback: thử đọc trực tiếp cột 2 nếu colMap không tìm thấy
            if (string.IsNullOrWhiteSpace(dateRaw))
                dateRaw = ws.Cell(rowNum, 2).GetString().Trim();

            rows.Add(new ImportRowDto
            {
                RowNumber = rowNum,
                ExternalOrderId = orderId,
                OrderDateRaw = dateRaw,
                OrderDate = ParseDate(dateRaw),
                CustomerName = GetCell(ws, rowNum, colMap,
                                    "Tên khách hàng (*)", "Tên khách hàng", "Customer Name"),
                CustomerPhone = GetCell(ws, rowNum, colMap,
                                    "Số điện thoại", "Phone"),
                ChannelName = GetCell(ws, rowNum, colMap,
                                    "Kênh bán (*)", "Kênh bán", "Channel"),
                ProductName = GetCell(ws, rowNum, colMap,
                                    "Tên sản phẩm", "Product Name"),
                Quantity = ParseInt(GetCell(ws, rowNum, colMap,
                                    "Số lượng", "Quantity")),
                UnitPrice = ParseDecimal(GetCell(ws, rowNum, colMap,
                                    "Đơn giá (VNĐ)", "Đơn giá", "Unit Price")),
                TotalAmount = ParseDecimal(GetCell(ws, rowNum, colMap,
                                    "Tổng tiền (*) VNĐ", "Tổng tiền (*)", "Tổng tiền", "Total")),
                Status = GetCell(ws, rowNum, colMap,
                                    "Trạng thái", "Status") is "" ? "completed"
                                  : GetCell(ws, rowNum, colMap, "Trạng thái", "Status"),
                Note = GetCell(ws, rowNum, colMap, "Ghi chú", "Note"),
            });
            rowNum++;
            if (rowNum > 10000) break;
        }
        return rows;
    }

    // ─── Parse file export từ Shopee Seller Center ─────────
    // Cột Shopee: Mã đơn hàng | Thời gian đặt hàng | Tên người mua |
    //             Số điện thoại | Tên sản phẩm | Số lượng | Giá gốc |
    //             Tổng số tiền đơn hàng | Trạng thái đơn hàng
    private List<ImportRowDto> ParseShopeeSheet(IXLWorksheet ws)
    {
        var rows = new List<ImportRowDto>();
        // Shopee thường có nhiều header row — tìm dòng có "Mã đơn hàng"
        int headerRow = FindHeaderRow(ws, "Mã đơn hàng", "Order ID", "Order Id");
        if (headerRow < 0) headerRow = 1;

        // Map cột theo header Shopee
        var colMap = BuildColumnMap(ws, headerRow);

        for (int r = headerRow + 1; r <= (ws.LastRowUsed()?.RowNumber() ?? headerRow + 1); r++)
        {
            var orderId = GetCell(ws, r, colMap, "Mã đơn hàng", "Order ID");
            if (string.IsNullOrWhiteSpace(orderId)) break;

            rows.Add(new ImportRowDto
            {
                RowNumber = r,
                ExternalOrderId = orderId,
                OrderDateRaw = GetCell(ws, r, colMap, "Thời gian đặt hàng", "Order Creation Time", "Order Creation Date", "Order Time"),
                OrderDate = ParseDate(GetCell(ws, r, colMap, "Thời gian đặt hàng", "Order Creation Time", "Order Creation Date", "Order Time")),
                CustomerName = GetCell(ws, r, colMap, "Tên người mua", "Buyer Name", "Buyer Username", "Recipient") is "" ? "Khách Shopee"
                                : GetCell(ws, r, colMap, "Tên người mua", "Buyer Name", "Buyer Username", "Recipient"),
                CustomerPhone = GetCell(ws, r, colMap, "Số điện thoại", "Phone Number", "Recipient's Phone", "Phone"),
                ChannelName = "Shopee",
                ProductName = GetCell(ws, r, colMap, "Tên sản phẩm", "Product Name"),
                Quantity = ParseInt(GetCell(ws, r, colMap, "Số lượng", "Quantity")),
                UnitPrice = ParseDecimal(GetCell(ws, r, colMap, "Giá gốc", "Original Price", "Deal Price")),
                TotalAmount = ParseDecimal(GetCell(ws, r, colMap, "Tổng số tiền đơn hàng", "Total Price", "Total Amount", "Order Total")),
                Status = MapShopeeStatus(GetCell(ws, r, colMap, "Trạng thái đơn hàng", "Order Status")),
                Note = GetCell(ws, r, colMap, "Ghi chú", "Note"),
            });
        }
        return rows;
    }

    // ─── Parse file export từ TikTok Shop Seller Center ────
    // Cột TikTok: Order ID | Created Time | Buyer Username |
    //             Recipient Name | Phone | Product Name | Qty |
    //             Item Original Price | Order Amount | Order Status
    private List<ImportRowDto> ParseTikTokSheet(IXLWorksheet ws)
    {
        var rows = new List<ImportRowDto>();
        int headerRow = FindHeaderRow(ws, "Order ID", "Order Id");
        if (headerRow < 0) headerRow = 1;

        var colMap = BuildColumnMap(ws, headerRow);

        for (int r = headerRow + 1; r <= (ws.LastRowUsed()?.RowNumber() ?? headerRow + 1); r++)
        {
            var orderId = GetCell(ws, r, colMap, "Order ID", "Order Id");
            if (string.IsNullOrWhiteSpace(orderId)) break;

            var custName = GetCell(ws, r, colMap, "Recipient", "Recipient Name", "Buyer Name", "Buyer Username");
            if (string.IsNullOrWhiteSpace(custName)) custName = "Khách TikTok";

            rows.Add(new ImportRowDto
            {
                RowNumber = r,
                ExternalOrderId = orderId,
                OrderDateRaw = GetCell(ws, r, colMap, "Order Creation Time", "Created Time", "Order Created Date", "Create Time"),
                OrderDate = ParseDate(GetCell(ws, r, colMap, "Order Creation Time", "Created Time", "Order Created Date", "Create Time")),
                CustomerName = custName,
                CustomerPhone = GetCell(ws, r, colMap, "Phone #", "Phone", "Buyer Phone", "Recipient Phone"),
                ChannelName = "TikTok Shop",
                ProductName = GetCell(ws, r, colMap, "Product Name", "Product name", "Item Name"),
                Quantity = ParseInt(GetCell(ws, r, colMap, "Quantity", "Qty", "Item Quantity")),
                UnitPrice = ParseDecimal(GetCell(ws, r, colMap, "SKU Unit Original Price", "Item Original Price", "Unit Price", "Original Price")),
                TotalAmount = ParseDecimal(GetCell(ws, r, colMap, "Order Total", "Order Amount", "SKU Subtotal After Discount", "Total Amount", "Amount")),
                Status = MapTikTokStatus(GetCell(ws, r, colMap, "Order Status", "Status")),
                Note = "",
            });
        }
        return rows;
    }

    // ════════════════════════════════════════════════════════
    // PARSE CSV
    // ════════════════════════════════════════════════════════
    private List<ImportRowDto> ParseCsv(Stream stream, ImportSource source)
    {
        var rows = new List<ImportRowDto>();
        using var reader = new StreamReader(stream, Encoding.UTF8);
        var headers = reader.ReadLine()?.Split(',')
            .Select(h => h.Trim('"', ' ')).ToArray() ?? Array.Empty<string>();

        int rowNum = 2;
        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            if (string.IsNullOrWhiteSpace(line)) continue;
            var cols = SplitCsvLine(line);

            string Get(params string[] names)
            {
                foreach (var name in names)
                {
                    var idx = Array.FindIndex(headers,
                        h => string.Equals(h, name, StringComparison.OrdinalIgnoreCase));
                    if (idx >= 0 && idx < cols.Length) return cols[idx].Trim();
                }
                return string.Empty;
            }

            rows.Add(new ImportRowDto
            {
                RowNumber = rowNum++,
                ExternalOrderId = Get("Mã đơn hàng", "Order ID", "order_id"),
                OrderDateRaw = Get("Ngày đặt", "order_date", "Created Time"),
                OrderDate = ParseDate(Get("Ngày đặt", "order_date", "Created Time")),
                CustomerName = Get("Tên khách hàng", "customer_name", "Buyer Username") is "" ? "Khách lẻ"
                                : Get("Tên khách hàng", "customer_name", "Buyer Username"),
                CustomerPhone = Get("Số điện thoại", "phone"),
                ChannelName = Get("Kênh bán", "channel", "Channel") is "" ? "Offline"
                                : Get("Kênh bán", "channel", "Channel"),
                ProductName = Get("Tên sản phẩm", "product_name", "Product Name"),
                Quantity = ParseInt(Get("Số lượng", "quantity", "Qty")),
                UnitPrice = ParseDecimal(Get("Đơn giá", "unit_price", "Item Original Price")),
                TotalAmount = ParseDecimal(Get("Tổng tiền", "total_amount", "Order Amount")),
                Status = Get("Trạng thái", "status", "Order Status") is "" ? "completed"
                                : Get("Trạng thái", "status", "Order Status"),
                Note = Get("Ghi chú", "note"),
            });
        }
        return rows;
    }

    // ════════════════════════════════════════════════════════
    // VALIDATE
    // ════════════════════════════════════════════════════════
    private static void ValidateRow(ImportRowDto row)
    {
        if (string.IsNullOrWhiteSpace(row.CustomerName))
            row.Errors.Add("Thiếu tên khách hàng");

        if (string.IsNullOrWhiteSpace(row.ChannelName))
            row.Errors.Add("Thiếu kênh bán");

        if (!row.OrderDate.HasValue)
            row.Errors.Add($"Ngày không hợp lệ: '{row.OrderDateRaw}'");

        if (row.TotalAmount <= 0 && (row.Quantity <= 0 || row.UnitPrice <= 0))
            row.Errors.Add("Thiếu tổng tiền hoặc đơn giá + số lượng");

        row.IsValid = row.Errors.Count == 0;
    }

    // ════════════════════════════════════════════════════════
    // HELPER METHODS
    // ════════════════════════════════════════════════════════
    private static DateOnly? ParseDate(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        raw = raw.Trim();

        // Thử các format phổ biến
        string[] formats = {
            "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy",
            "yyyy-MM-dd HH:mm:ss", "dd/MM/yyyy HH:mm:ss",
            "yyyy/MM/dd", "dd-MM-yyyy"
        };
        foreach (var fmt in formats)
            if (DateOnly.TryParseExact(raw.Length > 10 ? raw[..10] : raw,
                    fmt.Length > 10 ? fmt[..10] : fmt,
                    null, System.Globalization.DateTimeStyles.None, out var d))
                return d;

        if (DateOnly.TryParse(raw, out var result)) return result;
        return null;
    }

    private static decimal ParseDecimal(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return 0;
        raw = raw.Replace(",", "").Replace(".", "").Replace(" ", "").Replace("₫", "").Replace("đ", "");
        // Nếu có dấu . là phân cách thập phân
        if (raw.Contains('.')) raw = raw.Replace(".", "");
        return decimal.TryParse(raw, out var v) ? v : 0;
    }

    private static int ParseInt(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return 0;
        raw = raw.Trim().Replace(",", "").Replace(".", "");
        return int.TryParse(raw, out var v) ? v : 0;
    }

    private static int FindHeaderRow(IXLWorksheet ws, params string[] keywords)
    {
        for (int r = 1; r <= Math.Min(10, ws.LastRowUsed()?.RowNumber() ?? 10); r++)
        {
            var row = ws.Row(r);
            foreach (var cell in row.CellsUsed())
            {
                var val = cell.GetString();
                if (keywords.Any(k => string.Equals(val.Trim(), k, StringComparison.OrdinalIgnoreCase)))
                    return r;
            }
        }
        return -1;
    }

    private static Dictionary<string, int> BuildColumnMap(IXLWorksheet ws, int headerRow)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var row = ws.Row(headerRow);
        foreach (var cell in row.CellsUsed())
            map[cell.GetString().Trim()] = cell.Address.ColumnNumber;
        return map;
    }

    private static string GetCell(IXLWorksheet ws, int row,
        Dictionary<string, int> colMap, params string[] names)
    {
        foreach (var name in names)
            if (colMap.TryGetValue(name, out var col))
                return ws.Cell(row, col).GetString().Trim();
        return string.Empty;
    }

    private static string[] SplitCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuote = false;
        var current = new StringBuilder();
        foreach (char c in line)
        {
            if (c == '"') { inQuote = !inQuote; continue; }
            if (c == ',' && !inQuote) { result.Add(current.ToString()); current.Clear(); continue; }
            current.Append(c);
        }
        result.Add(current.ToString());
        return result.ToArray();
    }

    private static string MapShopeeStatus(string raw) => raw.ToLower() switch
    {
        "đã giao" or "giao thành công" or "delivered" or "completed" => "completed",
        "đã hủy" or "hủy đơn" or "cancelled" => "cancelled",
        "hoàn hàng" or "trả hàng" or "returned" or "refunded" => "refunded",
        _ => "completed",
    };

    private static string MapTikTokStatus(string raw) => raw.ToLower() switch
    {
        "completed" or "delivered" or "finished" => "completed",
        "cancelled" or "canceled" => "cancelled",
        "returned" or "refunded" => "refunded",
        _ => "completed",
    };
}