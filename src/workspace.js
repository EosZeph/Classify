"use strict";

const CATEGORY_COLORS = [
  "#2563eb",
  "#db2777",
  "#7c3aed",
  "#059669",
  "#0891b2",
  "#d97706",
  "#dc2626",
  "#4f46e5",
  "#64748b",
  "#0f766e"
];

const projectList = document.querySelector("#project-list");
const sidebarProjectCount = document.querySelector(
  "#sidebar-project-count"
);
const sidebarTemplateCount = document.querySelector(
  "#sidebar-template-count"
);
const templateList = document.querySelector("#template-list");
const sidebarNewProject = document.querySelector("#sidebar-new-project");
const projectTitle = document.querySelector("#project-title");
const projectMeta = document.querySelector("#project-meta");
const categoryCount = document.querySelector("#category-count");
const itemCount = document.querySelector("#item-count");
const updatedAt = document.querySelector("#updated-at");
const searchInput = document.querySelector("#search-input");
const categoryGrid = document.querySelector("#category-grid");
const emptyWorkspace = document.querySelector("#empty-workspace");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const emptyNewProject = document.querySelector("#empty-new-project");
const renameProjectButton = document.querySelector("#rename-project");
const deleteProjectButton = document.querySelector("#delete-project");
const addCategoryButton = document.querySelector("#add-category");
const addGroupButton = document.querySelector("#add-group");
const exportTextButton = document.querySelector("#export-text");
const exportDocButton = document.querySelector("#export-doc");
const exportTableButton = document.querySelector("#export-table");
const saveTemplateButton = document.querySelector("#save-template");
const lockProjectButton = document.querySelector("#lock-project");
const workspaceCollectionToggle = document.querySelector(
  "#workspace-collection-toggle"
);
const workspaceCollectionLabel = document.querySelector(
  "#workspace-collection-label"
);
const clearAllProjectsButton = document.querySelector("#clear-all-projects");

const projectDialog = document.querySelector("#project-dialog");
const projectForm = document.querySelector("#project-form");
const projectDialogTitle = document.querySelector("#project-dialog-title");
const projectNameInput = document.querySelector("#project-name-input");
const projectModeInputs = document.querySelectorAll(
  'input[name="project-mode"]'
);
const projectFormError = document.querySelector("#project-form-error");
const projectSubmit = document.querySelector("#project-submit");
const projectTemplateSelect = document.querySelector("#project-template-select");
const projectCategoryBuilder = document.querySelector(
  "#project-category-builder"
);
const projectPresetOptions = document.querySelector(
  "#project-preset-options"
);
const projectCustomCategoryName = document.querySelector(
  "#project-custom-category-name"
);
const projectAddCustomCategoryButton = document.querySelector(
  "#project-add-custom-category"
);
const projectCustomCategoryList = document.querySelector(
  "#project-custom-category-list"
);

const categoryDialog = document.querySelector("#category-dialog");
const categoryForm = document.querySelector("#category-form");
const categoryDialogTitle = document.querySelector("#category-dialog-title");
const categoryNameInput = document.querySelector("#category-name-input");
const categoryDescriptionInput = document.querySelector(
  "#category-description-input"
);
const categoryColorInput = document.querySelector("#category-color-input");
const categoryFormError = document.querySelector("#category-form-error");
const colorSwatches = document.querySelector("#color-swatches");

const itemDialog = document.querySelector("#item-dialog");
const itemForm = document.querySelector("#item-form");
const itemTextInput = document.querySelector("#item-text-input");
const itemFormError = document.querySelector("#item-form-error");

const exportDialog = document.querySelector("#export-dialog");
const exportProjectSelect = document.querySelector("#export-project-select");
const exportFileFormat = document.querySelector("#export-file-format");
const multiExportOptions = document.querySelector("#multi-export-options");
const exportIncludeSummary = document.querySelector("#export-include-summary");
const exportIncludeEnding = document.querySelector("#export-include-ending");
const exportSeparateGroups = document.querySelector("#export-separate-groups");
const separateExportOptions = document.querySelector(
  "#separate-export-options"
);
const exportFilenameCategory = document.querySelector("#export-filename-category");
const exportSeparateMode = document.querySelector("#export-separate-mode");
const exportSelectionCount = document.querySelector(
  "#export-selection-count"
);
const exportSelectAllButton = document.querySelector("#export-select-all");
const exportClearAllButton = document.querySelector("#export-clear-all");
const exportTree = document.querySelector("#export-tree");
const downloadTextFileButton = document.querySelector(
  "#download-text-file"
);
const exportPreviewContent = document.querySelector(
  "#export-preview-content"
);

const templateDialog = document.querySelector("#template-dialog");
const templateForm = document.querySelector("#template-form");
const templateNameInput = document.querySelector("#template-name-input");
const templateFormError = document.querySelector("#template-form-error");

const clearProjectsDialog = document.querySelector("#clear-projects-dialog");
const clearProjectsForm = document.querySelector("#clear-projects-form");
const clearProjectConfirmation = document.querySelector(
  "#clear-project-confirmation"
);
const clearProjectsError = document.querySelector("#clear-projects-error");

const confirmDialog = document.querySelector("#confirm-dialog");
const confirmTitle = document.querySelector("#confirm-title");
const confirmMessage = document.querySelector("#confirm-message");
const confirmSubmit = document.querySelector("#confirm-submit");
const confirmCancel = document.querySelector("#confirm-cancel");

const toast = document.querySelector("#toast");

let state = null;
let projectDialogMode = "create";
let categoryDialogMode = "create";
let editingCategoryId = null;
let editingItemContext = null;
let confirmResolver = null;
let refreshTimer = null;
let toastTimer = null;
let projectCustomCategories = [];

function sendMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "操作失败"));
        return;
      }
      resolve(response);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isSafeWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getCurrentProject() {
  if (!state) {
    return null;
  }
  return (
    state.projects.find(
      (project) => project.id === state.activeProjectId
    ) || null
  );
}

function getProjectEntryCount(project) {
  if (project.mode === "multi") {
    return project.groups.reduce(
      (total, group) => total + Object.keys(group.values || {}).length,
      0
    );
  }
  return project.categories.reduce(
    (total, category) => total + category.items.length,
    0
  );
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知";
  }

  const deltaSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (deltaSeconds < 45) {
    return "刚刚";
  }
  if (deltaSeconds < 3600) {
    return `${Math.max(1, Math.floor(deltaSeconds / 60))} 分钟前`;
  }
  if (deltaSeconds < 86400) {
    return `${Math.floor(deltaSeconds / 3600)} 小时前`;
  }
  if (deltaSeconds < 604800) {
    return `${Math.floor(deltaSeconds / 86400)} 天前`;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatFullTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function showToast(message, tone = "success") {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.dataset.visible = "true";
  toastTimer = window.setTimeout(() => {
    toast.dataset.visible = "false";
  }, 2400);
}

function setWorkspaceEnabled(enabled) {
  renameProjectButton.disabled = !enabled;
  deleteProjectButton.disabled = !enabled;
  addCategoryButton.disabled = !enabled;
  addGroupButton.disabled = !enabled;
  exportTextButton.disabled = !enabled;
  exportDocButton.disabled = !enabled;
  exportTableButton.disabled = !enabled;
  saveTemplateButton.disabled = !enabled;
  lockProjectButton.disabled = !enabled;
  searchInput.disabled = !enabled;
}

function renderCollectionStatus() {
  const enabled = state?.collectionEnabled !== false;
  workspaceCollectionToggle.dataset.enabled = String(enabled);
  workspaceCollectionLabel.textContent = enabled
    ? "采集已启动"
    : "采集已停止";
  workspaceCollectionToggle.title = enabled
    ? "点击停止网页采集"
    : "点击启动网页采集";
}

function renderSidebar() {
  const projects = state.projects;
  sidebarProjectCount.textContent = String(projects.length);

  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "sidebar-empty";
    empty.textContent = "暂无项目";
    projectList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-item";
    button.dataset.projectId = project.id;
    button.dataset.active = String(project.id === state.activeProjectId);

    const glyph = document.createElement("span");
    glyph.className = "project-glyph";
    glyph.textContent = String(index + 1);

    const main = document.createElement("span");
    main.className = "project-item-main";

    const name = document.createElement("span");
    name.className = "project-item-name";
    name.textContent = project.name;
    name.title = project.name;

    const meta = document.createElement("span");
    meta.className = "project-item-meta";
    meta.textContent = `${getProjectEntryCount(project)} 条 · ${formatRelativeTime(
      project.updatedAt
    )}`;

    main.append(name, meta);

    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = "project-lock-toggle";
    lockButton.dataset.action = "toggle-project-lock";
    lockButton.dataset.projectId = project.id;
    lockButton.title = project.locked ? "解锁项目" : "锁定项目";
    lockButton.setAttribute(
      "aria-label",
      project.locked ? "解锁项目" : "锁定项目"
    );
    lockButton.innerHTML = project.locked
      ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2"/></svg>';

    button.append(glyph, main, lockButton);
    fragment.append(button);
  });

  projectList.replaceChildren(fragment);
}

