"use strict";

const createDialog = document.querySelector("#create-dialog");
const createForm = document.querySelector("#create-project-form");
const projectNameInput = document.querySelector("#project-name");
const createError = document.querySelector("#create-error");
const confirmCreateButton = document.querySelector("#confirm-create");
const collectionControl = document.querySelector(".collection-control");
const collectionStatusTitle = document.querySelector(
  "#collection-status-title"
);
const collectionStatusDescription = document.querySelector(
  "#collection-status-description"
);
const collectionToggle = document.querySelector("#collection-toggle");
const drawerVisibilityToggle = document.querySelector(
  "#drawer-visibility-toggle"
);
const recentProjects = document.querySelector("#recent-projects");
const projectCount = document.querySelector("#project-count");
const presetCategories = document.querySelector("#preset-categories");
const customCategoryName = document.querySelector("#custom-category-name");
const addCustomCategoryButton = document.querySelector(
  "#add-custom-category"
);
const customCategoryList = document.querySelector("#custom-category-list");
const popupProjectModeInputs = document.querySelectorAll(
  'input[name="popup-project-mode"]'
);
const openWorkspaceButton = document.querySelector("#open-workspace-button");
const openWorkspaceIcon = document.querySelector("#open-workspace-icon");
const newProjectButton = document.querySelector("#new-project-button");
const closeCreateDialogButton = document.querySelector("#close-create-dialog");
const cancelCreateButton = document.querySelector("#cancel-create");

let currentState = null;
let customCategories = [];

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

function formatProjectMeta(project) {
  const count =
    project.mode === "multi"
      ? project.groups.reduce(
          (total, group) => total + Object.keys(group.values || {}).length,
          0
        )
      : project.categories.reduce(
          (total, category) => total + category.items.length,
          0
        );
  const date = new Date(project.updatedAt);
  const formatted = Number.isNaN(date.getTime())
    ? "刚刚"
    : new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric"
      }).format(date);

  return `${
    project.mode === "multi" ? "多组" : "单组"
  } · ${count} 项内容 · ${formatted} 更新`;
}

function renderPresetCategories() {
  presetCategories.replaceChildren(
    ...ArchiveStore.CATEGORY_TEMPLATES.map((category) => {
      const chip = document.createElement("label");
      chip.className = "preset-chip";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.value = category.name;
      checkbox.dataset.categoryKey = category.key;

      const dot = document.createElement("span");
      dot.className = "preset-dot";
      dot.style.background = category.color;

      const label = document.createElement("span");
      label.textContent = category.name;

      chip.append(checkbox, dot, label);
      return chip;
    })
  );
}

