// AssetFlow Frontend Application Logic
const API_BASE = "http://127.0.0.1:5000/api";
let isOnline = false;
let currentUser = null;
let currentScreen = "dashboard";

// Helper DB wrapper that switches between Live API and Offline LocalStorage
const DB = {
  async get(type) {
    if (isOnline) {
      try {
        const res = await fetch(`${API_BASE}/${type}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn("API GET failed, falling back to local storage:", e);
      }
    }
    const local = localStorage.getItem(`af_${type}`);
    if (local) return JSON.parse(local);
    // Use INITIAL seed data if localStorage is empty
    const seeds = {
      departments: INITIAL_DEPARTMENTS,
      categories: INITIAL_CATEGORIES,
      employees: INITIAL_EMPLOYEES,
      assets: INITIAL_ASSETS,
      transfers: INITIAL_TRANSFERS,
      bookings: INITIAL_BOOKINGS,
      maintenance: INITIAL_MAINTENANCE,
      audits: INITIAL_AUDITS,
      notifications: INITIAL_NOTIFICATIONS,
      logs: INITIAL_AUDIT_LOGS
    };
    localStorage.setItem(`af_${type}`, JSON.stringify(seeds[type] || []));
    return seeds[type] || [];
  },

  async add(type, item) {
    if (isOnline) {
      try {
        const res = await fetch(`${API_BASE}/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, userName: currentUser ? currentUser.name : 'System' })
        });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn("API POST failed, writing to local storage:", e);
      }
    }
    const list = await this.get(type);
    list.push(item);
    localStorage.setItem(`af_${type}`, JSON.stringify(list));
    return item;
  },

  async logAction(user, action, details) {
    const logItem = { date: new Date().toISOString(), user, action, details };
    if (isOnline) {
      try {
        await fetch(`${API_BASE}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logItem)
        });
        return;
      } catch (e) {}
    }
    const list = await this.get("logs");
    list.unshift(logItem);
    localStorage.setItem("af_logs", JSON.stringify(list));
  }
};

// Check connectivity with the Python server
async function checkConnectivity() {
  const dot = document.getElementById("db-status-dot");
  const txt = document.getElementById("db-status-text");
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      isOnline = true;
      dot.style.backgroundColor = "#4ade80"; // green
      txt.innerText = "🟢 Live Database";
    } else {
      throw new Error();
    }
  } catch (e) {
    isOnline = false;
    dot.style.backgroundColor = "#fb923c"; // orange
    txt.innerText = "Offline Sandbox";
  }
}

// User Session setup
async function setupSession() {
  await checkConnectivity();
  const userId = sessionStorage.getItem("af_current_user_id");
  if (userId) {
    const employees = await DB.get("employees");
    currentUser = employees.find(e => e.id === userId);
  } else {
    currentUser = null;
  }

  if (currentUser) {
    document.getElementById("auth-page").style.display = "none";
    document.getElementById("app-layout").style.display = "flex";
    document.getElementById("footer-avatar").innerText = currentUser.name.charAt(0).toUpperCase();
    document.getElementById("footer-username").innerText = currentUser.name;
    document.getElementById("footer-role").innerText = currentUser.role;
    
    // Hide administrative screen options if standard employee
    const setupNavItem = document.querySelector('[data-screen="orgsetup"]');
    if (setupNavItem) {
      setupNavItem.style.display = currentUser.role === "Admin" ? "flex" : "none";
    }
    
    populateDropdowns();
    renderApp();
  } else {
    document.getElementById("auth-page").style.display = "flex";
    document.getElementById("app-layout").style.display = "none";
  }
}

// Populate UI dropdown forms
async function populateDropdowns() {
  const depts = await DB.get("departments");
  const emps = await DB.get("employees");
  const cats = await DB.get("categories");
  const assets = await DB.get("assets");

  // Filter Active options
  const activeDepts = depts.filter(d => d.status === "Active");
  const activeEmps = emps.filter(e => e.status === "Active");

  // Populate Selects
  const deptParent = document.getElementById("dept-parent-select");
  if (deptParent) {
    deptParent.innerHTML = `<option value="">None (Top Level)</option>` + 
      activeDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  }

  const deptHead = document.getElementById("dept-head-select");
  if (deptHead) {
    deptHead.innerHTML = `<option value="">Unassigned</option>` + 
      activeEmps.map(e => `<option value="${e.id}">${e.name}</option>`).join("");
  }

  const regCat = document.getElementById("reg-asset-category");
  if (regCat) {
    regCat.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  const allocAsset = document.getElementById("alloc-asset-select");
  if (allocAsset) {
    const availAssets = assets.filter(a => a.status === "Available");
    allocAsset.innerHTML = availAssets.map(a => `<option value="${a.id}">${a.name} (${a.tag})</option>`).join("");
  }

  const allocEmp = document.getElementById("alloc-emp-select");
  if (allocEmp) {
    allocEmp.innerHTML = `<option value="">None (Select Department Instead)</option>` +
      activeEmps.map(e => `<option value="${e.id}">${e.name}</option>`).join("");
  }

  const allocDept = document.getElementById("alloc-dept-select");
  if (allocDept) {
    allocDept.innerHTML = `<option value="">None (Select Employee Instead)</option>` +
      activeDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  }

  const bookRes = document.getElementById("book-resource-select");
  if (bookRes) {
    const shared = assets.filter(a => a.isShared);
    bookRes.innerHTML = shared.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
  }

  const maintAsset = document.getElementById("maint-asset-select");
  if (maintAsset) {
    maintAsset.innerHTML = assets.map(a => `<option value="${a.id}">${a.name} (${a.tag})</option>`).join("");
  }

  const auditDept = document.getElementById("audit-scope-dept");
  if (auditDept) {
    auditDept.innerHTML = `<option value="">All Departments</option>` +
      activeDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  }

  const auditAuditors = document.getElementById("audit-auditors");
  if (auditAuditors) {
    auditAuditors.innerHTML = emps.filter(e => e.role === "Admin" || e.role === "Asset Manager")
      .map(e => `<option value="${e.id}">${e.name}</option>`).join("");
  }
}

// Navigation screen routing
function navigate(screen) {
  currentScreen = screen;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(`${screen}-screen`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-screen") === screen) {
      item.classList.add("active");
    }
  });

  renderApp();
}

// Modal dialog helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "flex";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

// Main Render Function for screens
async function renderApp() {
  if (!currentUser) return;

  switch (currentScreen) {
    case "dashboard":
      await renderDashboard();
      break;
    case "orgsetup":
      await renderOrgSetup();
      break;
    case "assets":
      await renderAssets();
      break;
    case "allocations":
      await renderAllocations();
      break;
    case "bookings":
      await renderBookings();
      break;
    case "maintenance":
      await renderMaintenance();
      break;
    case "audits":
      await renderAudits();
      break;
    case "reports":
      await renderReports();
      break;
    case "logs":
      await renderLogs();
      break;
  }
}

// Render Dashboard statistics & Overdue logs
async function renderDashboard() {
  const assets = await DB.get("assets");
  const bookings = await DB.get("bookings");
  const transfers = await DB.get("transfers");
  const maint = await DB.get("maintenance");

  const avail = assets.filter(a => a.status === "Available").length;
  const alloc = assets.filter(a => a.status === "Allocated").length;
  const inMaint = maint.filter(m => m.status === "In Progress" || m.status === "Pending").length;
  const activeBook = bookings.filter(b => b.status === "Ongoing" || b.status === "Upcoming").length;
  const pendingTrans = transfers.filter(t => t.status === "Pending").length;

  // Calculate Overdue returns (Expected return date in past)
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueCount = assets.filter(a => a.expectedReturnDate && a.expectedReturnDate < todayStr).length;

  document.getElementById("kpi-avail").innerText = avail;
  document.getElementById("kpi-alloc").innerText = alloc;
  document.getElementById("kpi-maint").innerText = inMaint;
  document.getElementById("kpi-bookings").innerText = activeBook;
  document.getElementById("kpi-transfers").innerText = pendingTrans;
  document.getElementById("kpi-returns").innerText = overdueCount;

  // Render Overdue Assets List
  const overdueList = document.getElementById("dashboard-overdue-list");
  const overdueItems = assets.filter(a => a.expectedReturnDate && a.expectedReturnDate < todayStr);
  if (overdueItems.length === 0) {
    overdueList.innerHTML = `<div class="empty-state">No overdue asset returns.</div>`;
  } else {
    overdueList.innerHTML = overdueItems.map(a => `
      <div class="overdue-item">
        <div>
          <strong>${a.name} (${a.tag})</strong><br>
          <span class="text-xs text-muted">Expected: ${a.expectedReturnDate}</span>
        </div>
        <span class="badge badge-danger">Overdue</span>
      </div>
    `).join("");
  }
}

// Render Org setup tables (Admin only)
async function renderOrgSetup() {
  const depts = await DB.get("departments");
  const emps = await DB.get("employees");
  const cats = await DB.get("categories");

  // Departments
  const deptBody = document.getElementById("depts-table-body");
  deptBody.innerHTML = depts.map(d => {
    const head = emps.find(e => e.id === d.headId);
    const parent = depts.find(dp => dp.id === d.parentId);
    return `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>${head ? head.name : "Unassigned"}</td>
        <td>${parent ? parent.name : "-"}</td>
        <td><span class="badge ${d.status === "Active" ? "badge-success" : "badge-secondary"}">${d.status}</span></td>
        <td><button class="btn btn-xs" onclick="toggleDeptStatus('${d.id}')">Toggle Status</button></td>
      </tr>
    `;
  }).join("");

  // Categories
  const catBody = document.getElementById("categories-table-body");
  catBody.innerHTML = cats.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.customFields.map(f => `${f.name} (${f.type})`).join(", ") || "None"}</td>
      <td><button class="btn btn-danger btn-xs" onclick="deleteCategory('${c.id}')">Delete</button></td>
    </tr>
  `).join("");

  // Employees
  const empBody = document.getElementById("employees-table-body");
  empBody.innerHTML = emps.map(e => {
    const dept = depts.find(d => d.id === e.departmentId);
    return `
      <tr>
        <td><strong>${e.name}</strong></td>
        <td>${e.email}</td>
        <td>${dept ? dept.name : "None"}</td>
        <td>${e.role}</td>
        <td><span class="badge ${e.status === "Active" ? "badge-success" : "badge-secondary"}">${e.status}</span></td>
        <td><button class="btn btn-xs" onclick="toggleEmployeeStatus('${e.id}')">Toggle Status</button></td>
      </tr>
    `;
  }).join("");
}

// Toggle functions for Org Management
async function toggleDeptStatus(id) {
  const depts = await DB.get("departments");
  const dept = depts.find(d => d.id === id);
  if (dept) {
    dept.status = dept.status === "Active" ? "Inactive" : "Active";
    localStorage.setItem("af_departments", JSON.stringify(depts));
    await DB.logAction(currentUser.name, "Update Dept", `Toggled department ${dept.name} to ${dept.status}`);
    renderApp();
  }
}

async function toggleEmployeeStatus(id) {
  const emps = await DB.get("employees");
  const emp = emps.find(e => e.id === id);
  if (emp) {
    emp.status = emp.status === "Active" ? "Inactive" : "Active";
    localStorage.setItem("af_employees", JSON.stringify(emps));
    await DB.logAction(currentUser.name, "Update Employee Status", `Toggled status of ${emp.name} to ${emp.status}`);
    renderApp();
  }
}

async function deleteCategory(id) {
  let cats = await DB.get("categories");
  cats = cats.filter(c => c.id !== id);
  localStorage.setItem("af_categories", JSON.stringify(cats));
  renderApp();
}

// Render Assets Directory Card Grid
async function renderAssets() {
  const assets = await DB.get("assets");
  const cats = await DB.get("categories");
  const grid = document.getElementById("asset-cards-grid");

  grid.innerHTML = assets.map(a => {
    const cat = cats.find(c => c.id === a.categoryId);
    const statusClass = a.status === "Available" ? "badge-success" : 
                        a.status === "Allocated" ? "badge-info" : "badge-warning";
    return `
      <div class="kpi-card" style="cursor: pointer;" onclick="viewAssetDetails('${a.id}')">
        <div style="display: flex; justify-content: space-between;">
          <span class="badge ${statusClass}">${a.status}</span>
          <span class="text-xs text-muted">${a.tag}</span>
        </div>
        <h4 style="margin-top: 10px;">${a.name}</h4>
        <p class="text-xs text-muted" style="margin-top: 5px;">Category: ${cat ? cat.name : "General"}</p>
        <p class="text-xs text-muted">Location: ${a.location}</p>
      </div>
    `;
  }).join("");
}

// View Asset details Modal
async function viewAssetDetails(id) {
  const assets = await DB.get("assets");
  const cats = await DB.get("categories");
  const asset = assets.find(a => a.id === id);
  if (!asset) return;

  const cat = cats.find(c => c.id === asset.categoryId);
  
  document.getElementById("details-name").innerText = asset.name;
  document.getElementById("details-tag").innerText = asset.tag;
  document.getElementById("details-status").innerText = asset.status;
  document.getElementById("details-category").innerText = cat ? cat.name : "General";
  document.getElementById("details-serial").innerText = asset.serialNumber;
  document.getElementById("details-date").innerText = asset.acquisitionDate;
  document.getElementById("details-cost").innerText = `$${asset.acquisitionCost}`;
  document.getElementById("details-condition").innerText = asset.condition;
  document.getElementById("details-location").innerText = asset.location;
  document.getElementById("details-shared").innerText = asset.isShared ? "Yes" : "No";

  const holder = asset.allocatedTo ? `${asset.allocatedTo.type}: ${asset.allocatedTo.id}` : "Available in Pool";
  document.getElementById("details-holder").innerText = holder;

  // Custom attributes
  const customs = document.getElementById("details-custom-fields");
  if (asset.customFields && asset.customFields.length > 0) {
    customs.innerHTML = asset.customFields.map(f => `
      <div class="asset-info-item">
        <span class="asset-info-label">${f.name}:</span>
        <span class="asset-info-value">${f.value}</span>
      </div>
    `).join("");
  } else {
    customs.innerHTML = `<span class="text-muted">No custom attributes.</span>`;
  }

  // Render History Timeline
  const timeline = document.getElementById("details-timeline");
  timeline.innerHTML = (asset.history || []).map(h => `
    <div style="border-left: 2px solid var(--border-color); padding-left: 15px; margin-bottom: 15px;">
      <span class="text-xs text-primary">${h.date} - ${h.action}</span><br>
      <span class="text-xs">User: ${h.user}</span><br>
      <span class="text-xs text-secondary">${h.notes}</span>
    </div>
  `).join("");

  openModal("details-modal");
}

// Render Allocations & Transfer Requests
async function renderAllocations() {
  const assets = await DB.get("assets");
  const emps = await DB.get("employees");
  const depts = await DB.get("departments");
  const transfers = await DB.get("transfers");

  // Allocations Table
  const returnsBody = document.getElementById("returns-table-body");
  const allocatedAssets = assets.filter(a => a.status === "Allocated");
  
  returnsBody.innerHTML = allocatedAssets.map(a => {
    let holderName = "N/A";
    if (a.allocatedTo) {
      if (a.allocatedTo.type === "Employee") {
        const emp = emps.find(e => e.id === a.allocatedTo.id);
        holderName = emp ? `Employee: ${emp.name}` : a.allocatedTo.id;
      } else {
        const dept = depts.find(d => d.id === a.allocatedTo.id);
        holderName = dept ? `Dept: ${dept.name}` : a.allocatedTo.id;
      }
    }
    return `
      <tr>
        <td><strong>${a.name}</strong><br><span class="text-muted text-xs">${a.tag}</span></td>
        <td>${holderName}</td>
        <td>${a.expectedReturnDate || "Permanent"}</td>
        <td><button class="btn btn-xs btn-primary" onclick="checkinAsset('${a.id}')">Return</button></td>
      </tr>
    `;
  }).join("");

  // Transfers Table
  const transBody = document.getElementById("transfers-table-body");
  transBody.innerHTML = transfers.map(t => {
    const asset = assets.find(a => a.id === t.assetId);
    const fromEmp = emps.find(e => e.id === t.fromEmployeeId);
    const toEmp = emps.find(e => e.id === t.toEmployeeId);
    const reqBy = emps.find(e => e.id === t.requestedBy);

    const showActions = t.status === "Pending" && (currentUser.role === "Admin" || currentUser.role === "Asset Manager");
    const actionsHtml = showActions ? `
      <button class="btn btn-xs btn-primary" onclick="handleTransferAction('${t.id}', 'approve')">Approve</button>
      <button class="btn btn-xs btn-danger" onclick="handleTransferAction('${t.id}', 'reject')">Reject</button>
    ` : `<span class="badge">${t.status}</span>`;

    return `
      <tr>
        <td>${asset ? asset.name : "Unknown"}</td>
        <td>${fromEmp ? fromEmp.name : "Unassigned"}</td>
        <td>${toEmp ? toEmp.name : "Unknown"}</td>
        <td>${reqBy ? reqBy.name : "Unknown"}</td>
        <td>${t.reason}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join("");
}

// Transfer execution logic
async function handleTransferAction(id, action) {
  let transfers = await DB.get("transfers");
  const t = transfers.find(x => x.id === id);
  if (!t) return;

  t.status = action === "approve" ? "Approved" : "Rejected";
  t.approvedBy = currentUser.id;
  t.approvalDate = new Date().toISOString().split("T")[0];

  if (action === "approve") {
    const assets = await DB.get("assets");
    const a = assets.find(x => x.id === t.assetId);
    if (a) {
      a.allocatedTo = { type: "Employee", id: t.toEmployeeId };
      a.history.push({
        date: new Date().toISOString().split("T")[0],
        action: "Transfer",
        user: currentUser.name,
        notes: `Approved asset transfer from employee ID ${t.fromEmployeeId} to ${t.toEmployeeId}`
      });
      localStorage.setItem("af_assets", JSON.stringify(assets));
    }
  }

  localStorage.setItem("af_transfers", JSON.stringify(transfers));
  await DB.logAction(currentUser.name, `${action.toUpperCase()} Transfer`, `Asset transfer request ${id} ${action}d`);
  renderApp();
}

// Return Check-in Trigger
let targetReturnAssetId = null;
function checkinAsset(id) {
  targetReturnAssetId = id;
  openModal("return-checkin-modal");
}

// Render Bookable Resources
async function renderBookings() {
  const assets = await DB.get("assets");
  const bookings = await DB.get("bookings");
  const emps = await DB.get("employees");

  const shared = assets.filter(a => a.isShared);
  const resourceList = document.getElementById("bookable-resources-list");

  resourceList.innerHTML = shared.map(a => `
    <div class="overdue-item">
      <div>
        <strong>${a.name}</strong><br>
        <span class="text-xs text-muted">Location: ${a.location}</span>
      </div>
      <span class="badge badge-success">Bookable</span>
    </div>
  `).join("");

  // Timeline render
  const timeline = document.getElementById("bookings-timeline-grid");
  const todayBookings = bookings.filter(b => b.startTime.startsWith(new Date().toISOString().split("T")[0]) && b.status !== "Cancelled");

  if (todayBookings.length === 0) {
    timeline.innerHTML = `<div class="empty-state">No reservations scheduled for today.</div>`;
  } else {
    timeline.innerHTML = todayBookings.map(b => {
      const res = assets.find(a => a.id === b.resourceId);
      const emp = emps.find(e => e.id === b.employeeId);
      return `
        <div class="overdue-item">
          <div>
            <strong>${res ? res.name : "Resource"}</strong><br>
            <span class="text-xs text-primary">${b.startTime.split("T")[1]} - ${b.endTime.split("T")[1]}</span><br>
            <span class="text-xs text-secondary">Reserved by: ${emp ? emp.name : "Staff"} - Purpose: ${b.purpose}</span>
          </div>
          <button class="btn btn-xs btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>
        </div>
      `;
    }).join("");
  }
}

async function cancelBooking(id) {
  const bookings = await DB.get("bookings");
  const b = bookings.find(x => x.id === id);
  if (b) {
    b.status = "Cancelled";
    localStorage.setItem("af_bookings", JSON.stringify(bookings));
    await DB.logAction(currentUser.name, "Cancel Reservation", `Cancelled slot ID ${id}`);
    renderApp();
  }
}

// Render Maintenance tickets
async function renderMaintenance() {
  const maint = await DB.get("maintenance");
  const assets = await DB.get("assets");
  const emps = await DB.get("employees");
  const body = document.getElementById("maintenance-table-body");

  body.innerHTML = maint.map(m => {
    const asset = assets.find(a => a.id === m.assetId);
    const reporter = emps.find(e => e.id === m.reportedBy);

    const isAdminOrMgr = currentUser.role === "Admin" || currentUser.role === "Asset Manager";
    let actionsHtml = `<span class="badge">${m.status}</span>`;

    if (m.status === "Pending" && isAdminOrMgr) {
      actionsHtml = `
        <button class="btn btn-xs btn-primary" onclick="handleMaintenanceAction('${m.id}', 'approve')">Approve</button>
        <button class="btn btn-xs btn-danger" onclick="handleMaintenanceAction('${m.id}', 'reject')">Reject</button>
      `;
    } else if (m.status === "Approved" && isAdminOrMgr) {
      actionsHtml = `<button class="btn btn-xs btn-primary" onclick="assignTechnician('${m.id}')">Assign Technician</button>`;
    } else if (m.status === "Technician Assigned" && isAdminOrMgr) {
      actionsHtml = `<button class="btn btn-xs btn-primary" onclick="resolveMaintenance('${m.id}')">Resolve Ticket</button>`;
    }

    return `
      <tr>
        <td><strong>${asset ? asset.name : "Unknown"}</strong><br><span class="text-xs text-muted">${asset ? asset.tag : ""}</span></td>
        <td>${reporter ? reporter.name : "Staff"}</td>
        <td>${m.issueDescription}</td>
        <td><span class="badge ${m.priority === 'High' || m.priority === 'Critical' ? 'badge-danger' : 'badge-warning'}">${m.priority}</span></td>
        <td>${m.status}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join("");
}

async function handleMaintenanceAction(id, action) {
  let maint = await DB.get("maintenance");
  const m = maint.find(x => x.id === id);
  if (!m) return;

  m.status = action === "approve" ? "Approved" : "Rejected";
  m.approvedBy = currentUser.id;

  if (action === "approve") {
    const assets = await DB.get("assets");
    const a = assets.find(x => x.id === m.assetId);
    if (a) {
      a.status = "Under Maintenance";
      a.history.push({
        date: new Date().toISOString().split("T")[0],
        action: "Maintenance",
        user: currentUser.name,
        notes: `Ticket approved: Asset status updated to Under Maintenance.`
      });
      localStorage.setItem("af_assets", JSON.stringify(assets));
    }
  }

  localStorage.setItem("af_maintenance", JSON.stringify(maint));
  await DB.logAction(currentUser.name, `${action.toUpperCase()} Maintenance`, `Ticket ID ${id} ${action}d`);
  renderApp();
}

let targetMaintId = null;
function assignTechnician(id) {
  targetMaintId = id;
  const techName = prompt("Enter Internal Technician / Third-Party Vendor Name:");
  if (techName) {
    executeTechnicianAssign(id, techName);
  }
}

async function executeTechnicianAssign(id, name) {
  const maint = await DB.get("maintenance");
  const m = maint.find(x => x.id === id);
  if (m) {
    m.status = "Technician Assigned";
    m.technicianName = name;
    localStorage.setItem("af_maintenance", JSON.stringify(maint));
    await DB.logAction(currentUser.name, "Assign Tech", `Assigned ${name} to ticket ID ${id}`);
    renderApp();
  }
}

function resolveMaintenance(id) {
  targetMaintId = id;
  openModal("resolve-maint-modal");
}

// Render Audits Campaigns
async function renderAudits() {
  const audits = await DB.get("audits");
  const grid = document.getElementById("audits-cards-grid");

  grid.innerHTML = audits.map(au => {
    const total = Object.keys(au.findings || {}).length;
    const verified = Object.values(au.findings || {}).filter(v => v !== "Pending").length;
    const progPercent = total > 0 ? Math.round((verified / total) * 100) : 100;

    const isActive = au.status === "Active";
    const actionBtn = isActive ? 
      `<button class="btn btn-xs btn-primary" onclick="openAuditorSheet('${au.id}')">Perform Verification</button>` : 
      `<button class="btn btn-xs btn-secondary" onclick="viewDiscrepancyReport('${au.id}')">Discrepancy Report</button>`;

    return `
      <div class="kpi-card" style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between;">
          <h4>${au.title}</h4>
          <span class="badge ${isActive ? 'badge-success' : 'badge-secondary'}">${au.status}</span>
        </div>
        <p class="text-xs text-muted" style="margin-top: 5px;">Scope: Dept ${au.scopeDepartmentId || "All"}, Loc: ${au.scopeLocation || "All"}</p>
        <p class="text-xs text-muted">Timeline: ${au.startDate} to ${au.endDate}</p>
        <div style="margin-top: 10px;">
          <div style="font-size: 0.8rem; margin-bottom: 4px;">Progress: ${progPercent}% (${verified}/${total} assets verified)</div>
          <div style="width: 100%; height: 6px; background-color: var(--bg-tertiary); border-radius: 3px;">
            <div style="width: ${progPercent}%; height: 100%; background-color: var(--primary); border-radius: 3px;"></div>
          </div>
        </div>
        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
          ${actionBtn}
        </div>
      </div>
    `;
  }).join("");
}

let activeAuditId = null;
async function openAuditorSheet(id) {
  activeAuditId = id;
  const audits = await DB.get("audits");
  const assets = await DB.get("assets");
  const au = audits.find(x => x.id === id);
  if (!au) return;

  document.getElementById("auditor-sheet-title").innerText = au.title;
  const body = document.getElementById("auditor-sheet-table-body");

  body.innerHTML = Object.keys(au.findings).map(assetId => {
    const asset = assets.find(a => a.id === assetId);
    const value = au.findings[assetId];
    return `
      <tr>
        <td><strong>${asset ? asset.name : "Unknown"}</strong><br><span class="text-xs text-muted">${asset ? asset.tag : ""}</span></td>
        <td>
          <select onchange="updateFindingValue('${assetId}', this.value)" class="form-control">
            <option value="Pending" ${value === 'Pending' ? 'selected' : ''}>Pending Verification</option>
            <option value="Verified" ${value === 'Verified' ? 'selected' : ''}>Verified (Intact)</option>
            <option value="Missing" ${value === 'Missing' ? 'selected' : ''}>Missing (Lost)</option>
            <option value="Damaged" ${value === 'Damaged' ? 'selected' : ''}>Damaged (Repair Required)</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");

  openModal("auditor-sheet-modal");
}

async function updateFindingValue(assetId, val) {
  const audits = await DB.get("audits");
  const au = audits.find(x => x.id === activeAuditId);
  if (au) {
    au.findings[assetId] = val;
    localStorage.setItem("af_audits", JSON.stringify(audits));
    renderApp();
  }
}

async function handleCloseAuditCycle() {
  const audits = await DB.get("audits");
  const au = audits.find(x => x.id === activeAuditId);
  if (!au) return;

  const hasPending = Object.values(au.findings).some(v => v === "Pending");
  if (hasPending) {
    alert("Cannot lock cycle. There are pending verification items.");
    return;
  }

  au.status = "Closed";
  au.closedBy = currentUser.id;
  au.closedDate = new Date().toISOString().split("T")[0];

  // Process discrepancies
  au.discrepancies = [];
  const assets = await DB.get("assets");
  for (const [assetId, finding] of Object.entries(au.findings)) {
    if (finding === "Missing" || finding === "Damaged") {
      au.discrepancies.push({ assetId, finding, resolved: false });
      if (finding === "Missing") {
        const a = assets.find(x => x.id === assetId);
        if (a) {
          a.status = "Lost";
          a.history.push({
            date: new Date().toISOString().split("T")[0],
            action: "Audit Flagged",
            user: currentUser.name,
            notes: `Confirmed missing during campaign "${au.title}". Marked as Lost.`
          });
        }
      }
    }
  }

  localStorage.setItem("af_assets", JSON.stringify(assets));
  localStorage.setItem("af_audits", JSON.stringify(audits));
  await DB.logAction(currentUser.name, "Lock Audit Cycle", `Locked audit cycle campaign ${activeAuditId}`);
  closeModal("auditor-sheet-modal");
  renderApp();
}

async function viewDiscrepancyReport(id) {
  const audits = await DB.get("audits");
  const assets = await DB.get("assets");
  const au = audits.find(x => x.id === id);
  if (!au) return;

  document.getElementById("discrepancy-title").innerText = `Discrepancies: ${au.title}`;
  const body = document.getElementById("discrepancy-report-body");

  if (!au.discrepancies || au.discrepancies.length === 0) {
    body.innerHTML = `<div class="empty-state">No discrepancies flagged during this audit. Compliance: 100%</div>`;
  } else {
    body.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Asset Details</th>
            <th>Issue Type</th>
            <th>Resolution State</th>
          </tr>
        </thead>
        <tbody>
          ${au.discrepancies.map(d => {
            const asset = assets.find(a => a.id === d.assetId);
            return `
              <tr>
                <td><strong>${asset ? asset.name : "Unknown"}</strong> (${asset ? asset.tag : ""})</td>
                <td><span class="badge badge-danger">${d.finding}</span></td>
                <td><span class="badge">${d.resolved ? 'Resolved' : 'Action Required'}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }
  openModal("discrepancy-modal");
}

// Render Analytics Reports
async function renderReports() {
  const assets = await DB.get("assets");
  const depts = await DB.get("departments");
  const emps = await DB.get("employees");
  const body = document.getElementById("dept-summary-table-body");

  // Generate mapping of employees to departments
  const empDeptMap = {};
  emps.forEach(e => {
    empDeptMap[e.id] = e.departmentId;
  });

  body.innerHTML = depts.map(d => {
    let count = 0;
    let netWorth = 0;

    assets.forEach(a => {
      if (a.allocatedTo) {
        if (a.allocatedTo.type === "Department" && a.allocatedTo.id === d.id) {
          count++;
          netWorth += a.acquisitionCost;
        } else if (a.allocatedTo.type === "Employee") {
          const empId = a.allocatedTo.id;
          if (empDeptMap[empId] === d.id) {
            count++;
            netWorth += a.acquisitionCost;
          }
        }
      }
    });

    return `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>${count} items</td>
        <td><strong>$${netWorth.toLocaleString()}</strong></td>
      </tr>
    `;
  }).join("");
}

// Render Activity logs
async function renderLogs() {
  const logs = await DB.get("logs");
  const body = document.getElementById("logs-table-body");

  body.innerHTML = logs.map(l => `
    <tr>
      <td>${l.date.replace("T", " ").substring(0, 19)}</td>
      <td><strong>${l.user}</strong></td>
      <td><span class="badge">${l.action}</span></td>
      <td>${l.details}</td>
    </tr>
  `).join("");
}

// Global Export Reports Handler
function handleExportReports() {
  const reports = {
    exportedAt: new Date().toISOString(),
    exporter: currentUser.name,
    localSandboxData: {
      departments: JSON.parse(localStorage.getItem("af_departments") || "[]"),
      assets: JSON.parse(localStorage.getItem("af_assets") || "[]"),
      transfers: JSON.parse(localStorage.getItem("af_transfers") || "[]"),
      bookings: JSON.parse(localStorage.getItem("af_bookings") || "[]"),
      maintenance: JSON.parse(localStorage.getItem("af_maintenance") || "[]"),
      audits: JSON.parse(localStorage.getItem("af_audits") || "[]")
    }
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `AssetFlow_ERP_Report_${Date.now()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

// --- FORM SUBMISSION EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  // Navigation tabs list binding
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const screen = item.getAttribute("data-screen");
      if (screen) navigate(screen);
    });
  });

  // Department creation
  const deptForm = document.getElementById("dept-form");
  if (deptForm) {
    deptForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("dept-name-input").value;
      const headId = document.getElementById("dept-head-select").value;
      const parentId = document.getElementById("dept-parent-select").value;

      const newDept = {
        id: `dept-${Date.now()}`,
        name,
        headId,
        parentId,
        status: "Active"
      };

      await DB.add("departments", newDept);
      await DB.logAction(currentUser.name, "Create Dept", `Created department "${name}"`);
      
      deptForm.reset();
      populateDropdowns();
      renderApp();
    });
  }

  // Category creation
  const catForm = document.getElementById("category-form");
  if (catForm) {
    catForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("cat-name-input").value;
      const fName = document.getElementById("cat-field1-name").value;
      const fType = document.getElementById("cat-field1-type").value;

      const customFields = fName ? [{ name: fName, type: fType, value: "" }] : [];
      const newCat = {
        id: `cat-${Date.now()}`,
        name,
        customFields
      };

      await DB.add("categories", newCat);
      await DB.logAction(currentUser.name, "Create Category", `Created asset category "${name}"`);
      
      catForm.reset();
      populateDropdowns();
      renderApp();
    });
  }

  // Register Asset Form
  const assetForm = document.getElementById("register-asset-form");
  if (assetForm) {
    assetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("reg-asset-name").value;
      const categoryId = document.getElementById("reg-asset-category").value;
      const serialNumber = document.getElementById("reg-asset-serial").value;
      const acquisitionDate = document.getElementById("reg-asset-date").value;
      const acquisitionCost = parseFloat(document.getElementById("reg-asset-cost").value);
      const condition = document.getElementById("reg-asset-condition").value;
      const location = document.getElementById("reg-asset-location").value;
      const isShared = document.getElementById("reg-asset-shared").checked;

      const list = await DB.get("assets");
      const tag = `AF-${str(list.length + 1).zfill(4)}`;

      const newAsset = {
        id: `asset-${Date.now()}`,
        tag,
        name,
        categoryId,
        serialNumber,
        acquisitionDate,
        acquisitionCost,
        condition,
        location,
        isShared,
        status: "Available",
        allocatedTo: null,
        expectedReturnDate: null,
        history: [{
          date: new Date().toISOString().split("T")[0],
          action: "Registration",
          user: currentUser.name,
          notes: `Asset registered by ${currentUser.name}.`
        }]
      };

      await DB.add("assets", newAsset);
      await DB.logAction(currentUser.name, "Register Asset", `Registered asset ${name} (${tag})`);
      
      assetForm.reset();
      closeModal("register-modal");
      renderApp();
    });
  }

  // Allocate Asset Form
  const allocForm = document.getElementById("allocation-form");
  if (allocForm) {
    allocForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const assetId = document.getElementById("alloc-asset-select").value;
      const empId = document.getElementById("alloc-emp-select").value;
      const deptId = document.getElementById("alloc-dept-select").value;
      const returnDate = document.getElementById("alloc-return-date").value;

      if (!empId && !deptId) {
        alert("You must allocate the asset to either an employee or a department!");
        return;
      }

      const assets = await DB.get("assets");
      const a = assets.find(x => x.id === assetId);
      if (a) {
        const allocatedTo = empId ? { type: "Employee", id: empId } : { type: "Department", id: deptId };
        a.status = "Allocated";
        a.allocatedTo = allocatedTo;
        a.expectedReturnDate = returnDate;
        a.history.push({
          date: new Date().toISOString().split("T")[0],
          action: "Allocation",
          user: currentUser.name,
          notes: `Allocated to ${empId ? 'Employee: ' + empId : 'Department: ' + deptId}. Expected return: ${returnDate || 'Permanent'}`
        });

        localStorage.setItem("af_assets", JSON.stringify(assets));
        await DB.logAction(currentUser.name, "Allocate Asset", `Allocated asset ${a.tag}`);
        
        allocForm.reset();
        populateDropdowns();
        renderApp();
      }
    });
  }

  // Confirm Return Form
  const returnForm = document.getElementById("return-checkin-form");
  if (returnForm) {
    returnForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const condition = document.getElementById("return-checkin-condition").value;
      const notes = document.getElementById("return-checkin-notes").value;

      const assets = await DB.get("assets");
      const a = assets.find(x => x.id === targetReturnAssetId);
      if (a) {
        a.status = "Available";
        a.allocatedTo = null;
        a.expectedReturnDate = null;
        a.condition = condition;
        a.history.push({
          date: new Date().toISOString().split("T")[0],
          action: "Return Check-in",
          user: currentUser.name,
          notes: `Asset returned in ${condition} condition. Remarks: ${notes || 'None'}`
        });

        localStorage.setItem("af_assets", JSON.stringify(assets));
        await DB.logAction(currentUser.name, "Return Asset", `Returned asset ${a.tag} in ${condition} condition`);
        
        returnForm.reset();
        closeModal("return-checkin-modal");
        populateDropdowns();
        renderApp();
      }
    });
  }

  // Booking Form
  const bookingForm = document.getElementById("booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const resourceId = document.getElementById("book-resource-select").value;
      const bDate = document.getElementById("book-date").value;
      const sTime = document.getElementById("book-start-time").value;
      const eTime = document.getElementById("book-end-time").value;
      const purpose = document.getElementById("book-purpose").value;

      const startTime = `${bDate}T${sTime}`;
      const endTime = `${bDate}T${eTime}`;

      // Booking overlap check
      const bookings = await DB.get("bookings");
      const overlap = bookings.some(b => b.resourceId === resourceId && b.status !== "Cancelled" && (startTime < b.endTime && b.startTime < endTime));
      if (overlap) {
        alert("Booking overlap conflict detected. Please select another slot.");
        return;
      }

      const newBooking = {
        id: `book-${Date.now()}`,
        resourceId,
        employeeId: currentUser.id,
        startTime,
        endTime,
        purpose,
        status: "Upcoming"
      };

      await DB.add("bookings", newBooking);
      await DB.logAction(currentUser.name, "Book Slot", `Reserved resource slot ${startTime} - ${endTime}`);
      
      bookingForm.reset();
      renderApp();
    });
  }

  // Raise Fault Ticket Form (Maintenance)
  const maintForm = document.getElementById("maintenance-form");
  if (maintForm) {
    maintForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const assetId = document.getElementById("maint-asset-select").value;
      const priority = document.getElementById("maint-priority").value;
      const issueDescription = document.getElementById("maint-desc").value;

      const newMaint = {
        id: `maint-${Date.now()}`,
        assetId,
        reportedBy: currentUser.id,
        issueDescription,
        priority,
        status: "Pending",
        raisedDate: new Date().toISOString().split("T")[0]
      };

      await DB.add("maintenance", newMaint);
      await DB.logAction(currentUser.name, "Raise Fault", `Reported issue on asset ID ${assetId}`);
      
      maintForm.reset();
      renderApp();
    });
  }

  // Resolve Maintenance Ticket Form
  const resolveMaintForm = document.getElementById("resolve-maint-form");
  if (resolveMaintForm) {
    resolveMaintForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const resolutionDetails = document.getElementById("resolve-maint-details").value;

      const maint = await DB.get("maintenance");
      const m = maint.find(x => x.id === targetMaintId);
      if (m) {
        m.status = "Resolved";
        m.resolutionDetails = resolutionDetails;
        m.resolvedDate = new Date().toISOString().split("T")[0];

        const assets = await DB.get("assets");
        const a = assets.find(x => x.id === m.assetId);
        if (a) {
          a.status = "Available";
          a.history.push({
            date: new Date().toISOString().split("T")[0],
            action: "Maintenance Resolved",
            user: currentUser.name,
            notes: `Repaired by ${m.technicianName}. Resolution: ${resolutionDetails}`
          });
          localStorage.setItem("af_assets", JSON.stringify(assets));
        }

        localStorage.setItem("af_maintenance", JSON.stringify(maint));
        await DB.logAction(currentUser.name, "Resolve Maintenance", `Closed ticket ID ${targetMaintId}`);
        
        resolveMaintForm.reset();
        closeModal("resolve-maint-modal");
        renderApp();
      }
    });
  }

  // Setup Audit Cycle Form
  const auditForm = document.getElementById("audit-form");
  if (auditForm) {
    auditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("audit-title").value;
      const scopeDepartmentId = document.getElementById("audit-scope-dept").value;
      const scopeLocation = document.getElementById("audit-scope-location").value;
      const startDate = document.getElementById("audit-start-date").value;
      const endDate = document.getElementById("audit-end-date").value;

      const selectAuditors = document.getElementById("audit-auditors");
      const assignedAuditors = Array.from(selectAuditors.selectedOptions).map(opt => opt.value);

      if (assignedAuditors.length === 0) {
        alert("Please assign at least one auditor.");
        return;
      }

      // Generate findings checklist
      const assets = await DB.get("assets");
      const findings = {};
      assets.forEach(a => {
        if (a.status === "Retired" || a.status === "Disposed") return;
        let matchDept = !scopeDepartmentId || (a.allocatedTo && a.allocatedTo.id === scopeDepartmentId);
        let matchLoc = !scopeLocation || (a.location.toLowerCase().includes(scopeLocation.toLowerCase()));
        if (matchDept && matchLoc) {
          findings[a.id] = "Pending";
        }
      });

      const newAudit = {
        id: `audit-${Date.now()}`,
        title,
        scopeDepartmentId,
        scopeLocation,
        startDate,
        endDate,
        assignedAuditors,
        status: "Active",
        findings,
        discrepancies: []
      };

      await DB.add("audits", newAudit);
      await DB.logAction(currentUser.name, "Launch Audit", `Launched audit cycle campaign "${title}"`);
      
      auditForm.reset();
      renderApp();
    });
  }

  // Initialize Session
  setupSession();
});

// Helper padding fill
function str(num) {
  return {
    zfill(width) {
      return (String(num).length >= width) ? String(num) : new Array(width - String(num).length + 1).join("0") + num;
    }
  };
}
