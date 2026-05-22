using ArmzAviation.Api.DTOs;
using ArmzAviation.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArmzAviation.Api.Controllers;

// ─── Auth ─────────────────────────────────────────────────────────────────────

[ApiController, Route("api/auth")]
public class AuthController(IAuthService svc) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var result = await svc.LoginAsync(req);
        if (result is null) return Unauthorized(new { message = "Invalid email or password." });
        return Ok(result);
    }
}

// ─── Employees ────────────────────────────────────────────────────────────────

[ApiController, Route("api/employees"), Authorize]
public class EmployeesController(IEmployeeService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await svc.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var emp = await svc.GetByIdAsync(id);
        return emp is null ? NotFound() : Ok(emp);
    }

    [HttpPost, Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeRequest req)
    {
        var emp = await svc.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = emp.Id }, emp);
    }

    [HttpPut("{id}"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEmployeeRequest req)
    {
        var emp = await svc.UpdateAsync(id, req);
        return emp is null ? NotFound() : Ok(emp);
    }

    [HttpDelete("{id}"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
        => await svc.DeleteAsync(id) ? NoContent() : NotFound();

    [HttpPost("{id}/reset-password"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest req)
        => await svc.ResetPasswordAsync(id, req.NewPassword) ? Ok() : NotFound();
}

public record ResetPasswordRequest(string NewPassword);

// ─── Attendance ───────────────────────────────────────────────────────────────

[ApiController, Route("api/attendance"), Authorize]
public class AttendanceController(IAttendanceService svc) : ControllerBase
{
    [HttpGet("today/{employeeId}")]
    public async Task<IActionResult> Today(int employeeId)
        => Ok(await svc.GetTodayStatusAsync(employeeId));

    [HttpGet("{employeeId}")]
    public async Task<IActionResult> GetRecords(
        int employeeId,
        [FromQuery] string from,
        [FromQuery] string to)
    {
        var records = await svc.GetRecordsAsync(
            employeeId, DateOnly.Parse(from), DateOnly.Parse(to));
        return Ok(records);
    }

    [HttpGet("team")]
    public async Task<IActionResult> TeamToday([FromQuery] string? date)
    {
        var d = date is not null ? DateOnly.Parse(date) : DateOnly.FromDateTime(DateTime.Today);
        return Ok(await svc.GetTeamRecordsAsync(d));
    }

    [HttpGet("records/all"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AllRecords([FromQuery] string from, [FromQuery] string to)
    {
        return Ok(await svc.GetAllRecordsAsync(DateOnly.Parse(from), DateOnly.Parse(to)));
    }

    [HttpGet("summary/{employeeId}")]
    public async Task<IActionResult> Summary(
        int employeeId,
        [FromQuery] int year = 0,
        [FromQuery] int month = 0)
    {
        year  = year  == 0 ? DateTime.Today.Year  : year;
        month = month == 0 ? DateTime.Today.Month : month;
        return Ok(await svc.GetSummaryAsync(employeeId, year, month));
    }

    [HttpGet("summary/all"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AllSummaries(
        [FromQuery] int year = 0,
        [FromQuery] int month = 0)
    {
        year  = year  == 0 ? DateTime.Today.Year  : year;
        month = month == 0 ? DateTime.Today.Month : month;
        return Ok(await svc.GetAllSummariesAsync(year, month));
    }

    [HttpPost("checkin")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequest req)
        => Ok(await svc.CheckInAsync(req));

    [HttpPost("checkout")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutRequest req)
    {
        try { return Ok(await svc.CheckOutAsync(req)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

[ApiController, Route("api/timeentries"), Authorize]
public class TimeEntryController(ITimeEntryService svc) : ControllerBase
{
    [HttpGet("{employeeId}")]
    public async Task<IActionResult> Get(
        int employeeId, [FromQuery] string from, [FromQuery] string to)
        => Ok(await svc.GetEntriesAsync(employeeId, DateOnly.Parse(from), DateOnly.Parse(to)));

    [HttpGet("all"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAll([FromQuery] string from, [FromQuery] string to)
        => Ok(await svc.GetAllEntriesAsync(DateOnly.Parse(from), DateOnly.Parse(to)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTimeEntryRequest req)
        => Ok(await svc.CreateAsync(req));

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTimeEntryRequest req)
    {
        var entry = await svc.UpdateAsync(id, req);
        return entry is null ? NotFound() : Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => await svc.DeleteAsync(id) ? NoContent() : NotFound();
}

// ─── Projects ─────────────────────────────────────────────────────────────────

[ApiController, Route("api/projects"), Authorize]
public class ProjectsController(ITimeEntryService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await svc.GetProjectsAsync());

    [HttpPost, Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest req)
        => Ok(await svc.CreateProjectAsync(req));

    [HttpPut("{id}/toggle"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Toggle(int id)
        => await svc.ToggleProjectAsync(id) ? Ok() : NotFound();
}

// ─── Monthly Events ───────────────────────────────────────────────────────────

[ApiController, Route("api/events"), Authorize]
public class MonthlyEventsController(IMonthlyEventService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await svc.GetAllAsync());

    [HttpPost, Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMonthlyEventRequest req)
    {
        var ev = await svc.CreateAsync(req);
        return Created($"/api/events/{ev.Id}", ev);
    }

    [HttpPut("{id}"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMonthlyEventRequest req)
    {
        var ev = await svc.UpdateAsync(id, req);
        return ev is null ? NotFound() : Ok(ev);
    }

    [HttpDelete("{id}"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
        => await svc.DeleteAsync(id) ? NoContent() : NotFound();
}

// ─── Leave ────────────────────────────────────────────────────────────────────

[ApiController, Route("api/leave"), Authorize]
public class LeaveController(ILeaveService svc) : ControllerBase
{
    [HttpGet("my/{employeeId}")]
    public async Task<IActionResult> MyLeaves(int employeeId)
        => Ok(await svc.GetMyLeavesAsync(employeeId));

    [HttpGet("pending"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Pending()
        => Ok(await svc.GetPendingLeavesAsync());

    [HttpGet("all"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> All([FromQuery] int year = 0)
    {
        year = year == 0 ? DateTime.Today.Year : year;
        return Ok(await svc.GetAllLeavesAsync(year));
    }

    [HttpGet("balance/{employeeId}")]
    public async Task<IActionResult> Balance(int employeeId, [FromQuery] int year = 0)
    {
        year = year == 0 ? DateTime.Today.Year : year;
        var bal = await svc.GetBalanceAsync(employeeId, year);
        return bal is null ? NotFound() : Ok(bal);
    }

    [HttpPost("apply")]
    public async Task<IActionResult> Apply([FromBody] ApplyLeaveRequest req)
        => Ok(await svc.ApplyLeaveAsync(req));

    [HttpPut("{id}/action"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Action(int id, [FromBody] LeaveActionRequest req)
    {
        var result = await svc.ActionLeaveAsync(id, req);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromQuery] int employeeId)
        => await svc.CancelLeaveAsync(id, employeeId) ? Ok() : BadRequest();
}