function renderTemplateList() {
  const templates = state.templates || [];
  sidebarTemplateCount.textContent = String(templates.length);
  if (!templates.length) {
    const empty = document.createElement("p");
    empty.className = "sidebar-empty";
    empty.textContent = "暂无模板";
    templateList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  templates.forEach((template) => {
    const card = document.createElement("div");
    card.className = "template-item";
    card.dataset.templateId = template.id;

    const main = document.createElement("button");
    main.type = "button";
    main.className = "template-main";
    main.dataset.action = "use-template";
    main.dataset.templateId = template.id;

    const name = document.createElement("strong");
    name.textContent = template.name;
    const meta = document.createElement("span");
    meta.textContent = `${
      template.mode === "multi" ? "多组" : "单组"
    } · ${template.categories.length} 个类别`;
    main.append(name, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "template-delete";
    remove.dataset.action = "delete-template";
    remove.dataset.templateId = template.id;
    remove.title = "删除模板";
    remove.setAttribute("aria-label", "删除模板");
    remove.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/></svg>';

    card.append(main, remove);
    fragment.append(card);
  });
  templateList.replaceChildren(fragment);
}

function renderProjectHeader(project) {
  if (!project) {
    projectTitle.textContent = "未选择项目";
    projectMeta.textContent = "创建或选择一个项目开始归档";
    categoryCount.textContent = "0";
    itemCount.textContent = "0";
    updatedAt.textContent = "--";
    addGroupButton.hidden = true;
    setWorkspaceEnabled(false);
    return;
  }

  projectTitle.textContent = project.name;
  projectMeta.textContent = `${
    project.mode === "multi" ? "多组项目" : "单组项目"
  } · 创建于 ${formatFullTime(project.createdAt)}`;
  categoryCount.textContent = String(project.categories.length);
  itemCount.textContent = String(getProjectEntryCount(project));
  updatedAt.textContent = formatRelativeTime(project.updatedAt);
  addGroupButton.hidden = project.mode !== "multi";
  lockProjectButton.querySelector("span").textContent = project.locked
    ? "已锁定"
    : "锁定";
  lockProjectButton.querySelector("svg").innerHTML = project.locked
    ? '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
    : '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2"/>';
  lockProjectButton.classList.toggle("accent-amber", !project.locked);
  lockProjectButton.classList.toggle("accent-green", project.locked);
  setWorkspaceEnabled(true);
  deleteProjectButton.disabled = project.locked;
  deleteProjectButton.title = project.locked
    ? "项目已锁定，请先解锁"
    : "删除当前项目";
}

function getFilteredCategories(project, query) {
  if (!query) {
    return project.categories.map((category) => ({
      category,
      items: category.items
    }));
  }

  const normalizedQuery = query.toLocaleLowerCase("zh-CN");
  return project.categories
    .map((category) => {
      const categoryMatches = [
        category.name,
        category.description
      ].some((value) =>
        String(value || "")
          .toLocaleLowerCase("zh-CN")
          .includes(normalizedQuery)
      );

      const matchingItems = category.items.filter((item) =>
        [item.text, item.sourceTitle, item.sourceUrl].some((value) =>
          String(value || "")
            .toLocaleLowerCase("zh-CN")
            .includes(normalizedQuery)
        )
      );

      return {
        category,
        items: categoryMatches ? category.items : matchingItems,
        visible: categoryMatches || matchingItems.length > 0
      };
    })
    .filter((entry) => entry.visible);
}

function renderEntry(item) {
  const sourceTime = `${escapeHtml(
    item.sourceTitle || "网页采集"
  )} · ${escapeHtml(formatRelativeTime(item.capturedAt))}`;

  const source = isSafeWebUrl(item.sourceUrl)
    ? `<a class="entry-source" href="${escapeHtml(
        item.sourceUrl
      )}" target="_blank" rel="noreferrer" title="${escapeHtml(
        item.sourceUrl
      )}">${sourceTime}</a>`
    : `<span class="entry-source" title="${sourceTime}">${sourceTime}</span>`;

  return `
    <article class="entry" data-item-id="${escapeHtml(item.id)}">
      <div class="entry-main">
        <p class="entry-text">${escapeHtml(item.text)}</p>
        <div class="entry-meta">${source}</div>
      </div>
      <div class="entry-actions">
        <button
          class="icon-button"
          type="button"
          data-action="edit-item"
          data-item-id="${escapeHtml(item.id)}"
          title="编辑"
          aria-label="编辑"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
          </svg>
        </button>
        <button
          class="icon-button danger-icon"
          type="button"
          data-action="delete-item"
          data-item-id="${escapeHtml(item.id)}"
          title="删除"
          aria-label="删除"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <path d="m19 6-1 14H6L5 6"></path>
          </svg>
        </button>
      </div>
    </article>
  `;
}

function renderCategoryCard(
  category,
  visibleItems,
  categoryIndex,
  categoryTotal
) {
  const entries = visibleItems.length
    ? visibleItems.map(renderEntry).join("")
    : '<p class="category-empty">这个类别还没有归档内容</p>';

  return `
    <article
      class="category-card"
      data-category-id="${escapeHtml(category.id)}"
      style="--category-color: ${escapeHtml(category.color)}"
    >
      <header class="category-header">
        <span class="category-glyph" aria-hidden="true"></span>
        <div class="category-title-wrap">
          <div class="category-title-line">
            <h3 class="category-title" title="${escapeHtml(category.name)}">
              ${escapeHtml(category.name)}
            </h3>
            <span class="category-count">${category.items.length}</span>
          </div>
          <p class="category-description" title="${escapeHtml(
            category.description
          )}">
            ${escapeHtml(category.description || "自定义归档类别")}
          </p>
        </div>
        <div class="category-actions">
          <button
            class="icon-button order-icon"
            type="button"
            data-action="move-category-up"
            title="类别上移"
            aria-label="类别上移"
            ${categoryIndex === 0 ? "disabled" : ""}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m18 15-6-6-6 6"></path>
            </svg>
          </button>
          <button
            class="icon-button order-icon"
            type="button"
            data-action="move-category-down"
            title="类别下移"
            aria-label="类别下移"
            ${categoryIndex === categoryTotal - 1 ? "disabled" : ""}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
          <button
            class="icon-button"
            type="button"
            data-action="edit-category"
            title="编辑类别"
            aria-label="编辑类别"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>
          </button>
          <button
            class="icon-button danger-icon"
            type="button"
            data-action="delete-category"
            title="删除类别"
            aria-label="删除类别"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="m19 6-1 14H6L5 6"></path>
            </svg>
          </button>
        </div>
      </header>
      <div class="entry-list">${entries}</div>
      <form class="quick-add" data-category-id="${escapeHtml(category.id)}">
        <input
          type="text"
          maxlength="50000"
          placeholder="手动添加一条${escapeHtml(category.name)}"
          aria-label="手动添加到${escapeHtml(category.name)}"
        />
        <button type="submit" title="添加" aria-label="添加">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
        </button>
      </form>
    </article>
  `;
}

function renderEmptyWorkspace(project, hasSearchResults) {
  const hasProject = Boolean(project);
  emptyWorkspace.hidden = hasProject && hasSearchResults;

  if (!hasProject) {
    const hasProjects = state.projects.length > 0;
    emptyTitle.textContent = hasProjects ? "当前项目不可用" : "还没有项目";
    emptyDescription.textContent = hasProjects
      ? "从左侧选择一个项目，或创建新的采集空间。"
      : "创建项目后，可在任意网页选中文字并选择类别进行采集。";
    emptyNewProject.hidden = false;
    emptyNewProject.querySelector("span").textContent = "新建项目";
    return;
  }

  if (project.mode === "multi") {
    emptyTitle.textContent = "还没有分组";
    emptyDescription.textContent =
      "新增一个分组后，即可按同一套类别填写多组数据。";
    emptyNewProject.hidden = false;
    emptyNewProject.querySelector("span").textContent = "新增分组";
    return;
  }

  if (hasSearchResults) {
    return;
  }

  if (searchInput.value.trim()) {
    emptyTitle.textContent = "未找到匹配内容";
    emptyDescription.textContent = "尝试更换关键词，搜索范围包括内容、来源和类别。";
    emptyNewProject.hidden = true;
    return;
  }

  emptyTitle.textContent = "还没有类别";
  emptyDescription.textContent = "新增类别后，即可在网页采集时选择它进行归档。";
  emptyNewProject.hidden = false;
  emptyNewProject.querySelector("span").textContent = "新增类别";
}

function renderGroupCard(project, group, query, groupIndex, groupTotal) {
  const normalizedQuery = query.toLocaleLowerCase("zh-CN");
  const visibleCategories = project.categories.filter((category) => {
    if (!query) {
      return true;
    }
    const value = group.values[category.id]?.text || "";
    return (
      category.name.toLocaleLowerCase("zh-CN").includes(normalizedQuery) ||
      value.toLocaleLowerCase("zh-CN").includes(normalizedQuery)
    );
  });

  if (query && !visibleCategories.length) {
    return "";
  }

  const fields = visibleCategories
    .map((category) => {
      const rawValue = group.values[category.id]?.text || "";
      const value = rawValue.replace(/\s+/g, " ").trim();
      return `
        <div
          class="group-field"
          data-category-id="${escapeHtml(category.id)}"
        >
          <span class="group-field-label">
            <span
              class="group-field-dot"
              style="background: ${escapeHtml(category.color)}"
            ></span>
            <span title="${escapeHtml(category.name)}">
              ${escapeHtml(category.name)}
            </span>
          </span>
          <input
            type="text"
            maxlength="50000"
            value="${escapeHtml(value)}"
            data-group-value
            data-group-id="${escapeHtml(group.id)}"
            data-category-id="${escapeHtml(category.id)}"
            placeholder="输入${escapeHtml(category.name)}"
          />
          <button
            class="group-field-clear"
            type="button"
            data-action="clear-group-value"
            data-group-id="${escapeHtml(group.id)}"
            data-category-id="${escapeHtml(category.id)}"
            title="清除该值"
            aria-label="清除该值"
            ${value ? "" : "disabled"}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </div>
      `;
    })
    .join("");

  return `
    <article
      class="group-card"
      data-group-id="${escapeHtml(group.id)}"
      data-active="${String(project.activeGroupId === group.id)}"
    >
      <header class="group-header">
        <div class="group-name-wrap">
          <input
            class="group-name-input"
            type="text"
            maxlength="40"
            value="${escapeHtml(group.name)}"
            data-group-name
            data-group-id="${escapeHtml(group.id)}"
            aria-label="分组名称"
          />
        </div>
        <div class="group-header-actions">
          <button
            class="icon-button order-icon"
            type="button"
            data-action="move-group-up"
            data-group-id="${escapeHtml(group.id)}"
            title="分组上移"
            ${groupIndex === 0 ? "disabled" : ""}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m18 15-6-6-6 6"></path>
            </svg>
          </button>
          <button
            class="icon-button order-icon"
            type="button"
            data-action="move-group-down"
            data-group-id="${escapeHtml(group.id)}"
            title="分组下移"
            ${groupIndex === groupTotal - 1 ? "disabled" : ""}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
          <button
            class="group-active-button"
            type="button"
            data-action="set-active-group"
            data-group-id="${escapeHtml(group.id)}"
            data-active="${String(project.activeGroupId === group.id)}"
          >
            ${project.activeGroupId === group.id ? "当前采集组" : "设为采集组"}
          </button>
          <button
            class="icon-button danger-icon"
            type="button"
            data-action="delete-group"
            data-group-id="${escapeHtml(group.id)}"
            title="删除分组"
            aria-label="删除分组"
            ${project.groups.length === 1 || project.locked ? "disabled" : ""}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="m19 6-1 14H6L5 6"></path>
            </svg>
          </button>
        </div>
      </header>
      <div class="group-fields">${fields}</div>
    </article>
  `;
}

function renderGroups(project) {
  const query = searchInput.value.trim();
  const groupMarkup = project.groups
    .map((group, index) =>
      renderGroupCard(
        project,
        group,
        query,
        index,
        project.groups.length
      )
    )
    .filter(Boolean);
  const categoryOrder = project.categories
    .map(
      (category, index) => `
        <span class="multi-category-chip">
          <span
            class="group-field-dot"
            style="background:${escapeHtml(category.color)}"
          ></span>
          <span>${escapeHtml(category.name)}</span>
          <button
            type="button"
            data-action="move-multi-category-up"
            data-category-id="${escapeHtml(category.id)}"
            ${index === 0 ? "disabled" : ""}
            title="类别上移"
          >↑</button>
          <button
            type="button"
            data-action="move-multi-category-down"
            data-category-id="${escapeHtml(category.id)}"
            ${index === project.categories.length - 1 ? "disabled" : ""}
            title="类别下移"
          >↓</button>
        </span>
      `
    )
    .join("");
  categoryGrid.innerHTML = `
    <section class="multi-order-bar">
      <span class="multi-order-title">类别顺序</span>
      <div class="multi-category-order">${categoryOrder}</div>
    </section>
    <section class="multi-fixed-card">
      <span class="multi-fixed-label">摘要</span>
      <textarea
        data-multi-summary
        maxlength="50000"
        placeholder="摘要内容，下载时排在最前面"
      >${escapeHtml(project.summary || "")}</textarea>
    </section>
    ${groupMarkup.join("")}
    <section class="multi-fixed-card">
      <span class="multi-fixed-label">结尾</span>
      <textarea
        data-multi-ending
        maxlength="50000"
        placeholder="结尾内容，下载时排在最后面"
      >${escapeHtml(project.ending || "")}</textarea>
    </section>
  `;
  renderEmptyWorkspace(project, true);
}

function renderCategories(project) {
  if (!project) {
    categoryGrid.replaceChildren();
    renderEmptyWorkspace(null, false);
    return;
  }

  if (project.mode === "multi") {
    renderGroups(project);
    return;
  }

  const query = searchInput.value.trim();
  const filteredCategories = getFilteredCategories(project, query);
  const hasResults = filteredCategories.length > 0;

  categoryGrid.innerHTML = filteredCategories
    .map(({ category, items }) =>
      renderCategoryCard(
        category,
        items,
        project.categories.findIndex(
          (candidate) => candidate.id === category.id
        ),
        project.categories.length
      )
    )
    .join("");
  renderEmptyWorkspace(project, hasResults);
}

async function moveCategory(project, categoryId, direction) {
  const index = project.categories.findIndex(
    (category) => category.id === categoryId
  );
  const targetIndex = index + direction;
  if (
    index === -1 ||
    targetIndex < 0 ||
    targetIndex >= project.categories.length
  ) {
    return;
  }

  const orderedIds = project.categories.map((category) => category.id);
  [orderedIds[index], orderedIds[targetIndex]] = [
    orderedIds[targetIndex],
    orderedIds[index]
  ];

  try {
    const response = await sendMessage("REORDER_CATEGORIES", {
      projectId: project.id,
      orderedIds
    });
    state = response.state;
    render();
    showToast("类别顺序已更新。");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function moveGroup(project, groupId, direction) {
  const index = project.groups.findIndex((group) => group.id === groupId);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= project.groups.length) {
    return;
  }
  const orderedIds = project.groups.map((group) => group.id);
  [orderedIds[index], orderedIds[targetIndex]] = [
    orderedIds[targetIndex],
    orderedIds[index]
  ];
  try {
    const response = await sendMessage("REORDER_GROUPS", {
      projectId: project.id,
      orderedIds
    });
    state = response.state;
    render();
    showToast("分组顺序已更新。");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function render() {
  renderCollectionStatus();
  renderSidebar();
  renderTemplateList();
  const project = getCurrentProject();
  renderProjectHeader(project);
  renderCategories(project);
  if (project?.locked) {
    document
      .querySelectorAll(
        '[data-action="delete-category"], [data-action="delete-item"], [data-action="delete-group"], [data-action="clear-group-value"]'
      )
      .forEach((button) => {
        button.disabled = true;
      });
  }
}

async function refreshState(preferredProjectId) {
  const response = await sendMessage("GET_STATE");
  state = response.state;
  render();
  return preferredProjectId;
}

function createSystemTimeName() {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .formatToParts(new Date())
    .reduce((result, part) => {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function renderProjectPresetOptions(categoryOrder = []) {
  const orderedTemplates = categoryOrder.length
    ? categoryOrder
        .map((category) =>
          ArchiveStore.CATEGORY_TEMPLATES.find(
            (candidate) =>
              candidate.key === category.key ||
              candidate.name === category.name
          )
        )
        .filter(Boolean)
        .concat(
          ArchiveStore.CATEGORY_TEMPLATES.filter(
            (candidate) =>
              !categoryOrder.some(
                (category) =>
                  category.key === candidate.key ||
                  category.name === candidate.name
              )
          )
        )
    : ArchiveStore.CATEGORY_TEMPLATES;
  projectPresetOptions.replaceChildren(
    ...orderedTemplates.map((category) => {
      const chip = document.createElement("label");
      chip.className = "project-preset-chip";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.dataset.categoryKey = category.key;

      const dot = document.createElement("span");
      dot.className = "project-preset-dot";
      dot.style.background = category.color;

      const label = document.createElement("span");
      label.textContent = category.name;

      chip.append(checkbox, dot, label);
      return chip;
    })
  );
}

function renderProjectCustomCategories() {
  projectCustomCategoryList.replaceChildren(
    ...projectCustomCategories.map((category, index) => {
      const chip = document.createElement("span");
      chip.className = "project-custom-category";

      const dot = document.createElement("span");
      dot.className = "project-preset-dot";
      dot.style.background = category.color;

      const label = document.createElement("span");
      label.textContent = category.name;

      const actions = document.createElement("span");
      actions.className = "project-custom-category-actions";

      const upButton = document.createElement("button");
      upButton.type = "button";
      upButton.title = "上移";
      upButton.dataset.action = "move-up";
      upButton.dataset.categoryId = category.id;
      upButton.disabled = index === 0;
      upButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';

      const downButton = document.createElement("button");
      downButton.type = "button";
      downButton.title = "下移";
      downButton.dataset.action = "move-down";
      downButton.dataset.categoryId = category.id;
      downButton.disabled =
        index === projectCustomCategories.length - 1;
      downButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.title = "移除";
      removeButton.dataset.action = "remove";
      removeButton.dataset.categoryId = category.id;
      removeButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12"/><path d="M18 6 6 18"/></svg>';

      actions.append(upButton, downButton, removeButton);
      chip.append(dot, label, actions);
      return chip;
    })
  );
}

function moveProjectCustomCategory(categoryId, direction) {
  const index = projectCustomCategories.findIndex(
    (category) => category.id === categoryId
  );
  const targetIndex = index + direction;
  if (
    index === -1 ||
    targetIndex < 0 ||
    targetIndex >= projectCustomCategories.length
  ) {
    return;
  }

  const [category] = projectCustomCategories.splice(index, 1);
  projectCustomCategories.splice(targetIndex, 0, category);
  renderProjectCustomCategories();
}

function addProjectCustomCategory() {
  const name = projectCustomCategoryName.value.trim();
  if (!name) {
    projectCustomCategoryName.focus();
    return;
  }

  const duplicate = projectCustomCategories.some(
    (category) =>
      category.name.toLocaleLowerCase("zh-CN") ===
      name.toLocaleLowerCase("zh-CN")
  ) ||
    ArchiveStore.CATEGORY_TEMPLATES.some(
      (category) =>
        category.name.toLocaleLowerCase("zh-CN") ===
        name.toLocaleLowerCase("zh-CN")
    );
  if (duplicate) {
    projectFormError.textContent = "该自定义类别已经存在。";
    return;
  }

  projectCustomCategories.push({
    id: ArchiveStore.createId("custom"),
    key: "custom",
    name,
    color: CATEGORY_COLORS[projectCustomCategories.length % CATEGORY_COLORS.length],
    description: "个人自定义类别"
  });
  projectCustomCategoryName.value = "";
  projectFormError.textContent = "";
  renderProjectCustomCategories();
  projectCustomCategoryName.focus();
}

function getSelectedProjectCategories() {
  const presets = Array.from(
    projectPresetOptions.querySelectorAll(
      "input[data-category-key]:checked"
    )
  )
    .map((checkbox) =>
      ArchiveStore.CATEGORY_TEMPLATES.find(
        (category) => category.key === checkbox.dataset.categoryKey
      )
    )
    .filter(Boolean)
    .map((category) => ({ ...category }));

  return [
    ...presets,
    ...projectCustomCategories.map((category) => ({ ...category }))
  ];
}

function getSelectedProjectMode() {
  return (
    Array.from(projectModeInputs).find((input) => input.checked)?.value ||
    "single"
  );
}

function renderProjectTemplateSelect() {
  projectTemplateSelect.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "不使用模板";
  projectTemplateSelect.append(empty);
  state.templates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    projectTemplateSelect.append(option);
  });
}

function applyProjectTemplate(template) {
  if (!template) {
    return;
  }
  projectModeInputs.forEach((input) => {
    input.checked = input.value === template.mode;
  });

  const presetNames = new Set(
    ArchiveStore.CATEGORY_TEMPLATES.map((category) => category.name)
  );
  const presetKeys = new Set(
    template.categories
      .filter((category) => presetNames.has(category.name))
      .map((category) => category.name)
  );
  renderProjectPresetOptions(template.categories);
  projectPresetOptions
    .querySelectorAll('input[data-category-key]')
    .forEach((checkbox) => {
      const category = ArchiveStore.CATEGORY_TEMPLATES.find(
        (candidate) => candidate.key === checkbox.dataset.categoryKey
      );
      checkbox.checked = Boolean(category && presetKeys.has(category.name));
    });
  projectCustomCategories = template.categories
    .filter((category) => !presetNames.has(category.name))
    .map((category, index) => ({
      id: ArchiveStore.createId("custom"),
      key: "custom",
      name: category.name,
      color: category.color,
      description: category.description,
      position: index
    }));
  renderProjectCustomCategories();
}

function openProjectDialog(mode = "create", project = null) {
  projectDialogMode = mode;
  projectFormError.textContent = "";
  projectNameInput.value = project?.name || createSystemTimeName();
  projectModeInputs.forEach((input) => {
    input.checked = input.value === (project?.mode || "single");
  });
  projectCategoryBuilder.hidden = mode === "edit";
  projectCustomCategories = [];
  projectCustomCategoryName.value = "";
  if (mode === "create") {
    renderProjectTemplateSelect();
    renderProjectPresetOptions();
    renderProjectCustomCategories();
  } else {
    renderProjectTemplateSelect();
  }
  projectTemplateSelect.closest(".field").hidden = mode === "edit";
  projectDialogTitle.textContent =
    mode === "edit" ? "修改项目名称" : "新建项目";
  projectSubmit.textContent = mode === "edit" ? "保存修改" : "创建项目";
  projectDialog.showModal();
  window.setTimeout(() => {
    projectNameInput.focus();
    projectNameInput.select();
  }, 30);
}

function renderColorSwatches(selectedColor) {
  colorSwatches.replaceChildren(
    ...CATEGORY_COLORS.map((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.dataset.color = color;
      button.dataset.selected = String(color === selectedColor);
      button.style.setProperty("--swatch-color", color);
      button.title = color;
      button.setAttribute("aria-label", `选择颜色 ${color}`);
      return button;
    })
  );
  categoryColorInput.value = selectedColor;
}

function openCategoryDialog(category = null) {
  categoryDialogMode = category ? "edit" : "create";
  editingCategoryId = category?.id || null;
  categoryDialogTitle.textContent = category ? "编辑类别" : "新增类别";
  categoryNameInput.value = category?.name || "";
  categoryDescriptionInput.value = category?.description || "";
  categoryFormError.textContent = "";
  renderColorSwatches(category?.color || CATEGORY_COLORS[0]);
  categoryDialog.showModal();
  window.setTimeout(() => categoryNameInput.focus(), 30);
}

function openItemDialog(category, item) {
  editingItemContext = {
    categoryId: category.id,
    itemId: item.id
  };
  itemTextInput.value = item.text;
  itemFormError.textContent = "";
  itemDialog.showModal();
  window.setTimeout(() => {
    itemTextInput.focus();
    itemTextInput.setSelectionRange(item.text.length, item.text.length);
  }, 30);
}

function settleConfirm(value) {
  if (!confirmResolver) {
    return;
  }

  const resolve = confirmResolver;
  confirmResolver = null;
  confirmDialog.close();
  resolve(value);
}

function askConfirm({ title, message, confirmLabel = "确认删除" }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmSubmit.textContent = confirmLabel;
  confirmDialog.showModal();

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeFilename(value) {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "采集项目"
  );
}

function renderExportProjectSelect() {
  exportProjectSelect.replaceChildren(
    ...state.projects.map((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      option.selected = project.id === state.activeProjectId;
      return option;
    })
  );
}

function renderExportTree() {
  const project = state.projects.find(
    (candidate) => candidate.id === exportProjectSelect.value
  );

  multiExportOptions.hidden = project?.mode !== "multi";
  separateExportOptions.hidden = exportFileFormat.value === "xlsx";
  renderExportFilenameCategories(project);
  exportFilenameCategory.disabled = !exportSeparateGroups.checked;
  exportSeparateMode.disabled = !exportSeparateGroups.checked;
  if (project?.mode === "multi") {
    exportIncludeSummary.checked = Boolean(project.summary);
    exportIncludeEnding.checked = Boolean(project.ending);
    renderMultiExportTree(project);
    return;
  }

  if (!project || !project.categories.length) {
    exportTree.innerHTML =
      '<p class="export-empty">当前项目还没有可下载的类别。</p>';
    updateExportSelectionState();
    return;
  }

  exportTree.innerHTML = project.categories
    .map((category) => {
      const categoryChecked = category.items.length > 0;
      const items = category.items.length
        ? category.items
            .map(
              (item) => `
                <label class="export-item">
                  <input
                    type="checkbox"
                    data-export-item="${escapeHtml(item.id)}"
                    ${categoryChecked ? "checked" : ""}
                  />
                  <span>${escapeHtml(item.text)}</span>
                </label>
              `
            )
            .join("")
        : '<p class="export-empty">该类别暂无内容</p>';

      return `
        <section
          class="export-category-group"
          data-export-category-group="${escapeHtml(category.id)}"
        >
          <label class="export-category-header">
            <input
              type="checkbox"
              data-export-category="${escapeHtml(category.id)}"
              ${categoryChecked ? "checked" : ""}
            />
            <span
              class="export-category-dot"
              style="background: ${escapeHtml(category.color)}"
            ></span>
            <span class="export-category-name">
              ${escapeHtml(category.name)}
            </span>
            <span class="export-category-total">
              ${category.items.length} 条
            </span>
          </label>
          <div class="export-items">${items}</div>
        </section>
      `;
    })
    .join("");

  updateExportSelectionState();
}

function renderExportFilenameCategories(project) {
  exportFilenameCategory.replaceChildren();
  if (!project) {
    return;
  }
  const groupOption = document.createElement("option");
  groupOption.value = "";
  groupOption.textContent = "使用分组名称";
  exportFilenameCategory.append(groupOption);
  project.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    exportFilenameCategory.append(option);
  });
}

function renderMultiExportTree(project) {
  if (!project.groups.length) {
    exportTree.innerHTML =
      '<p class="export-empty">当前多组项目还没有分组。</p>';
    updateExportSelectionState();
    return;
  }

  exportTree.innerHTML = project.groups
    .map((group, groupIndex) => {
      const fields = project.categories
        .map((category) => {
          const value = group.values[category.id]?.text || "";
          return `
            <div class="export-item export-group-value">
              <span class="export-category-dot" style="background:${escapeHtml(
                category.color
              )}"></span>
              <span><strong>${escapeHtml(category.name)}：</strong>${
                value ? escapeHtml(value) : "（空）"
              }</span>
            </div>
          `;
        })
        .join("");

      return `
        <section
          class="export-category-group"
          data-export-group="${escapeHtml(group.id)}"
        >
          <label class="export-category-header">
            <input
              type="checkbox"
              data-export-group-check="${escapeHtml(group.id)}"
              checked
            />
            <span class="export-category-name">
              ${escapeHtml(group.name || `第 ${groupIndex + 1} 组`)}
            </span>
            <span class="export-category-total">
              ${Object.keys(group.values).length} 项
            </span>
          </label>
          <div class="export-items">
            ${fields || '<p class="export-empty">该分组暂无内容</p>'}
          </div>
        </section>
      `;
    })
    .join("");

  updateExportSelectionState();
}

function renderExportPreview() {
  const project = state.projects.find(
    (candidate) => candidate.id === exportProjectSelect.value
  );
  if (!project) {
    exportPreviewContent.textContent = "";
    return;
  }

  const format = exportFileFormat.value;
  const formatLabel =
    format === "xlsx"
      ? "Excel XLSX"
      : format === "docx"
        ? "Word DOCX"
        : "文本 TXT";

  if (project.mode === "multi") {
    const selectedGroups = project.groups.filter((group) => {
      const checkbox = exportTree.querySelector(
        `input[data-export-group-check="${CSS.escape(group.id)}"]`
      );
      return checkbox?.checked;
    });

    if (format === "xlsx") {
      const table = buildProjectTable(project);
      const previewRows = table.rows.slice(0, 5).map((row) =>
        row
          .map((value) => String(value ?? "").replace(/\s+/g, " "))
          .join("  |  ")
      );
      exportPreviewContent.textContent = `${formatLabel}\n${previewRows.join(
        "\n"
      )}${table.rows.length > 5 ? "\n..." : ""}`;
      return;
    }

    if (exportSeparateGroups.checked) {
      const usedNames = new Set();
      const filenames = selectedGroups.slice(0, 5).map((group, index) => {
        const name = getExportGroupFilename(
          project,
          group,
          index,
          usedNames
        );
        return `${name}.${format === "docx" ? "docx" : "txt"}`;
      });
      exportPreviewContent.textContent = `${formatLabel} · 分组独立文件\n${
        filenames.join("\n") || "暂无分组"
      }${selectedGroups.length > 5 ? "\n..." : ""}`;
      return;
    }

    const lines = buildMultiExportLines(project);
    exportPreviewContent.textContent = `${formatLabel}\n${lines
      .slice(0, 6)
      .join("\n")}${lines.length > 6 ? "\n..." : ""}`;
    return;
  }

  const rows = buildSelectedRows(project);
  if (format === "xlsx") {
    const table = buildProjectTable(project);
    exportPreviewContent.textContent = `${formatLabel}\n${table.rows
      .slice(0, 5)
      .map((row) => row.join("  |  "))
      .join("\n")}`;
    return;
  }
  exportPreviewContent.textContent = `${formatLabel}\n${
    rows
      .slice(0, 6)
      .map((row) => `${row.category}：${row.text}`)
      .join("\n") || "暂无内容"
  }${rows.length > 6 ? "\n..." : ""}`;
}

function updateExportSelectionState() {
  const project = state.projects.find(
    (candidate) => candidate.id === exportProjectSelect.value
  );
  if (project?.mode === "multi") {
    const selectedGroups = exportTree.querySelectorAll(
      "input[data-export-group-check]:checked"
    ).length;
    const fixedCount =
      Number(exportIncludeSummary.checked) +
      Number(exportIncludeEnding.checked);
    exportSelectionCount.textContent = `已选择 ${selectedGroups} 个分组、${fixedCount} 个固定栏目`;
    downloadTextFileButton.disabled =
      selectedGroups === 0 && fixedCount === 0;
    renderExportPreview();
    return;
  }

  exportTree
    .querySelectorAll(".export-category-group")
    .forEach((group) => {
      const categoryCheckbox = group.querySelector(
        "input[data-export-category]"
      );
      const itemCheckboxes = Array.from(
        group.querySelectorAll("input[data-export-item]")
      );
      const checkedCount = itemCheckboxes.filter(
        (checkbox) => checkbox.checked
      ).length;

      if (!itemCheckboxes.length) {
        categoryCheckbox.indeterminate = false;
        return;
      }

      categoryCheckbox.checked = checkedCount > 0;
      categoryCheckbox.indeterminate =
        checkedCount > 0 && checkedCount < itemCheckboxes.length;
    });

  const selectedItems = exportTree.querySelectorAll(
    "input[data-export-item]:checked"
  ).length;
  const groups = Array.from(
    exportTree.querySelectorAll(".export-category-group")
  );
  const selectedEmptyCategories = groups.filter(
    (group) =>
      group.querySelector("input[data-export-category]")?.checked &&
      !group.querySelector("input[data-export-item]")
  ).length;
  const categoriesWithItems = groups.filter(
    (group) =>
      group.querySelectorAll("input[data-export-item]:checked").length > 0
  ).length;
  const selectedCategories =
    categoriesWithItems + selectedEmptyCategories;

  exportSelectionCount.textContent = `已选择 ${selectedItems} 条内容、${selectedCategories} 个类别`;
  downloadTextFileButton.disabled =
    selectedItems === 0 && selectedEmptyCategories === 0;
  renderExportPreview();
}

function buildSelectedRows(project) {
  const rows = [];

  project.categories.forEach((category) => {
    const categoryCheckbox = exportTree.querySelector(
      `input[data-export-category="${CSS.escape(category.id)}"]`
    );
    if (!categoryCheckbox?.checked) {
      return;
    }

    const selectedItems = category.items.filter((item) => {
      const checkbox = exportTree.querySelector(
        `input[data-export-item="${CSS.escape(item.id)}"]`
      );
      return checkbox?.checked;
    });

    if (!selectedItems.length) {
      rows.push({
        category: category.name,
        text: ""
      });
      return;
    }

    selectedItems.forEach((item) => {
      rows.push({
        category: category.name,
        text: item.text.replace(/\s+/g, " ").trim()
      });
    });
  });

  return rows;
}

function buildMultiExportLines(project) {
  const selectedGroups = project.groups.filter((group) => {
    const checkbox = exportTree.querySelector(
      `input[data-export-group-check="${CSS.escape(group.id)}"]`
    );
    return checkbox?.checked;
  });

  const groupLines = selectedGroups.map((group, index) => {
    const parts = project.categories
      .map((category) => {
        const text = group.values[category.id]?.text
          ?.replace(/\s+/g, " ")
          .trim();
        return `${category.name}：${text || ""}`;
      })
    const ending = index === selectedGroups.length - 1 ? "。" : "；";
    return `${parts.join("，")}${ending}`;
  });
  const lines = [];
  if (exportIncludeSummary.checked && project.summary) {
    lines.push(project.summary);
  }
  lines.push(...groupLines);
  if (exportIncludeEnding.checked && project.ending) {
    lines.push(project.ending);
  }
  return lines;
}

function buildSelectedText(project) {
  if (project.mode === "multi") {
    return buildMultiExportLines(project).join("\r\n");
  }

  return buildSelectedRows(project)
    .map((row) => `${row.category}：${row.text}`)
    .join("\r\n");
}

function buildGroupFileLines(project, group) {
  const parts = project.categories
    .map((category) => {
      const text = group.values[category.id]?.text
        ?.replace(/\s+/g, " ")
        .trim();
      return `${category.name}：${text || ""}`;
    })
  const lines = [];
  if (exportIncludeSummary.checked && project.summary) {
    lines.push(project.summary);
  }
  lines.push(`${parts.join("，")}。`);
  if (exportIncludeEnding.checked && project.ending) {
    lines.push(project.ending);
  }
  return lines;
}

function getExportGroupFilename(project, group, index, usedNames) {
  const categoryId = exportFilenameCategory.value;
  const categoryValue = categoryId
    ? group.values[categoryId]?.text
    : "";
  const base =
    sanitizeFilename(categoryValue || group.name || `第 ${index + 1} 组`);
  let filename = base;
  let suffix = 2;
  while (usedNames.has(filename.toLocaleLowerCase("zh-CN"))) {
    filename = `${base}-${suffix}`;
    suffix += 1;
  }
  usedNames.add(filename.toLocaleLowerCase("zh-CN"));
  return filename;
}

async function createGroupFileBlob(project, group, format) {
  const lines = buildGroupFileLines(project, group);
  if (format === "docx") {
    const paragraphs = [];
    if (exportIncludeSummary.checked && project.summary) {
      paragraphs.push({ plain: project.summary });
    }
    project.categories.forEach((category) => {
      paragraphs.push({
        segments: [
          {
            label: category.name,
            text: group.values[category.id]?.text || ""
          }
        ],
        ending: ""
      });
    });
    if (exportIncludeEnding.checked && project.ending) {
      paragraphs.push({ plain: project.ending });
    }
    return ArchiveDownload.createDocxStyledBlob(
      project.name,
      paragraphs
    );
  }
  return new Blob([lines.join("\r\n")], {
    type: "text/plain;charset=utf-8"
  });
}

function getExcelColumnName(index) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function buildProjectTable(project) {
  const rows = [];
  const merges = [];

  if (project.mode === "multi") {
    const selectedGroups = project.groups.filter((group) => {
      const checkbox = exportTree.querySelector(
        `input[data-export-group-check="${CSS.escape(group.id)}"]`
      );
      return checkbox?.checked;
    });
    const columnCount = project.categories.length + 1;
    const lastColumn = getExcelColumnName(columnCount - 1);
    if (exportIncludeSummary.checked && project.summary) {
      rows.push([project.summary]);
      merges.push(`A1:${lastColumn}1`);
    }
    rows.push([
      "分组",
      ...project.categories.map((category) => category.name)
    ]);
    selectedGroups.forEach((group) => {
      rows.push([
        group.name,
        ...project.categories.map(
          (category) => group.values[category.id]?.text || ""
        )
      ]);
    });
    if (exportIncludeEnding.checked && project.ending) {
      const rowNumber = rows.length + 1;
      rows.push([project.ending]);
      merges.push(`A${rowNumber}:${lastColumn}${rowNumber}`);
    }
    return { rows, merges };
  }

  rows.push(["类别", "内容"]);
  project.categories.forEach((category) => {
    rows.push([
      category.name,
      category.items.map((item) => item.text).join("\n")
    ]);
  });
  return { rows, merges };
}

function openExportDialog() {
  if (!state.projects.length) {
    showToast("当前没有可下载的项目。", "error");
    return;
  }

  renderExportProjectSelect();
  renderExportTree();
  exportDialog.showModal();
}

projectAddCustomCategoryButton.addEventListener(
  "click",
  addProjectCustomCategory
);
projectCustomCategoryName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addProjectCustomCategory();
  }
});
projectCustomCategoryList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category-id]");
  if (!button) {
    return;
  }

  if (button.dataset.action === "move-up") {
    moveProjectCustomCategory(button.dataset.categoryId, -1);
    return;
  }
  if (button.dataset.action === "move-down") {
    moveProjectCustomCategory(button.dataset.categoryId, 1);
    return;
  }
  if (button.dataset.action === "remove") {
    projectCustomCategories = projectCustomCategories.filter(
      (category) => category.id !== button.dataset.categoryId
    );
    renderProjectCustomCategories();
  }
});

