// ============================================================
// FILE: Data/AppDbContext.cs
// Map toàn bộ 9 bảng từ soursecode_csdl.docx
// ============================================================
using System.Collections.Generic;
using System.Reflection.Emit;
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Core.Entities;

namespace SalesAnalytics.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ─── DbSets (9 bảng) ───────────────────────────────────
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<SalesChannel> SalesChannels => Set<SalesChannel>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderDetail> OrderDetails => Set<OrderDetail>();
    public DbSet<Log> Logs => Set<Log>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ─── ROLE ───────────────────────────────────────────
        modelBuilder.Entity<Role>(e =>
        {
            e.ToTable("roles");
            e.HasKey(x => x.RoleId);
            e.Property(x => x.RoleId).HasColumnName("role_id").UseIdentityByDefaultColumn();
            e.Property(x => x.RoleName).HasColumnName("role_name").HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.RoleName).IsUnique();
        });

        // ─── USER ───────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasColumnName("user_id").UseIdentityByDefaultColumn();
            e.Property(x => x.Username).HasColumnName("username").HasMaxLength(50).IsRequired();
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(100);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(100);
            e.Property(x => x.RoleId).HasColumnName("role_id").IsRequired();
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasIndex(x => x.Username).IsUnique();

            e.HasOne(x => x.Role)
             .WithMany(r => r.Users)
             .HasForeignKey(x => x.RoleId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── CATEGORY ───────────────────────────────────────
        modelBuilder.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(x => x.CategoryId);
            e.Property(x => x.CategoryId).HasColumnName("category_id").UseIdentityByDefaultColumn();
            e.Property(x => x.CategoryName).HasColumnName("category_name").HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasIndex(x => x.CategoryName).IsUnique();
        });

        // ─── SALES_CHANNEL ──────────────────────────────────
        modelBuilder.Entity<SalesChannel>(e =>
        {
            e.ToTable("sales_channels");
            e.HasKey(x => x.ChannelId);
            e.Property(x => x.ChannelId).HasColumnName("channel_id").UseIdentityByDefaultColumn();
            e.Property(x => x.ChannelName).HasColumnName("channel_name").HasMaxLength(50).IsRequired();
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.HasIndex(x => x.ChannelName).IsUnique();
        });

        // ─── PRODUCT ────────────────────────────────────────
        modelBuilder.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.ProductId);
            e.Property(x => x.ProductId).HasColumnName("product_id").UseIdentityByDefaultColumn();
            e.Property(x => x.ProductName).HasColumnName("product_name").HasMaxLength(100).IsRequired();
            e.Property(x => x.CategoryId).HasColumnName("category_id");
            e.Property(x => x.Price).HasColumnName("price").HasPrecision(12, 2);
            e.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(30);
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.HasOne(x => x.Category)
             .WithMany(c => c.Products)
             .HasForeignKey(x => x.CategoryId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ─── CUSTOMER ───────────────────────────────────────
        modelBuilder.Entity<Customer>(e =>
        {
            e.ToTable("customers");
            e.HasKey(x => x.CustomerId);
            e.Property(x => x.CustomerId).HasColumnName("customer_id").UseIdentityByDefaultColumn();
            e.Property(x => x.CustomerName).HasColumnName("customer_name").HasMaxLength(100).IsRequired();
            e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(20);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(100);
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // ─── ORDER ──────────────────────────────────────────
        modelBuilder.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(x => x.OrderId);
            e.Property(x => x.OrderId).HasColumnName("order_id").UseIdentityByDefaultColumn();
            e.Property(x => x.OrderDate).HasColumnName("order_date").HasDefaultValueSql("CURRENT_DATE");
            e.Property(x => x.CustomerId).HasColumnName("customer_id");
            e.Property(x => x.ChannelId).HasColumnName("channel_id").IsRequired();
            e.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(14, 2).HasDefaultValue(0);
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("completed");
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.HasOne(x => x.Customer)
             .WithMany(c => c.Orders)
             .HasForeignKey(x => x.CustomerId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(x => x.Channel)
             .WithMany(sc => sc.Orders)
             .HasForeignKey(x => x.ChannelId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.CreatedByUser)
             .WithMany(u => u.Orders)
             .HasForeignKey(x => x.CreatedBy)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ─── ORDER_DETAIL ────────────────────────────────────
        modelBuilder.Entity<OrderDetail>(e =>
        {
            e.ToTable("order_details");
            e.HasKey(x => x.OrderDetailId);
            e.Property(x => x.OrderDetailId).HasColumnName("order_detail_id").UseIdentityByDefaultColumn();
            e.Property(x => x.OrderId).HasColumnName("order_id").IsRequired();
            e.Property(x => x.ProductId).HasColumnName("product_id").IsRequired();
            e.Property(x => x.Quantity).HasColumnName("quantity").IsRequired();
            e.Property(x => x.UnitPrice).HasColumnName("unit_price").HasPrecision(12, 2).IsRequired();
            e.Property(x => x.Discount).HasColumnName("discount").HasPrecision(5, 2).HasDefaultValue(0);
            // subtotal là cột GENERATED ALWAYS AS STORED trong PostgreSQL — chỉ đọc
            e.Property(x => x.Subtotal).HasColumnName("subtotal").HasPrecision(14, 2)
             .ValueGeneratedOnAddOrUpdate();

            e.HasOne(x => x.Order)
             .WithMany(o => o.OrderDetails)
             .HasForeignKey(x => x.OrderId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Product)
             .WithMany(p => p.OrderDetails)
             .HasForeignKey(x => x.ProductId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── LOG ────────────────────────────────────────────
        modelBuilder.Entity<Log>(e =>
        {
            e.ToTable("logs");
            e.HasKey(x => x.LogId);
            e.Property(x => x.LogId).HasColumnName("log_id").UseIdentityByDefaultColumn();
            e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            e.Property(x => x.Action).HasColumnName("action").IsRequired();
            e.Property(x => x.TableName).HasColumnName("table_name").HasMaxLength(50);
            e.Property(x => x.RecordId).HasColumnName("record_id");
            e.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.HasOne(x => x.User)
             .WithMany(u => u.Logs)
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
