// ============================================================
// FILE: Program.cs — ASP.NET Core 8
// ĐÃ SỬA: thứ tự middleware CORS + JSON serialization
// ============================================================
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SalesAnalytics.Core.Interfaces;
using SalesAnalytics.Infrastructure.Data;
using SalesAnalytics.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// ─── 1. DATABASE ─────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── 2. DEPENDENCY INJECTION ──────────────────────────────────
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<IChannelRepository, ChannelRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IStatisticsRepository, StatisticsRepository>();
builder.Services.AddScoped<ILogRepository, LogRepository>();

// ─── 3. JWT AUTHENTICATION ────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key không được để trống");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("ManagerOnly", policy => policy.RequireRole("Admin", "Manager"));
    options.AddPolicy("StaffOnly", policy => policy.RequireRole("Admin", "Staff"));
});

// ─── 4. CORS — PHẢI khai báo trước Build() ───────────────────
// FIX: Cho phép cả localhost:3000 và localhost:3001 (React dev ports)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());   // cho phép cookie nếu cần sau này
});

// ─── 5. CONTROLLERS — JSON camelCase cho Frontend ────────────
// FIX: .NET mặc định PascalCase → đổi sang camelCase cho JS
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // camelCase: Token → token, UserId → userId, FullName → fullName
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// ─── 6. SWAGGER ───────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Sales Analytics API",
        Version = "v1",
        Description = "API Hệ thống Thu thập, Quản lý và Phân tích Dữ liệu Bán hàng Đa kênh"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập: Bearer {token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ─── BUILD ────────────────────────────────────────────────────
var app = builder.Build();

// ══════════════════════════════════════════════════════════════
// MIDDLEWARE ORDER — THỨ TỰ NÀY RẤT QUAN TRỌNG
// UseCors() PHẢI đứng TRƯỚC UseAuthentication() và UseAuthorization()
// ══════════════════════════════════════════════════════════════

// 1. Swagger (chỉ dev)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sales Analytics API v1");
        c.RoutePrefix = string.Empty; // Swagger tại root: http://localhost:5000
    });
}

// 2. CORS — PHẢI đứng đầu tiên, trước Auth
app.UseCors("AllowFrontend");

// 3. Auth
app.UseAuthentication();
app.UseAuthorization();

// 4. Controllers
app.MapControllers();

app.Run();