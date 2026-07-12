const BASE_API_URL = "http://127.0.0.1:5000/api";
let useBackend = false; // Toggled dynamically based on backend server connectivity check

// Global State
let currentUser = null;
let currentScreen = "dashboard";
const SYSTEM_DATE = "2026-07-12"; // ERP system mock base date

class AssetFlowDB {
  constructor() {
    this.initLocalStorageSandbox();
  }

  // Fallback local storage initializer (for prototype sandbox mode)
  initLocalStorageSandbox() {
    if (!localStorage.getItem("af_departments")) {
      localStorage.setItem("af_departments", JSON.stringify(INITIAL_DEPARTMENTS));
      localStorage.setItem("af_categories", JSON.stringify(INITIAL_CATEGORIES));
      localStorage.setItem("af_employees", JSON.stringify(INITIAL_EMPLOYEES));
      localStorage.setItem("af_assets", JSON.stringify(INITIAL_ASSETS));
      localStorage.setItem("af_transfers", JSON.stringify(INITIAL_TRANSFERS));
      localStorage.setItem("af_bookings", JSON.stringify(INITIAL_BOOKINGS));
      localStorage.setItem("af_maintenance", JSON.stringify(INITIAL_MAINTENANCE));
      localStorage.setItem("af_audits", JSON.stringify(INITIAL_AUDITS));
      localStorage.setItem("af_notifications", JSON.stringify(INITIAL_NOTIFICATIONS));
      localStorage.setItem("af_logs", JSON.stringify(INITIAL_AUDIT_LOGS));
    }
  }

  // Asynchronous GET helper
  async get(table) {
    if (useBackend) {
      try {
        let endpoint = `${BASE_API_URL}/${table}`;
        if (table === "notifications" && currentUser) {
          endpoint = `${BASE_API_URL}/notifications/${currentUser.id}`;
        }
        const res = await fetch(endpoint);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend read failed. Falling back to LocalStorage sandbox.");
        handleConnectionChange(false);
      }
    }
    return JSON.parse(localStorage.getItem(`af_${table}`)) || [];
  }

  // Asynchronous ADD helper
  async add(table, item) {
    if (useBackend) {
      try {
        let endpoint = `${BASE_API_URL}/${table}`;
        // Standard mapping for backend POST
        let payload = item;
        
        // Custom adapters for backend compatibility
        if (table === "departments") {
          payload = { name: item.name, headId: item.headId, parentId: item.parentId, userName: currentUser.name };
        } else if (table === "categories") {
          payload = { name: item.name, customFields: item.customFields, userName: currentUser.name };
        } else if (table === "assets") {
          payload = { ...item, userName: currentUser.name };
        } else if (table === "transfers") {
          payload = { ...item, userName: currentUser.name };
        } else if (table === "bookings") {
          payload = { ...item, userName: currentUser.name };
        } else if (table === "maintenance") {
          payload = { ...item, userName: currentUser.name };
        } else if (table === "audits") {
          payload = { ...item, userName: currentUser.name };
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.error("Backend write failed. Falling back to LocalStorage sandbox.");
        handleConnectionChange(false);
      }
    }

    // Local Storage Fallback
    const data = JSON.parse(localStorage.getItem(`af_${table}`)) || [];
    data.push(item);
    localStorage.setItem(`af_${table}`, JSON.stringify(data));
    return item;
  }

  // Asynchronous UPDATE transaction dispatcher
  async update(table, id, updates) {
    if (useBackend) {
      try {
        let endpoint = null;
        let payload = { ...updates, userName: currentUser ? currentUser.name : "Admin" };

        if (table === "employees" && updates.role) {
          endpoint = `${BASE_API_URL}/employees/${id}/role`;
        } else if (table === "employees" && updates.status) {
          endpoint = `${BASE_API_URL}/employees/${id}/status`;
        } else if (table === "departments" && updates.status) {
          endpoint = `${BASE_API_URL}/departments/${id}/status`;
        } else if (table === "transfers" && updates.status === "Approved") {
          endpoint = `${BASE_API_URL}/transfers/${id}/approve`;
          payload = { approverId: currentUser.id, userName: currentUser.name };
        } else if (table === "transfers" && updates.status === "Rejected") {
          endpoint = `${BASE_API_URL}/transfers/${id}/reject`;
          payload = { approverId: currentUser.id, userName: currentUser.name };
        } else if (table === "bookings" && updates.status === "Cancelled") {
          endpoint = `${BASE_API_URL}/bookings/${id}/cancel`;
        } else if (table === "maintenance" && updates.status === "Approved") {
          endpoint = `${BASE_API_URL}/maintenance/${id}/approve`;
          payload = { approverId: currentUser.id, userName: currentUser.name };
        } else if (table === "maintenance" && updates.status === "Rejected") {
          endpoint = `${BASE_API_URL}/maintenance/${id}/reject`;
        } else if (table === "maintenance" && updates.status === "Technician Assigned") {
          endpoint = `${BASE_API_URL}/maintenance/${id}/assign`;
          payload = { technicianName: updates.technicianName, userName: currentUser.name };
        } else if (table === "maintenance" && updates.status === "Resolved") {
          endpoint = `${BASE_API_URL}/maintenance/${id}/resolve`;
          payload = { resolutionDetails: updates.resolutionDetails, userName: currentUser.name };
        } else if (table === "audits" && updates.findings) {
          endpoint = `${BASE_API_URL}/audits/${id}/findings`;
          payload = { findings: updates.findings };
        } else if (table === "audits" && updates.status === "Closed") {
          endpoint = `${BASE_API_URL}/audits/${id}/close`;
          payload = { closedBy: currentUser.id, userName: currentUser.name };
        } else if (table === "notifications" && updates.isRead) {
          endpoint = `${BASE_API_URL}/notifications/${id}/read`;
        }

        if (endpoint) {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res.ok) return await res.json();
        }
      } catch (err) {
        console.warn("Backend update failed. Falling back to LocalStorage sandbox.");
        handleConnectionChange(false);
      }
    }

    // Local Storage Fallback
    const data = JSON.parse(localStorage.getItem(`af_${table}`)) || [];
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      localStorage.setItem(`af_${table}`, JSON.stringify(data));
      return data[index];
    }
    return null;
  }

  // Custom specific transaction methods for complex business rules
  async allocateAsset(payload) {
    if (useBackend) {
      try {
        const res = await fetch(`${BASE_API_URL}/allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, userName: currentUser.name })
        });
        if (res.ok) return await res.json();
        const errJson = await res.json();
        throw new Error(errJson.error || "Allocation failed");
      } catch (err) {
        if (err.message.includes("conflict")) throw err;
        console.warn("Backend allocation failed. Falling back to LocalStorage sandbox.");
        handleConnectionChange(false);
      }
    }

    // Local Storage Fallback implementation
    const assets = JSON.parse(localStorage.getItem("af_assets")) || [];
    const a = assets.find(x => x.id === payload.assetId);
    if (a) {
      if (a.status === "Allocated") throw new Error("Double-allocation conflict.");
      
      let allocatedTo = null;
      let notes = "";
      if (payload.empId) {
        allocatedTo = { type: "Employee", id: payload.empId };
        notes = `Allocated to employee: ${await getEmployeeName(payload.empId)}.`;
      } else if (payload.deptId) {
        allocatedTo = { type: "Department", id: payload.deptId };
        notes = `Allocated to department: ${await getDeptName(payload.deptId)}.`;
      }

      const history = a.history || [];
      history.append({
        date: new Date().toISOString().split("T")[0],
        action: "Allocation",
        user: currentUser.name,
        notes: `${notes} Expected return: ${payload.returnDate || "None"}.`
      });

      a.status = "Allocated";
      a.allocatedTo = allocatedTo;
      a.expectedReturnDate = payload.returnDate || null;
      a.history = history;

      localStorage.setItem("af_assets", JSON.stringify(assets));
      await this.logAction(currentUser.name, "Allocate Asset", `Allocated asset ${a.tag}`);
      if (payload.empId) {
        await this.notify(payload.empId, `Asset Allocated: ${a.name} (${a.tag}) has been assigned to you.`);
      }
    }
  }

  async returnAsset(payload) {
    if (useBackend) {
      try {
        const res = await fetch(`${BASE_API_URL}/allocations/return`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, userName: currentUser.name })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend return failed. Falling back to LocalStorage sandbox.");
        handleConnectionChange(false);
      }
    }

    // Local Storage Fallback implementation
    const assets = JSON.parse(localStorage.getItem("af_assets")) || [];
    const a = assets.find(x => x.id === payload.assetId);
    if (a) {
      const history = a.history || [];
      history.push({
        date: new Date().toISOString().split("T")[0],
        action: "Return Check-in",
        user: currentUser.name,
        notes: `Asset returned in ${payload.condition} condition. Notes: ${payload.notes || "None"}`
      });

      a.status = "Available";
      a.allocatedTo = null;
      a.expectedReturnDate = null;
      a.condition = payload.condition;
      a.history = history;

      localStorage.setItem("af_assets", JSON.stringify(assets));
      await this.logAction(currentUser.name, "Return Check-in", `Returned asset tag ${a.tag}`);
    }
  }

  async delete(table, id) {
    if (useBackend) {
      try {
        const res = await fetch(`${BASE_API_URL}/${table}/${id}`, {
          method: "DELETE"
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend delete failed. Falling back to LocalStorage sandbox.");
        handleConnectionChange(false);
      }
    }

    const data = JSON.parse(localStorage.getItem(`af_${table}`)) || [];
    const remaining = data.filter(item => item.id !== id);
    localStorage.setItem(`af_${table}`, JSON.stringify(remaining));
  }

  async logAction(userName, action, details) {
    if (useBackend) {
      // Backend automatically writes logs on transaction endpoints, but we can do a secondary call or rely on it
      return;
    }
    const logs = JSON.parse(localStorage.getItem("af_logs")) || [];
    logs.unshift({
      date: new Date().toISOString(),
      user: userName,
      action: action,
      details: details
    });
    localStorage.setItem("af_logs", JSON.stringify(logs));
  }

  async notify(employeeId, message) {
    if (useBackend) {
      // Backend sends notifications in triggers
      return;
    }
    const notifs = JSON.parse(localStorage.getItem("af_notifications")) || [];
    notifs.unshift({
      id: `notif-${Date.now()}`,
      employeeId: employeeId,
      message: message,
      date: new Date().toISOString(),
      isRead: false
    });
    localStorage.setItem("af_notifications", JSON.stringify(notifs));
  }
}

const DB = new AssetFlowDB();

// Handle Status Badge Updates
function handleConnectionChange(connected) {
  useBackend = connected;
  const dot = document.getElementById("db-status-dot");
  const text = document.getElementById("db-status-text");
  
  if (dot && text) {
    if (connected) {
      dot.style.backgroundColor = "var(--status-available)";
      text.textContent = "Live Database";
      text.style.color = "var(--status-available)";
    } else {
      dot.style.backgroundColor = "var(--status-lost)";
      text.textContent = "Offline Sandbox";
      text.style.color = "var(--text-secondary)";
    }
  }
}

// Perform active connection check on start
async function verifyServerConnection() {
  try {
    const res = await fetch(`${BASE_API_URL}/employees`, { method: "GET" });
    if (res.ok) {
      handleConnectionChange(true);
      console.log("Connection to local Flask API server verified.");
    } else {
      handleConnectionChange(false);
    }
  } catch (err) {
    handleConnectionChange(false);
    console.warn("Could not connect to Flask API server. Running in Offline LocalStorage Prototyping Mode.");
  }
}

// ====================================================
// AUTHENTICATION SYSTEM
// ====================================================

// Toggle between Login, Signup, and Forgot Password cards
function showAuthCard(cardType) {
  document.getElementById("login-card").style.display = cardType === "login" ? "block" : "none";
  document.getElementById("signup-card").style.display = cardType === "signup" ? "block" : "none";
  document.getElementById("forgot-card").style.display = cardType === "forgot" ? "block" : "none";
}

// Handle Login Submit
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  // Try backend login first
  if (useBackend) {
    try {
      const res = await fetch(`${BASE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        currentUser = data;
        sessionStorage.setItem("af_current_user_id", data.id);
        await setupSession();
        setupEventListeners();
        await renderApp();
        return;
      } else {
        alert(data.error || "Invalid credentials.");
        return;
      }
    } catch (err) {
      console.warn("Backend login failed, falling back to localStorage.");
      handleConnectionChange(false);
    }
  }

  // LocalStorage fallback login
  const employees = JSON.parse(localStorage.getItem("af_employees")) || [];
  const user = employees.find(emp => emp.email === email && emp.password === password);

  if (!user) {
    alert("Invalid email or password. Try: admin@assetflow.com / password123");
    return;
  }

  if (user.status !== "Active") {
    alert("This account has been deactivated. Contact your administrator.");
    return;
  }

  currentUser = user;
  sessionStorage.setItem("af_current_user_id", user.id);
  await setupSession();
  setupEventListeners();
  await renderApp();
}

// Handle Signup Submit
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();

  if (!name || !email || !password) {
    alert("All fields are required.");
    return;
  }
  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  // Try backend signup
  if (useBackend) {
    try {
      const res = await fetch(`${BASE_API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Account created for ${data.name}! You can now sign in.`);
        showAuthCard("login");
        document.getElementById("login-email").value = email;
        return;
      } else {
        alert(data.error || "Signup failed.");
        return;
      }
    } catch (err) {
      console.warn("Backend signup failed, falling back to localStorage.");
      handleConnectionChange(false);
    }
  }

  // LocalStorage fallback signup
  const employees = JSON.parse(localStorage.getItem("af_employees")) || [];
  const exists = employees.find(emp => emp.email === email);
  if (exists) {
    alert("An account with this email already exists.");
    return;
  }

  const newEmp = {
    id: `emp-${Date.now()}`,
    name: name,
    email: email,
    password: password,
    departmentId: "",
    role: "Employee",
    status: "Active"
  };
  employees.push(newEmp);
  localStorage.setItem("af_employees", JSON.stringify(employees));
  alert(`Account created for ${name}! You can now sign in.`);
  showAuthCard("login");
  document.getElementById("login-email").value = email;
}

