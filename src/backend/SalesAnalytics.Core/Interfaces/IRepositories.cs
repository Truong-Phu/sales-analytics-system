// ============================================================
// INTERFACES — Repository pattern
// ============================================================
using SalesAnalytics.Core.DTOs.Orders;
using SalesAnalytics.Core.DTOs.Statistics;
using SalesAnalytics.Core.DTOs.Users;
using SalesAnalytics.Core.DTOs.Products;
using SalesAnalytics.Core.DTOs.Customers;
using SalesAnalytics.Core.DTOs.Channels;
using SalesAnalytics.Core.DTOs.Categories;
using SalesAnalytics.Core.DTOs.Logs;
using SalesAnalytics.Core.Entities;

namespace SalesAnalytics.Core.Interfaces;

// --- Auth ---
public interface IAuthRepository
{
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetPendingByUsernameAsync(string username);
    Task<bool> UsernameExistsAsync(string username);
}

// --- UC2: Users ---
public interface IUserRepository
{
    Task<PagedUsersDto> GetAllAsync(int page, int pageSize, string? search);
    Task<UserDto?> GetByIdAsync(int id);
    Task<User> CreateAsync(User user);
    Task<User?> UpdateAsync(int id, UpdateUserDto dto);
    Task<bool> DeleteAsync(int id);
    Task<List<UserDto>> GetPendingUsersAsync();
    Task<bool> ApproveUserAsync(int userId);
    Task<bool> RejectUserAsync(int userId);
    Task<bool> ChangePasswordAsync(int id, string newPasswordHash);
}

// --- UC3+UC4: Orders ---
public interface IOrderRepository
{
    Task<PagedOrdersDto> GetAllAsync(OrderQueryDto query);
    Task<OrderDto?> GetByIdAsync(int id);
    Task<Order> CreateAsync(Order order, List<OrderDetail> details);
    Task<Order?> UpdateAsync(int id, UpdateOrderDto dto);
    Task<bool> DeleteAsync(int id);
}

// --- UC9: Products ---
public interface IProductRepository
{
    Task<PagedProductsDto> GetAllAsync(int page, int pageSize, string? search, bool? isActive);
    Task<ProductDto?> GetByIdAsync(int id);
    Task<List<ProductDto>> GetActiveListAsync();
    Task<Product> CreateAsync(Product product);
    Task<Product?> UpdateAsync(int id, UpdateProductDto dto);
    Task<bool> DeleteAsync(int id);
}

// --- UC11: Customers ---
public interface ICustomerRepository
{
    Task<PagedCustomersDto> GetAllAsync(int page, int pageSize, string? search);
    Task<CustomerDto?> GetByIdAsync(int id);
    Task<Customer> CreateAsync(Customer customer);
    Task<Customer?> UpdateAsync(int id, UpdateCustomerDto dto);
    Task<bool> DeleteAsync(int id);
}

// --- UC10: Channels ---
public interface IChannelRepository
{
    Task<List<ChannelDto>> GetAllAsync(bool? isActive);
    Task<ChannelDto?> GetByIdAsync(int id);
    Task<SalesChannel> CreateAsync(SalesChannel channel);
    Task<SalesChannel?> UpdateAsync(int id, UpdateChannelDto dto);
    Task<bool> DeleteAsync(int id);
    Task<bool> NameExistsAsync(string name, int? excludeId = null);
}

// --- Categories ---
public interface ICategoryRepository
{
    Task<List<CategoryDto>> GetAllAsync();
    Task<CategoryDto?> GetByIdAsync(int id);
    Task<Category> CreateAsync(Category category);
    Task<bool> DeleteAsync(int id);
}

// --- UC5+UC6: Statistics ---
public interface IStatisticsRepository
{
    Task<DashboardKpiDto> GetDashboardKpiAsync();
    Task<DashboardKpiDto> GetKpiByPeriodAsync(DateOnly from, DateOnly to);
    Task<List<RevenueByChannelDto>> GetRevenueByChannelAsync(DateOnly? from, DateOnly? to);
    Task<List<RevenueByMonthDto>> GetRevenueByMonthAsync(DateOnly from, DateOnly to);
    Task<(DateOnly MinDate, DateOnly MaxDate)> GetOrderDateRangeAsync();
    Task<List<RevenueByDayDto>> GetRevenueByDayAsync(DateOnly from, DateOnly to);
    Task<List<TopProductDto>> GetTopProductsAsync(DateOnly? from, DateOnly? to, int topN);
    Task<List<RevenueByCategoryDto>> GetRevenueByCategoryAsync(DateOnly? from, DateOnly? to);
    Task<ReportSummaryDto> GetReportSummaryAsync(DateOnly from, DateOnly to);
}

// --- UC8: Logs ---
public interface ILogRepository
{
    Task AddAsync(int userId, string action, string? tableName = null,
                  int? recordId = null, string? ipAddress = null);
    Task<PagedLogsDto> GetAllAsync(int page, int pageSize, int? userId);
}
