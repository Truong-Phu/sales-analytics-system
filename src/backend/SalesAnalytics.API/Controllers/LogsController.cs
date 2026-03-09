// ============================================================
// FILE: Controllers/LogsController.cs
// UC8: Ghi log và theo dõi hoạt động hệ thống
// Quyền: Chỉ Admin
// ============================================================
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalesAnalytics.Core.Interfaces;

namespace SalesAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class LogsController : ControllerBase
{
    private readonly ILogRepository _repo;

    public LogsController(ILogRepository repo) => _repo = repo;

    // ─── GET /api/logs ──────────────────────────────────────
    /// <summary>
    /// UC8: Xem danh sách nhật ký hoạt động hệ thống.
    /// Hỗ trợ lọc theo userId và phân trang.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] int? userId = null)
        => Ok(await _repo.GetAllAsync(page, pageSize, userId));
}
