namespace ArmzAviation.Api.Models;

// ─── Enums ────────────────────────────────────────────────────────────────────

public enum UserRole { Admin, Manager, Employee }
public enum AttendanceMode { WFO, WFH }
public enum AttendanceStatus { Present, Absent, OnLeave, HalfDay, Holiday, Weekend }
public enum LeaveType { CasualLeave, SickLeave, EarnedLeave, UnpaidLeave, CompOff }
public enum LeaveStatus { Pending, Approved, Rejected, Cancelled }

// ─── Employee ─────────────────────────────────────────────────────────────────

public class Employee
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Employee;
    public string Department { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateOnly JoinDate { get; set; }
    public bool IsActive { get; set; } = true;
    public int? ManagerId { get; set; }
    public Employee? Manager { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = [];
    public ICollection<TimeEntry> TimeEntries { get; set; } = [];
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = [];
    public ICollection<Employee> Subordinates { get; set; } = [];
}

// ─── Attendance ───────────────────────────────────────────────────────────────

public class AttendanceRecord
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public DateOnly Date { get; set; }
    public TimeOnly? CheckIn { get; set; }
    public TimeOnly? CheckOut { get; set; }
    public AttendanceMode Mode { get; set; } = AttendanceMode.WFH;
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public double TotalHours { get; set; }
    public double EffectiveHours { get; set; }
    public bool IsFullDay { get; set; } = true;
    public string? Notes { get; set; }
}

// ─── Time Entry ───────────────────────────────────────────────────────────────

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<TimeEntry> TimeEntries { get; set; } = [];
}

public class TimeEntry
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public DateOnly EntryDate { get; set; }
    public double Hours { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

// ─── Monthly Events ───────────────────────────────────────────────────────────

public class MonthlyEvent
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ─── Leave ────────────────────────────────────────────────────────────────────

public class LeaveRequest
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public LeaveType LeaveType { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public int TotalDays { get; set; }
    public string Reason { get; set; } = string.Empty;
    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;
    public int? ApprovedById { get; set; }
    public Employee? ApprovedBy { get; set; }
    public string? ApproverComments { get; set; }
    public DateTime AppliedOn { get; set; } = DateTime.UtcNow;
    public DateTime? ActionedOn { get; set; }
}

// ─── Leave Balance ────────────────────────────────────────────────────────────

public class LeaveBalance
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public int Year { get; set; }
    public int CasualLeave { get; set; } = 12;
    public int SickLeave { get; set; } = 6;
    public int EarnedLeave { get; set; } = 15;
    public int CompOff { get; set; } = 0;
    public int UsedCasual { get; set; } = 0;
    public int UsedSick { get; set; } = 0;
    public int UsedEarned { get; set; } = 0;
    public int UsedCompOff { get; set; } = 0;
}
