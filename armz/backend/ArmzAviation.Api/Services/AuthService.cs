using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ArmzAviation.Api.Data;
using ArmzAviation.Api.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ArmzAviation.Api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest req);
}

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest req)
    {
        var emp = await db.Employees.FirstOrDefaultAsync(e =>
            e.IsActive && (e.Username == req.Identifier || e.Email == req.Identifier));
        if (emp is null) return null;
        if (!BCrypt.Net.BCrypt.Verify(req.Password, emp.PasswordHash)) return null;

        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, emp.Id.ToString()),
            new Claim(ClaimTypes.Name, emp.Name),
            new Claim(ClaimTypes.Role, emp.Role.ToString()),
        };
        if (!string.IsNullOrWhiteSpace(emp.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, emp.Email));
        }
        var token = new JwtSecurityToken(
            issuer:   config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddHours(12),
            signingCredentials: creds
        );

        return new LoginResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            emp.Id, emp.Name, emp.Email,
            emp.Role.ToString(), emp.Department,
            emp.Designation, emp.EmployeeCode
        );
    }
}
