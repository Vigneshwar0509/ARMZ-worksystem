using ArmzAviation.Api.Models;
using BCrypt.Net;

namespace ArmzAviation.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        var isFreshDatabase = !db.Employees.Any();
        var isEventsTableEmpty = !db.MonthlyEvents.Any();
        if (!isFreshDatabase && !isEventsTableEmpty) return;

        if (isFreshDatabase)
        {
            var admin = new Employee
            {
                EmployeeCode = "ARMZ001",
                Username = "Dev",
                Name = "Prime Admin",
                Email = "dev@armzaviation.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev@0509"),
                Role = UserRole.Admin,
                Department = "Administration",
                Designation = "System Administrator",
                JoinDate = new DateOnly(2024, 1, 1),
                IsActive = true,
            };

            db.Employees.Add(admin);
            db.SaveChanges();

            db.LeaveBalances.Add(new LeaveBalance
            {
                EmployeeId = admin.Id,
                Year = DateTime.Today.Year,
                CasualLeave = 12,
                SickLeave = 6,
                EarnedLeave = 15,
                CompOff = 0,
            });
            db.SaveChanges();
        }

        if (isEventsTableEmpty)
        {
            db.MonthlyEvents.AddRange(
                new MonthlyEvent
                {
                    Title = "May Day",
                    Description = "Company holiday for the workforce.",
                    Date = new DateOnly(DateTime.Today.Year, 5, 1)
                },
                new MonthlyEvent
                {
                    Title = "Team Review",
                    Description = "Monthly team progress review.",
                    Date = new DateOnly(DateTime.Today.Year, 5, 22)
                }
            );
            db.SaveChanges();
        }
    }
}
