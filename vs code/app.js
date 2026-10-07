const app = document.querySelector("#app");
const REPORTS_KEY = "havendesk-reports";
const SESSION_KEY = "havendesk-session";

const accounts = {
  student: { email: "student@hostel.edu", password: "student123", name: "Aarav Mehta" },
  admin: { email: "admin@hostel.edu", password: "admin123", name: "Hostel Admin" }
};

const startingReports = [
  {
    id: "sample-1",
    title: "Water leaking under the bathroom sink",
    category: "Plumbing",
    location: "Block A · Room 204",
    description: "There is a steady leak from the pipe below the sink. The floor gets wet after a few minutes.",
    priority: "High",
    status: "In progress",
    student: "Aarav Mehta",
    createdAt: Date.now() - 1000 * 60 * 60 * 26
  },
  {
    id: "sample-2",
    title: "Corridor light is not working",
    category: "Electrical",
    location: "Block B · Second floor",
    description: "The light beside the stairwell has been out since yesterday evening.",
    priority: "Normal",
    status: "Open",
    student: "Aarav Mehta",
    createdAt: Date.now() - 1000 * 60 * 60 * 5
  },
  {
    id: "sample-3",
    title: "Study room door handle is loose",
    category: "Carpentry",
    location: "Common area · Study room",
    description: "The handle moves when opening the door and may come off soon.",
    priority: "Normal",
    status: "Resolved",
    student: "Aarav Mehta",
    createdAt: Date.now() - 1000 * 60 * 60 * 72
  }
];

let selectedRole = "student";
let activeFilter = "All reports";
let toastTimer;

function getReports() {
  const saved = localStorage.getItem(REPORTS_KEY);
  if (!saved) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(startingReports));
    return [...startingReports];
  }
  try {
    const reports = JSON.parse(saved);
    if (!Array.isArray(reports)) throw new Error("Saved reports must be a list.");
    return reports;
  } catch (error) {
    console.error("Could not read saved maintenance reports.", error);
    return [...startingReports];
  }
}

function saveReports(reports) {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error("Could not save maintenance reports.", error);
    showToast("Unable to save changes. Check your browser storage.");
  }
}

function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session && accounts[session.role] ? session : null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp));
}

function showLogin() {
  app.innerHTML = `
    <div class="login-page">
      <section class="login-visual" aria-label="About HavenDesk">
        <div class="brand"><span class="brand-mark">⌂</span> HavenDesk</div>
        <div class="visual-copy">
          <span class="eyebrow">A better place to live</span>
          <h1>Small fixes.<br>Better hostel days.</h1>
          <p>Let your hostel team know what's not working. Track every request, from report to resolution.</p>
        </div>
        <div class="visual-note">Made for a more comfortable campus life.</div>
      </section>
      <section class="login-main">
        <div class="login-card">
          <h2>Welcome back</h2>
          <p class="intro">Sign in to report an issue or manage hostel requests.</p>
          <div class="role-switch" role="tablist" aria-label="Choose account type">
            <button type="button" class="role-option ${selectedRole === "student" ? "active" : ""}" data-role="student" role="tab" aria-selected="${selectedRole === "student"}">I'm a student</button>
            <button type="button" class="role-option ${selectedRole === "admin" ? "active" : ""}" data-role="admin" role="tab" aria-selected="${selectedRole === "admin"}">I'm an admin</button>
          </div>
          <form id="login-form">
            <div class="field">
              <label for="email">Email address</label>
              <input id="email" name="email" type="email" autocomplete="username" placeholder="you@hostel.edu" required>
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required>
            </div>
            <button class="primary-button" type="submit">Sign in as ${selectedRole}</button>
            <p id="login-error" class="login-error" role="alert"></p>
          </form>
          <div class="demo-box">
            <strong>Demo sign-in</strong><br>
            <span class="demo-credential" data-demo-role="student">Student: student@hostel.edu · student123</span><br>
            <span class="demo-credential" data-demo-role="admin">Admin: admin@hostel.edu · admin123</span>
          </div>
        </div>
      </section>
    </div>`;

  app.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRole = button.dataset.role;
      showLogin();
    });
  });
  app.querySelectorAll("[data-demo-role]").forEach((line) => {
    line.addEventListener("click", () => {
      selectedRole = line.dataset.demoRole;
      showLogin();
      const account = accounts[selectedRole];
      app.querySelector("#email").value = account.email;
      app.querySelector("#password").value = account.password;
      app.querySelector("#password").focus();
    });
  });
  app.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const account = accounts[selectedRole];
    if (form.get("email").trim().toLowerCase() !== account.email || form.get("password") !== account.password) {
      app.querySelector("#login-error").textContent = "Those sign-in details don't match this demo account.";
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ role: selectedRole, name: account.name }));
    showDashboard();
  });
}