projectTemplateSelect.addEventListener("change", () => {
  const template = state.templates.find(
    (candidate) => candidate.id === projectTemplateSelect.value
  );
  if (template) {
    applyProjectTemplate(template);
  } else {
    renderProjectPresetOptions();
    projectCustomCategories = [];
    renderProjectCustomCategories();
  }
});

saveTemplateButton.addEventListener("click", () => {
  const project = getCurrentProject();
  if (!project) {
    return;
  }
  templateNameInput.value = `${project.name} 模板`;
  templateFormError.textContent = "";
  templateDialog.showModal();
  window.setTimeout(() => templateNameInput.select(), 30);
});

templateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const project = getCurrentProject();
  const name = templateNameInput.value.trim();
  if (!project || !name) {
    templateFormError.textContent = "请输入模板名称。";
    return;
  }

  const submitButton = templateForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await sendMessage("SAVE_TEMPLATE", {
      projectId: project.id,
      name
    });
    state = response.state;
    templateDialog.close();
    showToast("项目模板已保存。");
  } catch (error) {
    templateFormError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

lockProjectButton.addEventListener("click", async () => {
  const project = getCurrentProject();
  if (!project) {
    return;
  }
  const wasLocked = project.locked;
  try {
    const response = await sendMessage("UPDATE_PROJECT", {
      projectId: project.id,
      locked: !project.locked
    });
    state = response.state;
    render();
    showToast(wasLocked ? "项目已解锁。" : "项目已锁定。");
  } catch (error) {
    showToast(error.message, "error");
  }
});

sidebarNewProject.addEventListener("click", () =>
  openProjectDialog("create")
);

templateList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const template = state.templates.find(
    (candidate) => candidate.id === button.dataset.templateId
  );
  if (!template) {
    return;
  }

  if (button.dataset.action === "use-template") {
    openProjectDialog("create");
    projectTemplateSelect.value = template.id;
    applyProjectTemplate(template);
    return;
  }

  if (button.dataset.action === "delete-template") {
    const confirmed = await askConfirm({
      title: "删除项目模板？",
      message: `“${template.name}”模板将被永久删除，不影响已有项目。`,
      confirmLabel: "删除模板"
    });
    if (!confirmed) {
      return;
    }
    try {
      const response = await sendMessage("DELETE_TEMPLATE", {
        templateId: template.id
      });
      state = response.state;
      render();
      showToast("模板已删除。");
    } catch (error) {
      showToast(error.message, "error");
    }
  }
});

