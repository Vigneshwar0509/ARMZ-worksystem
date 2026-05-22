using ArmzAviation.Api.Data;
using ArmzAviation.Api.DTOs;
using ArmzAviation.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ArmzAviation.Api.Services;

public interface ITimeEntryService
{
    Task<List<TimeEntryDto>> GetEntriesAsync(int employeeId, DateOnly from, DateOnly to);
    Task<List<TimeEntryDto>> GetAllEntriesAsync(DateOnly from, DateOnly to);
    Task<TimeEntryDto> CreateAsync(CreateTimeEntryRequest req);
    Task<TimeEntryDto?> UpdateAsync(int id, UpdateTimeEntryRequest req);
    Task<bool> DeleteAsync(int id);
    Task<List<ProjectDto>> GetProjectsAsync();
    Task<ProjectDto> CreateProjectAsync(CreateProjectRequest req);
    Task<bool> ToggleProjectAsync(int id);
}

public class TimeEntryService(AppDbContext db) : ITimeEntryService
{
    public async Task<List<TimeEntryDto>> GetEntriesAsync(int employeeId, DateOnly from, DateOnly to)
    {
        return await db.TimeEntries
            .Include(t => t.Project).Include(t => t.Employee)
            .Where(t => t.EmployeeId == employeeId && t.EntryDate >= from && t.EntryDate <= to)
            .OrderByDescending(t => t.EntryDate)
            .Select(t => ToDto(t))
            .ToListAsync();
    }

    public async Task<List<TimeEntryDto>> GetAllEntriesAsync(DateOnly from, DateOnly to)
    {
        return await db.TimeEntries
            .Include(t => t.Project).Include(t => t.Employee)
            .Where(t => t.EntryDate >= from && t.EntryDate <= to)
            .OrderByDescending(t => t.EntryDate)
            .Select(t => ToDto(t))
            .ToListAsync();
    }

    public async Task<TimeEntryDto> CreateAsync(CreateTimeEntryRequest req)
    {
        var entry = new TimeEntry
        {
            EmployeeId  = req.EmployeeId,
            ProjectId   = req.ProjectId,
            EntryDate   = DateOnly.Parse(req.EntryDate),
            Hours       = req.Hours,
            Description = req.Description,
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();
        await db.Entry(entry).Reference(e => e.Project).LoadAsync();
        await db.Entry(entry).Reference(e => e.Employee).LoadAsync();
        return ToDto(entry);
    }

    public async Task<TimeEntryDto?> UpdateAsync(int id, UpdateTimeEntryRequest req)
    {
        var entry = await db.TimeEntries.Include(t => t.Project).Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (entry is null) return null;

        entry.ProjectId   = req.ProjectId;
        entry.EntryDate   = DateOnly.Parse(req.EntryDate);
        entry.Hours       = req.Hours;
        entry.Description = req.Description;
        entry.UpdatedAt   = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(entry);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entry = await db.TimeEntries.FindAsync(id);
        if (entry is null) return false;
        db.TimeEntries.Remove(entry);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ProjectDto>> GetProjectsAsync()
    {
        return await db.Projects.OrderBy(p => p.Name)
            .Select(p => new ProjectDto(p.Id, p.Name, p.ClientName, p.IsActive))
            .ToListAsync();
    }

    public async Task<ProjectDto> CreateProjectAsync(CreateProjectRequest req)
    {
        var proj = new Project { Name = req.Name, ClientName = req.ClientName };
        db.Projects.Add(proj);
        await db.SaveChangesAsync();
        return new ProjectDto(proj.Id, proj.Name, proj.ClientName, proj.IsActive);
    }

    public async Task<bool> ToggleProjectAsync(int id)
    {
        var proj = await db.Projects.FindAsync(id);
        if (proj is null) return false;
        proj.IsActive = !proj.IsActive;
        await db.SaveChangesAsync();
        return true;
    }

    private static TimeEntryDto ToDto(TimeEntry t) => new(
        t.Id, t.EmployeeId, t.Employee?.Name ?? "",
        t.EntryDate.ToString("dd/MM/yyyy"),
        t.Project?.ClientName ?? "", t.Project?.Name ?? "",
        t.ProjectId, t.Description, t.Hours
    );
}
