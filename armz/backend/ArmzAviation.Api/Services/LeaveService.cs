using ArmzAviation.Api.Data;
using ArmzAviation.Api.DTOs;
using ArmzAviation.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ArmzAviation.Api.Services;

public interface ILeaveService
{
    Task<List<LeaveRequestDto>> GetMyLeavesAsync(int employeeId);
    Task<List<LeaveRequestDto>> GetPendingLeavesAsync();
    Task<List<LeaveRequestDto>> GetAllLeavesAsync(int year);
    Task<LeaveBalanceDto?> GetBalanceAsync(int employeeId, int year);
    Task<LeaveRequestDto> ApplyLeaveAsync(ApplyLeaveRequest req);
    Task<LeaveRequestDto?> ActionLeaveAsync(int id, LeaveActionRequest req);
    Task<bool> CancelLeaveAsync(int id, int employeeId);
}

public class LeaveService(AppDbContext db) : ILeaveService
{
    public async Task<List<LeaveRequestDto>> GetMyLeavesAsync(int employeeId)
    {
        return await db.LeaveRequests
            .Include(l => l.Employee).Include(l => l.ApprovedBy)
            .Where(l => l.EmployeeId == employeeId)
            .OrderByDescending(l => l.AppliedOn)
            .Select(l => ToDto(l))
            .ToListAsync();
    }

    public async Task<List<LeaveRequestDto>> GetPendingLeavesAsync()
    {
        return await db.LeaveRequests
            .Include(l => l.Employee).Include(l => l.ApprovedBy)
            .Where(l => l.Status == LeaveStatus.Pending)
            .OrderBy(l => l.AppliedOn)
            .Select(l => ToDto(l))
            .ToListAsync();
    }

    public async Task<List<LeaveRequestDto>> GetAllLeavesAsync(int year)
    {
        return await db.LeaveRequests
            .Include(l => l.Employee).Include(l => l.ApprovedBy)
            .Where(l => l.FromDate.Year == year)
            .OrderByDescending(l => l.AppliedOn)
            .Select(l => ToDto(l))
            .ToListAsync();
    }

    public async Task<LeaveBalanceDto?> GetBalanceAsync(int employeeId, int year)
    {
        var emp = await db.Employees.FindAsync(employeeId);
        if (emp is null) return null;
        var bal = await db.LeaveBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year);
        if (bal is null)
        {
            bal = new LeaveBalance { EmployeeId = employeeId, Year = year };
            db.LeaveBalances.Add(bal);
            await db.SaveChangesAsync();
        }

        return new LeaveBalanceDto(
            employeeId, emp.Name, year,
            bal.CasualLeave, bal.UsedCasual, bal.CasualLeave - bal.UsedCasual,
            bal.SickLeave,   bal.UsedSick,   bal.SickLeave   - bal.UsedSick,
            bal.EarnedLeave, bal.UsedEarned, bal.EarnedLeave - bal.UsedEarned,
            bal.CompOff,     bal.UsedCompOff,bal.CompOff     - bal.UsedCompOff
        );
    }

    public async Task<LeaveRequestDto> ApplyLeaveAsync(ApplyLeaveRequest req)
    {
        var from = DateOnly.Parse(req.FromDate);
        var to   = DateOnly.Parse(req.ToDate);
        int days = 0;
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
                days++;
        }

        var leave = new LeaveRequest
        {
            EmployeeId = req.EmployeeId,
            LeaveType  = Enum.Parse<LeaveType>(req.LeaveType),
            FromDate   = from, ToDate = to,
            TotalDays  = days,
            Reason     = req.Reason,
            Status     = LeaveStatus.Pending,
        };
        db.LeaveRequests.Add(leave);
        await db.SaveChangesAsync();
        await db.Entry(leave).Reference(l => l.Employee).LoadAsync();
        return ToDto(leave);
    }

    public async Task<LeaveRequestDto?> ActionLeaveAsync(int id, LeaveActionRequest req)
    {
        var leave = await db.LeaveRequests
            .Include(l => l.Employee).Include(l => l.ApprovedBy)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (leave is null) return null;

        var status = Enum.Parse<LeaveStatus>(req.Action);
        leave.Status           = status;
        leave.ApprovedById     = req.ApproverId;
        leave.ApproverComments = req.Comments;
        leave.ActionedOn       = DateTime.UtcNow;

        // Update leave balance if approved
        if (status == LeaveStatus.Approved)
        {
            var bal = await db.LeaveBalances.FirstOrDefaultAsync(
                b => b.EmployeeId == leave.EmployeeId && b.Year == leave.FromDate.Year);
            if (bal is not null)
            {
                switch (leave.LeaveType)
                {
                    case LeaveType.CasualLeave:  bal.UsedCasual  += leave.TotalDays; break;
                    case LeaveType.SickLeave:    bal.UsedSick    += leave.TotalDays; break;
                    case LeaveType.EarnedLeave:  bal.UsedEarned  += leave.TotalDays; break;
                    case LeaveType.CompOff:      bal.UsedCompOff += leave.TotalDays; break;
                }
            }
        }

        await db.SaveChangesAsync();
        await db.Entry(leave).Reference(l => l.ApprovedBy).LoadAsync();
        return ToDto(leave);
    }

    public async Task<bool> CancelLeaveAsync(int id, int employeeId)
    {
        var leave = await db.LeaveRequests
            .FirstOrDefaultAsync(l => l.Id == id && l.EmployeeId == employeeId && l.Status == LeaveStatus.Pending);
        if (leave is null) return false;
        leave.Status = LeaveStatus.Cancelled;
        await db.SaveChangesAsync();
        return true;
    }

    private static LeaveRequestDto ToDto(LeaveRequest l) => new(
        l.Id, l.EmployeeId, l.Employee?.Name ?? "",
        l.LeaveType.ToString(),
        l.FromDate.ToString("dd/MM/yyyy"), l.ToDate.ToString("dd/MM/yyyy"),
        l.TotalDays, l.Reason, l.Status.ToString(),
        l.ApprovedBy?.Name, l.ApproverComments,
        l.AppliedOn.ToString("dd/MM/yyyy HH:mm")
    );
}