emptyNewProject.addEventListener("click", () => {
  const project = getCurrentProject();
  if (project?.mode === "multi") {
    createProjectGroup(project);
  } else if (project) {
    openCategoryDialog();
  } else {
    openProjectDialog("create");
  }
});

projectList.addEventListener("click", async (event) => {
  const lockButton = event.target.closest(
    'button[data-action="toggle-project-lock"]'
  );
  if (lockButton) {
    event.stopPropagation();
    const project = state.projects.find(
      (candidate) => candidate.id === lockButton.dataset.projectId
    );
    if (!project) {
      return;
    }
    const wasLocked = project.locked;
    try {
      const response = await sendMessage("UPDATE_PROJECT", {
        projectId: project.id,
        locked: !project.locked
      });
      state = response.state;
      render();
      showToast(wasLocked ? "项目已解锁。" : "项目已锁定。");
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }

  const button = event.target.closest(".project-item");
  if (!button || button.dataset.projectId === state.activeProjectId) {
    return;
  }

  try {
    const response = await sendMessage("SET_ACTIVE_PROJECT", {
      projectId: button.dataset.projectId
    });
    state = response.state;
    searchInput.value = "";
    const url = new URL(window.location.href);
    url.searchParams.set("projectId", state.activeProjectId);
    url.searchParams.delete("new");
    history.replaceState(null, "", url);
    render();
  } catch (error) {
    showToast(error.message, "error");
  }
});

renameProjectButton.addEventListener("click", () => {
  const project = getCurrentProject();
  if (project) {
    openProjectDialog("edit", project);
  }
});

async function createProjectGroup(project) {
  try {
    const response = await sendMessage("ADD_GROUP", {
      projectId: project.id
    });
    state = response.state;
    render();
    showToast("已新增分组。");
  } catch (error) {
    showToast(error.message, "error");
  }
}

addCategoryButton.addEventListener("click", () => openCategoryDialog());
addGroupButton.addEventListener("click", () => {
  const project = getCurrentProject();
  if (project?.mode === "multi") {
    createProjectGroup(project);
  }
});
workspaceCollectionToggle.addEventListener("click", async () => {
  const enabled = state?.collectionEnabled === false;
  workspaceCollectionToggle.disabled = true;
  try {
    const response = await sendMessage("SET_COLLECTION_ENABLED", {
      enabled
    });
    state = response.state;
    renderCollectionStatus();
    showToast(enabled ? "网页采集已启动。" : "网页采集已停止。");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    workspaceCollectionToggle.disabled = false;
  }
});

clearAllProjectsButton.addEventListener("click", async () => {
  if (!state.projects.length) {
    showToast("当前没有项目需要清空。");
    return;
  }

  const firstConfirmed = await askConfirm({
    title: "清空全部项目？",
    message: `将删除 ${state.projects.length} 个项目的全部内容。此操作无法恢复。`,
    confirmLabel: "继续确认"
  });
  if (!firstConfirmed) {
    return;
  }

  clearProjectConfirmation.value = "";
  clearProjectsError.textContent = "";
  clearProjectsDialog.showModal();
  window.setTimeout(() => clearProjectConfirmation.focus(), 30);
});

clearProjectsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (clearProjectConfirmation.value.trim() !== "清空项目") {
    clearProjectsError.textContent = "请输入“清空项目”完成二次确认。";
    return;
  }

  const submitButton = clearProjectsForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await sendMessage("CLEAR_ALL_PROJECTS");
    state = response.state;
    clearProjectsDialog.close();
    searchInput.value = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("projectId");
    history.replaceState(null, "", url);
    render();
    showToast(`已清空 ${response.result} 个项目。`);
  } catch (error) {
    clearProjectsError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

deleteProjectButton.addEventListener("click", async () => {
  const project = getCurrentProject();
  if (!project) {
    return;
  }

  const shouldDelete = await askConfirm({
    title: "删除整个项目？",
    message: `“${project.name}”中的全部类别和归档内容都会被永久删除。`
  });
  if (!shouldDelete) {
    return;
  }

  try {
    const response = await sendMessage("DELETE_PROJECT", {
      projectId: project.id
    });
    state = response.state;
    const url = new URL(window.location.href);
    url.searchParams.delete("projectId");
    history.replaceState(null, "", url);
    render();
    showToast("项目已删除。");
    if (!state.projects.length) {
      openProjectDialog("create");
    }
  } catch (error) {
    showToast(error.message, "error");
  }
});

exportTextButton.addEventListener("click", () => {
  exportFileFormat.value = "txt";
  openExportDialog();
});
exportDocButton.addEventListener("click", () => {
  exportFileFormat.value = "docx";
  openExportDialog();
});

exportTableButton.addEventListener("click", () => {
  exportFileFormat.value = "xlsx";
  openExportDialog();
});

exportProjectSelect.addEventListener("change", renderExportTree);

exportSelectAllButton.addEventListener("click", () => {
  exportTree
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = true;
      checkbox.indeterminate = false;
    });
  updateExportSelectionState();
});

