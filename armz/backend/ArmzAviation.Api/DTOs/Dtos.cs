namespace ArmzAviation.Api.DTOs;

// ─── Auth ─────────────────────────────────────────────────────────────────────

public record LoginRequest(string Identifier, string Password);

public record LoginResponse(
    string Token,
    int EmployeeId,
    string Name,
    string? Email,
    string Role,
    string Department,
    string Designation,
    string EmployeeCode
);

// ─── Employee ─────────────────────────────────────────────────────────────────

public record EmployeeDto(
    int Id,
    string EmployeeCode,
    string Username,
    string Name,
    string? Email,
    string Role,
    string Department,
    string Designation,
    string? Phone,
    DateOnly JoinDate,
    bool IsActive,
    int? ManagerId,
    string? ManagerName
);

public record CreateEmployeeRequest(
    string Name,
    string Username,
    string? Email,
    string Password,
    string Role,
    string Department,
    string Designation,
    string? Phone,
    DateOnly JoinDate,
    int? ManagerId,
    bool IsActive
);

public record UpdateEmployeeRequest(
    string Name,
    string Username,
    string? Email,
    string Role,
    string Department,
    string Designation,
    string? Phone,
    int? ManagerId,
    bool IsActive
);

// ─── Attendance ───────────────────────────────────────────────────────────────

public record AttendanceRecordDto(
    int Id,
    int EmployeeId,
    string EmployeeName,
    string Date,
    string? CheckIn,
    string? CheckOut,
    string Mode,
    string Status,
    double TotalHours,
    double EffectiveHours,
    bool IsFullDay,
    string? Notes
);

public record AttendanceSummaryDto(
    int EmployeeId,
    string EmployeeName,
    int WFO,
    int WFH,
    int Absent,
    int OnLeave,
    int TotalWorkingDays,
    double TotalHours,
    double EffectiveHours
);

public record CheckInRequest(int EmployeeId, string Mode);
public record CheckOutRequest(int EmployeeId);
public record TodayStatusDto(
    bool IsCheckedIn,
    string? CheckIn,
    string? CheckOut,
    double Hours,
    string Mode,
    string Status
);

// ─── Time Entry ───────────────────────────────────────────────────────────────

public record TimeEntryDto(
    int Id,
    int EmployeeId,
    string EmployeeName,
    string EntryDate,
    string ClientName,
    string ProjectName,
    int ProjectId,
    string Description,
    double Hours
);

public record CreateTimeEntryRequest(
    int EmployeeId,
    int ProjectId,
    string EntryDate,
    double Hours,
    string Description
);

public record UpdateTimeEntryRequest(
    int ProjectId,
    string EntryDate,
    double Hours,
    string Description
);

public record ProjectDto(int Id, string Name, string ClientName, bool IsActive);

public record CreateProjectRequest(string Name, string ClientName);

public record MonthlyEventDto(int Id, string Title, string Description, string Date);
public record CreateMonthlyEventRequest(string Title, string Description, string Date);
public record UpdateMonthlyEventRequest(string Title, string Description, string Date);

// ─── Leave ────────────────────────────────────────────────────────────────────

public record LeaveRequestDto(
    int Id,
    int EmployeeId,
    string EmployeeName,
    string LeaveType,
    string FromDate,
    string ToDate,
    int TotalDays,
    string Reason,
    string Status,
    string? ApproverName,
    string? ApproverComments,
    string AppliedOn
);

public record ApplyLeaveRequest(
    int EmployeeId,
    string LeaveType,
    string FromDate,
    string ToDate,
    string Reason
);

public record LeaveActionRequest(
    int ApproverId,
    string Action,   // "Approved" | "Rejected"
    string? Comments
);

public record LeaveBalanceDto(
    int EmployeeId,
    string EmployeeName,
    int Year,
    int CasualTotal, int CasualUsed, int CasualAvail,
    int SickTotal,   int SickUsed,   int SickAvail,
    int EarnedTotal, int EarnedUsed, int EarnedAvail,
    int CompOffTotal, int CompOffUsed, int CompOffAvail
);

// ─── Reports ─────────────────────────────────────────────────────────────────

public record MonthlyReportRow(
    int EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string Department,
    int WFO, int WFH, int Absent, int OnLeave,
    int TotalPresent,
    double TotalHours,
    double EffectiveHours
);