// Handle Forgot Password Submit
function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();
  if (!email) {
    alert("Please enter your email address.");
    return;
  }
  alert(`Password recovery email sent to ${email}. (This is a demo — no email is actually sent.)`);
  showAuthCard("login");
}

// Handle Logout
function handleLogout() {
  currentUser = null;
  sessionStorage.removeItem("af_current_user_id");
  currentScreen = "dashboard";
  
  const authPage = document.getElementById("auth-page");
  const appLayout = document.getElementById("app-layout");
  if (authPage) authPage.style.display = "flex";
  if (appLayout) appLayout.style.display = "none";
  
  showAuthCard("login");
}

// Attach auth form listeners (called early, before login)
function setupAuthListeners() {
  const loginForm = document.getElementById("login-form-submit");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const signupForm = document.getElementById("signup-form-submit");
  if (signupForm) signupForm.addEventListener("submit", handleSignup);

  const forgotForm = document.getElementById("forgot-form-submit");
  if (forgotForm) forgotForm.addEventListener("submit", handleForgotPassword);
}

// Start Application
window.addEventListener("DOMContentLoaded", async () => {
  setupAuthListeners();       // Wire auth forms FIRST (before login)
  await verifyServerConnection();
  await setupSession();
  setupEventListeners();
  await renderApp();
});

// Session & Authorization Setup
async function setupSession() {
  const savedUserId = sessionStorage.getItem("af_current_user_id");
  const employees = await DB.get("employees");
  
  if (savedUserId) {
    currentUser = employees.find(e => e.id === savedUserId);
  } else {
    currentUser = null;
  }
  
  const authPage = document.getElementById("auth-page");
  const appLayout = document.getElementById("app-layout");
  
  if (!currentUser) {
    if (authPage) authPage.style.display = "flex";
    if (appLayout) appLayout.style.display = "none";
    return;
  } else {
    if (authPage) authPage.style.display = "none";
    if (appLayout) appLayout.style.display = "flex";
  }

  // Setup Role Switcher in header
  const switcher = document.getElementById("header-role-select");
  if (switcher) {
    switcher.innerHTML = employees
      .map(emp => `<option value="${emp.id}" ${emp.id === currentUser.id ? "selected" : ""}>${emp.name} (${emp.role})</option>`)
      .join("");
  }

  // Display user info in footer
  document.getElementById("footer-username").textContent = currentUser.name;
  document.getElementById("footer-role").textContent = `${currentUser.role} | ${await getDeptName(currentUser.departmentId)}`;
  
  // Set avatar
  const initials = currentUser.name.split(" ").map(n => n[0]).join("");
  document.getElementById("footer-avatar").textContent = initials;
}

async function switchUser(employeeId) {
  const employees = await DB.get("employees");
  const user = employees.find(e => e.id === employeeId);
  if (user) {
    currentUser = user;
    sessionStorage.setItem("af_current_user_id", user.id);
    await setupSession();
    await DB.logAction(currentUser.name, "Role Switch", `Switched active session view to ${currentUser.role}`);
    
    // Hide screens if user is not authorized
    if (currentScreen === "orgsetup" && currentUser.role !== "Admin") {
      navigate("dashboard");
    } else {
      await renderApp();
    }
  }
}

// Helpers
async function getDeptName(deptId) {
  if (!deptId) return "N/A";
  const depts = await DB.get("departments");
  const d = depts.find(x => x.id === deptId);
  return d ? d.name : "N/A";
}

window.getDeptName = getDeptName;

async function getEmployeeName(empId) {
  if (!empId) return "N/A";
  const emps = await DB.get("employees");
  const e = emps.find(x => x.id === empId);
  return e ? e.name : "N/A";
}

async function getCategoryName(catId) {
  const cats = await DB.get("categories");
  const c = cats.find(x => x.id === catId);
  return c ? c.name : "N/A";
}

async function getAssetTag(assetId) {
  const assets = await DB.get("assets");
  const a = assets.find(x => x.id === assetId);
  return a ? a.tag : "N/A";
}