exportClearAllButton.addEventListener("click", () => {
  exportTree
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.indeterminate = false;
    });
  updateExportSelectionState();
});

exportTree.addEventListener("change", (event) => {
  const checkbox = event.target;
  if (checkbox.matches("input[data-export-category]")) {
    const group = checkbox.closest(".export-category-group");
    group
      .querySelectorAll("input[data-export-item]")
      .forEach((itemCheckbox) => {
        itemCheckbox.checked = checkbox.checked;
      });
  }
  updateExportSelectionState();
});

exportIncludeSummary.addEventListener("change", updateExportSelectionState);
exportIncludeEnding.addEventListener("change", updateExportSelectionState);
exportSeparateGroups.addEventListener("change", () => {
  exportFilenameCategory.disabled = !exportSeparateGroups.checked;
  exportSeparateMode.disabled = !exportSeparateGroups.checked;
  renderExportPreview();
});
exportFileFormat.addEventListener("change", () => {
  if (exportFileFormat.value === "xlsx") {
    exportSeparateGroups.checked = false;
  }
  exportFilenameCategory.disabled =
    !exportSeparateGroups.checked || exportFileFormat.value === "xlsx";
  exportSeparateMode.disabled =
    !exportSeparateGroups.checked || exportFileFormat.value === "xlsx";
  separateExportOptions.hidden = exportFileFormat.value === "xlsx";
  renderExportPreview();
});
exportSeparateMode.addEventListener("change", renderExportPreview);
exportFilenameCategory.addEventListener("change", renderExportPreview);