function showDashboard() {
  const session = getSession();
  if (!session) return showLogin();
  const reports = getReports();
  const isAdmin = session.role === "admin";
  const visibleReports = reports.filter((report) => {
    if (!isAdmin && report.student !== session.name) return false;
    return activeFilter === "All reports" || report.status === activeFilter;
  }).sort((a, b) => b.createdAt - a.createdAt);
  const ownedReports = isAdmin ? reports : reports.filter((report) => report.student === session.name);
  const openCount = ownedReports.filter((report) => report.status === "Open").length;
  const progressCount = ownedReports.filter((report) => report.status === "In progress").length;
  const resolvedCount = ownedReports.filter((report) => report.status === "Resolved").length;
  const greeting = isAdmin ? "Maintenance overview" : `Hi, ${escapeHtml(session.name.split(" ")[0])}`;
  const subtitle = isAdmin
    ? "Review and update maintenance requests from your hostel."
    : "Your hostel, a little more comfortable. What needs fixing?";

  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">⌂</span> HavenDesk</div>
        <div class="topbar-right">
          <div class="user-chip"><span class="avatar">${escapeHtml(session.name.split(" ").map((part) => part[0]).join("").slice(0, 2))}</span><span>${escapeHtml(session.name)} · ${isAdmin ? "Admin" : "Student"}</span></div>
          <button class="logout-button" id="logout-button" type="button">Sign out</button>
        </div>
      </header>
      <section class="page-content">
        <div class="welcome-row">
          <div><h1>${greeting}</h1><p>${subtitle}</p></div>
          ${isAdmin ? "" : '<button class="new-report-button" id="new-report" type="button"><span aria-hidden="true">＋</span> New report</button>'}
        </div>
        <div class="stats-grid" aria-label="Request summary">
          <div class="stat-card"><div class="stat-label">Open</div><div class="stat-value">${openCount}</div></div>
          <div class="stat-card"><div class="stat-label">In progress</div><div class="stat-value">${progressCount}</div></div>
          <div class="stat-card"><div class="stat-label">Resolved</div><div class="stat-value green">${resolvedCount}</div></div>
        </div>
        <section class="panel" aria-labelledby="reports-heading">
          <div class="panel-heading">
            <div><h2 id="reports-heading">${isAdmin ? "All maintenance requests" : "Your reports"}</h2><p>${ownedReports.length} ${ownedReports.length === 1 ? "request" : "requests"} in total</p></div>
            <label class="sr-only" for="report-filter">Filter reports by status</label>
            <select class="filter-select" id="report-filter">
              ${["All reports", "Open", "In progress", "Resolved"].map((status) => `<option ${activeFilter === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </div>
          <div class="report-list">
            ${visibleReports.length ? visibleReports.map((report) => renderReport(report, isAdmin)).join("") : `
              <div class="empty-state"><div class="empty-icon">✓</div><h3>Nothing to see here</h3><p>${ownedReports.length ? "No reports match this filter." : "When you submit a maintenance request, it will appear here."}</p></div>
            `}
          </div>
        </section>
      </section>
    </div>`;

  app.querySelector("#logout-button").addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    activeFilter = "All reports";
    showLogin();
  });
  app.querySelector("#report-filter").addEventListener("change", (event) => {
    activeFilter = event.target.value;
    showDashboard();
  });
  app.querySelector("#new-report")?.addEventListener("click", showReportModal);
  app.querySelectorAll("[data-status-id]").forEach((select) => {
    select.addEventListener("change", (event) => updateStatus(event.currentTarget.dataset.statusId, event.currentTarget.value));
  });
}

