// Seed Data for AssetFlow ERP System
const INITIAL_DEPARTMENTS = [
  { id: "dept-1", name: "Information Technology", headId: "emp-2", parentId: "", status: "Active" },
  { id: "dept-2", name: "Human Resources", headId: "emp-3", parentId: "", status: "Active" },
  { id: "dept-3", name: "Operations", headId: "emp-4", parentId: "", status: "Active" },
  { id: "dept-4", name: "Engineering", headId: "emp-4", parentId: "dept-1", status: "Active" },
  { id: "dept-5", name: "Finance", headId: "", parentId: "", status: "Inactive" }
];
const INITIAL_CATEGORIES = [
  { id: "cat-1", name: "Electronics", customFields: [{ name: "Warranty Months", type: "number", value: "24" }, { name: "OS", type: "text", value: "Windows 11" }] },
  { id: "cat-2", name: "Vehicles", customFields: [{ name: "Fuel Type", type: "text", value: "Electric" }, { name: "License Plate", type: "text", value: "" }] },
  { id: "cat-3", name: "Office Furniture", customFields: [{ name: "Material", type: "text", value: "Ergonomic Mesh" }] },
  { id: "cat-4", name: "Shared Spaces", customFields: [{ name: "Capacity", type: "number", value: "10" }] }
];
const INITIAL_EMPLOYEES = [
  { id: "emp-1", name: "Administrator", email: "admin@assetflow.com", password: "password123", departmentId: "dept-1", role: "Admin", status: "Active" },
  { id: "emp-2", name: "Priya Sharma", email: "priya@assetflow.com", password: "password123", departmentId: "dept-1", role: "Asset Manager", status: "Active" },
  { id: "emp-3", name: "Raj Patel", email: "raj@assetflow.com", password: "password123", departmentId: "dept-2", role: "Department Head", status: "Active" },
  { id: "emp-4", name: "Amit Kumar", email: "amit@assetflow.com", password: "password123", departmentId: "dept-3", role: "Department Head", status: "Active" },
  { id: "emp-5", name: "Siddharth Rao", email: "sid@assetflow.com", password: "password123", departmentId: "dept-1", role: "Employee", status: "Active" },
  { id: "emp-6", name: "Neha Gupta", email: "neha@assetflow.com", password: "password123", departmentId: "dept-2", role: "Employee", status: "Active" },
  { id: "emp-7", name: "Vikram Singh", email: "vikram@assetflow.com", password: "password123", departmentId: "dept-3", role: "Employee", status: "Active" },
  { id: "emp-8", name: "Pooja Mehta", email: "pooja@assetflow.com", password: "password123", departmentId: "dept-4", role: "Employee", status: "Active" }
];
const INITIAL_ASSETS = [
  {
    id: "asset-1",
    tag: "AF-0001",
    name: "MacBook Pro M3 Max",
    categoryId: "cat-1",
    serialNumber: "SN-MBP99281A",
    acquisitionDate: "2025-06-15",
    acquisitionCost: 2800,
    condition: "Excellent",
    location: "IT Room 302",
    isShared: false,
    status: "Allocated", // Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed
    allocatedTo: { type: "Employee", id: "emp-5" }, // emp-id or dept-id
    expectedReturnDate: "2026-06-15", // OVERDUE (since system date is 2026-07-12)
    history: [
      { date: "2025-06-15", action: "Registration", user: "Priya Sharma", notes: "Asset registered under IT department." },
      { date: "2025-06-16", action: "Allocation", user: "Priya Sharma", notes: "Allocated to Siddharth Rao. Expected return: 2026-06-15." }
    ]
  },
  {
    id: "asset-2",
    tag: "AF-0002",
    name: "ThinkPad T14 Gen 4",
    categoryId: "cat-1",
    serialNumber: "SN-TPAD48301B",
    acquisitionDate: "2025-08-20",
    acquisitionCost: 1400,
    condition: "Good",
    location: "Main HQ",
    isShared: false,
    status: "Available",
    allocatedTo: null,
    expectedReturnDate: null,
    history: [
      { date: "2025-08-20", action: "Registration", user: "Priya Sharma", notes: "Standard developer issue laptop." }
    ]
  },
  {
    id: "asset-3",
    tag: "AF-0003",
    name: "Conference Room Alpha",
    categoryId: "cat-4",
    serialNumber: "ROOM-CONF-A",
    acquisitionDate: "2024-01-10",
    acquisitionCost: 15000,
    condition: "Excellent",
    location: "Block B, 2nd Floor",
    isShared: true,
    status: "Available",
    allocatedTo: null,
    expectedReturnDate: null,
    history: [
      { date: "2024-01-10", action: "Registration", user: "Administrator", notes: "Conference room space with projector." }
    ]
  },
  {
    id: "asset-4",
    tag: "AF-0004",
    name: "Tesla Model Y (Company Car)",
    categoryId: "cat-2",
    serialNumber: "VIN-5YJ3E1EA5L",
    acquisitionDate: "2024-11-05",
    acquisitionCost: 45000,
    condition: "Good",
    location: "Basement Parking B1",
    isShared: true,
    status: "Reserved",
    allocatedTo: null,
    expectedReturnDate: null,
    history: [
      { date: "2024-11-05", action: "Registration", user: "Priya Sharma", notes: "Tesla Model Y for executive travels." }
    ]
  },
  {
    id: "asset-5",
    tag: "AF-0005",
    name: "Dell UltraSharp 32'' Monitor",
    categoryId: "cat-1",
    serialNumber: "SN-DELL32901",
    acquisitionDate: "2025-01-12",
    acquisitionCost: 800,
    condition: "Fair",
    location: "Engineering Bay 4",
    isShared: false,
    status: "Under Maintenance",
    allocatedTo: null,
    expectedReturnDate: null,
    history: [
      { date: "2025-01-12", action: "Registration", user: "Priya Sharma", notes: "4K designer monitor." },
      { date: "2026-07-10", action: "Maintenance Raised", user: "Amit Kumar", notes: "Display flickering on warm boot." }
    ]
  },
  {
    id: "asset-6",
    tag: "AF-0006",
    name: "Ergonomic Desk Chair",
    categoryId: "cat-3",
    serialNumber: "SN-CHAIR8819",
    acquisitionDate: "2025-02-18",
    acquisitionCost: 350,
    condition: "Good",
    location: "Operations Area",
    isShared: false,
    status: "Allocated",
    allocatedTo: { type: "Department", id: "dept-3" },
    expectedReturnDate: "2026-09-01",
    history: [
      { date: "2025-02-18", action: "Registration", user: "Priya Sharma", notes: "Mesh support back chair." },
      { date: "2025-02-19", action: "Allocation", user: "Priya Sharma", notes: "Allocated to Operations department." }
    ]
  },
  {
    id: "asset-7",
    tag: "AF-0007",
    name: "iPad Pro 12.9''",
    categoryId: "cat-1",
    serialNumber: "SN-IPAD9901B",
    acquisitionDate: "2025-09-10",
    acquisitionCost: 1100,
    condition: "Excellent",
    location: "IT Room 302",
    isShared: false,
    status: "Available",
    allocatedTo: null,
    expectedReturnDate: null,
    history: [
      { date: "2025-09-10", action: "Registration", user: "Priya Sharma", notes: "iPad Pro with Apple Pencil." }
    ]
  },
  {
    id: "asset-8",
    tag: "AF-0008",
    name: "Conference Room Beta",
    categoryId: "cat-4",
    serialNumber: "ROOM-CONF-B",
    acquisitionDate: "2024-01-10",
    acquisitionCost: 10000,
    condition: "Excellent",
    location: "Block B, 1st Floor",
    isShared: true,
    status: "Available",
    allocatedTo: null,
    expectedReturnDate: null,
    history: [
      { date: "2024-01-10", action: "Registration", user: "Administrator", notes: "Smaller conference room." }
    ]
  }
];
const INITIAL_TRANSFERS = [
  {
    id: "trans-1",
    assetId: "asset-1",
    fromEmployeeId: "emp-5",
    toEmployeeId: "emp-8",
    requestedBy: "emp-8",
    requestDate: "2026-07-11",
    reason: "Siddharth has left for vacation and I need this laptop for testing high-load builds.",
    status: "Pending", // Pending, Approved, Rejected
    approvedBy: null,
    approvalDate: null
  }
];
const INITIAL_BOOKINGS = [
  {
    id: "book-1",
    resourceId: "asset-3", // Conference Room Alpha
    employeeId: "emp-6",
    startTime: "2026-07-12T10:00",
    endTime: "2026-07-12T11:30",
    purpose: "Monthly Team Alignment & OKR Review",
    status: "Ongoing" // Upcoming, Ongoing, Completed, Cancelled
  },
  {
    id: "book-2",
    resourceId: "asset-3", // Conference Room Alpha
    employeeId: "emp-7",
    startTime: "2026-07-12T14:00",
    endTime: "2026-07-12T15:30",
    purpose: "Engineering Sprint Planning",
    status: "Upcoming"
  },
  {
    id: "book-3",
    resourceId: "asset-4", // Tesla Y
    employeeId: "emp-3", // Raj
    startTime: "2026-07-12T09:00",
    endTime: "2026-07-12T17:00",
    purpose: "Client Visit at HighTech City Office",
    status: "Ongoing"
  }
];
const INITIAL_MAINTENANCE = [
  {
    id: "maint-1",
    assetId: "asset-5", // Dell Monitor
    reportedBy: "emp-7",
    issueDescription: "Flickering lines across the lower half of screen.",
    priority: "High", // Low, Medium, High, Critical
    photo: null,
    status: "In Progress", // Pending, Approved, Rejected, Technician Assigned, In Progress, Resolved
    raisedDate: "2026-07-09",
    approvedBy: "emp-2", // Priya
    technicianName: "Alex Mercer (Internal Support)",
    resolutionDetails: "",
    resolvedDate: null
  },
  {
    id: "maint-2",
    assetId: "asset-2", // ThinkPad
    reportedBy: "emp-5",
    issueDescription: "Battery draining in less than 1.5 hours.",
    priority: "Medium",
    photo: null,
    status: "Pending",
    raisedDate: "2026-07-12",
    approvedBy: null,
    technicianName: "",
    resolutionDetails: "",
    resolvedDate: null
  }
];
const INITIAL_AUDITS = [
  {
    id: "audit-1",
    title: "Q2 IT Asset Compliance Audit",
    scopeDepartmentId: "dept-1",
    scopeLocation: "IT Room 302",
    startDate: "2026-06-01",
    endDate: "2026-06-10",
    assignedAuditors: ["emp-2", "emp-3"],
    status: "Closed", // Active, Closed
    findings: {
      "asset-1": "Verified",
      "asset-7": "Verified"
    },
    discrepancies: [],
    closedBy: "emp-1",
    closedDate: "2026-06-10"
  },
  {
    id: "audit-2",
    title: "July Facilities Spot Audit",
    scopeDepartmentId: "",
    scopeLocation: "Main HQ",
    startDate: "2026-07-05",
    endDate: "2026-07-15",
    assignedAuditors: ["emp-2"],
    status: "Active",
    findings: {
      "asset-2": "Verified"
      // asset-5 is missing or damaged, not yet marked
    },
    discrepancies: [],
    closedBy: "",
    closedDate: ""
  }
];
const INITIAL_NOTIFICATIONS = [
  { id: "notif-1", employeeId: "emp-5", message: "Laptop AF-0001 return is overdue (expected: 2026-06-15). Please return or request extension.", date: "2026-07-12T08:00:00", isRead: false },
  { id: "notif-2", employeeId: "emp-2", message: "New Transfer Request: Siddharth Rao -> Pooja Mehta for MacBook Pro (AF-0001).", date: "2026-07-11T16:30:00", isRead: false },
  { id: "notif-3", employeeId: "emp-3", message: "Booking Confirmed: Tesla Model Y (AF-0004) for today, 09:00 - 17:00.", date: "2026-07-12T08:30:00", isRead: true }
];
const INITIAL_AUDIT_LOGS = [
  { date: "2026-07-12T09:00:00", user: "Raj Patel", action: "Resource Booking", details: "Booked Tesla Model Y from 09:00 to 17:00" },
  { date: "2026-07-12T08:15:00", user: "Siddharth Rao", action: "Maintenance Request", details: "Raised request for ThinkPad battery issue" },
  { date: "2026-07-11T16:30:00", user: "Pooja Mehta", action: "Transfer Request", details: "Requested transfer of MacBook Pro AF-0001 from Siddharth Rao" },
  { date: "2025-06-15T10:00:00", user: "Priya Sharma", action: "Asset Registration", details: "Registered MacBook Pro M3 Max (AF-0001)" }
];
