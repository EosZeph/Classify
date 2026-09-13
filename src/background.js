importScripts("storage.js");

let mutationQueue = Promise.resolve();

function enqueueMutation(mutator) {
  const operation = mutationQueue.then(() => ArchiveStore.mutate(mutator));
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

function requireProject(state, projectId) {
  const project = ArchiveStore.findProject(state, projectId);
  if (!project) {
    throw new Error("找不到指定项目，可能已被删除。");
  }
  return project;
}

function requireCategory(project, categoryId) {
  const category = ArchiveStore.findCategory(project, categoryId);
  if (!category) {
    throw new Error("找不到指定类别，可能已被删除。");
  }
  return category;
}

function updateActionBadge(state) {
  const enabled = state.collectionEnabled !== false;
  chrome.action.setBadgeText({ text: enabled ? "开" : "停" }).catch(() => {});
  chrome.action
    .setBadgeBackgroundColor({ color: enabled ? "#2156d8" : "#64748b" })
    .catch(() => {});
  chrome.action.setTitle({
    title: enabled ? "归类采集（采集中）" : "归类采集（已停止）"
  });
}

async function handleMessage(message, sender) {
  const payload = message.payload || {};

  switch (message.type) {
    case "GET_STATE": {
      return { state: await ArchiveStore.getState() };
    }

    case "SET_COLLECTION_ENABLED": {
      const operation = enqueueMutation((state) => {
        state.collectionEnabled = Boolean(payload.enabled);
        return state.collectionEnabled;
      });
      return operation.then((result) => {
        updateActionBadge(result.state);
        return result;
      });
    }

    case "SET_SIDE_DRAWER_VISIBLE": {
      return enqueueMutation((state) => {
        state.sideDrawerVisible = Boolean(payload.visible);
        return state.sideDrawerVisible;
      });
    }

    case "OPEN_WORKSPACE": {
      const workspaceUrl = new URL(
        chrome.runtime.getURL("src/workspace.html")
      );
      if (payload.projectId) {
        workspaceUrl.searchParams.set("projectId", payload.projectId);
      }
      if (payload.create) {
        workspaceUrl.searchParams.set("new", "1");
      }
      await chrome.tabs.create({ url: workspaceUrl.toString() });
      return true;
    }

    case "CREATE_PROJECT": {
      return enqueueMutation((state) => {
        const project = ArchiveStore.createProject(
          payload.name,
          payload.categories
        );
        state.projects.push(project);
        state.activeProjectId = project.id;
        return project;
      });
    }

    case "SET_ACTIVE_PROJECT": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        state.activeProjectId = project.id;
        return project;
      });
    }

    case "UPDATE_PROJECT": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        project.name =
          ArchiveStore.cleanText(payload.name, 80) || project.name;
        ArchiveStore.touchProject(project);
        return project;
      });
    }

    case "DELETE_PROJECT": {
      return enqueueMutation((state) => {
        const index = state.projects.findIndex(
          (project) => project.id === payload.projectId
        );
        if (index === -1) {
          throw new Error("项目不存在或已被删除。");
        }

        state.projects.splice(index, 1);
        if (state.activeProjectId === payload.projectId) {
          state.activeProjectId = state.projects[0]?.id || null;
        }
        return state.activeProjectId;
      });
    }

    case "CLEAN_LEGACY_DATA": {
      return enqueueMutation((state) => {
        const result = ArchiveStore.cleanLegacyState(state, {
          includeNonEmpty: payload.includeNonEmpty === true
        });
        state.migrations = {
          ...(state.migrations || {}),
          legacyEmptyProjectCleanup: true
        };
        return result.removedIds.length;
      });
    }

    case "ADD_CATEGORY": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        const timestamp = ArchiveStore.nowIso();
        const category = {
          id: ArchiveStore.createId("category"),
          key: "custom",
          name:
            ArchiveStore.cleanText(payload.name, 40) || "未命名类别",
          color: /^#[0-9a-f]{6}$/i.test(payload.color)
            ? payload.color
            : "#2563eb",
          description: ArchiveStore.cleanText(payload.description, 160),
          position: project.categories.length,
          items: [],
          createdAt: timestamp,
          updatedAt: timestamp
        };

        project.categories.push(category);
        ArchiveStore.touchProject(project);
        return category;
      });
    }

    case "UPDATE_CATEGORY": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        const category = requireCategory(project, payload.categoryId);
        category.name =
          ArchiveStore.cleanText(payload.name, 40) || category.name;
        category.description = ArchiveStore.cleanText(
          payload.description,
          160
        );
        if (/^#[0-9a-f]{6}$/i.test(payload.color)) {
          category.color = payload.color;
        }
        category.updatedAt = ArchiveStore.nowIso();
        ArchiveStore.touchProject(project);
        return category;
      });
    }

    case "REORDER_CATEGORIES": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        const orderedIds = Array.isArray(payload.orderedIds)
          ? payload.orderedIds
          : [];
        const uniqueIds = new Set(orderedIds);
        if (
          orderedIds.length !== project.categories.length ||
          uniqueIds.size !== project.categories.length
        ) {
          throw new Error("类别排序数据不完整，请刷新页面后重试。");
        }

        const categoryMap = new Map(
          project.categories.map((category) => [category.id, category])
        );
        const orderedCategories = orderedIds.map((categoryId) => {
          const category = categoryMap.get(categoryId);
          if (!category) {
            throw new Error("类别排序中包含无效类别。");
          }
          return category;
        });

        orderedCategories.forEach((category, position) => {
          category.position = position;
        });
        project.categories = orderedCategories;
        ArchiveStore.touchProject(project);
        return orderedCategories.map((category) => category.id);
      });
    }

    case "DELETE_CATEGORY": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        const index = project.categories.findIndex(
          (category) => category.id === payload.categoryId
        );
        if (index === -1) {
          throw new Error("类别不存在或已被删除。");
        }

        project.categories.splice(index, 1);
        project.categories.forEach((category, position) => {
          category.position = position;
        });
        ArchiveStore.touchProject(project);
        return true;
      });
    }

    case "ADD_ITEM": {
      return enqueueMutation((state) => {
        if (payload.captureMode && state.collectionEnabled === false) {
          throw new Error("采集已停止，请先启动采集。");
        }
        const project = requireProject(state, payload.projectId);
        const category = requireCategory(project, payload.categoryId);
        const text = ArchiveStore.cleanText(payload.text, 50000);
        if (!text) {
          throw new Error("采集内容不能为空。");
        }

        const timestamp = ArchiveStore.nowIso();
        const item = {
          id: ArchiveStore.createId("item"),
          text,
          sourceTitle:
            ArchiveStore.cleanText(payload.sourceTitle, 300) ||
            sender.tab?.title ||
            "手动添加",
          sourceUrl:
            ArchiveStore.cleanText(payload.sourceUrl, 2000) ||
            sender.tab?.url ||
            "",
          capturedAt: timestamp,
          updatedAt: timestamp
        };

        category.items.unshift(item);
        category.updatedAt = timestamp;
        ArchiveStore.touchProject(project);
        return item;
      });
    }

    case "UPDATE_ITEM": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        const category = requireCategory(project, payload.categoryId);
        const item = category.items.find(
          (candidate) => candidate.id === payload.itemId
        );
        if (!item) {
          throw new Error("归档内容不存在或已被删除。");
        }

        const text = ArchiveStore.cleanText(payload.text, 50000);
        if (!text) {
          throw new Error("归档内容不能为空。");
        }

        item.text = text;
        item.updatedAt = ArchiveStore.nowIso();
        category.updatedAt = item.updatedAt;
        ArchiveStore.touchProject(project);
        return item;
      });
    }

    case "DELETE_ITEM": {
      return enqueueMutation((state) => {
        const project = requireProject(state, payload.projectId);
        const category = requireCategory(project, payload.categoryId);
        const index = category.items.findIndex(
          (item) => item.id === payload.itemId
        );
        if (index === -1) {
          throw new Error("归档内容不存在或已被删除。");
        }

        category.items.splice(index, 1);
        category.updatedAt = ArchiveStore.nowIso();
        ArchiveStore.touchProject(project);
        return true;
      });
    }

    default:
      throw new Error(`不支持的消息类型：${message.type}`);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ArchiveStore.initialize()
    .then(() => ArchiveStore.getState())
    .then(updateActionBadge)
    .catch((error) => {
      console.error("初始化归类采集工作台失败：", error);
    });
});

chrome.runtime.onStartup.addListener(() => {
  ArchiveStore.initialize()
    .then(() => ArchiveStore.getState())
    .then(updateActionBadge)
    .catch((error) => {
      console.error("启动归类采集工作台失败：", error);
    });
});

ArchiveStore.initialize()
  .then(() => ArchiveStore.getState())
  .then(updateActionBadge)
  .catch((error) => {
    console.error("加载归类采集状态失败：", error);
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  handleMessage(message, sender)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error("归类采集工作台消息处理失败：", error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });

  return true;
});
