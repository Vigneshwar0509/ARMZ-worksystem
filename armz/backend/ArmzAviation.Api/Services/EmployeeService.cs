using ArmzAviation.Api.Data;
using ArmzAviation.Api.DTOs;
using ArmzAviation.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ArmzAviation.Api.Services;

public interface IEmployeeService
{
    Task<List<EmployeeDto>> GetAllAsync();
    Task<EmployeeDto?> GetByIdAsync(int id);
    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest req);
    Task<EmployeeDto?> UpdateAsync(int id, UpdateEmployeeRequest req);
    Task<bool> DeleteAsync(int id);
    Task<bool> ResetPasswordAsync(int id, string newPassword);
}

public class EmployeeService(AppDbContext db) : IEmployeeService
{
    public async Task<List<EmployeeDto>> GetAllAsync()
    {
        return await db.Employees
            .Include(e => e.Manager)
            .Where(e => e.IsActive)
            .OrderBy(e => e.EmployeeCode)
            .Select(e => Map(e))
            .ToListAsync();
    }

    public async Task<EmployeeDto?> GetByIdAsync(int id)
    {
        var e = await db.Employees.Include(e => e.Manager).FirstOrDefaultAsync(x => x.Id == id);
        return e is null ? null : Map(e);
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username))
            throw new InvalidOperationException("Username is required.");

        if (await db.Employees.AnyAsync(e => e.Username == req.Username))
            throw new InvalidOperationException("Username already exists.");

        if (!string.IsNullOrWhiteSpace(req.Email) && await db.Employees.AnyAsync(e => e.Email == req.Email))
            throw new InvalidOperationException("Email already exists.");

        // Generate next employee code
        var lastCode = await db.Employees.OrderByDescending(e => e.Id).Select(e => e.EmployeeCode).FirstOrDefaultAsync();
        int nextNum  = 1;
        if (lastCode is not null && lastCode.StartsWith("ARMZ"))
            nextNum = int.Parse(lastCode[4..]) + 1;

        var emp = new Employee
        {
            EmployeeCode  = $"ARMZ{nextNum:D3}",
            Username      = req.Username,
            Name          = req.Name,
            Email         = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email,
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role          = Enum.Parse<UserRole>(req.Role),
            Department    = req.Department,
            Designation   = req.Designation,
            Phone         = req.Phone,
            JoinDate      = req.JoinDate,
            ManagerId     = req.ManagerId,
            IsActive      = req.IsActive,
        };

        db.Employees.Add(emp);
        await db.SaveChangesAsync();

        // Create leave balance for current year
        db.LeaveBalances.Add(new LeaveBalance { EmployeeId = emp.Id, Year = DateTime.Today.Year });
        await db.SaveChangesAsync();

        return Map(emp);
    }

    public async Task<EmployeeDto?> UpdateAsync(int id, UpdateEmployeeRequest req)
    {
        var emp = await db.Employees.FindAsync(id);
        if (emp is null) return null;

        if (string.IsNullOrWhiteSpace(req.Username))
            throw new InvalidOperationException("Username is required.");

        if (await db.Employees.AnyAsync(e => e.Id != id && e.Username == req.Username))
            throw new InvalidOperationException("Username already exists.");

        if (!string.IsNullOrWhiteSpace(req.Email) && await db.Employees.AnyAsync(e => e.Id != id && e.Email == req.Email))
            throw new InvalidOperationException("Email already exists.");

        emp.Name        = req.Name;
        emp.Username    = req.Username;
        emp.Email       = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email;
        emp.Role        = Enum.Parse<UserRole>(req.Role);
        emp.Department  = req.Department;
        emp.Designation = req.Designation;
        emp.Phone       = req.Phone;
        emp.ManagerId   = req.ManagerId;
        emp.IsActive    = req.IsActive;

        await db.SaveChangesAsync();
        await db.Entry(emp).Reference(e => e.Manager).LoadAsync();
        return Map(emp);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var emp = await db.Employees.FindAsync(id);
        if (emp is null) return false;
        emp.IsActive = false; // soft delete
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ResetPasswordAsync(int id, string newPassword)
    {
        var emp = await db.Employees.FindAsync(id);
        if (emp is null) return false;
        emp.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
        return true;
    }

    private static EmployeeDto Map(Employee e) => new(
        e.Id, e.EmployeeCode, e.Username, e.Name, e.Email,
        e.Role.ToString(), e.Department, e.Designation,
        e.Phone, e.JoinDate, e.IsActive,
        e.ManagerId, e.Manager?.Name
    );
}
