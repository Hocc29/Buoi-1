"use strict";

// Dữ liệu khởi tạo
const items = [
  { "id": 1, "title": "Viết báo cáo HTML", "dueDate": "2026-10-20", "priority": "Cao", "status": "pending" },
  { "id": 2, "title": "Ôn Flexbox", "dueDate": "2026-10-23", "priority": "Trung bình", "status": "pending" },
  { "id": 3, "title": "Làm bài DOM", "dueDate": "2026-10-19", "priority": "Cao", "status": "done" },
  { "id": 4, "title": "Đọc tài liệu CSS", "dueDate": "2026-10-25", "priority": "Thấp", "status": "pending" },
  { "id": 5, "title": "Thiết kế trang cá nhân", "dueDate": "2026-10-21", "priority": "Trung bình", "status": "done" }
];

// ===== DOM references =====
const form = document.getElementById("task-form");
const titleInput = document.getElementById("title");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");
const titleError = document.getElementById("title-error");

const searchInput = document.getElementById("search");
const filterStatus = document.getElementById("filter-status");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const emptyMessage = document.getElementById("empty-message");

let nextId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;

const filters = { keyword: "", status: "all" };

// ===== Helpers =====
function normalize(str) {
  return String(str || "").toLowerCase().trim();
}

/**
 * Trả về ngày hôm nay theo giờ địa phương, định dạng YYYY-MM-DD
 * Luôn tính lại mỗi lần gọi để tránh bug "qua nửa đêm".
 */
function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "Không có hạn";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function priorityClass(p) {
  return "priority-" + normalize(p).replace(/\s+/g, "-");
}

function priorityBadgeClass(p) {
  return "badge-" + normalize(p).replace(/\s+/g, "-");
}

function getFilteredItems() {
  return items.filter(item => {
    const matchKeyword = normalize(item.title).includes(filters.keyword);
    const matchStatus = filters.status === "all" || item.status === filters.status;
    return matchKeyword && matchStatus;
  });
}

/* =========================================================
 *  CHẶN CHỌN NGÀY QUÁ KHỨ — 5 LỚP BẢO VỆ
 *  ---------------------------------------------------------
 *  Lớp 1: thuộc tính `min` khiến datepicker xám ngày cũ.
 *  Lớp 2: mỗi lần focus → cập nhật lại min (tránh qua nửa đêm).
 *  Lớp 3: `input` event → xoá ngay nếu user gõ tay ngày cũ.
 *  Lớp 4: `change` event → kiểm tra khi chọn từ picker / rời ô.
 *  Lớp 5: `keydown` event → chặn khi user dùng phím ↑↓ hoặc gõ số.
 *  Chốt chặn cuối: trong handler submit.
 * ========================================================= */

/** Cập nhật min cho input date, xoá giá trị cũ nếu < hôm nay */
function lockPastDates() {
  const today = getTodayISO();
  dueDateInput.min = today;
  dueDateInput.setAttribute("min", today);
  dueDateInput.dataset.minDate = today;

  if (dueDateInput.value && dueDateInput.value < today) {
    dueDateInput.value = "";
  }
}

/** Xoá input + hiện lỗi khi phát hiện ngày quá khứ */
function rejectPastDate() {
  dueDateInput.value = "";
  titleError.textContent = "Hạn hoàn thành không được ở quá khứ.";
}

/** Xoá thông báo lỗi nếu lỗi hiện tại đang là lỗi ngày */
function clearDateError() {
  if (titleError.textContent === "Hạn hoàn thành không được ở quá khứ.") {
    titleError.textContent = "";
  }
}

// Lớp 2: refresh min mỗi khi vào ô (tránh qua nửa đêm)
dueDateInput.addEventListener("focus", lockPastDates);

// Lớp 3: bắt ngay khi user đang gõ / chọn từ picker
dueDateInput.addEventListener("input", function () {
  if (this.value && this.value < getTodayISO()) {
    rejectPastDate();
  } else {
    clearDateError();
  }
});

