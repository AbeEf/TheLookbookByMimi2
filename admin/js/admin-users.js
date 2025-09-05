// ========================================
// Admin: Users
// - Single fetch -> local render
// - Create / Update (basic fields only)
// - Schema-safe (uses whatever fields API returns)
// ========================================

import { API_BASE_URL, MOCK_MODE } from "../../js/env.js";
import { httpRequest } from "../../js/http.js";
import { debounce, formatCurrency, showToast, openDialog, closeDialog } from "./admin-ui.js";



const tbody = document.getElementById("usersTbody");
const createBtn = document.getElementById("createUserBtn");

let allUsers = [];

// ---- API helpers ----
async function fetchUsers() {
  if (MOCK_MODE) {
    // lightweight mock
    allUsers = [
      { id: "u1", email: "mimi@example.com", name: "Mimi", role: "admin", status: "active" },
      { id: "u2", email: "sam@example.com", name: "Sam Doe", role: "editor", status: "active" },
      { id: "u3", email: "jane@example.com", name: "Jane Smith", role: "viewer", status: "disabled" },
    ];
    return allUsers;
  }
  const url = new URL("/admin/users", API_BASE_URL).toString();
  return httpRequest(url);
}
async function createUser(user) {
  if (MOCK_MODE) {
    user.id = "u" + (Math.random() * 1e6 | 0);
    allUsers.unshift(user);
    return user;
  }
  const url = new URL("/admin/users", API_BASE_URL).toString();
  return httpRequest(url, { method: "POST", body: JSON.stringify(user) });
}
async function updateUser(id, patch) {
  if (MOCK_MODE) {
    const idx = allUsers.findIndex(u => String(u.id) === String(id));
    if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...patch };
    return allUsers[idx];
  }
  const url = new URL(`/admin/users/${encodeURIComponent(id)}`, API_BASE_URL).toString();
  return httpRequest(url, { method: "PATCH", body: JSON.stringify(patch) });
}

// ---- Rendering ----
function userRow(u) {
  const email = u.email ?? "—";
  const name = u.name ?? "—";
  const role = u.role ?? "—";
  const status = u.status ?? "—";
  return `
    <tr data-id="${u.id}">
      <td>${email}</td>
      <td>${name}</td>
      <td>${role}</td>
      <td>${status}</td>
      <td class="col-actions">
        <button class="button--ghost btn-edit">Edit</button>
      </td>
    </tr>
  `;
}

function paintUsers(list) {
  tbody.innerHTML = list.map(userRow).join("");
}

// ---- Dialog (inline, minimal) ----
let userDialog;
function ensureDialog() {
  if (userDialog) return userDialog;
  userDialog = document.createElement("dialog");
  userDialog.innerHTML = `
    <form method="dialog" id="userForm" class="stack-sm">
      <h3 id="userDialogTitle">User</h3>
      <label>
        <span class="sr-only">Email</span>
        <input type="email" name="email" placeholder="Email" required />
      </label>
      <label>
        <span class="sr-only">Name</span>
        <input type="text" name="name" placeholder="Name" />
      </label>
      <label>
        <span class="sr-only">Role</span>
        <input type="text" name="role" placeholder="Role (e.g., admin, editor)" />
      </label>
      <label>
        <span class="sr-only">Status</span>
        <select name="status">
          <option value="active">active</option>
          <option value="disabled">disabled</option>
        </select>
      </label>
      <menu class="dialog-actions">
        <button value="cancel" class="button--ghost">Cancel</button>
        <button id="saveUserBtn" value="default" class="button">Save</button>
      </menu>
    </form>
  `;
  document.body.appendChild(userDialog);
  return userDialog;
}

function getFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  // normalize
  if (!data.email) delete data.email;
  if (!data.name) delete data.name;
  if (!data.role) delete data.role;
  if (!data.status) delete data.status;
  return data;
}

function openCreateDialog() {
  const dlg = ensureDialog();
  const form = dlg.querySelector("#userForm");
  form.reset();
  form.dataset.mode = "create";
  form.dataset.id = "";
  dlg.querySelector("#userDialogTitle").textContent = "Create User";
  openDialog(dlg);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const payload = getFormData(form);
    try {
      const created = await createUser(payload);
      showToast("User created", "success");
      allUsers.unshift(created);
      paintUsers(allUsers);
    } catch {
      showToast("Error creating user", "error");
    } finally {
      closeDialog(dlg);
    }
  };
}

function openEditDialog(id) {
  const user = allUsers.find(u => String(u.id) === String(id));
  if (!user) return;

  const dlg = ensureDialog();
  const form = dlg.querySelector("#userForm");
  form.reset();
  form.dataset.mode = "edit";
  form.dataset.id = id;
  dlg.querySelector("#userDialogTitle").textContent = "Edit User";
  form.email.value = user.email ?? "";
  form.name.value = user.name ?? "";
  form.role.value = user.role ?? "";
  form.status.value = user.status ?? "active";
  openDialog(dlg);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const payload = getFormData(form);
    try {
      const updated = await updateUser(id, payload);
      showToast("User updated", "success");
      const idx = allUsers.findIndex(u => String(u.id) === String(id));
      if (idx >= 0) allUsers[idx] = updated;
      paintUsers(allUsers);
    } catch {
      showToast("Error updating user", "error");
    } finally {
      closeDialog(dlg);
    }
  };
}

// ---- Events ----
createBtn?.addEventListener("click", openCreateDialog);
tbody?.addEventListener("click", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.dataset.id;
  if (e.target.classList.contains("btn-edit")) {
    openEditDialog(id);
  }
});

// ---- Init ----
(async function initUsers() {
  if (!tbody) return; // not on this page
  try {
    const users = await fetchUsers();
    allUsers = Array.isArray(users) ? users : [];
    paintUsers(allUsers);
  } catch {
    tbody.innerHTML = `<tr><td colspan="5">Couldn’t load users.</td></tr>`;
  }
})();
