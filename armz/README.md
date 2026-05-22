# ✈ Armz Aviation — Work Management System

Full-stack attendance and work-management system built with **React + Vite** (frontend) and **.NET 8 Web API** (backend) with **SQLite** database.

---

## 👥 User Roles & Credentials

| Role     | Email                          | Password      | Access |
|----------|-------------------------------|---------------|--------|
| Admin    | admin@armzaviation.com        | Admin@123     | Full access |
| Manager  | rajesh@armzaviation.com       | Manager@123   | Team view, leave approvals, reports |
| Employee | sangeetha@armzaviation.com    | Emp@123456    | Dashboard, time entry, leave |

---

## 📦 Project Structure

```
armz-aviation/
├── frontend/                    ← React + Vite
│   └── src/
│       ├── pages/
│       │   ├── auth/Login.jsx
│       │   ├── employee/
│       │   │   ├── Dashboard.jsx    ← My Attendance + Check In/Out
│       │   │   ├── TimeEntry.jsx    ← Log daily work hours
│       │   │   └── MyLeave.jsx      ← Apply & track leaves
│       │   ├── manager/
│       │   │   ├── TeamView.jsx     ← Team attendance overview
│       │   │   └── LeaveApprovals.jsx ← Approve/reject leaves
│       │   └── admin/
│       │       ├── Employees.jsx    ← Add/manage employees
│       │       ├── Projects.jsx     ← Manage projects
│       │       └── Reports.jsx      ← Attendance & timesheet reports
│       ├── components/Sidebar.jsx
│       ├── context/AuthContext.jsx  ← JWT auth state
│       ├── api/index.js             ← All API calls
│       └── hooks/useToast.js
│
└── backend/ArmzAviation.Api/       ← .NET 8 Web API
    ├── Controllers/Controllers.cs  ← Auth, Attendance, TimeEntry, Leave, Employees, Projects
    ├── Services/                   ← Business logic
    ├── Models/Models.cs            ← EF Core entities
    ├── Data/
    │   ├── AppDbContext.cs
    │   └── DbSeeder.cs             ← Auto seeds demo data
    └── DTOs/Dtos.cs
```

---

## 🖥 Frontend Setup

**Requirements:** Node.js 18+

```bash
cd frontend
npm install
npm run dev
```

Opens at → **http://localhost:5173**

---

## ⚙️ Backend Setup

**Requirements:** .NET 8 SDK

```bash
cd backend/ArmzAviation.Api
dotnet restore
dotnet run
```

Runs at → **http://localhost:5000**  
Swagger UI → **http://localhost:5000/swagger**

> Database (`armz.db`) is **auto-created and seeded** on first run — no setup needed!

---

## 🔌 API Endpoints

### Auth
| Method | URL | Body |
|--------|-----|------|
| POST | `/api/auth/login` | `{ email, password }` |

### Attendance
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/attendance/today/{empId}` | Today's check-in status |
| GET | `/api/attendance/{empId}?from=&to=` | Records by date range |
| GET | `/api/attendance/team` | All team records today |
| GET | `/api/attendance/summary/{empId}?year=&month=` | Monthly summary |
| GET | `/api/attendance/summary/all?year=&month=` | All employees summary |
| POST | `/api/attendance/checkin` | `{ employeeId, mode }` |
| POST | `/api/attendance/checkout` | `{ employeeId }` |

### Time Entries
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/timeentries/{empId}?from=&to=` | My entries |
| GET | `/api/timeentries/all?from=&to=` | All entries (Admin/Manager) |
| POST | `/api/timeentries` | Create entry |
| PUT | `/api/timeentries/{id}` | Update entry |
| DELETE | `/api/timeentries/{id}` | Delete entry |

### Leave
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/leave/my/{empId}` | My leave requests |
| GET | `/api/leave/pending` | Pending approvals |
| GET | `/api/leave/balance/{empId}` | Leave balance |
| POST | `/api/leave/apply` | Apply for leave |
| PUT | `/api/leave/{id}/action` | Approve/Reject |
| PUT | `/api/leave/{id}/cancel` | Cancel leave |

### Employees & Projects
| Method | URL |
|--------|-----|
| GET/POST | `/api/employees` |
| PUT/DELETE | `/api/employees/{id}` |
| POST | `/api/employees/{id}/reset-password` |
| GET/POST | `/api/projects` |
| PUT | `/api/projects/{id}/toggle` |

---

## 🚀 Production Notes

1. **SQL Server** — swap in `Program.cs`:
   ```csharp
   opt.UseSqlServer(config.GetConnectionString("Default"))
   ```
   Add package: `Microsoft.EntityFrameworkCore.SqlServer`

2. **Change JWT secret** in `appsettings.json` → `Jwt:Key`

3. **Build frontend**: `npm run build` → deploy `dist/` folder

4. **CORS** — update `WithOrigins()` in `Program.cs` with your production domain