function renderCustomCategories() {
  customCategoryList.replaceChildren(
    ...customCategories.map((category, index) => {
      const chip = document.createElement("span");
      chip.className = "custom-category-item";

      const dot = document.createElement("span");
      dot.className = "preset-dot";
      dot.style.background = category.color;

      const label = document.createElement("span");
      label.textContent = category.name;

      const actions = document.createElement("span");
      actions.className = "custom-category-actions";

      const upButton = document.createElement("button");
      upButton.type = "button";
      upButton.className = "order-button";
      upButton.title = "上移";
      upButton.dataset.action = "move-up";
      upButton.dataset.categoryId = category.id;
      upButton.disabled = index === 0;
      upButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';

      const downButton = document.createElement("button");
      downButton.type = "button";
      downButton.className = "order-button";
      downButton.title = "下移";
      downButton.dataset.action = "move-down";
      downButton.dataset.categoryId = category.id;
      downButton.disabled = index === customCategories.length - 1;
      downButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.title = "移除";
      removeButton.setAttribute("aria-label", `移除 ${category.name}`);
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

function moveCustomCategory(categoryId, direction) {
  const index = customCategories.findIndex(
    (category) => category.id === categoryId
  );
  const targetIndex = index + direction;
  if (
    index === -1 ||
    targetIndex < 0 ||
    targetIndex >= customCategories.length
  ) {
    return;
  }

  const [category] = customCategories.splice(index, 1);
  customCategories.splice(targetIndex, 0, category);
  renderCustomCategories();
}

function addCustomCategory() {
  const name = customCategoryName.value.trim();
  if (!name) {
    customCategoryName.focus();
    return;
  }

  const duplicate = customCategories.some(
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
    createError.textContent = "该自定义类别已经存在。";
    return;
  }

  const colors = [
    "#2563eb",
    "#db2777",
    "#7c3aed",
    "#059669",
    "#0891b2",
    "#d97706",
    "#dc2626",
    "#4f46e5"
  ];
  customCategories.push({
    id: ArchiveStore.createId("custom"),
    key: "custom",
    name,
    color: colors[customCategories.length % colors.length],
    description: "个人自定义类别"
  });
  customCategoryName.value = "";
  createError.textContent = "";
  renderCustomCategories();
  customCategoryName.focus();
}

function getSelectedCategoryDefinitions() {
  const presets = ArchiveStore.CATEGORY_TEMPLATES.filter((category) => {
    const checkbox = presetCategories.querySelector(
      `input[data-category-key="${category.key}"]`
    );
    return checkbox?.checked;
  }).map((category) => ({ ...category }));

  return [
    ...presets,
    ...customCategories.map((category) => ({ ...category }))
  ];
}

function renderCollectionStatus() {
  const enabled = currentState?.collectionEnabled !== false;
  const drawerVisible = currentState?.sideDrawerVisible !== false;
  collectionControl.dataset.enabled = String(enabled);
  collectionStatusTitle.textContent = enabled ? "采集已启动" : "采集已停止";
  collectionStatusDescription.textContent = enabled
    ? "网页选中文本后可立即归档"
    : "网页浮动采集器当前不会出现";
  collectionToggle.textContent = enabled ? "停止采集" : "启动采集";
  drawerVisibilityToggle.textContent = drawerVisible
    ? "隐藏侧栏"
    : "显示侧栏";
}

function renderRecentProjects() {
  const projects = currentState?.projects || [];
  projectCount.textContent = `${projects.length} 个`;

  if (!projects.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "还没有项目，创建一个项目后即可开始采集。";
    recentProjects.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  projects
    .map((project, index) => ({
      project,
      sequence: index + 1
    }))
    .slice(-5)
    .reverse()
    .forEach(({ project, sequence }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-project";
    button.dataset.active = String(
      project.id === currentState.activeProjectId
    );
    button.dataset.projectId = project.id;

    const glyph = document.createElement("span");
    glyph.className = "project-glyph";
    glyph.textContent = String(sequence);

    const main = document.createElement("span");
    main.className = "recent-project-main";

    const name = document.createElement("span");
    name.className = "recent-project-name";
    name.textContent = project.name;

    const meta = document.createElement("span");
    meta.className = "recent-project-meta";
    meta.textContent = formatProjectMeta(project);

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

    main.append(name, meta);
    button.append(glyph, main, chevron);
    fragment.append(button);
    });

  recentProjects.replaceChildren(fragment);
}

function openCreateDialog() {
  createError.textContent = "";
  customCategories = [];
  customCategoryName.value = "";
  presetCategories
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = true;
    });
  popupProjectModeInputs.forEach((input) => {
    input.checked = input.value === "single";
  });
  renderCustomCategories();
  if (!createDialog.open) {
    createDialog.showModal();
  }
  window.setTimeout(() => {
    projectNameInput.focus();
    projectNameInput.select();
  }, 30);
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

async function openWorkspace(projectId) {
  const url = new URL(chrome.runtime.getURL("src/workspace.html"));
  if (projectId) {
    url.searchParams.set("projectId", projectId);
  } else {
    url.searchParams.set("new", "1");
  }
  await chrome.tabs.create({ url: url.toString() });
  window.close();
}

async function loadState() {
  const response = await sendMessage("GET_STATE");
  currentState = response.state;
  renderCollectionStatus();
  renderRecentProjects();
}

newProjectButton.addEventListener("click", openCreateDialog);
addCustomCategoryButton.addEventListener("click", addCustomCategory);
customCategoryName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCustomCategory();
  }
});
customCategoryList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category-id]");
  if (!button) {
    return;
  }
  if (button.dataset.action === "move-up") {
    moveCustomCategory(button.dataset.categoryId, -1);
    return;
  }
  if (button.dataset.action === "move-down") {
    moveCustomCategory(button.dataset.categoryId, 1);
    return;
  }
  if (button.dataset.action === "remove") {
    customCategories = customCategories.filter(
      (category) => category.id !== button.dataset.categoryId
    );
    renderCustomCategories();
  }
});
collectionToggle.addEventListener("click", async () => {
  const enabled = currentState?.collectionEnabled === false;
  collectionToggle.disabled = true;
  try {
    const response = await sendMessage("SET_COLLECTION_ENABLED", {
      enabled
    });
    currentState = response.state;
    renderCollectionStatus();
  } catch (error) {
    createError.textContent = error.message;
  } finally {
    collectionToggle.disabled = false;
  }
});
drawerVisibilityToggle.addEventListener("click", async () => {
  const visible = currentState?.sideDrawerVisible === false;
  drawerVisibilityToggle.disabled = true;
  try {
    const response = await sendMessage("SET_SIDE_DRAWER_VISIBLE", {
      visible
    });
    currentState = response.state;
    renderCollectionStatus();
  } catch (error) {
    createError.textContent = error.message;
  } finally {
    drawerVisibilityToggle.disabled = false;
  }
});

closeCreateDialogButton.addEventListener("click", () => createDialog.close());
cancelCreateButton.addEventListener("click", () => createDialog.close());

createDialog.addEventListener("click", (event) => {
  if (event.target === createDialog) {
    createDialog.close();
  }
});

recentProjects.addEventListener("click", async (event) => {
  const button = event.target.closest(".recent-project");
  if (!button) {
    return;
  }

  try {
    await sendMessage("SET_ACTIVE_PROJECT", {
      projectId: button.dataset.projectId
    });
    await openWorkspace(button.dataset.projectId);
  } catch (error) {
    createError.textContent = error.message;
  }
});

openWorkspaceButton.addEventListener("click", () =>
  openWorkspace(currentState?.activeProjectId)
);
openWorkspaceIcon.addEventListener("click", () =>
  openWorkspace(currentState?.activeProjectId)
);

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = projectNameInput.value.trim();
  if (!name) {
    createError.textContent = "请输入项目名称。";
    projectNameInput.focus();
    return;
  }

  confirmCreateButton.disabled = true;
  createError.textContent = "";

  try {
    const categories = getSelectedCategoryDefinitions();
    if (!categories.length) {
      throw new Error("请至少选择一个预设类别或添加一个自定义类别。");
    }
    const response = await sendMessage("CREATE_PROJECT", {
      name,
      mode:
        Array.from(popupProjectModeInputs).find((input) => input.checked)
          ?.value || "single",
      categories
    });
    await openWorkspace(response.result.id);
  } catch (error) {
    createError.textContent = error.message;
    confirmCreateButton.disabled = false;
  }
});

async function initialize() {
  renderPresetCategories();
  renderCustomCategories();

  try {
    await loadState();
  } catch (error) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "暂时无法读取本地数据，请重新打开扩展。";
    recentProjects.replaceChildren(empty);
  }

  projectNameInput.value = createSystemTimeName();
  openCreateDialog();
}

initialize();
