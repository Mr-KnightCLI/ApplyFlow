const STATUS = ["WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"];
const LABELS = { WISHLIST: "Wishlist", APPLIED: "Applied", INTERVIEW: "Interview", OFFER: "Offer", REJECTED: "Rejected" };
const STATUS_STYLE = {
  WISHLIST: ["#edf0f4", "#596675"], APPLIED: ["#e8f1ff", "#3868a3"],
  INTERVIEW: ["#fbf1dd", "#8b651d"], OFFER: ["#e7f4eb", "#34754c"], REJECTED: ["#f8e9e9", "#9e5558"]
};
const AVATAR_PALETTE = [["#e3eef8", "#426889"], ["#f4ebdf", "#8a6a3d"], ["#e8eee6", "#52704e"], ["#efe8f4", "#765b8c"], ["#e9edf1", "#5b6876"], ["#f4e9e6", "#8e635b"]];
const state = { applications: [], allApplications: [], view: "list", toastTimer: null, searchTimer: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = new Date();
today.setHours(0, 0, 0, 0);
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function dateFrom(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function formatDate(value, options = { day: "numeric", month: "short" }) {
  const date = dateFrom(value);
  return date ? new Intl.DateTimeFormat("en-IN", options).format(date) : "Not set";
}
function relativeFollowup(value) {
  const date = dateFrom(value);
  if (!date) return "No date set";
  const days = Math.round((date - today) / 86400000);
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function initials(company) {
  return (company || "?").trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}
function avatarStyle(company) {
  const index = [...company].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_PALETTE.length;
  return `--avatar-bg:${AVATAR_PALETTE[index][0]};--avatar-ink:${AVATAR_PALETTE[index][1]}`;
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "That didn’t work. Please try again.");
    error.fields = body.fields || {};
    error.status = response.status;
    throw error;
  }
  return body;
}

async function refresh() {
  const query = new URLSearchParams();
  const text = $("#search-input").value.trim();
  const status = $("#status-filter").value;
  if (text) query.set("q", text);
  if (status) query.set("status", status);
  try {
    const [applications, allApplications, summary] = await Promise.all([
      api(`/applications${query.size ? `?${query}` : ""}`), api("/applications"), api("/dashboard")
    ]);
    state.applications = applications;
    state.allApplications = allApplications;
    renderSummary(summary);
    renderApplications();
  } catch (error) {
    $("#application-list").innerHTML = `<div class="loading-row">${escapeHtml(error.message)} <button class="row-action" id="retry-load" aria-label="Try again">↻</button></div>`;
    $("#retry-load")?.addEventListener("click", refresh);
  }
}

function renderSummary(summary) {
  $("#total-count").textContent = summary.totalApplications;
  $("#interview-count").textContent = summary.interviews;
  $("#offer-count").textContent = summary.offers;
  $("#followup-count").textContent = summary.followUpsDue;
  $("#followup-note").textContent = summary.followUpsDue === 1 ? "one nudge is due" : "nudges to send today";
  renderNextMove(summary);
  const list = $("#upcoming-list");
  if (!summary.upcomingFollowUps.length) {
    list.innerHTML = '<p class="followup-empty">No follow-ups on the calendar this week. Make room for a little breathing space.</p>';
    return;
  }
  list.innerHTML = summary.upcomingFollowUps.slice(0, 3).map((item) => {
    const isToday = item.followUpDate === localDate(today);
    return `<button class="followup-item" data-open-id="${item.id}" aria-label="Open ${escapeHtml(item.company)} follow-up, ${relativeFollowup(item.followUpDate)}"><span class="followup-company">${escapeHtml(item.company)}</span><span class="followup-date ${isToday ? "is-today" : ""}">${isToday ? "Due today" : formatDate(item.followUpDate, { weekday: "short", day: "numeric", month: "short" })}</span></button>`;
  }).join("");
  $$("[data-open-id]", list).forEach((button) => button.addEventListener("click", () => openEditor(Number(button.dataset.openId))));
}

function renderNextMove(summary) {
  const target = $("#next-move-action");
  const overdue = state.allApplications
    .filter((item) => item.followUpDate && item.followUpDate < localDate(today) && !["OFFER", "REJECTED"].includes(item.status))
    .sort((left, right) => left.followUpDate.localeCompare(right.followUpDate))[0];
  const next = overdue || summary.upcomingFollowUps.find((item) => !["OFFER", "REJECTED"].includes(item.status));
  const description = $("#next-move-description");
  if (!next) {
    const candidate = state.allApplications.find((item) => !["OFFER", "REJECTED"].includes(item.status));
    if (!candidate) {
      description.textContent = "Give your next opportunity a place to land.";
      target.innerHTML = '<button class="move-cta" id="move-create">Add your first application <span aria-hidden="true">↗</span></button>';
      $("#move-create").addEventListener("click", () => openEditor());
      return;
    }
    description.textContent = "Nothing is due this week. Set a gentle reminder for a role still in motion.";
    target.innerHTML = `<button class="move-card move-card-open" data-move-id="${candidate.id}"><span class="move-card-top"><span class="move-company">${escapeHtml(candidate.company)}</span><span class="move-tag">SET A REMINDER</span></span><span class="move-role">${escapeHtml(candidate.roleTitle)}</span><span class="move-path" aria-label="Current stage: ${LABELS[candidate.status]}">${stagePath(candidate.status)}</span></button>`;
  } else {
    const dueToday = next.followUpDate === localDate(today);
    const isOverdue = next.followUpDate < localDate(today);
    description.textContent = isOverdue
      ? `A gentle check-in with ${next.company} is past its planned date. Pick it back up when you're ready.`
      : dueToday
      ? "You picked today for this. A short, thoughtful check-in is enough."
      : `${LABELS[next.status]} is in motion. Here’s the next date you chose.`;
    target.innerHTML = `<button class="move-card move-card-open" data-move-id="${next.id}"><span class="move-card-top"><span class="move-company">${escapeHtml(next.company)}</span><span class="move-tag ${dueToday || isOverdue ? "move-tag-today" : ""}">${escapeHtml(relativeFollowup(next.followUpDate).toUpperCase())}</span></span><span class="move-role">${escapeHtml(next.roleTitle)}</span><span class="move-path" aria-label="Current stage: ${LABELS[next.status]}">${stagePath(next.status)}</span></button>`;
  }
  $("[data-move-id]", target)?.addEventListener("click", () => openEditor(Number($("[data-move-id]", target).dataset.moveId)));
}

function stagePath(status) {
  const order = ["WISHLIST", "APPLIED", "INTERVIEW", "OFFER"];
  const current = status === "REJECTED" ? 1 : Math.max(0, order.indexOf(status));
  return `<span class="path-label">${LABELS[status]}</span><span class="path-rail">${order.map((stage, index) => `<i class="${index <= current ? "is-past" : ""} ${index === current ? "is-current" : ""}"></i>`).join("")}</span><span class="path-label path-end">${status === "REJECTED" ? "CLOSED" : "OFFER"}</span>`;
}

function rowMarkup(item) {
  const [bg, ink] = STATUS_STYLE[item.status] || STATUS_STYLE.APPLIED;
  const followDate = dateFrom(item.followUpDate);
  const overdue = followDate && followDate < today;
  const choices = STATUS.map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${LABELS[status]}</option>`).join("");
  const company = item.jobLink
    ? `<a class="company-name company-link" href="${escapeHtml(item.jobLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.company)} <span aria-hidden="true">↗</span></a>`
    : `<span class="company-name">${escapeHtml(item.company)}</span>`;
  const note = item.notes ? `<span class="note-line">${escapeHtml(item.notes)}</span>` : "";
  return `<article class="application-row" data-id="${item.id}">
    <div class="company-cell"><span class="company-avatar" style="${avatarStyle(item.company)}">${escapeHtml(initials(item.company))}</span><span class="company-info">${company}<span class="role-name">${escapeHtml(item.roleTitle)}</span>${note}</span></div>
    <span class="date-cell">${formatDate(item.applicationDate, { day: "numeric", month: "short", year: "numeric" })}</span>
    <span class="date-cell followup-cell ${overdue ? "date-overdue" : ""}">${item.followUpDate ? formatDate(item.followUpDate, { day: "numeric", month: "short" }) : "—"}<span class="date-subtle">${item.followUpDate ? relativeFollowup(item.followUpDate) : "No reminder"}</span></span>
    <select class="status-select" data-status-id="${item.id}" style="--status-bg:${bg};--status-ink:${ink}" aria-label="${escapeHtml(item.company)} status">${choices}</select>
    <div class="row-actions"><button class="row-action edit-action" data-edit-id="${item.id}" aria-label="Edit ${escapeHtml(item.company)}" title="Edit">${editIcon()}</button><button class="row-action delete delete-action" data-delete-id="${item.id}" aria-label="Delete ${escapeHtml(item.company)}" title="Delete">${trashIcon()}</button></div>
  </article>`;
}

function renderApplications() {
  const list = $("#application-list");
  const items = state.applications;
  $("#results-count").textContent = `${items.length} ${items.length === 1 ? "application" : "applications"}`;
  $("#application-caption").textContent = items.length ? "Every possibility, in one place." : "The best next move starts somewhere.";
  $("#list-view").classList.toggle("hidden", state.view !== "list" || items.length === 0);
  $("#board-view").classList.toggle("hidden", state.view !== "board" || items.length === 0);
  $("#empty-state").classList.toggle("hidden", items.length > 0);
  list.innerHTML = items.length ? items.map(rowMarkup).join("") : "";
  renderBoard(items);
  $$("[data-status-id]").forEach((select) => select.addEventListener("change", () => updateStatus(Number(select.dataset.statusId), select.value)));
  $$("[data-edit-id]").forEach((button) => button.addEventListener("click", () => openEditor(Number(button.dataset.editId))));
  $$("[data-delete-id]").forEach((button) => button.addEventListener("click", () => deleteApplication(Number(button.dataset.deleteId))));
}

function renderBoard(items) {
  const board = $("#board-view");
  board.innerHTML = STATUS.map((status) => {
    const matching = items.filter((item) => item.status === status);
    return `<section class="board-column" data-drop-status="${status}"><div class="board-column-heading"><h3>${LABELS[status]}</h3><span class="column-count">${matching.length}</span></div><div class="board-cards">${matching.map((item) => `<article class="board-card" draggable="true" data-card-id="${item.id}">${item.jobLink ? `<a class="board-company board-company-link" href="${escapeHtml(item.jobLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.company)} ↗</a>` : `<div class="board-company">${escapeHtml(item.company)}</div>`}<div class="board-role">${escapeHtml(item.roleTitle)}</div>${item.notes ? `<div class="board-note">${escapeHtml(item.notes)}</div>` : ""}<div class="board-card-foot"><span>${item.followUpDate ? `Next · ${formatDate(item.followUpDate)}` : `Applied · ${formatDate(item.applicationDate)}`}</span><select class="board-stage" data-board-status-id="${item.id}" aria-label="Move ${escapeHtml(item.company)} to another stage">${STATUS.map((s) => `<option value="${s}" ${item.status === s ? "selected" : ""}>${LABELS[s]}</option>`).join("")}</select><button class="board-edit" data-edit-id="${item.id}">Edit</button></div></article>`).join("")}</div></section>`;
  }).join("");
  $$(".board-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => { state.draggedId = Number(card.dataset.cardId); event.dataTransfer.effectAllowed = "move"; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });
  $$(".board-column").forEach((column) => {
    column.addEventListener("dragover", (event) => { event.preventDefault(); column.querySelector(".board-cards").classList.add("drag-over"); });
    column.addEventListener("dragleave", (event) => { if (!column.contains(event.relatedTarget)) column.querySelector(".board-cards").classList.remove("drag-over"); });
    column.addEventListener("drop", async (event) => {
      event.preventDefault(); column.querySelector(".board-cards").classList.remove("drag-over");
      if (state.draggedId) await updateStatus(state.draggedId, column.dataset.dropStatus);
      state.draggedId = null;
    });
  });
  $$(".board-view [data-edit-id]").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); openEditor(Number(button.dataset.editId)); }));
  $$("[data-board-status-id]").forEach((select) => select.addEventListener("change", () => updateStatus(Number(select.dataset.boardStatusId), select.value)));
}

function editIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg>'; }
function trashIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"></path></svg>'; }

function setView(view) {
  state.view = view;
  $$(".view-option").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderApplications();
}

async function updateStatus(id, status) {
  try {
    await api(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    showToast(`Moved to ${LABELS[status].toLowerCase()}`);
    await refresh();
  } catch (error) { showToast(error.message); await refresh(); }
}

async function deleteApplication(id) {
  const item = state.applications.find((application) => application.id === id);
  if (!item || !window.confirm(`Remove ${item.company} — ${item.roleTitle}?`)) return;
  try { await api(`/applications/${id}`, { method: "DELETE" }); showToast("Application removed"); await refresh(); }
  catch (error) { showToast(error.message); }
}

const dialog = $("#application-dialog");
const form = $("#application-form");
function openEditor(id = null) {
  form.reset(); clearErrors();
  $("#form-message").textContent = "";
  $("#application-id").value = id || "";
  $("[name=applicationDate]").max = localDate(today);
  $("[name=followUpDate]").min = "";
  if (id) {
    const item = [...state.applications, ...state.allApplications].find((application) => application.id === id);
    if (!item) return;
    $("#dialog-title").textContent = "A little more detail";
    $("#save-application").textContent = "Save changes";
    for (const [key, value] of Object.entries(item)) if (form.elements[key]) form.elements[key].value = value ?? "";
    $("[name=followUpDate]").min = item.applicationDate;
  } else {
    $("#dialog-title").textContent = "Add an application";
    $("#save-application").textContent = "Save application";
    $("[name=applicationDate]").value = localDate(today);
    $("[name=status]").value = "APPLIED";
  }
  dialog.showModal();
  setTimeout(() => $("[name=company]").focus(), 50);
}
function clearErrors() {
  $$(".form-field").forEach((field) => { field.classList.remove("has-error"); $(".field-error", field).textContent = ""; });
}
function showFieldErrors(fields) {
  clearErrors();
  for (const [name, message] of Object.entries(fields)) {
    const input = form.elements[name];
    if (!input) continue;
    const field = input.closest(".form-field");
    field.classList.add("has-error");
    $(".field-error", field).textContent = message;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); clearErrors(); $("#form-message").textContent = "";
  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());
  body.followUpDate ||= null; body.jobLink ||= null; body.notes ||= null;
  if (!body.company.trim()) showFieldErrors({ company: "Add the company name." });
  if (!body.roleTitle.trim()) showFieldErrors({ ...(body.company.trim() ? {} : { company: "Add the company name." }), roleTitle: "Add the role title." });
  if (!body.applicationDate) showFieldErrors({ ...(!body.company.trim() ? { company: "Add the company name." } : {}), ...(!body.roleTitle.trim() ? { roleTitle: "Add the role title." } : {}), applicationDate: "Choose the application date." });
  if ($$(".has-error", form).length) { $("#form-message").textContent = "A couple of details need your attention."; return; }
  const id = $("#application-id").value;
  const button = $("#save-application"); button.disabled = true; button.textContent = "Saving…";
  try {
    await api(`/applications${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    dialog.close(); showToast(id ? "Your changes are saved" : "Application added to your flow"); await refresh();
  } catch (error) {
    if (Object.keys(error.fields).length) showFieldErrors(error.fields);
    $("#form-message").textContent = error.message;
  } finally { button.disabled = false; button.textContent = id ? "Save changes" : "Save application"; }
});

function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("visible");
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove("visible"), 2700);
}

function init() {
  $("#today-line").textContent = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(today);
  $("[name=applicationDate]").max = localDate(today);
  $("#add-application").addEventListener("click", () => openEditor());
  $("#empty-add").addEventListener("click", () => openEditor());
  $$(".view-option").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  $("#search-input").addEventListener("input", () => { clearTimeout(state.searchTimer); state.searchTimer = setTimeout(refresh, 220); });
  $("#status-filter").addEventListener("change", refresh);
  $(".cancel-dialog").addEventListener("click", () => dialog.close());
  $(".close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  $("[name=applicationDate]").addEventListener("change", (event) => { $("[name=followUpDate]").min = event.target.value; });
  $("#mobile-search").addEventListener("click", () => { $("#search-input").focus(); $("#applications").scrollIntoView({ behavior: "smooth" }); });
  $("#menu-toggle").addEventListener("click", (event) => {
    const open = event.currentTarget.getAttribute("aria-expanded") !== "true";
    event.currentTarget.setAttribute("aria-expanded", String(open)); $(".main-nav").classList.toggle("open", open);
  });
  $$(".nav-link").forEach((link) => link.addEventListener("click", () => { $(".main-nav").classList.remove("open"); $("#menu-toggle").setAttribute("aria-expanded", "false"); }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !dialog.open) { event.preventDefault(); $("#search-input").focus(); }
  });
  refresh();
}

init();