// Main Navigation Routing
function navigate(screenId) {
  if (!currentUser) return;
  currentScreen = screenId;
  
  // Update sidebar active state
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-screen") === screenId) {
      item.classList.add("active");
    }
  });

  // Hide/Show Admin-only screens on sidebar
  const orgSetupNav = document.querySelector('[data-screen="orgsetup"]');
  if (orgSetupNav) {
    orgSetupNav.style.display = currentUser.role === "Admin" ? "flex" : "none";
  }

  // Update screens visibility
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
    if (screen.id === `${screenId}-screen`) {
      screen.classList.add("active");
    }
  });

  // Render specific screen content
  renderScreenContent(screenId);
}

// Screen content routers
async function renderScreenContent(screenId) {
  if (!currentUser) return;
  switch (screenId) {
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

async function renderApp() {
  if (!currentUser) return;
  navigate(currentScreen);
  await updateNotificationsBadge();
}

// Notifications badge update
async function updateNotificationsBadge() {
  if (!currentUser) return;
  const notifs = (await DB.get("notifications")).filter(n => n.employeeId === currentUser.id && !n.isRead);
  const badge = document.getElementById("notif-badge");
  if (badge) {
    if (notifs.length > 0) {
      badge.style.display = "block";
    } else {
      badge.style.display = "none";
    }
  }
}

// ----------------------------------------------------
// 2. DASHBOARD SCREEN
// ----------------------------------------------------
async function renderDashboard() {
  const assets = await DB.get("assets");
  const bookings = await DB.get("bookings");
  const maintenance = await DB.get("maintenance");
  const transfers = await DB.get("transfers");

  // Filter counters
  const availCount = assets.filter(a => a.status === "Available").length;
  const allocCount = assets.filter(a => a.status === "Allocated").length;
  const maintTodayCount = maintenance.filter(m => m.status === "In Progress" || m.status === "Pending").length;
  const activeBookingsCount = bookings.filter(b => b.status === "Ongoing" || b.status === "Upcoming").length;
  const pendingTransCount = transfers.filter(t => t.status === "Pending").length;

  // Overdue returns count: allocated assets where expectedReturnDate < SYSTEM_DATE
  const overdueAssets = assets.filter(a => 
    a.status === "Allocated" && 
    a.expectedReturnDate && 
    a.expectedReturnDate < SYSTEM_DATE
  );
  
  const upcomingReturns = assets.filter(a => 
    a.status === "Allocated" && 
    a.expectedReturnDate && 
    a.expectedReturnDate >= SYSTEM_DATE
  );

  // Update KPI fields
  document.getElementById("kpi-avail").textContent = availCount;
  document.getElementById("kpi-alloc").textContent = allocCount;
  document.getElementById("kpi-maint").textContent = maintTodayCount;
  document.getElementById("kpi-bookings").textContent = activeBookingsCount;
  document.getElementById("kpi-transfers").textContent = pendingTransCount;
  document.getElementById("kpi-returns").textContent = overdueAssets.length;

  // Render Overdue Allocations separately
  const overdueContainer = document.getElementById("dashboard-overdue-list");
  if (overdueAssets.length === 0) {
    overdueContainer.innerHTML = `<div class="text-muted p-3 text-center">No overdue asset returns.</div>`;
  } else {
    overdueContainer.innerHTML = await Promise.all(overdueAssets.map(async asset => `
      <div class="overdue-item">
        <div class="overdue-info">
          <h4>${asset.name} (${asset.tag})</h4>
          <p>Held by: ${asset.allocatedTo.type === "Employee" ? await getEmployeeName(asset.allocatedTo.id) : await getDeptName(asset.allocatedTo.id)}</p>
          <p class="text-danger font-semibold">Expected: ${asset.expectedReturnDate} (Overdue)</p>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openAssetDetails('${asset.id}')">View Asset</button>
      </div>
    `)).then(htmls => htmls.join(""));
  }

  // Render Upcoming Returns
  const upcomingContainer = document.getElementById("dashboard-upcoming-list");
  if (upcomingReturns.length === 0) {
    upcomingContainer.innerHTML = `<div class="text-muted p-3 text-center">No upcoming asset returns.</div>`;
  } else {
    upcomingContainer.innerHTML = await Promise.all(upcomingReturns.map(async asset => `
      <div class="overdue-item" style="background-color: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.15)">
        <div class="overdue-info">
          <h4 style="color: #60a5fa">${asset.name} (${asset.tag})</h4>
          <p>Held by: ${asset.allocatedTo.type === "Employee" ? await getEmployeeName(asset.allocatedTo.id) : await getDeptName(asset.allocatedTo.id)}</p>
          <p class="text-blue-400 font-semibold" style="color: #60a5fa">Expected: ${asset.expectedReturnDate}</p>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="openAssetDetails('${asset.id}')">View Asset</button>
      </div>
    `)).then(htmls => htmls.join(""));
  }
}

// ----------------------------------------------------
// 3. ORGANIZATION SETUP (ADMIN ONLY)
// ----------------------------------------------------
let activeOrgTab = "depts";

async function renderOrgSetup() {
  if (currentUser.role !== "Admin") {
    navigate("dashboard");
    return;
  }

  // Handle Tab Activation
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
    if (tab.getAttribute("data-tab") === activeOrgTab) {
      tab.classList.add("active");
    }
  });

  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.remove("active");
    if (content.id === `tab-${activeOrgTab}`) {
      content.classList.add("active");
    }
  });

  // Load Tab Specific content
  if (activeOrgTab === "depts") {
    await renderOrgDepts();
  } else if (activeOrgTab === "categories") {
    await renderOrgCategories();
  } else if (activeOrgTab === "employees") {
    await renderOrgEmployees();
  }
}

// Tab A: Department Management
async function renderOrgDepts() {
  const depts = await DB.get("departments");
  const employees = await DB.get("employees");
  const tbody = document.getElementById("depts-table-body");

  // Load parent departments selector in form
  const parentSelect = document.getElementById("dept-parent-select");
  parentSelect.innerHTML = `<option value="">None (Top-Level)</option>` + 
    depts.filter(d => d.status === "Active").map(d => `<option value="${d.id}">${d.name}</option>`).join("");

  // Load heads selector in form
  const headSelect = document.getElementById("dept-head-select");
  headSelect.innerHTML = `<option value="">None</option>` + 
    employees.map(e => `<option value="${e.id}">${e.name}</option>`).join("");

  tbody.innerHTML = await Promise.all(depts.map(async dept => {
    const headName = await getEmployeeName(dept.headId);
    const parentName = dept.parentId ? await getDeptName(dept.parentId) : "None";
    const statusClass = dept.status === "Active" ? "status-available" : "status-retired";
    return `
      <tr>
        <td class="font-semibold">${dept.name}</td>
        <td>${headName}</td>
        <td>${parentName}</td>
        <td><span class="status-badge ${statusClass}">${dept.status}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="toggleDeptStatus('${dept.id}')">
            ${dept.status === "Active" ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>
    `;
  })).then(htmls => htmls.join(""));
}

async function handleCreateDept(e) {
  e.preventDefault();
  const name = document.getElementById("dept-name-input").value.trim();
  const headId = document.getElementById("dept-head-select").value;
  const parentId = document.getElementById("dept-parent-select").value;

  // Validation
  if (!name) {
    alert("Department name cannot be empty.");
    return;
  }

  const newDept = {
    id: `dept-${Date.now()}`,
    name,
    headId,
    parentId,
    status: "Active"
  };

  await DB.add("departments", newDept);
  await DB.logAction(currentUser.name, "Create Department", `Created department: ${name}`);

  document.getElementById("dept-form").reset();
  await renderOrgDepts();
}

async function toggleDeptStatus(deptId) {
  const depts = await DB.get("departments");
  const dept = depts.find(d => d.id === deptId);
  if (dept) {
    const newStatus = dept.status === "Active" ? "Inactive" : "Active";
    await DB.update("departments", deptId, { status: newStatus });
    await DB.logAction(currentUser.name, "Update Department Status", `Toggled department ${dept.name} to ${newStatus}`);
    await renderOrgDepts();
  }
}

