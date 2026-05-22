using ArmzAviation.Api.Data;
using ArmzAviation.Api.DTOs;
using ArmzAviation.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ArmzAviation.Api.Services;

public interface IMonthlyEventService
{
    Task<List<MonthlyEventDto>> GetAllAsync();
    Task<MonthlyEventDto> CreateAsync(CreateMonthlyEventRequest req);
    Task<MonthlyEventDto?> UpdateAsync(int id, UpdateMonthlyEventRequest req);
    Task<bool> DeleteAsync(int id);
}

public class MonthlyEventService(AppDbContext db) : IMonthlyEventService
{
    public async Task<List<MonthlyEventDto>> GetAllAsync()
    {
        return await db.MonthlyEvents
            .OrderBy(e => e.Date)
            .Select(e => Map(e))
            .ToListAsync();
    }

    public async Task<MonthlyEventDto> CreateAsync(CreateMonthlyEventRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            throw new InvalidOperationException("Title is required.");

        var date = DateOnly.Parse(req.Date);
        var ev = new MonthlyEvent
        {
            Title = req.Title,
            Description = req.Description?.Trim() ?? string.Empty,
            Date = date,
        };

        db.MonthlyEvents.Add(ev);
        await db.SaveChangesAsync();
        return Map(ev);
    }

    public async Task<MonthlyEventDto?> UpdateAsync(int id, UpdateMonthlyEventRequest req)
    {
        var ev = await db.MonthlyEvents.FindAsync(id);
        if (ev is null) return null;
        ev.Title = req.Title;
        ev.Description = req.Description?.Trim() ?? string.Empty;
        ev.Date = DateOnly.Parse(req.Date);
        await db.SaveChangesAsync();
        return Map(ev);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var ev = await db.MonthlyEvents.FindAsync(id);
        if (ev is null) return false;
        db.MonthlyEvents.Remove(ev);
        await db.SaveChangesAsync();
        return true;
    }

    private static MonthlyEventDto Map(MonthlyEvent e)
        => new(e.Id, e.Title, e.Description, e.Date.ToString("yyyy-MM-dd"));
}