async function downloadSeparateGroupFiles(project, format) {
  const selectedGroups = project.groups.filter((group) => {
    const checkbox = exportTree.querySelector(
      `input[data-export-group-check="${CSS.escape(group.id)}"]`
    );
    return checkbox?.checked;
  });
  const usedNames = new Set();
  const files = [];

  for (const [index, group] of selectedGroups.entries()) {
    const blob = await createGroupFileBlob(project, group, format);
    const filename = getExportGroupFilename(
      project,
      group,
      index,
      usedNames
    );
    const extension = format === "docx" ? "docx" : "txt";
    const fullName = `${filename}.${extension}`;
    if (exportSeparateMode.value === "multiple") {
      window.setTimeout(() => {
        ArchiveDownload.triggerDownload(blob, fullName);
      }, index * 180);
    } else {
      files.push({
        name: fullName,
        content: new Uint8Array(await blob.arrayBuffer())
      });
    }
  }

  if (exportSeparateMode.value === "zip" && files.length) {
    const zip = ArchiveDownload.createZip(files);
    ArchiveDownload.triggerDownload(
      new Blob([zip], { type: "application/zip" }),
      `${sanitizeFilename(project.name)}-分组文件.zip`
    );
  }
}

downloadTextFileButton.addEventListener("click", async () => {
  const project = state.projects.find(
    (candidate) => candidate.id === exportProjectSelect.value
  );
  if (!project) {
    return;
  }

  const isMulti = project.mode === "multi";
  const format = exportFileFormat.value;
  const rows = isMulti ? [] : buildSelectedRows(project);
  const multiLines = isMulti ? buildMultiExportLines(project) : [];
  if ((!isMulti && !rows.length) || (isMulti && !multiLines.length)) {
    showToast("请至少选择一个类别或内容。", "error");
    return;
  }

  const now = createSystemTimeName().replaceAll(":", "-");
  const baseFilename = `${sanitizeFilename(project.name)}-${now}`;
  if (isMulti && exportSeparateGroups.checked && format !== "xlsx") {
    await downloadSeparateGroupFiles(project, format);
    exportDialog.close();
    showToast(
      exportSeparateMode.value === "zip"
        ? "分组文件 ZIP 已下载。"
        : "分组文件已开始下载。"
    );
    return;
  }
  if (format === "xlsx") {
    const table = buildProjectTable(project);
    const blob = ArchiveDownload.createXlsxBlob(
      project.name,
      table.rows,
      table.merges
    );
    ArchiveDownload.triggerDownload(blob, `${baseFilename}.xlsx`);
    exportDialog.close();
    showToast("Excel 表格已下载。");
    return;
  }
  if (format === "docx") {
    const blob = isMulti
      ? ArchiveDownload.createDocxLinesBlob(project.name, multiLines)
      : ArchiveDownload.createDocxBlob(project.name, rows);
    ArchiveDownload.triggerDownload(blob, `${baseFilename}.docx`);
    showToast("Word 文档已下载。");
  } else {
    const text = buildSelectedText(project);
    downloadBlob(
      text,
      "text/plain;charset=utf-8",
      `${baseFilename}.txt`
    );
    showToast("文本文件已下载。");
  }
  exportDialog.close();
});