// Tab B: Asset Category Management
async function renderOrgCategories() {
  const categories = await DB.get("categories");
  const tbody = document.getElementById("categories-table-body");

  tbody.innerHTML = categories.map(cat => {
    const customFieldsStr = cat.customFields.map(f => `${f.name} (${f.type})`).join(", ");
    return `
      <tr>
        <td class="font-semibold">${cat.name}</td>
        <td class="text-secondary">${customFieldsStr || "None"}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

async function handleCreateCategory(e) {
  e.preventDefault();
  const name = document.getElementById("cat-name-input").value.trim();
  const fieldName1 = document.getElementById("cat-field1-name").value.trim();
  const fieldType1 = document.getElementById("cat-field1-type").value;
  
  if (!name) {
    alert("Category name is required.");
    return;
  }

  const customFields = [];
  if (fieldName1) {
    customFields.push({ name: fieldName1, type: fieldType1, value: "" });
  }

  const newCat = {
    id: `cat-${Date.now()}`,
    name,
    customFields
  };

  await DB.add("categories", newCat);
  await DB.logAction(currentUser.name, "Create Category", `Created asset category: ${name}`);
  document.getElementById("category-form").reset();
  await renderOrgCategories();
}

async function deleteCategory(catId) {
  await DB.delete("categories", catId);
  await DB.logAction(currentUser.name, "Delete Category", `Deleted category`);
  await renderOrgCategories();
}

// Tab C: Employee Directory Promotion
async function renderOrgEmployees() {
  const employees = await DB.get("employees");
  const tbody = document.getElementById("employees-table-body");

  tbody.innerHTML = await Promise.all(employees.map(async emp => {
    const deptName = await getDeptName(emp.departmentId);
    return `
      <tr>
        <td class="font-semibold">${emp.name}</td>
        <td>${emp.email}</td>
        <td>${deptName}</td>
        <td>
          <select onchange="changeEmployeeRole('${emp.id}', this.value)" style="padding: 6px 12px; width: 180px;">
            <option value="Employee" ${emp.role === "Employee" ? "selected" : ""}>Employee</option>
            <option value="Department Head" ${emp.role === "Department Head" ? "selected" : ""}>Department Head</option>
            <option value="Asset Manager" ${emp.role === "Asset Manager" ? "selected" : ""}>Asset Manager</option>
            <option value="Admin" ${emp.role === "Admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td><span class="status-badge ${emp.status === "Active" ? "status-available" : "status-retired"}">${emp.status}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="toggleEmployeeStatus('${emp.id}')">
            ${emp.status === "Active" ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>
    `;
  })).then(htmls => htmls.join(""));
}

async function changeEmployeeRole(empId, newRole) {
  const employees = await DB.get("employees");
  const oldEmp = employees.find(e => e.id === empId);
  await DB.update("employees", empId, { role: newRole });
  await DB.logAction(currentUser.name, "Promote Employee", `Updated role of ${oldEmp.name} to ${newRole}`);
  await setupSession();
  await renderOrgEmployees();
}

async function toggleEmployeeStatus(empId) {
  const emps = await DB.get("employees");
  const emp = emps.find(e => e.id === empId);
  if (emp) {
    const newStatus = emp.status === "Active" ? "Inactive" : "Active";
    await DB.update("employees", empId, { status: newStatus });
    await DB.logAction(currentUser.name, "Update Employee Status", `Toggled employee ${emp.name} status to ${newStatus}`);
    await renderOrgEmployees();
  }
}

// ----------------------------------------------------
// 4. ASSET DIRECTORY
// ----------------------------------------------------
async function renderAssets() {
  const assets = await DB.get("assets");
  const categories = await DB.get("categories");
  const grid = document.getElementById("asset-cards-grid");

  // Load registration categories list selector
  const regCatSelect = document.getElementById("reg-asset-category");
  if (regCatSelect) {
    regCatSelect.innerHTML = `<option value="">Select Category...</option>` + 
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  // Render Grid
  const searchQuery = document.getElementById("asset-search-input").value.toLowerCase();
  const filterCategory = document.getElementById("asset-filter-category").value;
  const filterStatus = document.getElementById("asset-filter-status").value;

  // Filter Categories dropdown in controls
  const filterCatSelect = document.getElementById("asset-filter-category");
  if (filterCatSelect && filterCatSelect.children.length <= 1) {
    filterCatSelect.innerHTML = `<option value="">All Categories</option>` +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  const filtered = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery) ||
                          a.tag.toLowerCase().includes(searchQuery) ||
                          a.serialNumber.toLowerCase().includes(searchQuery) ||
                          a.location.toLowerCase().includes(searchQuery);
    const matchesCategory = filterCategory ? a.categoryId === filterCategory : true;
    const matchesStatus = filterStatus ? a.status === filterStatus : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-muted p-5 text-center">No assets found.</div>`;
  } else {
    grid.innerHTML = await Promise.all(filtered.map(async a => {
      const statusClass = `status-${a.status.toLowerCase().replace(" ", "")}`;
      const holderText = a.allocatedTo ? 
        (a.allocatedTo.type === "Employee" ? await getEmployeeName(a.allocatedTo.id) : await getDeptName(a.allocatedTo.id)) : 
        "None";
      return `
        <div class="asset-card" onclick="openAssetDetails('${a.id}')">
          <div class="asset-card-header">
            <div>
              <div class="asset-name">${a.name}</div>
              <div class="asset-tag">${a.tag}</div>
            </div>
            <span class="status-badge ${statusClass}">${a.status}</span>
          </div>
          <div class="asset-card-body">
            <div class="asset-info-item">
              <span class="asset-info-label">Category:</span>
              <span class="asset-info-value">${await getCategoryName(a.categoryId)}</span>
            </div>
            <div class="asset-info-item">
              <span class="asset-info-label">Location:</span>
              <span class="asset-info-value">${a.location}</span>
            </div>
            <div class="asset-info-item">
              <span class="asset-info-label">Holder:</span>
              <span class="asset-info-value">${holderText}</span>
            </div>
          </div>
          <div class="asset-card-footer">
            <span class="text-secondary font-semibold">$${a.acquisitionCost}</span>
            <span class="text-muted font-medium">${a.condition}</span>
          </div>
        </div>
      `;
    })).then(htmls => htmls.join(""));
  }

  // Adjust visibility of register button based on Asset Manager role
  const regBtn = document.getElementById("open-register-modal-btn");
  if (regBtn) {
    regBtn.style.display = (currentUser.role === "Asset Manager" || currentUser.role === "Admin") ? "inline-flex" : "none";
  }
}

async function handleRegisterCategoryChange() {
  const catId = document.getElementById("reg-asset-category").value;
  const customFieldsContainer = document.getElementById("reg-custom-fields-container");
  customFieldsContainer.innerHTML = "";

  if (catId) {
    const categories = await DB.get("categories");
    const cat = categories.find(c => c.id === catId);
    if (cat && cat.customFields) {
      cat.customFields.forEach(field => {
        customFieldsContainer.innerHTML += `
          <div class="form-group">
            <label>${field.name}</label>
            <input type="${field.type}" class="form-control reg-custom-field-input" data-field-name="${field.name}" required>
          </div>
        `;
      });
    }
  }
}

async function handleRegisterAsset(e) {
  e.preventDefault();
  const name = document.getElementById("reg-asset-name").value.trim();
  const categoryId = document.getElementById("reg-asset-category").value;
  const serialNumber = document.getElementById("reg-asset-serial").value.trim();
  const acquisitionDate = document.getElementById("reg-asset-date").value;
  const acquisitionCost = parseFloat(document.getElementById("reg-asset-cost").value);
  const condition = document.getElementById("reg-asset-condition").value;
  const location = document.getElementById("reg-asset-location").value.trim();
  const isShared = document.getElementById("reg-asset-shared").checked;

  // Validation
  if (!name || !serialNumber || !location || isNaN(acquisitionCost) || acquisitionCost <= 0) {
    alert("Please enter valid, positive registration parameters.");
    return;
  }

  const assets = await DB.get("assets");
  const nextNum = assets.length + 1;
  const tag = `AF-${String(nextNum).padStart(4, "0")}`;

  // Gather custom fields
  const customFieldsData = [];
  document.querySelectorAll(".reg-custom-field-input").forEach(input => {
    customFieldsData.push({
      name: input.getAttribute("data-field-name"),
      value: input.value
    });
  });

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
    customFields: customFieldsData,
    history: [
      { date: new Date().toISOString().split("T")[0], action: "Registration", user: currentUser.name, notes: `Asset registered by ${currentUser.name}.` }
    ]
  };

  try {
    await DB.add("assets", newAsset);
    await DB.logAction(currentUser.name, "Register Asset", `Registered new asset ${name} (${tag})`);
    closeModal("register-modal");
    document.getElementById("register-asset-form").reset();
    await renderAssets();
  } catch (err) {
    alert(err.message);
  }
}

async function openAssetDetails(assetId) {
  const assets = await DB.get("assets");
  const a = assets.find(x => x.id === assetId);
  if (!a) return;

  document.getElementById("details-name").textContent = a.name;
  document.getElementById("details-tag").textContent = a.tag;
  document.getElementById("details-status").className = `status-badge status-${a.status.toLowerCase().replace(" ", "")}`;
  document.getElementById("details-status").textContent = a.status;

  // Key Fields
  document.getElementById("details-category").textContent = await getCategoryName(a.categoryId);
  document.getElementById("details-serial").textContent = a.serialNumber;
  document.getElementById("details-date").textContent = a.acquisitionDate;
  document.getElementById("details-cost").textContent = `$${a.acquisitionCost}`;
  document.getElementById("details-condition").textContent = a.condition;
  document.getElementById("details-location").textContent = a.location;
  document.getElementById("details-shared").textContent = a.isShared ? "Yes (Bookable)" : "No (Private Allocation)";
  
  const holderText = a.allocatedTo ? 
    (a.allocatedTo.type === "Employee" ? await getEmployeeName(a.allocatedTo.id) : await getDeptName(a.allocatedTo.id)) : 
    "None";
  document.getElementById("details-holder").textContent = holderText;

  // Render Category Custom fields
  const customFieldsContainer = document.getElementById("details-custom-fields");
  if (a.customFields && a.customFields.length > 0) {
    customFieldsContainer.innerHTML = a.customFields.map(f => `
      <div class="asset-info-item">
        <span class="asset-info-label">${f.name}:</span>
        <span class="asset-info-value">${f.value}</span>
      </div>
    `).join("");
  } else {
    customFieldsContainer.innerHTML = `<span class="text-muted">No category-specific fields.</span>`;
  }

  // Render History Timeline
  const timeline = document.getElementById("details-timeline");
  timeline.innerHTML = a.history.map(h => `
    <div class="timeline-item">
      <div class="timeline-date">${h.date}</div>
      <div class="timeline-action">${h.action} - by ${h.user}</div>
      <div class="timeline-notes">${h.notes}</div>
    </div>
  `).join("");

  openModal("details-modal");
}

// ----------------------------------------------------
// 5. ASSET ALLOCATION & TRANSFERS
// ----------------------------------------------------
let pendingAllocationAssetId = null;

async function renderAllocations() {
  const assets = await DB.get("assets");
  const employees = await DB.get("employees");
  const depts = await DB.get("departments");
  const transfers = await DB.get("transfers");

  // Load forms
  const assetSelect = document.getElementById("alloc-asset-select");
  assetSelect.innerHTML = `<option value="">Select Asset...</option>` + 
    assets.map(a => `<option value="${a.id}">${a.name} (${a.tag}) - [${a.status}]</option>`).join("");

  const empSelect = document.getElementById("alloc-emp-select");
  empSelect.innerHTML = `<option value="">None (Department Allocation)</option>` + 
    employees.map(e => `<option value="${e.id}">${e.name}</option>`).join("");

  const deptSelect = document.getElementById("alloc-dept-select");
  deptSelect.innerHTML = `<option value="">None (Employee Allocation)</option>` + 
    depts.map(d => `<option value="${d.id}">${d.name}</option>`).join("");

  // Check role eligibility to perform allocations
  const allocFormCard = document.getElementById("allocation-form-card");
  if (allocFormCard) {
    allocFormCard.style.display = (currentUser.role === "Asset Manager" || currentUser.role === "Admin") ? "block" : "none";
  }

  // Render Transfer requests table
  const transfersTable = document.getElementById("transfers-table-body");
  transfersTable.innerHTML = await Promise.all(transfers.map(async t => {
    const asset = assets.find(x => x.id === t.assetId);
    const assetStr = asset ? `${asset.name} (${asset.tag})` : "N/A";
    const fromStr = await getEmployeeName(t.fromEmployeeId);
    const toStr = await getEmployeeName(t.toEmployeeId);
    const reqStr = await getEmployeeName(t.requestedBy);

    let actions = "";
    if (t.status === "Pending") {
      const isAssetManager = currentUser.role === "Asset Manager" || currentUser.role === "Admin";
      const targetEmp = employees.find(e => e.id === t.toEmployeeId);
      const isTargetDeptHead = currentUser.role === "Department Head" && targetEmp && targetEmp.departmentId === currentUser.departmentId;

      if (isAssetManager || isTargetDeptHead) {
        actions = `
          <button class="btn btn-sm btn-primary" onclick="approveTransfer('${t.id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectTransfer('${t.id}')">Reject</button>
        `;
      } else {
        actions = `<span class="text-muted">Awaiting Manager</span>`;
      }
    } else {
      actions = `<span class="font-semibold" style="color: ${t.status === 'Approved' ? 'var(--status-available)' : 'var(--status-lost)'}">${t.status}</span>`;
    }

    return `
      <tr>
        <td class="font-semibold">${assetStr}</td>
        <td>${fromStr}</td>
        <td>${toStr}</td>
        <td>${reqStr}</td>
        <td class="text-secondary" title="${t.reason}">${t.reason.substring(0, 30)}...</td>
        <td>${actions}</td>
      </tr>
    `;
  })).then(htmls => htmls.join(""));

  // Render active allocations returns list
  const activeAllocations = assets.filter(a => a.status === "Allocated");
  const returnTable = document.getElementById("returns-table-body");
  returnTable.innerHTML = await Promise.all(activeAllocations.map(async a => {
    const holder = a.allocatedTo.type === "Employee" ? await getEmployeeName(a.allocatedTo.id) : await getDeptName(a.allocatedTo.id);
    return `
      <tr>
        <td class="font-semibold">${a.name} (${a.tag})</td>
        <td>${a.allocatedTo.type}: ${holder}</td>
        <td>${a.expectedReturnDate || "None"}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="openReturnCheckinModal('${a.id}')">Mark Returned</button>
        </td>
      </tr>
    `;
  })).then(htmls => htmls.join(""));
}

async function handleAllocateAsset(e) {
  e.preventDefault();
  const assetId = document.getElementById("alloc-asset-select").value;
  const empId = document.getElementById("alloc-emp-select").value;
  const deptId = document.getElementById("alloc-dept-select").value;
  const returnDate = document.getElementById("alloc-return-date").value;

  // Validation
  if (!assetId || (!empId && !deptId)) {
    alert("Please select an asset and a target employee/department.");
    return;
  }

  const assets = await DB.get("assets");
  const a = assets.find(x => x.id === assetId);

  if (!a) return;

  // Conflict handling: Double-allocation check
  if (a.status === "Allocated") {
    pendingAllocationAssetId = assetId;
    const currentHolderId = a.allocatedTo.id;
    const holderName = a.allocatedTo.type === "Employee" ? await getEmployeeName(currentHolderId) : await getDeptName(currentHolderId);
    
    document.getElementById("conflict-message").innerHTML = `
      The asset <strong>${a.name} (${a.tag})</strong> is already allocated to <strong>${holderName}</strong>. 
      You cannot double-allocate a single asset.
    `;
    
    const targetUserId = empId || currentUser.id;
    document.getElementById("transfer-target-id").value = targetUserId;
    document.getElementById("transfer-from-id").value = currentHolderId;

    openModal("conflict-modal");
    return;
  }

  // Call allocation transaction
  try {
    await DB.allocateAsset({ assetId, empId, deptId, returnDate });
    document.getElementById("allocation-form").reset();
    await renderAllocations();
  } catch (err) {
    alert(err.message);
  }
}

async function handleRaiseTransferRequest(e) {
  e.preventDefault();
  const assetId = pendingAllocationAssetId;
  const fromEmpId = document.getElementById("transfer-from-id").value;
  const toEmpId = document.getElementById("transfer-target-id").value;
  const reason = document.getElementById("transfer-reason").value.trim();

  if (!reason) {
    alert("Please specify a transfer reason.");
    return;
  }

  const newTransfer = {
    id: `trans-${Date.now()}`,
    assetId,
    fromEmployeeId: fromEmpId,
    toEmployeeId: toEmpId,
    requestedBy: currentUser.id,
    requestDate: new Date().toISOString().split("T")[0],
    reason,
    status: "Pending",
    approvedBy: null,
    approvalDate: null
  };

  await DB.add("transfers", newTransfer);
  await DB.logAction(currentUser.name, "Raise Transfer Request", `Requested transfer for asset tag ${await getAssetTag(assetId)}`);
  
  // Notify Asset Manager
  const employees = await DB.get("employees");
  const managers = employees.filter(e => e.role === "Asset Manager");
  for (const m of managers) {
    await DB.notify(m.id, `New Transfer Request for asset ${await getAssetTag(assetId)}.`);
  }

  closeModal("conflict-modal");
  document.getElementById("transfer-reason").value = "";
  await renderAllocations();
}

async function approveTransfer(transId) {
  await DB.update("transfers", transId, { status: "Approved" });
  await renderAllocations();
}

async function rejectTransfer(transId) {
  await DB.update("transfers", transId, { status: "Rejected" });
  await renderAllocations();
}

let returnCheckinAssetId = null;
function openReturnCheckinModal(assetId) {
  returnCheckinAssetId = assetId;
  openModal("return-checkin-modal");
}

async function handleConfirmReturn(e) {
  e.preventDefault();
  const notes = document.getElementById("return-checkin-notes").value.trim();
  const condition = document.getElementById("return-checkin-condition").value;

  try {
    await DB.returnAsset({ assetId: returnCheckinAssetId, condition, notes });
    closeModal("return-checkin-modal");
    document.getElementById("return-checkin-form").reset();
    await renderAllocations();
  } catch (err) {
    alert(err.message);
  }
}

// ----------------------------------------------------
// 6. RESOURCE BOOKING
// ----------------------------------------------------
let selectedResourceId = "asset-3"; // Default room alpha

async function renderBookings() {
  const assets = await DB.get("assets");
  const bookings = await DB.get("bookings");

  const bookables = assets.filter(a => a.isShared);
  
  // Render Left Resources panel
  const resourcesPanel = document.getElementById("bookable-resources-list");
  resourcesPanel.innerHTML = await Promise.all(bookables.map(async r => `
    <div class="resource-item ${r.id === selectedResourceId ? 'active' : ''}" onclick="selectResourceForBooking('${r.id}')">
      <div class="font-semibold">${r.name}</div>
      <div class="text-secondary" style="font-size: 0.8rem;">${r.location} • ${await getCategoryName(r.categoryId)}</div>
    </div>
  `)).then(htmls => htmls.join(""));

  // Setup resource selector in booking form
  const formResourceSelect = document.getElementById("book-resource-select");
  formResourceSelect.innerHTML = bookables.map(r => `<option value="${r.id}" ${r.id === selectedResourceId ? 'selected' : ''}>${r.name}</option>`).join("");

  // Render Visual Timeline bookings
  const timelineGrid = document.getElementById("bookings-timeline-grid");
  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  
  timelineGrid.innerHTML = await Promise.all(timeSlots.map(async time => {
    const slotHour = parseInt(time.split(":")[0]);
    
    const matchingBookings = bookings.filter(b => {
      if (b.resourceId !== selectedResourceId) return false;
      if (b.status === "Cancelled") return false;
      
      const bStartHour = parseInt(b.startTime.split("T")[1].split(":")[0]);
      const bEndHour = parseInt(b.endTime.split("T")[1].split(":")[0]);
      return slotHour >= bStartHour && slotHour < bEndHour;
    });

    let slotContent = `<span class="text-muted" style="font-size: 0.8rem; font-style: italic;">Available for booking</span>`;
    if (matchingBookings.length > 0) {
      const b = matchingBookings[0];
      const startStr = b.startTime.split("T")[1];
      const endStr = b.endTime.split("T")[1];
      slotContent = `
        <div class="booking-block">
          <div>
            <span class="booking-purpose">${b.purpose}</span>
            <span class="booking-meta"> | Booked by ${await getEmployeeName(b.employeeId)}</span>
          </div>
          <span class="booking-meta">${startStr} - ${endStr} (${b.status})</span>
          ${b.employeeId === currentUser.id ? `<button class="btn btn-sm btn-danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}
        </div>
      `;
    }

    return `
      <div class="schedule-row">
        <div class="schedule-time">${time}</div>
        <div class="schedule-slots">${slotContent}</div>
      </div>
    `;
  })).then(htmls => htmls.join(""));
}

async function selectResourceForBooking(resId) {
  selectedResourceId = resId;
  await renderBookings();
}

async function handleCreateBooking(e) {
  e.preventDefault();
  const resourceId = document.getElementById("book-resource-select").value;
  const date = document.getElementById("book-date").value;
  const startTime = document.getElementById("book-start-time").value;
  const endTime = document.getElementById("book-end-time").value;
  const purpose = document.getElementById("book-purpose").value.trim();

  const startIso = `${date}T${startTime}`;
  const endIso = `${date}T${endTime}`;

  if (startIso >= endIso) {
    alert("End time must be after start time.");
    return;
  }
  if (!purpose) {
    alert("Booking purpose is required.");
    return;
  }

  // Dynamic booking conflict overlap validations
  if (useBackend) {
    try {
      const res = await fetch(`${BASE_API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, employeeId: currentUser.id, startTime: startIso, endTime: endIso, purpose, userName: currentUser.name })
      });
      if (!res.ok) {
        const errorJson = await res.json();
        alert(errorJson.error || "Booking overlap detected.");
        return;
      }
      document.getElementById("booking-form").reset();
      await renderBookings();
      return;
    } catch (err) {
      console.warn("Backend booking failed. Reverting to sandbox.");
      handleConnectionChange(false);
    }
  }

  // Local Storage overlap validation rules
  const bookings = await DB.get("bookings");
  const hasOverlap = bookings.some(b => {
    if (b.resourceId !== resourceId) return false;
    if (b.status === "Cancelled") return false;
    return (startIso < b.endTime) && (b.startTime < endIso);
  });

  if (hasOverlap) {
    alert("Booking Overlap Rejected! This resource is already booked during the selected timeframe.");
    return;
  }

  const newBooking = {
    id: `book-${Date.now()}`,
    resourceId,
    employeeId: currentUser.id,
    startTime: startIso,
    endTime: endIso,
    purpose,
    status: "Upcoming"
  };

  await DB.add("bookings", newBooking);
  await DB.logAction(currentUser.name, "Book Resource", `Booked ${await getAssetTag(resourceId)} for ${startTime}-${endTime}`);
  await DB.notify(currentUser.id, `Booking Confirmed: Resource has been reserved.`);

  document.getElementById("booking-form").reset();
  await renderBookings();
}

async function cancelBooking(bookingId) {
  await DB.update("bookings", bookingId, { status: "Cancelled" });
  await DB.logAction(currentUser.name, "Cancel Booking", `Cancelled booking ID: ${bookingId}`);
  await renderBookings();
}

// ----------------------------------------------------
// 7. MAINTENANCE MANAGEMENT
// ----------------------------------------------------
async function renderMaintenance() {
  const assets = await DB.get("assets");
  const maintenance = await DB.get("maintenance");
  
  // Select Asset dropdown
  const assetSelect = document.getElementById("maint-asset-select");
  assetSelect.innerHTML = `<option value="">Select Asset...</option>` + 
    assets.map(a => `<option value="${a.id}">${a.name} (${a.tag})</option>`).join("");

  const tbody = document.getElementById("maintenance-table-body");
  tbody.innerHTML = await Promise.all(maintenance.map(async m => {
    const asset = assets.find(x => x.id === m.assetId);
    const assetStr = asset ? `${asset.name} (${asset.tag})` : "N/A";
    const reportedByStr = await getEmployeeName(m.reportedBy);

    let actions = "";
    const isManager = currentUser.role === "Asset Manager" || currentUser.role === "Admin";

    if (m.status === "Pending") {
      if (isManager) {
        actions = `
          <button class="btn btn-sm btn-primary" onclick="approveMaintenance('${m.id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectMaintenance('${m.id}')">Reject</button>
        `;
      } else {
        actions = `<span class="text-muted">Awaiting Approval</span>`;
      }
    } else if (m.status === "Approved") {
      if (isManager) {
        actions = `
          <div class="flex gap-2">
            <input type="text" placeholder="Tech Name" id="tech-${m.id}" style="padding: 4px 8px; font-size: 0.8rem; width: 100px;">
            <button class="btn btn-sm btn-secondary" onclick="assignTechnician('${m.id}')">Assign</button>
          </div>
        `;
      } else {
        actions = `<span class="text-muted">Awaiting Technician</span>`;
      }
    } else if (m.status === "Technician Assigned" || m.status === "In Progress") {
      actions = `
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted">Tech: ${m.technicianName}</span>
          <button class="btn btn-sm btn-primary" onclick="openResolveMaintModal('${m.id}')">Resolve Work</button>
        </div>
      `;
    } else {
      actions = `<span class="font-semibold text-green-400" style="color: var(--status-available)">Resolved</span>`;
    }

    return `
      <tr>
        <td class="font-semibold">${assetStr}</td>
        <td>${reportedByStr}</td>
        <td>${m.issueDescription}</td>
        <td><span class="status-badge ${m.priority === 'Critical' || m.priority === 'High' ? 'status-lost' : 'status-maintenance'}">${m.priority}</span></td>
        <td><span class="status-badge status-${m.status.toLowerCase().replace(" ", "")}">${m.status}</span></td>
        <td>${actions}</td>
      </tr>
    `;
  })).then(htmls => htmls.join(""));
}

async function handleRaiseMaintenance(e) {
  e.preventDefault();
  const assetId = document.getElementById("maint-asset-select").value;
  const priority = document.getElementById("maint-priority").value;
  const description = document.getElementById("maint-desc").value.trim();

  // Validation
  if (!assetId || !description) {
    alert("Please select asset and describe physical fault.");
    return;
  }

  const newMaint = {
    id: `maint-${Date.now()}`,
    assetId,
    reportedBy: currentUser.id,
    issueDescription: description,
    priority,
    photo: null,
    status: "Pending",
    raisedDate: new Date().toISOString().split("T")[0],
    approvedBy: null,
    technicianName: "",
    resolutionDetails: "",
    resolvedDate: null
  };

  await DB.add("maintenance", newMaint);
  await DB.logAction(currentUser.name, "Raise Maintenance Request", `Raised maintenance for ${await getAssetTag(assetId)}`);
  
  // Notify Manager
  const employees = await DB.get("employees");
  const managers = employees.filter(e => e.role === "Asset Manager");
  for (const m of managers) {
    await DB.notify(m.id, `New Maintenance Request on asset ${await getAssetTag(assetId)}.`);
  }

  document.getElementById("maintenance-form").reset();
  await renderMaintenance();
}

async function approveMaintenance(maintId) {
  await DB.update("maintenance", maintId, { status: "Approved" });
  await renderMaintenance();
}

async function rejectMaintenance(maintId) {
  await DB.update("maintenance", maintId, { status: "Rejected" });
  await renderMaintenance();
}

async function assignTechnician(maintId) {
  const techName = document.getElementById(`tech-${maintId}`).value.trim();
  if (!techName) {
    alert("Please enter a technician name.");
    return;
  }

  await DB.update("maintenance", maintId, { status: "Technician Assigned", technicianName: techName });
  await renderMaintenance();
}

let activeResolveMaintId = null;
function openResolveMaintModal(maintId) {
  activeResolveMaintId = maintId;
  openModal("resolve-maint-modal");
}

async function handleConfirmResolveMaint(e) {
  e.preventDefault();
  const resolutionDetails = document.getElementById("resolve-maint-details").value.trim();

  if (!resolutionDetails) {
    alert("Please enter resolution remarks.");
    return;
  }

  await DB.update("maintenance", activeResolveMaintId, { status: "Resolved", resolutionDetails });
  
  closeModal("resolve-maint-modal");
  document.getElementById("resolve-maint-form").reset();
  await renderMaintenance();
}

// ----------------------------------------------------
// 8. ASSET AUDIT SCREEN
// ----------------------------------------------------
async function renderAudits() {
  const audits = await DB.get("audits");
  const depts = await DB.get("departments");
  const employees = await DB.get("employees");

  // Load audit scopes form
  const auditDept = document.getElementById("audit-scope-dept");
  auditDept.innerHTML = `<option value="">All Departments</option>` + 
    depts.map(d => `<option value="${d.id}">${d.name}</option>`).join("");

  const auditAuditor = document.getElementById("audit-auditors");
  auditAuditor.innerHTML = employees.map(e => `<option value="${e.id}">${e.name}</option>`).join("");

  // Audit cards grid
  const grid = document.getElementById("audits-cards-grid");
  grid.innerHTML = await Promise.all(audits.map(async cycle => {
    const verifiedCount = Object.values(cycle.findings).filter(v => v === "Verified").length;
    const missingCount = Object.values(cycle.findings).filter(v => v === "Missing").length;
    const damagedCount = Object.values(cycle.findings).filter(v => v === "Damaged").length;

    const isAssigned = cycle.assignedAuditors.includes(currentUser.id) || currentUser.role === "Admin" || currentUser.role === "Asset Manager";

    let footerAction = "";
    if (cycle.status === "Active") {
      if (isAssigned) {
        footerAction = `<button class="btn btn-sm btn-primary w-full" onclick="openAuditorSheetModal('${cycle.id}')">Perform Verification</button>`;
      } else {
        footerAction = `<span class="text-muted text-center w-full block text-xs">Auditors: ${cycle.assignedAuditors.map(a => getEmployeeName(a)).join(", ")}</span>`;
      }
    } else {
      footerAction = `<button class="btn btn-sm btn-secondary w-full" onclick="openDiscrepancyReport('${cycle.id}')">View Discrepancy Report</button>`;
    }

    return `
      <div class="audit-card">
        <div>
          <span class="status-badge ${cycle.status === 'Active' ? 'status-maintenance' : 'status-available'} float-right">${cycle.status}</span>
          <h4 class="audit-card-title">${cycle.title}</h4>
          <span class="text-xs text-muted">Range: ${cycle.startDate} to ${cycle.endDate}</span>
        </div>
        <div class="audit-stat-row">
          <div>
            <div class="audit-stat-label">Verified</div>
            <div class="audit-stat-val text-green-400" style="color: var(--status-available)">${verifiedCount}</div>
          </div>
          <div>
            <div class="audit-stat-label">Discrepancies</div>
            <div class="audit-stat-val text-red-400" style="color: var(--status-lost)">${missingCount + damagedCount}</div>
          </div>
        </div>
        <div>
          <span class="text-xs text-secondary font-medium">Scope: ${cycle.scopeLocation || 'All Locations'} | ${cycle.scopeDepartmentId ? await getDeptName(cycle.scopeDepartmentId) : 'All Depts'}</span>
        </div>
        <div class="mt-2">
          ${footerAction}
        </div>
      </div>
    `;
  })).then(htmls => htmls.join(""));
}

async function handleCreateAuditCycle(e) {
  e.preventDefault();
  const title = document.getElementById("audit-title").value.trim();
  const scopeDeptId = document.getElementById("audit-scope-dept").value;
  const scopeLocation = document.getElementById("audit-scope-location").value.trim();
  const startDate = document.getElementById("audit-start-date").value;
  const endDate = document.getElementById("audit-end-date").value;
  
  const select = document.getElementById("audit-auditors");
  const auditors = Array.from(select.selectedOptions).map(opt => opt.value);

  // Validation
  if (!title || auditors.length === 0 || startDate > endDate) {
    alert("Invalid campaign configuration parameters.");
    return;
  }

  const assets = await DB.get("assets");
  const scopedAssets = assets.filter(a => {
    const matchesDept = scopeDeptId ? (a.allocatedTo && a.allocatedTo.id === scopeDeptId) : true;
    const matchesLoc = scopeLocation ? a.location.toLowerCase().includes(scopeLocation.toLowerCase()) : true;
    return matchesDept && matchesLoc && a.status !== "Retired" && a.status !== "Disposed";
  });

  const findings = {};
  scopedAssets.forEach(a => {
    findings[a.id] = "Pending";
  });

  const newAudit = {
    id: `audit-${Date.now()}`,
    title,
    scopeDepartmentId: scopeDeptId,
    scopeLocation,
    startDate,
    endDate,
    assignedAuditors: auditors,
    status: "Active",
    findings,
    discrepancies: [],
    closedBy: "",
    closedDate: ""
  };

  await DB.add("audits", newAudit);
  await DB.logAction(currentUser.name, "Create Audit Cycle", `Created audit cycle: ${title}`);
  
  for (const audId of auditors) {
    await DB.notify(audId, `Audit Assigned: You are assigned to campaign "${title}".`);
  }

  document.getElementById("audit-form").reset();
  await renderAudits();
}

let activeAuditCycleId = null;
async function openAuditorSheetModal(auditId) {
  activeAuditCycleId = auditId;
  const audits = await DB.get("audits");
  const cycle = audits.find(x => x.id === auditId);
  if (!cycle) return;

  document.getElementById("auditor-sheet-title").textContent = cycle.title;
  
  const tbody = document.getElementById("auditor-sheet-table-body");
  const assets = await DB.get("assets");

  tbody.innerHTML = Object.keys(cycle.findings).map(assetId => {
    const asset = assets.find(x => x.id === assetId);
    const assetStr = asset ? `${asset.name} (${asset.tag})` : "Unknown Asset";
    const currentStatus = cycle.findings[assetId];

    return `
      <tr>
        <td class="font-semibold">${assetStr}</td>
        <td>
          <select onchange="updateAuditFinding('${assetId}', this.value)" style="padding: 4px 8px; font-size: 0.85rem;">
            <option value="Pending" ${currentStatus === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Verified" ${currentStatus === "Verified" ? "selected" : ""}>Verified</option>
            <option value="Missing" ${currentStatus === "Missing" ? "selected" : ""}>Missing</option>
            <option value="Damaged" ${currentStatus === "Damaged" ? "selected" : ""}>Damaged</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");

  openModal("auditor-sheet-modal");
}

async function updateAuditFinding(assetId, findingValue) {
  const audits = await DB.get("audits");
  const cycle = audits.find(x => x.id === activeAuditCycleId);
  if (cycle) {
    cycle.findings[assetId] = findingValue;
    await DB.update("audits", activeAuditCycleId, { findings: cycle.findings });
  }
}

async function handleCloseAuditCycle() {
  const audits = await DB.get("audits");
  const cycle = audits.find(x => x.id === activeAuditCycleId);
  if (!cycle) return;

  const pendingCount = Object.values(cycle.findings).filter(v => v === "Pending").length;
  if (pendingCount > 0) {
    alert(`Cannot close audit cycle. There are still ${pendingCount} assets pending verification.`);
    return;
  }

  // Lock campaign and generate discrepancy list
  if (useBackend) {
    try {
      const res = await fetch(`${BASE_API_URL}/audits/${activeAuditCycleId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closedBy: currentUser.id, userName: currentUser.name })
      });
      if (res.ok) {
        closeModal("auditor-sheet-modal");
        await renderAudits();
        return;
      }
    } catch (err) {
      console.warn("Backend closure failed. Reverting to sandbox.");
      handleConnectionChange(false);
    }
  }

  // Local Storage Fallback audit close logic
  const discrepancies = [];
  const assets = await DB.get("assets");

  for (const assetId in cycle.findings) {
    const finding = cycle.findings[assetId];
    if (finding === "Missing" || finding === "Damaged") {
      const asset = assets.find(x => x.id === assetId);
      discrepancies.push({ assetId, finding, resolved: false });

      if (finding === "Missing") {
        const history = asset.history || [];
        history.push({
          date: new Date().toISOString().split("T")[0],
          action: "Audit Flagged",
          user: currentUser.name,
          notes: `Asset marked as Missing. Status updated to Lost.`
        });
        await DB.update("assets", assetId, { status: "Lost", history });
        
        const emps = await DB.get("employees");
        const managers = emps.filter(e => e.role === "Asset Manager");
        for (const m of managers) {
          await DB.notify(m.id, `Audit Alert: Asset tag ${asset.tag} missing.`);
        }
      }
    }
  }

  await DB.update("audits", activeAuditCycleId, {
    status: "Closed",
    discrepancies,
    closedBy: currentUser.id,
    closedDate: new Date().toISOString().split("T")[0]
  });

  await DB.logAction(currentUser.name, "Close Audit Cycle", `Closed campaign "${cycle.title}"`);
  
  closeModal("auditor-sheet-modal");
  await renderAudits();
}

