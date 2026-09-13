(function initializeCollector() {
  "use strict";

  if (!chrome.runtime?.id || window.top !== window) {
    return;
  }

  const HOST_ID = "web-archive-collector-root";
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        width: 0;
        height: 0;
        overflow: visible;
        pointer-events: none;
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      button,
      select {
        font: inherit;
      }

      button {
        color: inherit;
      }

      svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .collector-button {
        position: fixed;
        display: inline-flex;
        height: 36px;
        align-items: center;
        gap: 7px;
        padding: 0 11px;
        border: 1px solid #1948bd;
        border-radius: 7px;
        background: #2156d8;
        color: #ffffff;
        box-shadow: 0 8px 24px rgba(19, 42, 96, 0.25);
        cursor: pointer;
        font: 700 12px/1 "Segoe UI", "Microsoft YaHei UI", sans-serif;
        pointer-events: auto;
      }

      .collector-button:hover {
        background: #1846b7;
      }

      .collector-button[hidden],
      .collector-panel[hidden] {
        display: none;
      }

      .collector-panel {
        position: fixed;
        width: min(316px, calc(100vw - 24px));
        overflow: hidden;
        border: 1px solid #d7dee8;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 18px 50px rgba(21, 32, 52, 0.24);
        color: #172033;
        font: 12px/1.45 "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif;
        pointer-events: auto;
      }

      .drawer-toggle {
        position: fixed;
        top: 38%;
        right: 0;
        display: inline-flex;
        width: 34px;
        min-height: 112px;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 6px;
        border: 1px solid #1948bd;
        border-right: 0;
        border-radius: 8px 0 0 8px;
        background: #2156d8;
        box-shadow: -6px 8px 22px rgba(19, 42, 96, 0.2);
        color: #ffffff;
        cursor: pointer;
        font: 800 10px/1.2 "Segoe UI", "Microsoft YaHei UI", sans-serif;
        pointer-events: auto;
        writing-mode: vertical-rl;
        transition: right 160ms ease;
      }

      .drawer-toggle:hover {
        background: #1846b7;
      }

      .drawer-toggle svg {
        width: 16px;
        height: 16px;
        transform: rotate(90deg);
      }

      .drawer-toggle-close {
        position: fixed;
        top: calc(38% - 9px);
        right: -5px;
        z-index: 1;
        display: grid;
        width: 22px;
        height: 22px;
        padding: 0;
        place-items: center;
        border: 1px solid #b9c5d4;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 3px 10px rgba(21, 32, 52, 0.18);
        color: #526b9a;
        cursor: pointer;
        pointer-events: auto;
        transition: right 160ms ease;
      }

      .drawer-toggle-close:hover {
        border-color: #8fa0b7;
        color: #b52e37;
      }

      .drawer-toggle-close svg {
        width: 12px;
        height: 12px;
      }

      :host([data-drawer-open="true"]) .drawer-toggle {
        right: 340px;
      }

      :host([data-drawer-open="true"]) .drawer-toggle-close {
        right: 335px;
      }

      :host([data-side-drawer-visible="false"]) .drawer-toggle,
      :host([data-side-drawer-visible="false"]) .drawer-toggle-close {
        display: none;
      }

      .side-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        display: grid;
        grid-template-rows: auto auto auto auto auto minmax(0, 1fr);
        width: min(340px, calc(100vw - 28px));
        border-left: 1px solid #d7dee8;
        background: #ffffff;
        box-shadow: -16px 0 40px rgba(21, 32, 52, 0.18);
        color: #172033;
        font: 12px/1.45 "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif;
        pointer-events: auto;
        transform: translateX(100%);
        transition: transform 170ms ease;
      }

      .side-drawer[data-open="true"] {
        transform: translateX(0);
      }

      .drawer-header {
        display: flex;
        min-height: 62px;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 14px;
        border-bottom: 1px solid #e3e8ef;
        background: #fbfcfd;
      }

      .drawer-title {
        min-width: 0;
      }

      .drawer-kicker {
        display: block;
        margin-bottom: 2px;
        color: #7a8699;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .drawer-title h2 {
        overflow: hidden;
        margin: 0;
        color: #18243a;
        font-size: 15px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .drawer-header-actions {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 4px;
      }

      .drawer-download-button {
        display: inline-flex;
        height: 30px;
        align-items: center;
        gap: 5px;
        padding: 0 8px;
        border: 1px solid #b9c9ef;
        border-radius: 6px;
        background: #f4f7ff;
        color: #2853b1;
        cursor: pointer;
        font-size: 10px;
        font-weight: 800;
      }

      .drawer-download-button:hover {
        border-color: #8fa9e5;
        background: #eaf0ff;
      }

      .drawer-download-button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      .drawer-download-button svg {
        width: 13px;
        height: 13px;
      }

      .drawer-download-bar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 7px;
        padding: 9px 14px;
        border-bottom: 1px solid #e3e8ef;
        background: #ffffff;
      }

      .drawer-download-bar label {
        color: #748094;
        font-size: 9px;
        font-weight: 800;
      }

      .drawer-download-bar select {
        min-width: 0;
        height: 30px;
        padding: 0 7px;
        border: 1px solid #d1d9e4;
        border-radius: 6px;
        outline: none;
        background: #ffffff;
        color: #253247;
        font-size: 10px;
      }

      .drawer-download-bar .drawer-download-button {
        grid-column: 1 / -1;
        justify-content: center;
      }

      .drawer-status {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 9px;
        padding: 10px 14px;
        border-bottom: 1px solid #e3e8ef;
        background: #f7fbf9;
      }

      .drawer-status[data-enabled="false"] {
        background: #f6f7f9;
      }

      .drawer-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #2f8a6b;
        box-shadow: 0 0 0 3px rgba(47, 138, 107, 0.13);
      }

      .drawer-status[data-enabled="false"] .drawer-status-dot {
        background: #98a2b3;
        box-shadow: 0 0 0 3px rgba(152, 162, 179, 0.14);
      }

      .drawer-status-copy {
        display: grid;
        gap: 1px;
      }

      .drawer-status-copy strong {
        color: #253247;
        font-size: 11px;
      }

      .drawer-status-copy span {
        color: #748094;
        font-size: 9px;
      }

      .drawer-toggle-button {
        min-height: 29px;
        padding: 0 8px;
        border: 1px solid #b9c5d4;
        border-radius: 6px;
        background: #ffffff;
        cursor: pointer;
        font-size: 10px;
        font-weight: 800;
      }

      .drawer-project {
        padding: 10px 14px;
        border-bottom: 1px solid #e3e8ef;
      }

      .drawer-project label {
        display: block;
        margin-bottom: 5px;
        color: #748094;
        font-size: 9px;
        font-weight: 800;
      }

      .drawer-project select {
        width: 100%;
        height: 34px;
        padding: 0 8px;
        border: 1px solid #d1d9e4;
        border-radius: 6px;
        outline: none;
        background: #ffffff;
        color: #253247;
        font-size: 11px;
      }

      .drawer-group-wrap {
        margin-top: 8px;
      }

      .drawer-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-bottom: 1px solid #e3e8ef;
      }

      .drawer-stat {
        display: grid;
        gap: 2px;
        padding: 9px 14px;
        border-right: 1px solid #e3e8ef;
      }

      .drawer-stat:last-child {
        border-right: 0;
      }

      .drawer-stat span {
        color: #7a8699;
        font-size: 9px;
      }

      .drawer-stat strong {
        color: #253247;
        font-size: 12px;
      }

      .drawer-scroll {
        min-height: 0;
        overflow-y: auto;
        padding: 10px;
      }

      .drawer-section + .drawer-section {
        margin-top: 14px;
      }

      .drawer-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 4px 7px;
        color: #5f6b7d;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .drawer-category-list,
      .drawer-recent-list {
        display: grid;
        gap: 5px;
      }

      .drawer-category {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 40px;
        padding: 7px 9px;
        border: 0;
        border-radius: 0;
        background: #ffffff;
        text-align: left;
        cursor: pointer;
      }

      .drawer-category:hover {
        background: #f6f8ff;
      }

      .drawer-category-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .drawer-category-name {
        overflow: hidden;
        color: #253247;
        font-size: 11px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .drawer-category-count {
        color: #748094;
        font-size: 9px;
      }

      .drawer-category-chevron {
        display: grid;
        width: 18px;
        height: 18px;
        place-items: center;
        color: #98a2b3;
      }

      .drawer-category-chevron svg {
        width: 12px;
        height: 12px;
        transition: transform 130ms ease;
      }

      .drawer-category[data-expanded="true"] .drawer-category-chevron svg {
        transform: rotate(180deg);
      }

      .drawer-category-group {
        overflow: hidden;
        border: 1px solid #e1e6ed;
        border-radius: 8px;
        background: #ffffff;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease;
      }

      .drawer-category-group.is-highlighted {
        border-color: #7d9ce8;
        box-shadow: 0 0 0 2px rgba(33, 86, 216, 0.12);
      }

      .drawer-category-items {
        display: grid;
        gap: 0;
        border-top: 1px solid #e8edf3;
        background: #fbfcfd;
      }

      .drawer-category-items[hidden] {
        display: none;
      }

      .drawer-preview-item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 6px;
        padding: 8px 9px;
        border-bottom: 1px solid #edf0f4;
      }

      .drawer-preview-item:last-child {
        border-bottom: 0;
      }

      .drawer-preview-copy {
        min-width: 0;
      }

      .drawer-preview-text {
        display: block;
        overflow: hidden;
        color: #344054;
        font-size: 10px;
        line-height: 1.45;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .drawer-preview-meta {
        display: block;
        margin-top: 3px;
        color: #8a94a5;
        font-size: 8px;
      }

      .drawer-more {
        padding: 7px 9px;
        color: #7a8699;
        font-size: 9px;
        text-align: center;
      }

      .drawer-author {
        margin: 12px 4px 2px;
        color: #9aa4b2;
        font-size: 9px;
        text-align: right;
      }

      .drawer-recent {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 6px;
        padding: 8px 9px;
        border: 1px solid #e5e9ef;
        border-radius: 7px;
        background: #fbfcfd;
      }

      .drawer-recent-copy {
        min-width: 0;
      }

      .drawer-recent-text {
        display: block;
        overflow: hidden;
        color: #344054;
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .drawer-recent-meta {
        display: block;
        margin-top: 3px;
        color: #8a94a5;
        font-size: 9px;
      }

      .drawer-delete {
        display: grid;
        width: 26px;
        height: 26px;
        place-items: center;
        border: 1px solid transparent;
        border-radius: 5px;
        background: transparent;
        color: #98a2b3;
        cursor: pointer;
      }

      .drawer-delete:hover {
        border-color: #edc8cb;
        background: #fff1f2;
        color: #b52e37;
      }

      .drawer-empty {
        padding: 16px 10px;
        color: #8a94a5;
        font-size: 10px;
        line-height: 1.6;
        text-align: center;
      }

      .panel-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 30px;
        align-items: center;
        gap: 8px;
        min-height: 54px;
        padding: 10px 10px 10px 13px;
        border-bottom: 1px solid #e3e8ef;
        background: #fbfcfd;
      }

      .panel-kicker {
        display: block;
        margin-bottom: 3px;
        color: #7a8699;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .panel-project {
        width: 100%;
        min-width: 0;
        padding: 0;
        overflow: hidden;
        border: 0;
        outline: none;
        background: transparent;
        color: #18243a;
        font-size: 13px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      select.panel-project {
        height: 23px;
        cursor: pointer;
      }

      .close-button {
        display: grid;
        width: 30px;
        height: 30px;
        place-items: center;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
      }

      .close-button:hover {
        border-color: #d7dee8;
        background: #f1f4f7;
      }

      .panel-body {
        max-height: 330px;
        overflow-y: auto;
        padding: 8px;
      }

      .category-list {
        display: grid;
        gap: 5px;
      }

      .category-option {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 9px;
        width: 100%;
        min-height: 44px;
        padding: 7px 9px;
        border: 1px solid transparent;
        border-radius: 7px;
        background: transparent;
        text-align: left;
        cursor: pointer;
      }

      .category-option:hover {
        border-color: #c9d6f4;
        background: #f5f8ff;
      }

      .category-option:disabled {
        cursor: wait;
        opacity: 0.58;
      }

      .category-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--category-color);
      }

      .category-copy {
        min-width: 0;
      }

      .category-name {
        display: block;
        overflow: hidden;
        color: #1d2939;
        font-size: 12px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .category-description {
        display: block;
        overflow: hidden;
        margin-top: 1px;
        color: #7a8699;
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .category-total {
        min-width: 23px;
        padding: 2px 5px;
        border-radius: 99px;
        background: #eef1f5;
        color: #596579;
        font-size: 9px;
        font-weight: 800;
        text-align: center;
      }

      .panel-footer {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        padding: 7px 12px;
        border-top: 1px solid #e3e8ef;
        background: #fafbfd;
        color: #7a8699;
        font-size: 9px;
      }

      .panel-footer svg {
        width: 12px;
        height: 12px;
        color: #27725c;
      }

      .empty-project {
        padding: 18px 14px;
        text-align: center;
      }

      .empty-project strong {
        display: block;
        margin-bottom: 5px;
        color: #1d2939;
        font-size: 13px;
      }

      .empty-project p {
        margin: 0 0 13px;
        color: #6e7a8c;
        font-size: 10px;
        line-height: 1.55;
      }

      .create-button {
        display: inline-flex;
        height: 34px;
        align-items: center;
        justify-content: center;
        padding: 0 12px;
        border: 1px solid #2156d8;
        border-radius: 6px;
        background: #2156d8;
        color: #ffffff;
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
      }

      .create-button:hover {
        background: #1846b7;
      }

      .collector-toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        max-width: min(420px, calc(100vw - 28px));
        padding: 10px 14px;
        overflow: hidden;
        border: 1px solid #acd1c3;
        border-radius: 7px;
        background: #f0f9f5;
        box-shadow: 0 12px 34px rgba(21, 32, 52, 0.2);
        color: #205d4c;
        font: 700 11px/1.45 "Segoe UI", "Microsoft YaHei UI", sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, 8px);
      }

      .collector-toast[data-visible="true"] {
        opacity: 1;
        transform: translate(-50%, 0);
      }

      .collector-toast[data-tone="error"] {
        border-color: #e8bec2;
        background: #fff3f4;
        color: #9f2830;
      }

      @media (prefers-reduced-motion: no-preference) {
        .collector-toast {
          transition:
            opacity 140ms ease,
            transform 140ms ease;
        }

        .collector-panel {
          animation: panel-in 130ms ease-out;
        }

        @keyframes panel-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      }

      @media (max-width: 520px) {
        .drawer-toggle {
          min-height: 92px;
        }

        .side-drawer {
          width: calc(100vw - 20px);
        }

        :host([data-drawer-open="true"]) .drawer-toggle {
          right: calc(100vw - 20px);
        }

        :host([data-drawer-open="true"]) .drawer-toggle-close {
          right: calc(100vw - 25px);
        }
      }
    </style>

    <button
      id="collect-button"
      class="collector-button"
      type="button"
      hidden
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 21h14"></path>
      </svg>
      <span>采集</span>
    </button>

    <section
      id="collector-panel"
      class="collector-panel"
      aria-label="选择归档类别"
      hidden
    >
      <header class="panel-header">
        <div>
          <span class="panel-kicker">采集到项目</span>
          <select
            id="project-select"
            class="panel-project"
            aria-label="选择目标项目"
          ></select>
        </div>
        <button
          id="close-panel"
          class="close-button"
          type="button"
          aria-label="关闭"
          title="关闭"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12"></path>
            <path d="M18 6 6 18"></path>
          </svg>
        </button>
      </header>
      <div id="panel-body" class="panel-body"></div>
      <footer class="panel-footer">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z"></path>
          <path d="m9.5 12 1.7 1.7 3.6-4"></path>
        </svg>
        <span>选择类别后自动归档到工作台</span>
      </footer>
    </section>

    <button
      id="drawer-toggle"
      class="drawer-toggle"
      type="button"
      aria-label="打开采集台"
      title="打开采集台"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z"></path>
        <path d="M8 8h8"></path>
        <path d="M8 12h8"></path>
      </svg>
      <span>采集台</span>
    </button>

    <button
      id="hide-drawer-toggle"
      class="drawer-toggle-close"
      type="button"
      aria-label="隐藏侧边采集台悬浮标"
      title="隐藏悬浮标"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12"></path>
        <path d="M18 6 6 18"></path>
      </svg>
    </button>

    <aside id="side-drawer" class="side-drawer" data-open="false">
      <header class="drawer-header">
        <div class="drawer-title">
          <span class="drawer-kicker">Eoszeph · 网页侧边预览</span>
          <h2 id="drawer-project-name">暂无项目</h2>
        </div>
        <button
          id="close-drawer"
          class="close-button"
          type="button"
          aria-label="关闭采集台"
          title="关闭采集台"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12"></path>
            <path d="M18 6 6 18"></path>
          </svg>
        </button>
      </header>

      <div class="drawer-download-bar">
        <label for="drawer-download-format">下载格式</label>
        <select id="drawer-download-format">
          <option value="txt">文本 TXT</option>
          <option value="docx">Word DOCX</option>
        </select>
        <button
          id="drawer-download"
          class="drawer-download-button"
          type="button"
          title="下载当前项目"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12"></path>
            <path d="m7 10 5 5 5-5"></path>
            <path d="M5 21h14"></path>
          </svg>
          <span>下载当前项目</span>
        </button>
      </div>

      <div id="drawer-status" class="drawer-status" data-enabled="true">
        <span class="drawer-status-dot" aria-hidden="true"></span>
        <div class="drawer-status-copy">
          <strong id="drawer-status-title">采集已启动</strong>
          <span id="drawer-status-description">选中文本后可点击类别归档</span>
        </div>
        <button
          id="drawer-collection-toggle"
          class="drawer-toggle-button"
          type="button"
        >
          停止
        </button>
      </div>

      <div class="drawer-project">
        <label for="drawer-project-select">目标项目</label>
        <select id="drawer-project-select"></select>
        <div id="drawer-group-wrap" class="drawer-group-wrap" hidden>
          <label for="drawer-group-select">当前采集组</label>
          <select id="drawer-group-select"></select>
        </div>
      </div>

      <div class="drawer-stats">
        <div class="drawer-stat">
          <span>类别</span>
          <strong id="drawer-category-total">0</strong>
        </div>
        <div class="drawer-stat">
          <span>已采集</span>
          <strong id="drawer-item-total">0</strong>
        </div>
        <div class="drawer-stat">
          <span>状态</span>
          <strong id="drawer-state-label">运行</strong>
        </div>
      </div>

      <div class="drawer-scroll">
        <section class="drawer-section">
          <div class="drawer-section-heading">
            <span>类别预览</span>
            <span>采集后自动定位</span>
          </div>
          <div id="drawer-category-list" class="drawer-category-list"></div>
          <p class="drawer-author">作者：Eoszeph</p>
        </section>
      </div>
    </aside>

    <div
      id="collector-toast"
      class="collector-toast"
      role="status"
      aria-live="polite"
    ></div>
  `;

  document.documentElement.append(host);

  const collectButton = shadow.querySelector("#collect-button");
  const panel = shadow.querySelector("#collector-panel");
  const projectSelect = shadow.querySelector("#project-select");
  const panelBody = shadow.querySelector("#panel-body");
  const closePanelButton = shadow.querySelector("#close-panel");
  const collectorToast = shadow.querySelector("#collector-toast");
  const drawerToggle = shadow.querySelector("#drawer-toggle");
  const hideDrawerToggle = shadow.querySelector("#hide-drawer-toggle");
  const closeDrawerButton = shadow.querySelector("#close-drawer");
  const sideDrawer = shadow.querySelector("#side-drawer");
  const drawerProjectName = shadow.querySelector("#drawer-project-name");
  const drawerProjectSelect = shadow.querySelector(
    "#drawer-project-select"
  );
  const drawerGroupWrap = shadow.querySelector("#drawer-group-wrap");
  const drawerGroupSelect = shadow.querySelector("#drawer-group-select");
  const drawerStatus = shadow.querySelector("#drawer-status");
  const drawerStatusTitle = shadow.querySelector("#drawer-status-title");
  const drawerStatusDescription = shadow.querySelector(
    "#drawer-status-description"
  );
  const drawerCollectionToggle = shadow.querySelector(
    "#drawer-collection-toggle"
  );
  const drawerCategoryTotal = shadow.querySelector(
    "#drawer-category-total"
  );
  const drawerItemTotal = shadow.querySelector("#drawer-item-total");
  const drawerStateLabel = shadow.querySelector("#drawer-state-label");
  const drawerCategoryList = shadow.querySelector(
    "#drawer-category-list"
  );
  const drawerDownloadButton = shadow.querySelector("#drawer-download");
  const drawerDownloadFormat = shadow.querySelector(
    "#drawer-download-format"
  );

  let pendingSelection = null;
  let currentState = null;
  let selectionTimer = null;
  let toastTimer = null;
  let stateRefreshTimer = null;
  let highlightTimer = null;
  let highlightedCategoryId = null;
  let busy = false;
  const expandedCategoryIds = new Set();
  const initializedCategoryIds = new Set();

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

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function isCollectorNode(node) {
    return node === host || shadow.contains(node);
  }

  function clearSelectionUi() {
    collectButton.hidden = true;
    panel.hidden = true;
  }

  function showToast(message, tone = "success") {
    window.clearTimeout(toastTimer);
    collectorToast.textContent = message;
    collectorToast.dataset.tone = tone;
    collectorToast.dataset.visible = "true";
    toastTimer = window.setTimeout(() => {
      collectorToast.dataset.visible = "false";
    }, 2400);
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

  function buildProjectRows(project) {
    return project.categories.flatMap((category) => {
      if (!category.items.length) {
        return [{ category: category.name, text: "" }];
      }
      return category.items.map((item) => ({
        category: category.name,
        text: item.text.replace(/\s+/g, " ").trim()
      }));
    });
  }

  function buildProjectText(project) {
    if (project.mode === "multi") {
      return buildProjectMultiLines(project).join("\r\n");
    }
    return buildProjectRows(project)
      .map((row) => `${row.category}：${row.text}`)
      .join("\r\n");
  }

  function buildProjectMultiLines(project) {
    return project.groups.map((group, index) => {
      const parts = project.categories
        .map((category) => {
          const text = group.values[category.id]?.text
            ?.replace(/\s+/g, " ")
            .trim();
          return text ? `${category.name}：${text}` : "";
        })
        .filter(Boolean);
      const ending = index === project.groups.length - 1 ? "。" : "；";
      return `${parts.join("，")}${ending}`;
    });
  }

  function downloadProjectText(project) {
    const content = buildProjectText(project);
    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeFilename(project.name)}.txt`;
    document.documentElement.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadProjectDocx(project) {
    const blob =
      project.mode === "multi"
        ? ArchiveDownload.createDocxLinesBlob(
            project.name,
            buildProjectMultiLines(project)
          )
        : ArchiveDownload.createDocxBlob(
            project.name,
            buildProjectRows(project)
          );
    ArchiveDownload.triggerDownload(
      blob,
      `${ArchiveDownload.sanitizeFilename(project.name)}.docx`
    );
  }

  function focusDrawerCategory(categoryId) {
    if (sideDrawer.dataset.open !== "true") {
      return;
    }

    highlightedCategoryId = categoryId;
    const group = drawerCategoryList.querySelector(
      `[data-category-group="${CSS.escape(categoryId)}"]`
    );
    if (group) {
      group.classList.add("is-highlighted");
      window.requestAnimationFrame(() => {
        group.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }

    window.clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => {
      highlightedCategoryId = null;
      const highlightedGroup = drawerCategoryList.querySelector(
        `[data-category-group="${CSS.escape(categoryId)}"]`
      );
      highlightedGroup?.classList.remove("is-highlighted");
    }, 1500);
  }

  function positionAroundSelection(element, rect, gap) {
    const elementRect = element.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    let left = rect.left + rect.width / 2 - elementRect.width / 2;
    let top = rect.bottom + gap;

    if (top + elementRect.height > viewportHeight - 10) {
      top = rect.top - elementRect.height - gap;
    }

    left = clamp(left, 10, viewportWidth - elementRect.width - 10);
    top = clamp(top, 10, viewportHeight - elementRect.height - 10);

    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(top)}px`;
  }

  function showCollectButton(rect) {
    collectButton.hidden = false;
    positionAroundSelection(collectButton, rect, 8);
  }

  function updateSelection() {
    if (!isCollectionEnabled()) {
      pendingSelection = null;
      collectButton.hidden = true;
      panel.hidden = true;
      return;
    }

    if (panel.hidden === false) {
      return;
    }

    const activeElement = document.activeElement;
    if (
      isCollectorNode(activeElement) ||
      activeElement?.matches?.("input, textarea, [contenteditable='true']")
    ) {
      return;
    }

    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed
    ) {
      pendingSelection = null;
      collectButton.hidden = true;
      return;
    }

    const text = selection.toString().trim().slice(0, 50000);
    if (!text) {
      pendingSelection = null;
      collectButton.hidden = true;
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 0 && rect.height > 0
    );
    const rect = rects.at(-1) || range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return;
    }

    pendingSelection = {
      text,
      rect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
    showCollectButton(pendingSelection.rect);
  }

  function scheduleSelectionUpdate(delay = 90) {
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(updateSelection, delay);
  }

  function getActiveProject() {
    if (!currentState) {
      return null;
    }
    return (
      currentState.projects.find(
        (project) => project.id === currentState.activeProjectId
      ) || null
    );
  }

  function isCollectionEnabled() {
    return currentState?.collectionEnabled !== false;
  }

  function renderDrawerProjectSelect() {
    drawerProjectSelect.replaceChildren();

    if (!currentState?.projects.length) {
      const option = document.createElement("option");
      option.textContent = "暂无项目";
      drawerProjectSelect.append(option);
      drawerProjectSelect.disabled = true;
      return;
    }

    currentState.projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      option.selected = project.id === currentState.activeProjectId;
      drawerProjectSelect.append(option);
    });
    drawerProjectSelect.disabled = false;
  }

  function renderDrawerGroupSelect(project) {
    drawerGroupSelect.replaceChildren();
    const isMulti = project?.mode === "multi";
    drawerGroupWrap.hidden = !isMulti;
    if (!isMulti) {
      drawerGroupSelect.disabled = true;
      return;
    }

    project.groups.forEach((group, index) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name || `第 ${index + 1} 组`;
      option.selected = group.id === project.activeGroupId;
      drawerGroupSelect.append(option);
    });
    drawerGroupSelect.disabled = !project.groups.length;
  }

  function renderDrawerCategories(project) {
    drawerCategoryList.replaceChildren();

    if (!project) {
      const empty = document.createElement("p");
      empty.className = "drawer-empty";
      empty.textContent = "还没有项目，请先在工作台创建项目。";
      drawerCategoryList.append(empty);
      return;
    }

    const activeGroup =
      project.mode === "multi"
        ? project.groups.find(
            (group) => group.id === project.activeGroupId
          ) || project.groups[0]
        : null;

    project.categories.forEach((category) => {
      const groupValue = activeGroup?.values[category.id];
      const categoryItems =
        project.mode === "multi"
          ? groupValue
            ? [groupValue]
            : []
          : category.items;
      if (!initializedCategoryIds.has(category.id)) {
        initializedCategoryIds.add(category.id);
        if (categoryItems.length > 0) {
          expandedCategoryIds.add(category.id);
        }
      }

      const expanded = expandedCategoryIds.has(category.id);
      const group = document.createElement("div");
      group.className = "drawer-category-group";
      group.dataset.categoryGroup = category.id;
      if (highlightedCategoryId === category.id) {
        group.classList.add("is-highlighted");
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "drawer-category";
      button.dataset.categoryId = category.id;
      button.dataset.action = "preview-or-capture";
      button.dataset.expanded = String(expanded);

      const dot = document.createElement("span");
      dot.className = "drawer-category-dot";
      dot.style.background = category.color;

      const name = document.createElement("span");
      name.className = "drawer-category-name";
      name.textContent = category.name;

      const count = document.createElement("span");
      count.className = "drawer-category-count";
      count.textContent =
        project.mode === "multi"
          ? groupValue
            ? "已填写"
            : "未填写"
          : `${category.items.length} 条`;

      const chevron = document.createElement("span");
      chevron.className = "drawer-category-chevron";
      chevron.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

      button.append(dot, name, count, chevron);
      group.append(button);

      const itemList = document.createElement("div");
      itemList.className = "drawer-category-items";
      itemList.hidden = !expanded;

      const previewItems = categoryItems.slice(0, 5);
      if (!previewItems.length) {
        const empty = document.createElement("p");
        empty.className = "drawer-empty";
        empty.textContent = "暂无采集内容";
        itemList.append(empty);
      } else {
        previewItems.forEach((item) => {
          const row = document.createElement("div");
          row.className = "drawer-preview-item";

          const copy = document.createElement("div");
          copy.className = "drawer-preview-copy";

          const text = document.createElement("span");
          text.className = "drawer-preview-text";
          text.textContent = item.text.replace(/\s+/g, " ").trim();
          text.title = item.text;

          const meta = document.createElement("span");
          meta.className = "drawer-preview-meta";
          meta.textContent =
            item.sourceTitle ||
            new Intl.DateTimeFormat("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            }).format(new Date(item.capturedAt));

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "drawer-delete";
          removeButton.title = "删除";
          removeButton.dataset.deleteItem = item.id;
          removeButton.dataset.categoryId = category.id;
          if (activeGroup?.id) {
            removeButton.dataset.groupId = activeGroup.id;
          }
          removeButton.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/></svg>';

          copy.append(text, meta);
          row.append(copy, removeButton);
          itemList.append(row);
        });

        if (categoryItems.length > previewItems.length) {
          const more = document.createElement("div");
          more.className = "drawer-more";
          more.textContent = `另有 ${
            categoryItems.length - previewItems.length
          } 条内容`;
          itemList.append(more);
        }
      }

      group.append(itemList);
      drawerCategoryList.append(group);
    });
  }

  function renderDrawer() {
    const project = getActiveProject();
    const enabled = isCollectionEnabled();
    const drawerVisible = currentState?.sideDrawerVisible !== false;

    host.dataset.sideDrawerVisible = String(drawerVisible);
    if (!drawerVisible) {
      sideDrawer.dataset.open = "false";
      host.dataset.drawerOpen = "false";
    }

    drawerProjectName.textContent = project?.name || "暂无项目";
    renderDrawerProjectSelect();
    renderDrawerGroupSelect(project);

    drawerStatus.dataset.enabled = String(enabled);
    drawerStatusTitle.textContent = enabled ? "采集已启动" : "采集已停止";
    drawerStatusDescription.textContent = enabled
      ? "选中文本后点击类别即可归档"
      : "启动后才能在网页中采集";
    drawerCollectionToggle.textContent = enabled ? "停止" : "启动";
    drawerStateLabel.textContent = enabled ? "运行" : "停止";

    drawerCategoryTotal.textContent = String(
      project?.categories.length || 0
    );
    drawerItemTotal.textContent = String(
      project
        ? project.mode === "multi"
          ? project.groups.reduce(
              (total, group) => total + Object.keys(group.values).length,
              0
            )
          : project.categories.reduce(
              (total, category) => total + category.items.length,
              0
            )
        : 0
    );

    renderDrawerCategories(project);
    drawerDownloadButton.disabled =
      !project || (project.mode === "multi" && !project.groups.length);
  }

  async function refreshState() {
    const response = await sendMessage("GET_STATE");
    currentState = response.state;
    renderDrawer();
    if (!isCollectionEnabled()) {
      pendingSelection = null;
      collectButton.hidden = true;
      panel.hidden = true;
    }
  }

  function renderProjectSelect() {
    projectSelect.replaceChildren();

    if (!currentState?.projects.length) {
      const option = document.createElement("option");
      option.textContent = "暂无项目";
      projectSelect.append(option);
      projectSelect.disabled = true;
      return;
    }

    currentState.projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      option.selected = project.id === currentState.activeProjectId;
      projectSelect.append(option);
    });
    projectSelect.disabled = false;
  }

  function renderCategoryOptions() {
    const project = getActiveProject();
    if (!project) {
      const empty = document.createElement("div");
      empty.className = "empty-project";

      const title = document.createElement("strong");
      title.textContent = "还没有可用项目";

      const description = document.createElement("p");
      description.textContent =
        "先创建项目并设置类别，再回来归档这段内容。";

      const button = document.createElement("button");
      button.className = "create-button";
      button.type = "button";
      button.dataset.action = "create-project";
      button.textContent = "新建项目";

      empty.append(title, description, button);
      panelBody.replaceChildren(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "category-list";

    project.categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-option";
      button.dataset.categoryId = category.id;
      button.style.setProperty("--category-color", category.color);
      button.disabled = busy || !isCollectionEnabled();

      const dot = document.createElement("span");
      dot.className = "category-dot";
      dot.setAttribute("aria-hidden", "true");

      const copy = document.createElement("span");
      copy.className = "category-copy";

      const name = document.createElement("span");
      name.className = "category-name";
      name.textContent = category.name;

      const description = document.createElement("span");
      description.className = "category-description";
      description.textContent =
        category.description || "自定义归档类别";

      const total = document.createElement("span");
      total.className = "category-total";
      total.textContent = String(category.items.length);

      copy.append(name, description);
      button.append(dot, copy, total);
      list.append(button);
    });

    panelBody.replaceChildren(list);
  }

  function renderPanel() {
    renderProjectSelect();
    renderCategoryOptions();
  }

  async function openPanel() {
    if (!pendingSelection?.text) {
      return;
    }
    if (!isCollectionEnabled()) {
      showToast("采集已停止，请先启动采集。", "error");
      return;
    }

    try {
      const response = await sendMessage("GET_STATE");
      currentState = response.state;
      renderPanel();
      panel.hidden = false;
      positionAroundSelection(panel, pendingSelection.rect, 8);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function captureSelection(categoryId) {
    const project = getActiveProject();
    const category = project?.categories.find(
      (candidate) => candidate.id === categoryId
    );
    if (!project || !category || !pendingSelection?.text || busy) {
      return;
    }
    if (!isCollectionEnabled()) {
      showToast("采集已停止，请先启动采集。", "error");
      return;
    }

    busy = true;
    expandedCategoryIds.add(categoryId);
    panelBody.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });

    try {
      const response = await sendMessage("ADD_ITEM", {
        projectId: project.id,
        categoryId,
        text: pendingSelection.text,
        sourceTitle: document.title,
        sourceUrl: window.location.href,
        groupId:
          project.mode === "multi" ? project.activeGroupId : undefined,
        captureMode: true
      });
      currentState = response.state;
      clearSelectionUi();
      renderDrawer();
      focusDrawerCategory(categoryId);
      showToast(`已归档到「${category.name}」`);
    } catch (error) {
      showToast(error.message, "error");
      renderPanel();
    } finally {
      busy = false;
    }
  }

  collectButton.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  collectButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPanel();
  });

  closePanelButton.addEventListener("click", (event) => {
    event.preventDefault();
    panel.hidden = true;
  });

  projectSelect.addEventListener("change", async () => {
    if (!projectSelect.value || busy) {
      return;
    }

    busy = true;
    try {
      const response = await sendMessage("SET_ACTIVE_PROJECT", {
        projectId: projectSelect.value
      });
      currentState = response.state;
      renderPanel();
      renderDrawer();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      busy = false;
    }
  });

  panelBody.addEventListener("click", (event) => {
    const categoryButton = event.target.closest(
      "button[data-category-id]"
    );
    if (categoryButton) {
      captureSelection(categoryButton.dataset.categoryId);
      return;
    }

    const createButton = event.target.closest(
      "button[data-action='create-project']"
    );
    if (createButton) {
      sendMessage("OPEN_WORKSPACE", { create: true })
        .then(() => {
          panel.hidden = true;
        })
        .catch((error) => showToast(error.message, "error"));
    }
  });

  drawerToggle.addEventListener("click", () => {
    const open = sideDrawer.dataset.open !== "true";
    sideDrawer.dataset.open = String(open);
    host.dataset.drawerOpen = String(open);
    drawerToggle.setAttribute(
      "aria-label",
      open ? "关闭采集台" : "打开采集台"
    );
    drawerToggle.title = open ? "关闭采集台" : "打开采集台";
    if (open) {
      refreshState().catch((error) => showToast(error.message, "error"));
    }
  });

  closeDrawerButton.addEventListener("click", () => {
    sideDrawer.dataset.open = "false";
    host.dataset.drawerOpen = "false";
    drawerToggle.setAttribute("aria-label", "打开采集台");
    drawerToggle.title = "打开采集台";
  });

  hideDrawerToggle.addEventListener("click", async () => {
    hideDrawerToggle.disabled = true;
    try {
      const response = await sendMessage("SET_SIDE_DRAWER_VISIBLE", {
        visible: false
      });
      currentState = response.state;
      sideDrawer.dataset.open = "false";
      host.dataset.drawerOpen = "false";
      renderDrawer();
      showToast("侧边采集台悬浮标已隐藏，可在扩展弹窗中重新显示。");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      hideDrawerToggle.disabled = false;
    }
  });

  drawerProjectSelect.addEventListener("change", async () => {
    if (!drawerProjectSelect.value || busy) {
      return;
    }

    busy = true;
    try {
      const response = await sendMessage("SET_ACTIVE_PROJECT", {
        projectId: drawerProjectSelect.value
      });
      currentState = response.state;
      renderDrawer();
      if (!panel.hidden) {
        renderPanel();
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      busy = false;
      renderDrawer();
    }
  });

  drawerGroupSelect.addEventListener("change", async () => {
    const project = getActiveProject();
    if (!project || project.mode !== "multi" || busy) {
      return;
    }

    busy = true;
    try {
      const response = await sendMessage("SET_ACTIVE_GROUP", {
        projectId: project.id,
        groupId: drawerGroupSelect.value
      });
      currentState = response.state;
      renderDrawer();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      busy = false;
      renderDrawer();
    }
  });

  drawerCollectionToggle.addEventListener("click", async () => {
    const enabled = !isCollectionEnabled();
    drawerCollectionToggle.disabled = true;
    try {
      const response = await sendMessage("SET_COLLECTION_ENABLED", {
        enabled
      });
      currentState = response.state;
      renderDrawer();
      if (!enabled) {
        pendingSelection = null;
        collectButton.hidden = true;
        panel.hidden = true;
      }
      showToast(enabled ? "网页采集已启动。" : "网页采集已停止。");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      drawerCollectionToggle.disabled = false;
    }
  });

  drawerCategoryList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("button[data-delete-item]");
    const project = getActiveProject();
    if (deleteButton) {
      if (!project || busy) {
        return;
      }

      busy = true;
      try {
        const response = await sendMessage(
          deleteButton.dataset.groupId
            ? "DELETE_GROUP_VALUE"
            : "DELETE_ITEM",
          {
          projectId: project.id,
          categoryId: deleteButton.dataset.categoryId,
          itemId: deleteButton.dataset.deleteItem,
          groupId: deleteButton.dataset.groupId
          }
        );
        currentState = response.state;
        renderDrawer();
        showToast("采集内容已删除。");
      } catch (error) {
        showToast(error.message, "error");
        refreshState().catch(() => {});
      } finally {
        busy = false;
        renderDrawer();
      }
      return;
    }

    const categoryButton = event.target.closest(
      "button[data-action='preview-or-capture']"
    );
    if (!categoryButton) {
      return;
    }

    const categoryId = categoryButton.dataset.categoryId;
    if (pendingSelection?.text && isCollectionEnabled()) {
      expandedCategoryIds.add(categoryId);
      captureSelection(categoryId);
      return;
    }

    if (expandedCategoryIds.has(categoryId)) {
      expandedCategoryIds.delete(categoryId);
    } else {
      expandedCategoryIds.add(categoryId);
    }
    renderDrawerCategories(getActiveProject());
  });

  drawerDownloadButton.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) {
      showToast("当前没有可下载的项目。", "error");
      return;
    }

    if (drawerDownloadFormat.value === "docx") {
      downloadProjectDocx(project);
      showToast("Word 文档已下载。");
      return;
    }

    downloadProjectText(project);
    showToast("项目文本已下载。");
  });

  document.addEventListener("selectionchange", () => {
    scheduleSelectionUpdate();
  });

  document.addEventListener("mouseup", () => {
    scheduleSelectionUpdate(0);
  });

  document.addEventListener("keyup", (event) => {
    if (event.key === "Shift" || event.shiftKey) {
      scheduleSelectionUpdate(0);
    }
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.composedPath().includes(host)) {
        panel.hidden = true;
      }
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearSelectionUi();
      pendingSelection = null;
      if (sideDrawer.dataset.open === "true") {
        sideDrawer.dataset.open = "false";
        host.dataset.drawerOpen = "false";
      }
    }
  });

  window.addEventListener("scroll", () => {
    collectButton.hidden = true;
    panel.hidden = true;
  }, true);

  window.addEventListener("resize", () => {
    collectButton.hidden = true;
    panel.hidden = true;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName !== "local" ||
      !Object.prototype.hasOwnProperty.call(changes, "archiveState")
    ) {
      return;
    }

    window.clearTimeout(stateRefreshTimer);
    stateRefreshTimer = window.setTimeout(() => {
      refreshState().catch((error) => {
        showToast(error.message, "error");
      });
    }, 80);
  });

  const pageObserver = new MutationObserver(() => {
    if (
      !document.documentElement.contains(host) &&
      chrome.runtime?.id
    ) {
      document.documentElement.append(host);
    }
  });
  pageObserver.observe(document.documentElement, { childList: true });

  refreshState().catch((error) => {
    console.debug("读取采集状态失败：", error);
  });
})();
