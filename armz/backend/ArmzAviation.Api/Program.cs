using System.Text;
using System;
using ArmzAviation.Api.Data;
using ArmzAviation.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql.EntityFrameworkCore.PostgreSQL;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
var isProduction = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
var productionConnString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (isProduction)
{
    if (string.IsNullOrWhiteSpace(productionConnString))
    {
        throw new InvalidOperationException(
            "Production database connection string is required. Set DATABASE_URL or ConnectionStrings__DefaultConnection.");
    }

    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseNpgsql(productionConnString));
}
else
{
    var sqliteConnString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=armz.db";
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseSqlite(sqliteConnString));
}

// ── JWT Auth ──────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ArmzAviationSuperSecretKey2026!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"] ?? "ArmzAviation",
            ValidAudience            = builder.Configuration["Jwt:Audience"] ?? "ArmzAviationApp",
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

builder.Services.AddAuthorization();

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService,       AuthService>();
builder.Services.AddScoped<IEmployeeService,   EmployeeService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<ITimeEntryService,  TimeEntryService>();
builder.Services.AddScoped<IMonthlyEventService, MonthlyEventService>();
builder.Services.AddScoped<ILeaveService,      LeaveService>();

// ── Controllers + Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Armz Aviation API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http,
        Scheme = "Bearer", BearerFormat = "JWT", In = ParameterLocation.Header,
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        }
    });
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt => opt.AddPolicy("Frontend", p =>
    p.SetIsOriginAllowed(origin =>
        !string.IsNullOrEmpty(origin) &&
        (origin == "https://armz-worksystem.vercel.app" ||
         origin == "https://armz-worksystem-f103eot1w-armzworksystem.vercel.app" ||
         (Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)) ||
         origin == "http://localhost:5173"))
     .AllowAnyHeader()
     .AllowAnyMethod()));

var app = builder.Build();

// ── Migrate + Seed ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    try
    {
        // Force a read against the monthly events table so we can detect a stale schema.
        _ = db.MonthlyEvents.Any();
    }
    catch (SqliteException ex) when (ex.Message.Contains("no such table") || ex.Message.Contains("unable to open database file"))
    {
        db.Database.ExecuteSqlRaw(@"
CREATE TABLE IF NOT EXISTS ""MonthlyEvents"" (
    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_MonthlyEvents"" PRIMARY KEY AUTOINCREMENT,
    ""Title"" TEXT NOT NULL,
    ""Description"" TEXT NOT NULL,
    ""Date"" TEXT NOT NULL,
    ""CreatedAt"" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ""IX_MonthlyEvents_Date"" ON ""MonthlyEvents"" (""Date"");");
    }

    DbSeeder.Seed(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Bind to Render's PORT environment variable if present, otherwise default to 8080
var portEnv = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(portEnv))
{
    app.Urls.Clear();
    app.Urls.Add($"http://*:{portEnv}");
}
else
{
    app.Urls.Add("http://*:8080");
}

app.Run();