async function openDiscrepancyReport(auditId) {
  const audits = await DB.get("audits");
  const cycle = audits.find(x => x.id === auditId);
  if (!cycle) return;

  document.getElementById("discrepancy-title").textContent = `Discrepancy Report: ${cycle.title}`;
  
  const reportBody = document.getElementById("discrepancy-report-body");
  if (!cycle.discrepancies || cycle.discrepancies.length === 0) {
    reportBody.innerHTML = `<div class="text-green-400 font-semibold" style="color: var(--status-available)">Clean Audit! No discrepancies found.</div>`;
  } else {
    const assets = await DB.get("assets");
    reportBody.innerHTML = `
      <div class="discrepancy-header">Flagged Anomalies (${cycle.discrepancies.length})</div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>Asset Tag</th>
            <th>Asset Name</th>
            <th>Anomaly Type</th>
            <th>Resolution Status</th>
          </tr>
        </thead>
        <tbody>
          ${cycle.discrepancies.map(d => {
            const asset = assets.find(x => x.id === d.assetId);
            const tag = asset ? asset.tag : "N/A";
            const assetName = asset ? asset.name : "Unknown";
            return `
              <tr>
                <td class="font-semibold">${tag}</td>
                <td>${assetName}</td>
                <td><span class="status-badge status-lost">${d.finding}</span></td>
                <td><span class="status-badge status-retired">${d.resolved ? "Resolved" : "Active Flag"}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  openModal("discrepancy-modal");
}

// ----------------------------------------------------
// 9. REPORTS & ANALYTICS
// ----------------------------------------------------
async function renderReports() {
  if (useBackend) {
    try {
      const res = await fetch(`${BASE_API_URL}/reports`);
      if (res.ok) {
        const payload = await res.json();
        renderChartsUI(payload.utilization, payload.maintenance, payload.departments);
        return;
      }
    } catch (err) {
      console.warn("Backend reports retrieval failed. Reverting to sandbox.");
      handleConnectionChange(false);
    }
  }

  // Local Storage Sandbox Report aggregates calculation
  const assets = await DB.get("assets");
  const bookings = await DB.get("bookings");
  const maintenance = await DB.get("maintenance");
  const depts = await DB.get("departments");

  // Top 5 utilized assets
  const topUtil = assets.map(a => {
    const bookingCount = bookings.filter(b => b.resourceId === a.id).length;
    const allocCount = a.history.filter(h => h.action === "Allocation" || h.action === "Transfer").length;
    return { name: a.name, tag: a.tag, score: bookingCount + allocCount };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  // Category maintenance frequency counts
  const categoryCounts = {};
  maintenance.forEach(m => {
    const asset = assets.find(x => x.id === m.assetId);
    if (asset) {
      const cat = asset.categoryId === "cat-1" ? "Electronics" : (asset.categoryId === "cat-2" ? "Vehicles" : (asset.categoryId === "cat-3" ? "Office Furniture" : "Shared Spaces"));
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });
  const maintCat = Object.entries(categoryCounts).map(([cat, count]) => ({ category: cat, count }));

  // Department Allocation summaries
  const deptWorth = await Promise.all(depts.map(async d => {
    const allocCount = assets.filter(a => a.status === "Allocated" && a.allocatedTo && a.allocatedTo.id === d.id).length;
    const worth = assets.filter(a => a.allocatedTo && a.allocatedTo.id === d.id).reduce((sum, a) => sum + a.acquisitionCost, 0);
    return { name: d.name, count: allocCount, worth };
  }));

  renderChartsUI(topUtil, maintCat, deptWorth);
}

function renderChartsUI(topUtil, maintCat, deptWorth) {
  // Utilization Bar chart
  const maxScore = Math.max(...topUtil.map(x => x.score), 1);
  const utilChart = document.getElementById("utilization-chart");
  utilChart.innerHTML = topUtil.map(item => {
    const heightPercent = (item.score / maxScore) * 100;
    return `
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height: ${heightPercent}px;">
          <span class="chart-value">${item.score}</span>
        </div>
        <span class="chart-label" title="${item.name}">${item.tag}</span>
      </div>
    `;
  }).join("");

  // Category Maintenance frequency
  const maxMaintCount = Math.max(...maintCat.map(x => x.count), 1);
  const catChart = document.getElementById("category-maint-chart");
  catChart.innerHTML = maintCat.map(item => {
    const heightPercent = (item.count / maxMaintCount) * 100;
    return `
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height: ${heightPercent}px; background: linear-gradient(to top, var(--secondary), #ec4899);">
          <span class="chart-value">${item.count}</span>
        </div>
        <span class="chart-label" title="${item.category}">${item.category}</span>
      </div>
    `;
  }).join("");

  // Heatmap rendering
  const heatmapContainer = document.getElementById("heatmap-grid-container");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayDensity = [0, 2, 4, 3, 1, 0, 0];
  heatmapContainer.innerHTML = dayDensity.map((density, idx) => `
    <div class="heatmap-cell" data-level="${density}">
      ${days[idx]}
      <span class="absolute text-xs" style="bottom: 2px; font-weight: 500;">Lv ${density}</span>
    </div>
  `).join("");

  // Table summary
  const deptSummaryTable = document.getElementById("dept-summary-table-body");
  deptSummaryTable.innerHTML = deptWorth.map(dept => `
    <tr>
      <td class="font-semibold">${dept.name}</td>
      <td>${dept.count}</td>
      <td>$${dept.worth}</td>
    </tr>
  `).join("");
}

async function handleExportReports() {
  const assets = await DB.get("assets");
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(assets, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "AssetFlow_ERP_Export.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  await DB.logAction(currentUser.name, "Export Report", "Exported organization-wide asset inventory JSON report.");
}

// ----------------------------------------------------
// 10. ACTIVITY LOGS & NOTIFICATIONS
// ----------------------------------------------------
async function renderLogs() {
  // Render Notifications
  const notifs = (await DB.get("notifications")).filter(n => n.employeeId === currentUser.id);
  const notifContainer = document.getElementById("notifications-list-container");

  if (notifs.length === 0) {
    notifContainer.innerHTML = `<div class="text-muted p-4 text-center">No notifications.</div>`;
  } else {
    notifContainer.innerHTML = notifs.map(n => `
      <div class="notif-item ${!n.isRead ? 'unread' : ''}">
        <div class="notif-item-content">
          <div>${n.message}</div>
          <div class="notif-item-date">${new Date(n.date).toLocaleString()}</div>
        </div>
        <div class="notif-actions">
          ${!n.isRead ? `<button class="btn btn-sm btn-secondary" onclick="markNotificationRead('${n.id}')">Read</button>` : ''}
        </div>
      </div>
    `).join("");
  }

  // Render Full System Audit Logs
  const logs = await DB.get("logs");
  const logsTable = document.getElementById("logs-table-body");
  
  logsTable.innerHTML = logs.map(l => `
    <tr>
      <td class="text-secondary">${new Date(l.date).toLocaleString()}</td>
      <td class="font-semibold">${l.user}</td>
      <td><span class="status-badge status-allocated">${l.action}</span></td>
      <td class="text-secondary">${l.details}</td>
    </tr>
  `).join("");
}

async function markNotificationRead(notifId) {
  await DB.update("notifications", notifId, { isRead: true });
  await updateNotificationsBadge();
  await renderLogs();
}

// Global modal helpers
function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// ----------------------------------------------------
// EVENT LISTENERS & SETUP
// ----------------------------------------------------
function setupEventListeners() {
  // Navigation Sidebar Link clicks
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const screenId = item.getAttribute("data-screen");
      navigate(screenId);
    });
  });

  // User Switcher in header
  const switcher = document.getElementById("header-role-select");
  if (switcher) {
    switcher.addEventListener("change", (e) => {
      switchUser(e.target.value);
    });
  }

  // Org Setup tab links
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeOrgTab = tab.getAttribute("data-tab");
      renderOrgSetup();
    });
  });

  // Search input typing on asset directory
  const assetSearch = document.getElementById("asset-search-input");
  if (assetSearch) {
    assetSearch.addEventListener("input", renderAssets);
  }

  // Filters change on asset directory
  document.getElementById("asset-filter-category").addEventListener("change", renderAssets);
  document.getElementById("asset-filter-status").addEventListener("change", renderAssets);

  // Modal click outsides to dismiss
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });

  // Category select change dynamically adjusts fields
  document.getElementById("reg-asset-category").addEventListener("change", handleRegisterCategoryChange);

  // Forms Submits
  document.getElementById("dept-form").addEventListener("submit", handleCreateDept);
  document.getElementById("category-form").addEventListener("submit", handleCreateCategory);
  document.getElementById("register-asset-form").addEventListener("submit", handleRegisterAsset);
  document.getElementById("allocation-form").addEventListener("submit", handleAllocateAsset);
  document.getElementById("transfer-request-form").addEventListener("submit", handleRaiseTransferRequest);
  document.getElementById("return-checkin-form").addEventListener("submit", handleConfirmReturn);
  document.getElementById("booking-form").addEventListener("submit", handleCreateBooking);
  document.getElementById("maintenance-form").addEventListener("submit", handleRaiseMaintenance);
  document.getElementById("resolve-maint-form").addEventListener("submit", handleConfirmResolveMaint);
  document.getElementById("audit-form").addEventListener("submit", handleCreateAuditCycle);
}