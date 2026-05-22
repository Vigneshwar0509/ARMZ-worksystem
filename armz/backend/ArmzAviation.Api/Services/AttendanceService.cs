using ArmzAviation.Api.Data;
using ArmzAviation.Api.DTOs;
using ArmzAviation.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ArmzAviation.Api.Services;

public interface IAttendanceService
{
    Task<TodayStatusDto> GetTodayStatusAsync(int employeeId);
    Task<List<AttendanceRecordDto>> GetRecordsAsync(int employeeId, DateOnly from, DateOnly to);
    Task<List<AttendanceRecordDto>> GetTeamRecordsAsync(DateOnly date);
    Task<List<AttendanceRecordDto>> GetAllRecordsAsync(DateOnly from, DateOnly to);
    Task<AttendanceSummaryDto> GetSummaryAsync(int employeeId, int year, int month);
    Task<List<AttendanceSummaryDto>> GetAllSummariesAsync(int year, int month);
    Task<AttendanceRecordDto> CheckInAsync(CheckInRequest req);
    Task<AttendanceRecordDto> CheckOutAsync(CheckOutRequest req);
}

public class AttendanceService(AppDbContext db) : IAttendanceService
{
    public async Task<TodayStatusDto> GetTodayStatusAsync(int employeeId)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var rec   = await db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == today);

        if (rec is null)
            return new TodayStatusDto(false, null, null, 0, "WFH", "NotCheckedIn");

        double hrs = 0;
        if (rec.CheckIn.HasValue && rec.CheckOut.HasValue)
            hrs = Math.Round((rec.CheckOut.Value.ToTimeSpan() - rec.CheckIn.Value.ToTimeSpan()).TotalHours, 2);
        else if (rec.CheckIn.HasValue)
            hrs = Math.Round((TimeOnly.FromDateTime(DateTime.Now).ToTimeSpan() - rec.CheckIn.Value.ToTimeSpan()).TotalHours, 2);

        return new TodayStatusDto(
            rec.CheckOut is null && rec.CheckIn is not null,
            rec.CheckIn?.ToString("HH:mm"),
            rec.CheckOut?.ToString("HH:mm"),
            hrs,
            rec.Mode.ToString(),
            rec.Status.ToString()
        );
    }

    public async Task<List<AttendanceRecordDto>> GetRecordsAsync(int employeeId, DateOnly from, DateOnly to)
    {
        return await db.AttendanceRecords
            .Include(a => a.Employee)
            .Where(a => a.EmployeeId == employeeId && a.Date >= from && a.Date <= to)
            .OrderByDescending(a => a.Date)
            .Select(a => ToDto(a))
            .ToListAsync();
    }

    public async Task<List<AttendanceRecordDto>> GetTeamRecordsAsync(DateOnly date)
    {
        return await db.AttendanceRecords
            .Include(a => a.Employee)
            .Where(a => a.Date == date && a.Employee.IsActive)
            .Select(a => ToDto(a))
            .ToListAsync();
    }

    public async Task<List<AttendanceRecordDto>> GetAllRecordsAsync(DateOnly from, DateOnly to)
    {
        return await db.AttendanceRecords
            .Include(a => a.Employee)
            .Where(a => a.Date >= from && a.Date <= to && a.Employee.IsActive)
            .OrderByDescending(a => a.Date)
            .Select(a => ToDto(a))
            .ToListAsync();
    }

    public async Task<AttendanceSummaryDto> GetSummaryAsync(int employeeId, int year, int month)
    {
        var emp  = await db.Employees.FindAsync(employeeId);
        var from = new DateOnly(year, month, 1);
        var to   = from.AddMonths(1).AddDays(-1);
        var recs = await db.AttendanceRecords
            .Where(a => a.EmployeeId == employeeId && a.Date >= from && a.Date <= to)
            .ToListAsync();

        return BuildSummary(employeeId, emp!.Name, recs);
    }

    public async Task<List<AttendanceSummaryDto>> GetAllSummariesAsync(int year, int month)
    {
        var from = new DateOnly(year, month, 1);
        var to   = from.AddMonths(1).AddDays(-1);
        var all  = await db.AttendanceRecords
            .Include(a => a.Employee)
            .Where(a => a.Date >= from && a.Date <= to && a.Employee.IsActive)
            .ToListAsync();

        return all.GroupBy(a => new { a.EmployeeId, a.Employee.Name })
            .Select(g => BuildSummary(g.Key.EmployeeId, g.Key.Name, g.ToList()))
            .OrderBy(s => s.EmployeeName)
            .ToList();
    }

    public async Task<AttendanceRecordDto> CheckInAsync(CheckInRequest req)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var mode  = Enum.Parse<AttendanceMode>(req.Mode, true);
        var rec   = await db.AttendanceRecords
            .FirstOrDefaultAsync(a => a.EmployeeId == req.EmployeeId && a.Date == today);

        if (rec is null)
        {
            rec = new AttendanceRecord
            {
                EmployeeId = req.EmployeeId,
                Date       = today,
                CheckIn    = TimeOnly.FromDateTime(DateTime.Now),
                Mode       = mode,
                Status     = AttendanceStatus.Present,
            };
            db.AttendanceRecords.Add(rec);
        }
        else
        {
            rec.CheckIn       = TimeOnly.FromDateTime(DateTime.Now);
            rec.CheckOut      = null;
            rec.TotalHours    = 0;
            rec.EffectiveHours = 0;
            rec.Mode          = mode;
            rec.Status        = AttendanceStatus.Present;
        }

        await db.SaveChangesAsync();
        await db.Entry(rec).Reference(r => r.Employee).LoadAsync();
        return ToDto(rec);
    }

    public async Task<AttendanceRecordDto> CheckOutAsync(CheckOutRequest req)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var rec   = await db.AttendanceRecords
            .Include(r => r.Employee)
            .FirstOrDefaultAsync(a => a.EmployeeId == req.EmployeeId && a.Date == today)
            ?? throw new InvalidOperationException("No check-in record found for today.");

        rec.CheckOut = TimeOnly.FromDateTime(DateTime.Now);
        if (rec.CheckIn.HasValue)
        {
            var span = rec.CheckOut.Value.ToTimeSpan() - rec.CheckIn.Value.ToTimeSpan();
            rec.TotalHours     = Math.Round(span.TotalHours, 2);
            rec.EffectiveHours = Math.Round(Math.Max(0, span.TotalHours - 0.5), 2);
        }

        await db.SaveChangesAsync();
        return ToDto(rec);
    }

    private static AttendanceSummaryDto BuildSummary(int empId, string name, List<AttendanceRecord> recs) =>
        new(empId, name,
            recs.Count(r => r.Mode == AttendanceMode.WFO  && r.Status == AttendanceStatus.Present),
            recs.Count(r => r.Mode == AttendanceMode.WFH  && r.Status == AttendanceStatus.Present),
            recs.Count(r => r.Status == AttendanceStatus.Absent),
            recs.Count(r => r.Status == AttendanceStatus.OnLeave),
            recs.Count(r => r.Status is AttendanceStatus.Present or AttendanceStatus.HalfDay),
            Math.Round(recs.Sum(r => r.TotalHours), 2),
            Math.Round(recs.Sum(r => r.EffectiveHours), 2)
        );

    private static AttendanceRecordDto ToDto(AttendanceRecord a) => new(
        a.Id, a.EmployeeId, a.Employee?.Name ?? "",
        a.Date.ToString("dd/MM/yyyy"),
        a.CheckIn?.ToString("HH:mm"), a.CheckOut?.ToString("HH:mm"),
        a.Mode.ToString(), a.Status.ToString(),
        a.TotalHours, a.EffectiveHours, a.IsFullDay, a.Notes
    );
}