searchInput.addEventListener("input", () => {
  renderCategories(getCurrentProject());
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = projectNameInput.value.trim();
  if (!name) {
    projectFormError.textContent = "请输入项目名称。";
    return;
  }

  const project = getCurrentProject();
  projectSubmit.disabled = true;
  projectFormError.textContent = "";

  try {
    let response;
    if (projectDialogMode === "edit" && project) {
      response = await sendMessage("UPDATE_PROJECT", {
        projectId: project.id,
        name,
        mode: getSelectedProjectMode()
      });
    } else {
      const categories = getSelectedProjectCategories();
      if (!categories.length) {
        throw new Error("请至少选择一个预设类别或添加一个自定义类别。");
      }
      response = await sendMessage("CREATE_PROJECT", {
        name,
        mode: getSelectedProjectMode(),
        categories
      });
    }

    state = response.state;
    projectDialog.close();
    searchInput.value = "";

    const url = new URL(window.location.href);
    url.searchParams.set("projectId", state.activeProjectId);
    url.searchParams.delete("new");
    history.replaceState(null, "", url);

    render();
    showToast(projectDialogMode === "edit" ? "项目名称已更新。" : "项目已创建。");
  } catch (error) {
    projectFormError.textContent = error.message;
  } finally {
    projectSubmit.disabled = false;
  }
});