function renderReport(report, isAdmin) {
  const statusClass = report.status === "Resolved" ? "status-resolved" : report.status === "In progress" ? "status-progress" : "status-open";
  const priorityClass = report.priority === "High" ? "priority-high" : "priority-normal";
  return `
    <article class="report-card">
      <div>
        <div class="report-topline"><h3>${escapeHtml(report.title)}</h3><span class="badge ${statusClass}">${escapeHtml(report.status)}</span></div>
        <p>${escapeHtml(report.description)}</p>
        <div class="report-meta"><span>${escapeHtml(report.category)}</span><span>${escapeHtml(report.location)}</span><span>Reported by ${escapeHtml(report.student)}</span><span>${formatDate(report.createdAt)}</span><span class="badge ${priorityClass}">${escapeHtml(report.priority)} priority</span></div>
      </div>
      ${isAdmin ? `<div class="report-actions"><label class="sr-only" for="status-${escapeHtml(report.id)}">Update status for ${escapeHtml(report.title)}</label><select id="status-${escapeHtml(report.id)}" data-status-id="${escapeHtml(report.id)}" aria-label="Update request status">${["Open", "In progress", "Resolved"].map((status) => `<option ${report.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></div>` : ""}
    </article>`;
}

function showReportModal() {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-heading"><div><h2 id="modal-title">Report a maintenance issue</h2><p>Tell us what's wrong and where to find it.</p></div><button type="button" class="close-button" aria-label="Close">×</button></div>
      <form id="report-form">
        <div class="field"><label for="report-title">What's the issue?</label><input id="report-title" name="title" maxlength="90" placeholder="e.g. Shower is not heating up" required></div>
        <div class="form-row">
          <div class="field"><label for="category">Category</label><select id="category" name="category" required><option value="">Choose one</option><option>Plumbing</option><option>Electrical</option><option>Cleaning</option><option>Carpentry</option><option>Internet</option><option>Other</option></select></div>
          <div class="field"><label for="priority">Priority</label><select id="priority" name="priority"><option>Normal</option><option>High</option></select></div>
        </div>
        <div class="field"><label for="location">Location</label><input id="location" name="location" maxlength="90" placeholder="Block and room number" required></div>
        <div class="field"><label for="description">A few more details</label><textarea id="description" name="description" maxlength="600" placeholder="Describe what happened and when you noticed it." required></textarea></div>
        <div class="form-actions"><button type="button" class="secondary-button" data-cancel>Cancel</button><button type="submit" class="primary-button">Submit report</button></div>
      </form>
    </section>`;
  app.append(overlay);
  const close = () => overlay.remove();
  overlay.querySelector(".close-button").addEventListener("click", close);
  overlay.querySelector("[data-cancel]").addEventListener("click", close);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  overlay.querySelector("#report-title").focus();
  overlay.querySelector("#report-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const session = getSession();
    if (!session || session.role !== "student") return;
    const form = new FormData(event.currentTarget);
    const report = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: form.get("title").trim(),
      category: form.get("category"),
      location: form.get("location").trim(),
      description: form.get("description").trim(),
      priority: form.get("priority"),
      status: "Open",
      student: session.name,
      createdAt: Date.now()
    };
    const reports = getReports();
    reports.push(report);
    saveReports(reports);
    close();
    activeFilter = "All reports";
    showDashboard();
    showToast("Your maintenance report has been submitted.");
  });
}

function updateStatus(id, status) {
  const reports = getReports();
  const report = reports.find((item) => item.id === id);
  if (!report) {
    showToast("Could not find that maintenance request.");
    return;
  }
  report.status = status;
  saveReports(reports);
  showDashboard();
  showToast("Request status updated.");
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.append(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 3000);
}

if (getSession()) showDashboard();
else showLogin();
