(function attachArchiveStore(global) {
  "use strict";

  const STORAGE_KEY = "archiveState";
  const SCHEMA_VERSION = 4;

  const CATEGORY_TEMPLATES = [
    {
      key: "name",
      name: "姓名",
      color: "#2563eb",
      description: "姓名、昵称、联系人名称"
    },
    {
      key: "gender",
      name: "性别",
      color: "#db2777",
      description: "性别及相关信息"
    },
    {
      key: "birthday",
      name: "出生日期",
      color: "#7c3aed",
      description: "出生日期、年龄、生日"
    },
    {
      key: "phone",
      name: "手机号",
      color: "#059669",
      description: "手机、座机、联系方式"
    },
    {
      key: "email",
      name: "邮箱",
      color: "#0891b2",
      description: "电子邮件地址"
    },
    {
      key: "address",
      name: "地址",
      color: "#d97706",
      description: "省市区、详细地址"
    },
    {
      key: "organization",
      name: "单位",
      color: "#4f46e5",
      description: "公司、学校、组织"
    },
    {
      key: "note",
      name: "备注",
      color: "#64748b",
      description: "其他值得归档的信息"
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return `${prefix}_${global.crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function cleanText(value, maxLength) {
    const text = typeof value === "string" ? value.trim() : "";
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function createEmptyState() {
    return {
      version: SCHEMA_VERSION,
      projects: [],
      activeProjectId: null,
      collectionEnabled: true,
      sideDrawerVisible: true,
      migrations: {},
      updatedAt: nowIso()
    };
  }

  function createDefaultCategories(categoryDefinitions) {
    const timestamp = nowIso();
    const definitions =
      Array.isArray(categoryDefinitions) &&
      categoryDefinitions.length > 0
        ? categoryDefinitions
        : CATEGORY_TEMPLATES;

    return definitions.map((definition, index) => ({
      id: createId("category"),
      key: cleanText(definition.key, 80) || "custom",
      name: cleanText(definition.name, 40) || `类别 ${index + 1}`,
      color: /^#[0-9a-f]{6}$/i.test(definition.color)
        ? definition.color
        : CATEGORY_TEMPLATES[index % CATEGORY_TEMPLATES.length].color,
      description: cleanText(definition.description, 160),
      position: index,
      items: [],
      createdAt: timestamp,
      updatedAt: timestamp
    }));
  }

  function createEmptyGroup(name, index) {
    const timestamp = nowIso();
    return {
      id: createId("group"),
      name: cleanText(name, 40) || `第 ${index + 1} 组`,
      values: {},
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function normalizeGroupValue(value) {
    if (typeof value === "string") {
      const text = cleanText(value, 50000);
      return text
        ? {
            id: createId("group_value"),
            text,
            sourceTitle: "",
            sourceUrl: "",
            capturedAt: nowIso(),
            updatedAt: nowIso()
          }
        : null;
    }

    if (!value || typeof value !== "object") {
      return null;
    }

    const text = cleanText(value.text, 50000);
    if (!text) {
      return null;
    }

    return {
      id: cleanText(value.id, 120) || createId("group_value"),
      text,
      sourceTitle: cleanText(value.sourceTitle, 300),
      sourceUrl: cleanText(value.sourceUrl, 2000),
      capturedAt: cleanText(value.capturedAt, 80) || nowIso(),
      updatedAt: cleanText(value.updatedAt, 80) || nowIso()
    };
  }

  function normalizeGroup(group, index) {
    if (!group || typeof group !== "object") {
      return null;
    }

    const timestamp = nowIso();
    const values = {};
    if (group.values && typeof group.values === "object") {
      Object.entries(group.values).forEach(([categoryId, value]) => {
        const normalizedValue = normalizeGroupValue(value);
        if (normalizedValue) {
          values[categoryId] = normalizedValue;
        }
      });
    }

    return {
      id: cleanText(group.id, 120) || createId("group"),
      name: cleanText(group.name, 40) || `第 ${index + 1} 组`,
      values,
      createdAt: cleanText(group.createdAt, 80) || timestamp,
      updatedAt: cleanText(group.updatedAt, 80) || timestamp
    };
  }

  function createProject(name, categoryDefinitions, mode = "single") {
    const timestamp = nowIso();
    const safeName = cleanText(name, 80) || "未命名项目";
    const safeMode = mode === "multi" ? "multi" : "single";
    const groups = safeMode === "multi" ? [createEmptyGroup("", 0)] : [];

    return {
      id: createId("project"),
      name: safeName,
      mode: safeMode,
      createdAt: timestamp,
      updatedAt: timestamp,
      categories: createDefaultCategories(categoryDefinitions),
      groups,
      activeGroupId: groups[0]?.id || null
    };
  }

  function normalizeItem(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const text = cleanText(item.text, 50000);
    if (!text) {
      return null;
    }

    return {
      id: cleanText(item.id, 120) || createId("item"),
      text,
      sourceTitle: cleanText(item.sourceTitle, 300),
      sourceUrl: cleanText(item.sourceUrl, 2000),
      capturedAt: cleanText(item.capturedAt, 80) || nowIso(),
      updatedAt: cleanText(item.updatedAt, 80) || nowIso()
    };
  }

  function normalizeCategory(category, index) {
    if (!category || typeof category !== "object") {
      return null;
    }

    const timestamp = nowIso();
    const name = cleanText(category.name, 40);
    if (!name) {
      return null;
    }

    return {
      id: cleanText(category.id, 120) || createId("category"),
      key: cleanText(category.key, 80) || "custom",
      name,
      color: /^#[0-9a-f]{6}$/i.test(category.color)
        ? category.color
        : "#2563eb",
      description: cleanText(category.description, 160),
      position: Number.isFinite(category.position)
        ? category.position
        : index,
      items: Array.isArray(category.items)
        ? category.items.map(normalizeItem).filter(Boolean)
        : [],
      createdAt: cleanText(category.createdAt, 80) || timestamp,
      updatedAt: cleanText(category.updatedAt, 80) || timestamp
    };
  }

  function normalizeProject(project) {
    if (!project || typeof project !== "object") {
      return null;
    }

    const timestamp = nowIso();
    const name = cleanText(project.name, 80);
    if (!name) {
      return null;
    }

    const categories = Array.isArray(project.categories)
      ? project.categories
          .map(normalizeCategory)
          .filter(Boolean)
          .sort((left, right) => left.position - right.position)
      : createDefaultCategories();
    const mode = project.mode === "multi" ? "multi" : "single";
    const groups = Array.isArray(project.groups)
      ? project.groups.map(normalizeGroup).filter(Boolean)
      : [];
    const activeGroupId = groups.some(
      (group) => group.id === project.activeGroupId
    )
      ? project.activeGroupId
      : groups[0]?.id || null;

    return {
      id: cleanText(project.id, 120) || createId("project"),
      name,
      mode,
      createdAt: cleanText(project.createdAt, 80) || timestamp,
      updatedAt: cleanText(project.updatedAt, 80) || timestamp,
      categories,
      groups,
      activeGroupId
    };
  }

  function normalizeState(rawState) {
    if (!rawState || typeof rawState !== "object") {
      return createEmptyState();
    }

    const projects = Array.isArray(rawState.projects)
      ? rawState.projects.map(normalizeProject).filter(Boolean)
      : [];

    const activeProjectId = projects.some(
      (project) => project.id === rawState.activeProjectId
    )
      ? rawState.activeProjectId
      : projects[0]?.id || null;

    return {
      version: SCHEMA_VERSION,
      projects,
      activeProjectId,
      collectionEnabled: rawState.collectionEnabled !== false,
      sideDrawerVisible: rawState.sideDrawerVisible !== false,
      migrations:
        rawState.migrations && typeof rawState.migrations === "object"
          ? { ...rawState.migrations }
          : {},
      updatedAt: cleanText(rawState.updatedAt, 80) || nowIso()
    };
  }

  function isLegacyProjectName(project) {
    const normalizedName = String(project?.name || "")
      .replace(/\s+/g, "")
      .toLocaleLowerCase("zh-CN");
    return (
      normalizedName === "项目1" ||
      normalizedName === "未命名项目1"
    );
  }

  function isLegacyEmptyProject(project) {
    const isEmpty = (project?.categories || []).every(
      (category) => !Array.isArray(category.items) || category.items.length === 0
    );
    return isLegacyProjectName(project) && isEmpty;
  }

  function cleanLegacyState(state, options = {}) {
    const includeNonEmpty = options.includeNonEmpty === true;
    const removedProjects = state.projects.filter((project) =>
      includeNonEmpty
        ? isLegacyProjectName(project)
        : isLegacyEmptyProject(project)
    );
    if (!removedProjects.length) {
      return {
        state,
        removedIds: []
      };
    }

    const removedIds = new Set(removedProjects.map((project) => project.id));
    state.projects = state.projects.filter(
      (project) => !removedIds.has(project.id)
    );
    if (removedIds.has(state.activeProjectId)) {
      state.activeProjectId = state.projects[0]?.id || null;
    }

    return {
      state,
      removedIds: Array.from(removedIds)
    };
  }

  async function getState() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return normalizeState(result[STORAGE_KEY]);
  }

  async function setState(state) {
    const normalized = normalizeState({
      ...state,
      updatedAt: nowIso()
    });
    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
    return normalized;
  }

  async function mutate(mutator) {
    const state = await getState();
    const draft = clone(state);
    const result = await mutator(draft);
    const savedState = await setState(draft);

    return {
      state: savedState,
      result
    };
  }

  function findProject(state, projectId) {
    return (
      state.projects.find((project) => project.id === projectId) ||
      state.projects.find((project) => project.id === state.activeProjectId) ||
      null
    );
  }

  function touchProject(project) {
    project.updatedAt = nowIso();
    return project;
  }

  function findCategory(project, categoryId) {
    return project.categories.find((category) => category.id === categoryId) || null;
  }

  async function initialize() {
    const existing = await chrome.storage.local.get(STORAGE_KEY);
    if (!existing[STORAGE_KEY]) {
      await setState(createEmptyState());
      return;
    }

    const state = normalizeState(existing[STORAGE_KEY]);
    let changed = false;

    if (state.migrations.legacyEmptyProjectCleanup !== true) {
      cleanLegacyState(state);
      state.migrations.legacyEmptyProjectCleanup = true;
      changed = true;
    }

    if (state.migrations.projectOrderAscending !== true) {
      state.projects.sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();
        return leftTime - rightTime;
      });
      state.migrations.projectOrderAscending = true;
      changed = true;
    }

    if (changed) {
      await setState(state);
    }
  }

  global.ArchiveStore = {
    STORAGE_KEY,
    CATEGORY_TEMPLATES: clone(CATEGORY_TEMPLATES),
    cleanText,
    clone,
    createDefaultCategories,
    createEmptyGroup,
    createId,
    createProject,
    cleanLegacyState,
    findCategory,
    findProject,
    getState,
    initialize,
    isLegacyEmptyProject,
    isLegacyProjectName,
    mutate,
    normalizeState,
    nowIso,
    setState,
    touchProject
  };
})(globalThis);
