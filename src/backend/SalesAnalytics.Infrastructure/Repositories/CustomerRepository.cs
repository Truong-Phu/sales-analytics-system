// ============================================================
// FILE: Repositories/CustomerRepository.cs
// Mục đích: Quản lý khách hàng — UC11: Quản lý khách hàng
// ============================================================
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.DTOs.Customers;
using SalesAnalytics.Core.Entities;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;

namespace SalesAnalytics.Infrastructure.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly AppDbContext _db;

    public CustomerRepository(AppDbContext db) => _db = db;

    // ─── Lấy danh sách khách hàng (phân trang + tìm kiếm) ──
    public async Task<PagedCustomersDto> GetAllAsync(int page, int pageSize, string? search)
    {
        var q = _db.Customers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.CustomerName.ToLower().Contains(search.ToLower())
                          || (c.Phone != null && c.Phone.Contains(search))
                          || (c.Email != null && c.Email.ToLower().Contains(search.ToLower())));

        var total = await q.CountAsync();

        var items = await q
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerDto
            {
                CustomerId   = c.CustomerId,
                CustomerName = c.CustomerName,
                Phone        = c.Phone,
                Email        = c.Email,
                Address      = c.Address,
                CreatedAt    = c.CreatedAt
            })
            .ToListAsync();

        return new PagedCustomersDto
        {
            Items      = items,
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize
        };
    }

    // ─── Lấy 1 khách hàng theo ID ───────────────────────────
    public async Task<CustomerDto?> GetByIdAsync(int id)
        => await _db.Customers
                    .Where(c => c.CustomerId == id)
                    .Select(c => new CustomerDto
                    {
                        CustomerId   = c.CustomerId,
                        CustomerName = c.CustomerName,
                        Phone        = c.Phone,
                        Email        = c.Email,
                        Address      = c.Address,
                        CreatedAt    = c.CreatedAt
                    })
                    .FirstOrDefaultAsync();

    // ─── Tạo khách hàng mới ─────────────────────────────────
    public async Task<Customer> CreateAsync(Customer customer)
    {
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return customer;
    }

    // ─── Cập nhật thông tin khách hàng ──────────────────────
    public async Task<Customer?> UpdateAsync(int id, UpdateCustomerDto dto)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return null;

        customer.CustomerName = dto.CustomerName;
        customer.Phone        = dto.Phone;
        customer.Email        = dto.Email;
        customer.Address      = dto.Address;
        customer.UpdatedAt    = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return customer;
    }

    // ─── Xóa khách hàng ─────────────────────────────────────
    public async Task<bool> DeleteAsync(int id)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return false;

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync();
        return true;
    }
}