colorSwatches.addEventListener("click", (event) => {
  const button = event.target.closest(".color-swatch");
  if (!button) {
    return;
  }

  categoryColorInput.value = button.dataset.color;
  colorSwatches.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.dataset.selected = String(swatch === button);
  });
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const project = getCurrentProject();
  if (!project) {
    categoryFormError.textContent = "当前没有可用项目。";
    return;
  }

  const name = categoryNameInput.value.trim();
  if (!name) {
    categoryFormError.textContent = "请输入类别名称。";
    return;
  }

  const payload = {
    projectId: project.id,
    name,
    description: categoryDescriptionInput.value.trim(),
    color: categoryColorInput.value
  };

  const submitButton = categoryForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  categoryFormError.textContent = "";

  try {
    const response =
      categoryDialogMode === "edit" && editingCategoryId
        ? await sendMessage("UPDATE_CATEGORY", {
            ...payload,
            categoryId: editingCategoryId
          })
        : await sendMessage("ADD_CATEGORY", payload);

    state = response.state;
    categoryDialog.close();
    render();
    showToast(
      categoryDialogMode === "edit" ? "类别已更新。" : "类别已新增。"
    );
  } catch (error) {
    categoryFormError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

categoryGrid.addEventListener("change", async (event) => {
  const project = getCurrentProject();
  if (!project || project.mode !== "multi") {
    return;
  }

  const valueInput = event.target.closest("input[data-group-value]");
  if (valueInput) {
    try {
      const response = await sendMessage("UPDATE_GROUP_VALUE", {
        projectId: project.id,
        groupId: valueInput.dataset.groupId,
        categoryId: valueInput.dataset.categoryId,
        text: valueInput.value
      });
      state = response.state;
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }

  const summaryInput = event.target.closest("textarea[data-multi-summary]");
  const endingInput = event.target.closest("textarea[data-multi-ending]");
  if (summaryInput || endingInput) {
    try {
      const response = await sendMessage("UPDATE_PROJECT", {
        projectId: project.id,
        summary: summaryInput?.value,
        ending: endingInput?.value
      });
      state = response.state;
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }

  const nameInput = event.target.closest("input[data-group-name]");
  if (nameInput) {
    try {
      const response = await sendMessage("UPDATE_GROUP", {
        projectId: project.id,
        groupId: nameInput.dataset.groupId,
        name: nameInput.value
      });
      state = response.state;
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
  }
});

categoryGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  const groupCard = button?.closest(".group-card");
  const project = getCurrentProject();
  if (!button || !project || project.mode !== "multi") {
    return;
  }

  const action = button.dataset.action;
  const groupId = button.dataset.groupId;
  if (
    action === "move-multi-category-up" ||
    action === "move-multi-category-down"
  ) {
    await moveCategory(
      project,
      button.dataset.categoryId,
      action === "move-multi-category-up" ? -1 : 1
    );
    return;
  }
  if (action === "move-group-up" || action === "move-group-down") {
    await moveGroup(
      project,
      groupId,
      action === "move-group-up" ? -1 : 1
    );
    return;
  }
  if (!groupCard) {
    return;
  }
  if (action === "set-active-group") {
    try {
      const response = await sendMessage("SET_ACTIVE_GROUP", {
        projectId: project.id,
        groupId
      });
      state = response.state;
      render();
      showToast("当前采集组已切换。");
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }

  if (action === "clear-group-value") {
    try {
      const response = await sendMessage("UPDATE_GROUP_VALUE", {
        projectId: project.id,
        groupId,
        categoryId: button.dataset.categoryId,
        text: ""
      });
      state = response.state;
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }

  if (action === "delete-group") {
    const group = project.groups.find((candidate) => candidate.id === groupId);
    const shouldDelete = await askConfirm({
      title: "删除这个分组？",
      message: `“${group?.name || "当前分组"}”中的全部类别值都会被删除。`,
      confirmLabel: "删除分组"
    });
    if (!shouldDelete) {
      return;
    }

    try {
      const response = await sendMessage("DELETE_GROUP", {
        projectId: project.id,
        groupId
      });
      state = response.state;
      render();
      showToast("分组已删除。");
    } catch (error) {
      showToast(error.message, "error");
    }
  }
});

categoryGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const project = getCurrentProject();
  const card = button.closest(".category-card");
  if (!project || !card) {
    return;
  }

  const category = project.categories.find(
    (candidate) => candidate.id === card.dataset.categoryId
  );
  if (!category) {
    return;
  }

  const action = button.dataset.action;

  if (action === "edit-category") {
    openCategoryDialog(category);
    return;
  }

  if (
    action === "move-category-up" ||
    action === "move-category-down"
  ) {
    await moveCategory(
      project,
      category.id,
      action === "move-category-up" ? -1 : 1
    );
    return;
  }

  if (action === "delete-category") {
    const shouldDelete = await askConfirm({
      title: "删除这个类别？",
      message: `“${category.name}”中的 ${category.items.length} 条内容也会一并删除。`
    });
    if (!shouldDelete) {
      return;
    }

    try {
      const response = await sendMessage("DELETE_CATEGORY", {
        projectId: project.id,
        categoryId: category.id
      });
      state = response.state;
      render();
      showToast("类别已删除。");
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }

  const item = category.items.find(
    (candidate) => candidate.id === button.dataset.itemId
  );
  if (!item) {
    return;
  }

  if (action === "edit-item") {
    openItemDialog(category, item);
    return;
  }

  if (action === "delete-item") {
    const shouldDelete = await askConfirm({
      title: "删除这条归档内容？",
      message: "删除后无法恢复。",
      confirmLabel: "删除内容"
    });
    if (!shouldDelete) {
      return;
    }

    try {
      const response = await sendMessage("DELETE_ITEM", {
        projectId: project.id,
        categoryId: category.id,
        itemId: item.id
      });
      state = response.state;
      render();
      showToast("归档内容已删除。");
    } catch (error) {
      showToast(error.message, "error");
    }
  }
});

categoryGrid.addEventListener("submit", async (event) => {
  const form = event.target.closest(".quick-add");
  if (!form) {
    return;
  }

  event.preventDefault();
  const project = getCurrentProject();
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!project || !text) {
    return;
  }

  const submitButton = form.querySelector("button");
  submitButton.disabled = true;

  try {
    const response = await sendMessage("ADD_ITEM", {
      projectId: project.id,
      categoryId: form.dataset.categoryId,
      text
    });
    state = response.state;
    render();
    showToast("内容已归档。");
  } catch (error) {
    showToast(error.message, "error");
    submitButton.disabled = false;
  }
});

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const project = getCurrentProject();
  const text = itemTextInput.value.trim();
  if (!project || !editingItemContext) {
    itemFormError.textContent = "当前归档内容不可用。";
    return;
  }
  if (!text) {
    itemFormError.textContent = "内容不能为空。";
    return;
  }

  const submitButton = itemForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  itemFormError.textContent = "";

  try {
    const response = await sendMessage("UPDATE_ITEM", {
      projectId: project.id,
      categoryId: editingItemContext.categoryId,
      itemId: editingItemContext.itemId,
      text
    });
    state = response.state;
    itemDialog.close();
    editingItemContext = null;
    render();
    showToast("归档内容已更新。");
  } catch (error) {
    itemFormError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

confirmSubmit.addEventListener("click", () => settleConfirm(true));
confirmCancel.addEventListener("click", () => settleConfirm(false));
confirmDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  settleConfirm(false);
});

document.querySelectorAll(".modal").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      if (dialog === confirmDialog) {
        settleConfirm(false);
      } else {
        dialog.close();
      }
    }
  });
});

document.querySelectorAll(".modal-close").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest("dialog")?.close();
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName !== "local" ||
    !Object.prototype.hasOwnProperty.call(changes, "archiveState")
  ) {
    return;
  }

  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshState().catch((error) => {
      showToast(error.message, "error");
    });
  }, 80);
});

async function initialize() {
  const url = new URL(window.location.href);
  const requestedProjectId = url.searchParams.get("projectId");
  const shouldCreateProject = url.searchParams.get("new") === "1";
  const shouldOpenDownload = url.searchParams.get("download") === "1";

  try {
    await refreshState(requestedProjectId);

    if (
      requestedProjectId &&
      state.projects.some(
        (project) => project.id === requestedProjectId
      ) &&
      state.activeProjectId !== requestedProjectId
    ) {
      const response = await sendMessage("SET_ACTIVE_PROJECT", {
        projectId: requestedProjectId
      });
      state = response.state;
      render();
    }
  } catch (error) {
    showToast(error.message, "error");
    return;
  }

  if (shouldCreateProject || !getCurrentProject()) {
    openProjectDialog("create");
  } else if (shouldOpenDownload) {
    openExportDialog();
    url.searchParams.delete("download");
    history.replaceState(null, "", url);
  }
}

initialize();
