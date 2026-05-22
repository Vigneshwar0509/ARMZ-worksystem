using ArmzAviation.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ArmzAviation.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<MonthlyEvent> MonthlyEvents => Set<MonthlyEvent>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Employee>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.EmployeeCode).IsUnique();
            e.HasOne(x => x.Manager)
             .WithMany(x => x.Subordinates)
             .HasForeignKey(x => x.ManagerId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<AttendanceRecord>(e =>
        {
            e.HasIndex(x => new { x.EmployeeId, x.Date }).IsUnique();
            e.HasOne(x => x.Employee).WithMany(x => x.AttendanceRecords)
             .HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<TimeEntry>(e =>
        {
            e.HasOne(x => x.Employee).WithMany(x => x.TimeEntries)
             .HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Project).WithMany(x => x.TimeEntries)
             .HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<MonthlyEvent>(e =>
        {
            e.HasIndex(x => x.Date);
        });

        mb.Entity<LeaveRequest>(e =>
        {
            e.HasOne(x => x.Employee).WithMany(x => x.LeaveRequests)
             .HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ApprovedBy).WithMany()
             .HasForeignKey(x => x.ApprovedById).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<LeaveBalance>(e =>
        {
            e.HasIndex(x => new { x.EmployeeId, x.Year }).IsUnique();
            e.HasOne(x => x.Employee).WithMany()
             .HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