// Lớp 4: kiểm tra khi user rời ô (paste, autofill, chọn từ picker)
dueDateInput.addEventListener("change", function () {
  if (this.value && this.value < getTodayISO()) {
    rejectPastDate();
  } else {
    clearDateError();
  }
});

// Lớp 5: chặn cứng bằng bàn phím (một số trình duyệt bỏ qua input event)
dueDateInput.addEventListener("keydown", function (e) {
  const allowedKeys = [
    "Tab", "Backspace", "Delete", "Enter", "Escape",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "Home", "End"
  ];
  if (allowedKeys.includes(e.key)) return;

  // Nếu là ký tự số (0-9 hoặc dấu "/") và giá trị hiện tại đã < hôm nay → chặn
  if (/^[0-9/]$/.test(e.key) && this.value && this.value < getTodayISO()) {
    e.preventDefault();
    rejectPastDate();
  }
});

// ===== C1: Hiển thị dữ liệu =====
function render() {
  const data = getFilteredItems();
  taskList.innerHTML = "";

  data.forEach(item => {
    const li = document.createElement("li");
    li.className = `task-item ${priorityClass(item.priority)} ${item.status === "done" ? "done" : ""}`;
    li.dataset.id = item.id;

    // Thông tin
    const info = document.createElement("div");
    info.className = "task-info";

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const dueSpan = document.createElement("span");
    dueSpan.textContent = "Hạn: " + formatDate(item.dueDate);

    const priBadge = document.createElement("span");
    priBadge.className = "badge " + priorityBadgeClass(item.priority);
    priBadge.textContent = item.priority;

    meta.append(dueSpan, priBadge);
    info.append(title, meta);

    // Trạng thái
    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge " + (item.status === "done" ? "status-done" : "status-pending");
    statusBadge.textContent = item.status === "done" ? "Đã hoàn thành" : "Chưa hoàn thành";

    // Nút hành động
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "btn btn-sm btn-toggle";
    toggleBtn.textContent = item.status === "done" ? "Bỏ hoàn thành" : "Hoàn thành";
    toggleBtn.addEventListener("click", () => toggleStatus(item.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-sm btn-delete";
    delBtn.textContent = "Xóa";
    delBtn.addEventListener("click", () => deleteItem(item.id));

    actions.append(toggleBtn, delBtn);

    li.append(info, statusBadge, actions);
    taskList.appendChild(li);
  });

  taskCount.textContent = `Hiển thị ${data.length}/${items.length} công việc`;
  emptyMessage.hidden = data.length !== 0;
}

// ===== C2: Thêm công việc =====
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  const dueDate = dueDateInput.value;
  titleError.textContent = "";

  if (!title) {
    titleError.textContent = "Vui lòng nhập tên công việc.";
    titleInput.focus();
    return;
  }
  if (title.length < 2) {
    titleError.textContent = "Tên công việc phải có ít nhất 2 ký tự.";
    titleInput.focus();
    return;
  }

  // Chốt chặn cuối: không cho submit nếu ngày ở quá khứ
  if (dueDate && dueDate < getTodayISO()) {
    titleError.textContent = "Hạn hoàn thành không được ở quá khứ.";
    dueDateInput.focus();
    return;
  }

  items.push({
    id: nextId++,
    title: title,
    dueDate: dueDate || "",
    priority: priorityInput.value,
    status: "pending"
  });

  form.reset();
  lockPastDates();               // cập nhật lại min sau khi reset
  priorityInput.value = "Trung bình";
  titleInput.focus();
  render();
});

// ===== C3: Tìm kiếm & lọc =====
searchInput.addEventListener("input", function () {
  filters.keyword = normalize(this.value);
  render();
});

filterStatus.addEventListener("change", function () {
  filters.status = this.value;
  render();
});

// ===== C4: Đổi trạng thái & xoá =====
function toggleStatus(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.status = item.status === "done" ? "pending" : "done";
  render();
}

function deleteItem(id) {
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;

  if (confirm(`Bạn có chắc muốn xóa công việc "${items[idx].title}"?`)) {
    items.splice(idx, 1);
    render();
  }
}

// ===== Khởi tạo =====
lockPastDates();
render();