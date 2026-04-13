// ── Bebras CMS — Content Editor ─────────────────────────
// Dynamic form generation for all 15 JSON content files.
// Reads the live JSON data, builds form fields, saves back via API.
// Preview uses a persistent Astro dev server with HMR for instant updates.

const Editor = {
  currentFile: null,
  currentData: null,
  dirty: false,
  devServerReady: false,
  devServerStarting: false,
  collapsedItems: new Set(),
  itemExpandedState: new Map(),

  // ── Map content files to landing page routes ────────────
  // Used to load the correct page in the preview iframe.
  fileToPage: {
    "site.json": "/",
    "navigation.json": "/",
    "hero.json": "/",
    "about.json": "/",
    "categories.json": "/",
    "scoring.json": "/",
    "news.json": "/",
    "faq.json": "/faq/",
    "teacher-instructions.json": "/docentes/",
    "sponsors.json": "/sponsors/",
    "contact.json": "/contacto/",
    "registro.json": "/registro/",
    "estudiantes.json": "/estudiantes/",
    "docentes.json": "/docentes/",
    "blog-ui.json": "/blog/",
  },

  // ── Schema hints: field types that need special treatment ─
  // By default all string fields become text inputs; these overrides
  // specify textarea, url, select, etc.
  fieldHints: {
    // Global hints (match any field path ending with these keys)
    href: "url",
    siteUrl: "url",
    trademarkUrl: "url",
    linkHref: "url",
    buttonHref: "url",
    ctaHref: "url",
    link: "url",           // news.json slides[].link
    image: "text",
    src: "text",
    defaultDescription: "textarea",
    subtitle: "textarea",
    body: "textarea",
    description: "textarea",
    paragraph: "textarea",
    answer: "textarea",
    desc: "textarea",
    intro: "textarea",
    outro: "textarea",
    tip: "textarea",
    text: "textarea",
    pageDescription: "textarea",
    headingHighlight: "text",
    instruction: "textarea",
    disclaimer: "textarea",
    content: "textarea",    // string arrays rendered as textarea per item
    brandDescription: "textarea",
    copyrightText: "textarea",
    trademarkNote: "textarea",
    color: "color",
  },

  selectOptions: {
    variant: ["button", "link"],
    status: ["positive", "neutral", "negative"],
    icon: ["monitor", "wifi", "user", "clock", "email", "clipboard", "share"],
    color: ["emerald", "amber", "sky", "violet", "rose", "orange", "indigo"],
  },

  hiddenFields: new Set(["id", "pageTitle", "pageDescription"]),

  // ── Render the editor for a file ────────────────────────
  async render(filename) {
    const main = document.getElementById("main-content");
    if (!main) return;

    this.currentFile = filename;
    this.dirty = false;

    try {
      this.currentData = await API.getContent(filename);

      const meta = App.contentMeta[filename] || { label: filename, desc: "" };

      if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
        main.innerHTML = '<div id="react-editor-primitives-root"></div>';
        const root = document.getElementById("react-editor-primitives-root");
        if (root && this.mountReactPrimitives(root, meta.label, filename)) {
          return;
        }
      }

      main.innerHTML = `
        <div class="editor-toolbar">
          <div>
            <h2>${App.escapeHtml(meta.label)}</h2>
            <span class="text-sm text-muted">${App.escapeHtml(filename)}</span>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-ghost btn-sm" id="editor-reset">${App.icon("refresh")} Resetear</button>
            <button class="btn btn-primary btn-sm" id="editor-save">${App.icon("save")} Guardar</button>
          </div>
        </div>
        <div class="editor-layout">
          <div class="editor-form" id="editor-form"></div>
          <div class="editor-preview" id="editor-preview-panel">
            <div class="preview-overlay" id="preview-overlay" style="display:none;">
              <div class="spinner"></div>
              <span id="preview-overlay-text">Iniciando servidor de vista previa...</span>
            </div>
            <iframe id="preview-frame" src="about:blank"></iframe>
          </div>
        </div>`;

      // Render form fields
      const formContainer = document.getElementById("editor-form");
      this.renderFields(formContainer, this.currentData, "");

      if (this.currentFile === "blog-ui.json") {
        await this.renderBlogPostsSection(formContainer);
      }

      // Bind save/reset
      document.getElementById("editor-save").addEventListener("click", () => this.save());
      document.getElementById("editor-reset").addEventListener("click", () => this.reset());

      // Start dev server and load preview
      this.ensureDevServer();

      // Mark dirty on any input change
      formContainer.addEventListener("input", () => {
        this.dirty = true;
      });


    } catch (err) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  },

  // ── Recursive field renderer ────────────────────────────
  // Walks the data object and generates form fields.
  // `path` is a dot-separated key path (e.g. "header.tag").

  renderFields(container, data, path, depth = 0) {
    if (data === null || data === undefined) return;

    if (Array.isArray(data)) {
      this.renderArray(container, data, path, depth);
    } else if (typeof data === "object") {
      this.renderObject(container, data, path, depth);
    } else {
      // Primitive — should be handled by parent
      this.renderPrimitive(container, data, path);
    }
  },

  renderObject(container, obj, path, depth) {
    const keys = Object.keys(obj);

    for (const key of keys) {
      const val = obj[key];
      const fieldPath = path ? `${path}.${key}` : key;

       if (this.shouldHideField(key)) continue;

      if (val === null || val === undefined) continue;

      if (Array.isArray(val)) {
        this.renderArray(container, val, fieldPath, depth);
      } else if (typeof val === "object") {
        // Nested object — render as a section
        const section = document.createElement("div");
        section.className = "field-section";

        const title = document.createElement("div");
        title.className = "field-section-title";
        title.textContent = this.formatLabel(key);
        section.appendChild(title);

        this.renderObject(section, val, fieldPath, depth + 1);
        container.appendChild(section);
      } else {
        // Primitive value
        this.renderPrimitive(container, val, fieldPath);
      }
    }
  },

  renderPrimitive(container, value, path) {
    const key = path.split(".").pop();
    const type = this.getFieldType(path, value);
    const isAutoNumberField = this.isAutoNumberField(path);

    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.textContent = this.formatLabel(key);
    label.setAttribute("for", `field-${path}`);
    group.appendChild(label);

    let input;
    let bindPath = true;
    if (type === "textarea") {
      input = document.createElement("textarea");
      input.className = "form-textarea";
      input.value = String(value);
      input.rows = Math.min(6, Math.max(2, String(value).split("\n").length + 1));
      input.setAttribute("data-value-type", "string");
    } else if (type === "boolean") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(value);
      input.style.width = "16px";
      input.style.height = "16px";
      input.setAttribute("data-value-type", "boolean");
    } else if (type === "number") {
      input = document.createElement("input");
      input.type = isAutoNumberField ? "text" : "number";
      input.className = "form-input";
      input.value = String(value);
      if (isAutoNumberField) {
        input.readOnly = true;
        input.disabled = true;
        bindPath = false;
      } else {
        input.setAttribute("data-value-type", "number");
      }
    } else if (type === "select") {
      input = document.createElement("select");
      input.className = "form-select";
      const options = this.selectOptions[key] || [];
      options.forEach((opt) => {
        const optionEl = document.createElement("option");
        optionEl.value = opt;
        optionEl.textContent = this.formatLabel(opt);
        input.appendChild(optionEl);
      });
      input.value = String(value);
      input.setAttribute("data-value-type", "string");
    } else if (type === "color") {
      // Color: show both a color picker and text input
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.gap = "0.5rem";
      wrapper.style.alignItems = "center";

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = this.toHexColor(value);
      colorInput.style.width = "40px";
      colorInput.style.height = "32px";
      colorInput.style.border = "none";
      colorInput.style.cursor = "pointer";

      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.className = "form-input";
      textInput.value = String(value);
      textInput.id = `field-${path}`;
      textInput.setAttribute("data-path", path);
      textInput.setAttribute("data-value-type", "string");

      // Sync
      colorInput.addEventListener("input", () => {
        textInput.value = colorInput.value;
        textInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
      textInput.addEventListener("input", () => {
        try {
          colorInput.value = this.toHexColor(textInput.value);
        } catch {}
      });

      wrapper.appendChild(colorInput);
      wrapper.appendChild(textInput);
      group.appendChild(wrapper);
      container.appendChild(group);
      return;
    } else {
      input = document.createElement("input");
      input.type = type === "url" ? "url" : "text";
      input.className = "form-input";
      input.value = String(value);
      input.setAttribute("data-value-type", "string");
    }

    input.id = `field-${path}`;
    if (bindPath) input.setAttribute("data-path", path);

    if (type === "text" && this.isImagePathField(path, value)) {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.gap = "0.5rem";
      wrapper.style.alignItems = "center";

      wrapper.appendChild(input);

      const mediaBtn = document.createElement("button");
      mediaBtn.type = "button";
      mediaBtn.className = "btn btn-ghost btn-sm";
      mediaBtn.textContent = "Media";
      mediaBtn.addEventListener("click", async () => {
        if (window.CMSMediaPicker && typeof window.CMSMediaPicker.open === "function") {
          const selected = await window.CMSMediaPicker.open();
          if (selected) {
            input.value = selected;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      });
      wrapper.appendChild(mediaBtn);

      group.appendChild(wrapper);
      container.appendChild(group);
      return;
    }

    group.appendChild(input);
    container.appendChild(group);
  },

  renderArray(container, arr, path, depth) {
    const key = path.split(".").pop();

    const section = document.createElement("div");
    section.className = "field-section";

    const header = document.createElement("div");
    header.className = "field-section-title";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.innerHTML = `
      <span>${this.formatLabel(key)} (${arr.length})</span>
    `;
    section.appendChild(header);

    const arrayContainer = document.createElement("div");
    arrayContainer.className = "array-field";
    arrayContainer.setAttribute("data-array-path", path);

    // Check type of array items
    if (arr.length > 0 && typeof arr[0] === "string") {
      // Array of strings
      this.renderStringArray(arrayContainer, arr, path);
    } else if (arr.length > 0 && typeof arr[0] === "object") {
      // Array of objects
      this.renderObjectArray(arrayContainer, arr, path, depth);
    }

    section.appendChild(arrayContainer);

    // Special: component picker modal for shared components arrays
    if (path === "components") {
      if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
        const actionId = `arr-action-${path}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this._arrayActionTargets.push({
          id: actionId,
          path,
          currentArr: arr,
          options: [],
          mode: "button",
          buttonLabel: "Agregar nuevo componente",
          action: "component-modal",
        });
        const placeholder = document.createElement("div");
        placeholder.setAttribute("data-array-action-placeholder", actionId);
        section.appendChild(placeholder);
      } else {
        const addBtn = document.createElement("button");
        addBtn.className = "add-item-btn component-add-btn";
        addBtn.type = "button";
        addBtn.textContent = "Agregar nuevo componente";
        addBtn.addEventListener("click", () => {
          this.openAddComponentModal(path, arr);
        });
        section.appendChild(addBtn);
      }
      container.appendChild(section);
      return;
    }

    // Add item button
    const addOptions = this.getAddTypeOptions(path, arr);
    if (addOptions && addOptions.length > 0) {
      if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
        const actionId = `arr-action-${path}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this._arrayActionTargets.push({ id: actionId, path, currentArr: arr, options: addOptions, mode: "select", action: "direct" });
        const placeholder = document.createElement("div");
        placeholder.setAttribute("data-array-action-placeholder", actionId);
        section.appendChild(placeholder);
      } else {
        const picker = document.createElement("div");
        picker.className = "editor-block-picker";

        const typeSelect = document.createElement("select");
        typeSelect.className = "form-select type-select";
        addOptions.forEach((opt) => {
          const optionEl = document.createElement("option");
          optionEl.value = opt.value;
          optionEl.textContent = opt.label;
          typeSelect.appendChild(optionEl);
        });

        const addBtn = document.createElement("button");
        addBtn.className = "add-item-btn";
        addBtn.type = "button";
        addBtn.textContent = "Agregar bloque";
        addBtn.addEventListener("click", () => {
          this.addArrayItem(path, arr, typeSelect.value);
        });

        picker.appendChild(typeSelect);
        picker.appendChild(addBtn);
        section.appendChild(picker);
      }
    } else {
      if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
        const actionId = `arr-action-${path}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this._arrayActionTargets.push({ id: actionId, path, currentArr: arr, options: [], mode: "button", buttonLabel: "Agregar", action: "direct" });
        const placeholder = document.createElement("div");
        placeholder.setAttribute("data-array-action-placeholder", actionId);
        section.appendChild(placeholder);
      } else {
        const addBtn = document.createElement("button");
        addBtn.className = "add-item-btn";
        addBtn.type = "button";
        addBtn.textContent = "Agregar";
        addBtn.addEventListener("click", () => {
          this.addArrayItem(path, arr);
        });
        section.appendChild(addBtn);
      }
    }

    container.appendChild(section);
  },

  renderStringArray(container, arr, path) {
    container.setAttribute("data-dnd-array", path);

    arr.forEach((val, idx) => {
      const itemPath = `${path}[${idx}]`;
      const item = document.createElement("div");
      item.className = "array-item";
      item.setAttribute("draggable", "false");
      item.setAttribute("data-dnd-idx", idx);

      // Drag handle
      const handle = document.createElement("div");
      handle.className = "drag-handle";
      handle.innerHTML = App.icon("grip");
      handle.title = "Arrastrar para reordenar";
      item.appendChild(handle);

      const type = this.getFieldType(path.split(".").pop(), val);
      let input;
      if (type === "textarea") {
        input = document.createElement("textarea");
        input.className = "form-textarea";
        input.rows = 2;
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className = "form-input";
      }
      input.value = val;
      input.setAttribute("data-path", itemPath);
      item.appendChild(input);

      const removeBtn = document.createElement("button");
      if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
        const actionId = `arr-item-${itemPath}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this._arrayItemActionTargets.push({ id: actionId, path, idx, inline: false });
        const placeholder = document.createElement("div");
        placeholder.setAttribute("data-array-item-action-placeholder", actionId);
        item.appendChild(placeholder);
      } else {
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = App.icon("trash");
        removeBtn.title = "Eliminar";
        removeBtn.addEventListener("click", () => {
          this.removeArrayItem(path, idx);
        });
        item.appendChild(removeBtn);
      }

      // DnD events
      this.attachDragEvents(item, container, path);

      container.appendChild(item);
    });
  },

  renderObjectArray(container, arr, path, depth) {
    container.setAttribute("data-dnd-array", path);

    arr.forEach((obj, idx) => {
      const itemPath = `${path}[${idx}]`;
      const isCollapsible = this.isCollapsibleArray(path);
      if (isCollapsible && !this.itemExpandedState.has(itemPath)) {
        this.itemExpandedState.set(itemPath, false);
      }
      const isExpanded = isCollapsible ? this.itemExpandedState.get(itemPath) === true : true;

      const item = document.createElement("div");
      item.className = "array-item";
      item.setAttribute("draggable", "false");
      item.setAttribute("data-dnd-idx", idx);

      // Header row with drag handle, index label, and remove button
      const header = document.createElement("div");
      header.style.cssText =
        "font-size:0.6875rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;width:100%;";

      const handleSpan = document.createElement("span");
      handleSpan.className = "drag-handle";
      handleSpan.innerHTML = App.icon("grip");
      handleSpan.title = "Arrastrar para reordenar";
      handleSpan.style.cssText = "margin-right:0.5rem;";

      const labelSpan = document.createElement("span");
      labelSpan.textContent = this.getArrayItemLabel(obj, idx);

      const leftGroup = document.createElement("span");
      leftGroup.style.cssText = "display:flex;align-items:center;";
      leftGroup.appendChild(handleSpan);
      leftGroup.appendChild(labelSpan);

      const rightGroup = document.createElement("span");
      rightGroup.style.cssText = "display:flex;align-items:center;gap:0.375rem;padding-right:0rem;";

      if (isCollapsible) {
        if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
          const collapseId = `arr-collapse-${itemPath}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          this._arrayCollapseTargets.push({ id: collapseId, itemPath, expanded: isExpanded });
          const placeholder = document.createElement("div");
          placeholder.setAttribute("data-array-collapse-placeholder", collapseId);
          leftGroup.appendChild(placeholder);
        } else {
          const collapseBtn = document.createElement("button");
          collapseBtn.type = "button";
          collapseBtn.className = "array-collapse-btn";
          collapseBtn.innerHTML = `${App.icon("arrow")}`;
          collapseBtn.title = isExpanded ? "Minimizar" : "Expandir";
          collapseBtn.setAttribute("aria-expanded", String(isExpanded));
          if (!isExpanded) collapseBtn.classList.add("collapsed");
          leftGroup.appendChild(collapseBtn);
        }
      }

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = App.icon("trash");
      removeBtn.title = "Eliminar";
      removeBtn.addEventListener("click", () => {
        this.removeArrayItem(path, idx);
      });

      if (isCollapsible) {
        if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
          const actionId = `arr-item-${itemPath}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          this._arrayItemActionTargets.push({ id: actionId, path, idx, inline: true });
          const placeholder = document.createElement("div");
          placeholder.setAttribute("data-array-item-action-placeholder", actionId);
          rightGroup.appendChild(placeholder);
        } else {
          removeBtn.classList.add("inline-remove-btn");
          rightGroup.appendChild(removeBtn);
        }
      }

      header.appendChild(leftGroup);
      if (isCollapsible) {
        header.appendChild(rightGroup);
      }
      item.appendChild(header);

      const body = document.createElement("div");
      body.className = "array-item-body";
      if (isCollapsible && !isExpanded) {
        body.style.display = "none";
      }

      // Render each field in the object
      this.renderObject(body, obj, itemPath, depth + 1);
      item.appendChild(body);

      if (isCollapsible) {
        const collapseBtn = item.querySelector(".array-collapse-btn");
        if (collapseBtn && !(window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function")) {
          collapseBtn.addEventListener("click", () => {
            const isOpen = body.style.display !== "none";
            if (isOpen) {
              body.style.display = "none";
              collapseBtn.classList.add("collapsed");
              collapseBtn.setAttribute("aria-expanded", "false");
              collapseBtn.title = "Expandir";
              this.collapsedItems.add(itemPath);
              this.itemExpandedState.set(itemPath, false);
            } else {
              body.style.display = "";
              collapseBtn.classList.remove("collapsed");
              collapseBtn.setAttribute("aria-expanded", "true");
              collapseBtn.title = "Minimizar";
              this.collapsedItems.delete(itemPath);
              this.itemExpandedState.set(itemPath, true);
            }
          });
        }
      }

      if (!isCollapsible) {
        if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
          const actionId = `arr-item-${itemPath}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          this._arrayItemActionTargets.push({ id: actionId, path, idx, inline: false });
          const placeholder = document.createElement("div");
          placeholder.setAttribute("data-array-item-action-placeholder", actionId);
          item.appendChild(placeholder);
        } else {
          item.appendChild(removeBtn);
        }
      }

      // DnD events
      this.attachDragEvents(item, container, path);

      container.appendChild(item);
    });
  },

  // ── Array mutations ─────────────────────────────────────

  rerenderEditorForm() {
    const root = document.getElementById("react-editor-primitives-root");
    if (root && window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
      const meta = App.contentMeta[this.currentFile] || { label: this.currentFile, desc: "" };
      this.mountReactPrimitives(root, meta.label, this.currentFile);
      return;
    }

    const formContainer = document.getElementById("editor-form");
    if (!formContainer) return;
    formContainer.innerHTML = "";
    this.renderFields(formContainer, this.currentData, "");
    formContainer.addEventListener("input", () => {
      this.dirty = true;
    });
  },

  addArrayItem(path, currentArr, selectedType = null) {
    if (selectedType) {
      const typedTemplate = this.createTypedArrayItem(path, selectedType);
      if (typedTemplate !== null) {
        this.setNestedValue(this.currentData, path, [...currentArr, typedTemplate]);
        this.normalizeStructuredArrays();
        this.dirty = true;
        this.collectFormData();
        this.rerenderEditorForm();
        return;
      }
    }

    if (currentArr.length === 0) {
      const emptyTemplate = this.createEmptyArrayItem(path);
      this.setNestedValue(this.currentData, path, [...currentArr, emptyTemplate]);
    } else {
      const template = currentArr[currentArr.length - 1];
      if (typeof template === "string") {
        this.setNestedValue(this.currentData, path, [...currentArr, ""]);
      } else if (typeof template === "object") {
        // Clone template with empty values
        const blank = this.blankClone(template);
        this.setNestedValue(this.currentData, path, [...currentArr, blank]);
      }
    }
    this.normalizeStructuredArrays();
    this.dirty = true;
    // Re-render the whole form
    this.collectFormData();
    this.rerenderEditorForm();
  },

  removeArrayItem(path, idx) {
    this.collectFormData();
    const arr = this.getNestedValue(this.currentData, path);
    if (Array.isArray(arr)) {
      arr.splice(idx, 1);
      this.setNestedValue(this.currentData, path, arr);
    }
    this.normalizeStructuredArrays();
    this.dirty = true;
    this.rerenderEditorForm();
  },

  // ── Drag-and-drop reordering ────────────────────────────

  _dragState: null,
  _dndBoundContainers: new WeakSet(),
  _arrayActionTargets: [],
  _arrayItemActionTargets: [],
  _arrayCollapseTargets: [],

  attachDragEvents(item, container, arrayPath) {
    this.bindContainerDnd(container, arrayPath);
    const handle = item.querySelector(".drag-handle");
    if (handle) {
      handle.addEventListener("mousedown", () => {
        item.setAttribute("draggable", "true");
      });
      handle.addEventListener("mouseup", () => {
        item.setAttribute("draggable", "false");
      });
    }
  },

  bindContainerDnd(container, arrayPath) {
    if (this._dndBoundContainers.has(container)) return;
    this._dndBoundContainers.add(container);

    container.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".array-item");
      if (!item) return;
      this._dragState = {
        arrayPath,
        fromIdx: parseInt(item.getAttribute("data-dnd-idx"), 10),
        container,
      };
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    });

    container.addEventListener("dragend", (e) => {
      const item = e.target.closest(".array-item");
      if (item) {
        item.classList.remove("dragging");
        item.setAttribute("draggable", "false");
      }
      container.querySelectorAll(".array-item").forEach((el) => {
        el.classList.remove("drag-over-above", "drag-over-below");
      });
      this._dragState = null;
    });

    container.addEventListener("dragover", (e) => {
      if (!this._dragState || this._dragState.arrayPath !== arrayPath) return;
      const item = e.target.closest(".array-item");
      if (!item) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isAbove = e.clientY < midY;

      container.querySelectorAll(".array-item").forEach((el) => {
        el.classList.remove("drag-over-above", "drag-over-below");
      });
      item.classList.add(isAbove ? "drag-over-above" : "drag-over-below");
    });

    container.addEventListener("drop", (e) => {
      if (!this._dragState || this._dragState.arrayPath !== arrayPath) return;
      const item = e.target.closest(".array-item");
      if (!item) return;

      e.preventDefault();
      const fromIdx = this._dragState.fromIdx;
      const toIdx = parseInt(item.getAttribute("data-dnd-idx"), 10);

      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isAbove = e.clientY < midY;

      let targetIdx = isAbove ? toIdx : toIdx + 1;
      if (fromIdx < targetIdx) targetIdx--;

      if (fromIdx !== targetIdx) {
        this.moveArrayItem(arrayPath, fromIdx, targetIdx);
      }

      container.querySelectorAll(".array-item").forEach((el) => {
        el.classList.remove("drag-over-above", "drag-over-below");
      });
      this._dragState = null;
    });
  },

  moveArrayItem(path, fromIdx, toIdx) {
    this.collectFormData();
    const arr = this.getNestedValue(this.currentData, path);
    if (!Array.isArray(arr) || fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= arr.length) return;
    if (toIdx < 0 || toIdx >= arr.length) return;

    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    this.setNestedValue(this.currentData, path, arr);
    this.normalizeStructuredArrays();

    this.dirty = true;
    this.rerenderEditorForm();
  },

  blankClone(obj) {
    if (Array.isArray(obj)) {
      return [];
    }
    if (typeof obj === "object" && obj !== null) {
      const clone = {};
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) {
          clone[k] = [];
        } else if (typeof v === "object" && v !== null) {
          clone[k] = this.blankClone(v);
        } else {
          clone[k] = "";
        }
      }
      return clone;
    }
    return "";
  },

  // ── Collect all form data back into the data object ─────

  collectFormData() {
    const inputs = document.querySelectorAll("[data-path]");
    inputs.forEach((input) => {
      const path = input.getAttribute("data-path");
      const value = this.parseInputValue(input);
      this.setNestedValue(this.currentData, path, value);
    });
  },

  async renderBlogPostsSection(container) {
    const section = document.createElement("div");
    section.className = "field-section";

    const title = document.createElement("div");
    title.className = "field-section-title";
    title.textContent = "Publicaciones";
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "blog-links-list";
    list.innerHTML = `<div class="text-sm text-muted">Cargando publicaciones...</div>`;
    section.appendChild(list);

    container.appendChild(section);

    try {
      const data = await API.listBlog();
      const posts = (data.posts || []).sort((a, b) => new Date(b.date) - new Date(a.date));

      if (posts.length === 0) {
        list.innerHTML = `<div class="text-sm text-muted">No hay publicaciones creadas.</div>`;
        return;
      }

      list.innerHTML = posts
        .map((post) => {
          const slug = App.escapeHtml(post.slug);
          const title = App.escapeHtml(post.title || post.slug);
          const date = new Date(post.date).toLocaleDateString("es-BO", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          return `
            <button class="blog-link-item" type="button" data-blog-slug="${slug}">
              <span class="blog-link-title">${title}</span>
              <span class="blog-link-meta">${slug} — ${date}</span>
            </button>
          `;
        })
        .join("");

      list.querySelectorAll(".blog-link-item").forEach((el) => {
        el.addEventListener("click", () => {
          const slug = el.getAttribute("data-blog-slug");
          if (!slug) return;
          App.navigate(`/blog/edit/${encodeURIComponent(slug)}`);
        });
      });
    } catch (err) {
      list.innerHTML = `<div class="text-sm text-muted">No se pudieron cargar las publicaciones.</div>`;
    }
  },

  parseInputValue(input) {
    const valueType = input.getAttribute("data-value-type") || "string";
    if (valueType === "boolean") {
      return Boolean(input.checked);
    }
    if (valueType === "number") {
      const n = Number(input.value);
      return Number.isNaN(n) ? 0 : n;
    }
    return input.value;
  },

  // ── Save ────────────────────────────────────────────────

  async save() {
    const saveBtn = document.getElementById("editor-save");
    if (!saveBtn) return;

    this.collectFormData();

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Guardando...';

    try {
      await API.saveContent(this.currentFile, this.currentData);
      this.dirty = false;

      if (this.devServerReady) {
        Toast.success("Guardado — la vista previa se actualiza automaticamente");
      } else {
        Toast.success("Contenido guardado");
      }
    } catch (err) {
      // Show validation details if available
      if (err.details) {
        Toast.error(`Error de validacion: ${err.details}`);
      } else {
        Toast.error(`Error al guardar: ${err.message}`);
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${App.icon("save")} Guardar`;
    }
  },

  // ── Reset ───────────────────────────────────────────────

  async reset() {
    this.collectFormData();

    try {
      await API.syncPreviewDraft(this.currentFile, this.currentData);
      this.loadPreviewIframe(true);
      Toast.info("Vista previa actualizada con tus cambios");
    } catch (err) {
      if (err && err.message) {
        Toast.error(`No se pudo actualizar la vista previa: ${err.message}`);
      } else {
        Toast.error("No se pudo actualizar la vista previa");
      }
    }
  },

  // ── Preview ────────────────────────────────────────────

  /**
   * Ensure the Astro dev server is running, then load the preview iframe.
   * Called when the editor opens a file.
   */
  async ensureDevServer() {
    const overlay = document.getElementById("preview-overlay");
    const overlayText = document.getElementById("preview-overlay-text");
    const iframe = document.getElementById("preview-frame");

    // Check if already running
    try {
      const status = await API.previewStatus();
      if (status.running) {
        this.devServerReady = true;
        this.devServerPort = status.port;
        this.loadPreviewIframe();
        return;
      }
    } catch {
      // Ignore — will try to start
    }

    // Show starting overlay
    if (overlay) overlay.style.display = "flex";
    if (overlayText) overlayText.textContent = "Iniciando servidor de vista previa...";
    this.devServerStarting = true;

    try {
      const result = await API.startPreview();
      this.devServerReady = true;
      this.devServerStarting = false;
      this.devServerPort = result.port;

      // Small delay to let the dev server stabilize
      await new Promise((r) => setTimeout(r, 500));

      this.loadPreviewIframe();
      Toast.success("Vista previa lista — los cambios se actualizan al guardar");
    } catch (err) {
      this.devServerStarting = false;
      Toast.error(`Error al iniciar vista previa: ${err.message}`);

      // Show error in iframe
      if (iframe) {
        iframe.srcdoc = `<html><body style="font-family:system-ui;padding:2rem;background:#1a1a2e;color:#e2e8f0;">
          <h3 style="color:#ef4444;">Error al iniciar el servidor de vista previa</h3>
          <pre style="white-space:pre-wrap;font-size:0.8rem;background:#0f0f23;padding:1rem;border-radius:6px;overflow:auto;color:#94a3b8;">${this.escapeForPre(err.message)}</pre>
          <p style="color:#94a3b8;margin-top:1rem;">Podes guardar contenido normalmente. La vista previa se actualizara cuando el servidor este listo.</p>
        </body></html>`;
      }
    } finally {
      if (overlay) overlay.style.display = "none";
    }
  },

  /**
   * Load the correct landing page in the preview iframe.
   * Points directly to the Astro dev server for full HMR support.
   */
  loadPreviewIframe(forceReload = false) {
    const iframe = document.getElementById("preview-frame");
    if (!iframe) return;

    const pagePath = this.fileToPage[this.currentFile] || "/";

    if (this.devServerReady && this.devServerPort) {
      // Point directly to Astro dev server for native HMR WebSocket support
      const base = `http://localhost:${this.devServerPort}${pagePath}`;
      iframe.src = forceReload ? `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}` : base;
    } else {
      // Fallback: use proxied path (no HMR, but content still shows)
      const base = `/preview-site${pagePath}`;
      iframe.src = forceReload ? `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}` : base;
    }
  },

  // ── Helpers ─────────────────────────────────────────────

  formatLabel(key) {
    if (!key) return "";
    // Convert camelCase/kebab-case to words
    return key
      .replace(/[-_]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  },

  mountReactPrimitives(root, title, filename) {
    const primitiveFields = this.extractPrimitiveFields(this.currentData);
    if (!window.CMSEditor || typeof window.CMSEditor.mountPrimitives !== "function") {
      return false;
    }

    window.CMSEditor.mountPrimitives(root, {
      title,
      filename,
      fields: primitiveFields,
      icons: App.icons,
      onSave: () => this.save(),
      onReset: () => this.reset(),
      onFieldChange: (path, value) => {
        this.setNestedValue(this.currentData, path, value);
        this.dirty = true;
      },
      onInitPreview: () => this.ensureDevServer(),
      onInitComplex: (el) => {
        this._arrayActionTargets = [];
        this._arrayItemActionTargets = [];
        this._arrayCollapseTargets = [];
        el.addEventListener("input", () => {
          this.dirty = true;
        });

        if (this.currentFile === "blog-ui.json") {
          this.renderBlogPostsSection(el);
        }
      },
      complexNodes: this.buildComplexNodes(this.currentData, ""),
      onArrayMount: (path, el) => {
        const value = this.getNestedValue(this.currentData, path);
        if (!Array.isArray(value)) return;
        this.renderArray(el, value, path, 0);
      },
      getArrayActionTargets: () => [...this._arrayActionTargets],
      onAddArrayItem: (id, selectedType) => {
        const target = this._arrayActionTargets.find((x) => x.id === id);
        if (!target) return;
        if (target.action === "component-modal") {
          this.openAddComponentModal(target.path, target.currentArr);
          return;
        }
        this.addArrayItem(target.path, target.currentArr, selectedType || null);
      },
      getArrayItemActionTargets: () => [...this._arrayItemActionTargets],
      onRemoveArrayItem: (id) => {
        const target = this._arrayItemActionTargets.find((x) => x.id === id);
        if (!target) return;
        this.removeArrayItem(target.path, target.idx);
      },
      getArrayCollapseTargets: () => [...this._arrayCollapseTargets],
      onToggleArrayCollapse: (id) => {
        const target = this._arrayCollapseTargets.find((x) => x.id === id);
        if (!target) return;
        const nextExpanded = !target.expanded;
        this.itemExpandedState.set(target.itemPath, nextExpanded);
        if (nextExpanded) {
          this.collapsedItems.delete(target.itemPath);
        } else {
          this.collapsedItems.add(target.itemPath);
        }
        this.rerenderEditorForm();
      },
    });

    return true;
  },

  buildComplexNodes(obj, path = "") {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const nodes = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (this.shouldHideField(key)) return;
      const fieldPath = path ? `${path}.${key}` : key;
      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        nodes.push({ kind: "array", path: fieldPath, label: this.formatLabel(key) });
        return;
      }

      if (typeof value === "object") {
        const children = this.buildComplexNodes(value, fieldPath);
        if (children.length > 0) {
          nodes.push({ kind: "object", path: fieldPath, label: this.formatLabel(key), children });
        }
      }
    });

    return nodes;
  },

  extractPrimitiveFields(obj, path = "") {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const out = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (this.shouldHideField(key)) return;
      const fieldPath = path ? `${path}.${key}` : key;

      if (value === null || value === undefined) return;
      if (Array.isArray(value)) return;

      if (typeof value === "object") {
        out.push(...this.extractPrimitiveFields(value, fieldPath));
        return;
      }

      const type = this.getFieldType(fieldPath, value);
      const editorType = type === "textarea" || type === "boolean" || type === "number" || type === "url" || type === "select"
        ? type
        : "text";
      const readOnly = editorType === "number" && this.isAutoNumberField(fieldPath);

      out.push({
        path: fieldPath,
        label: this.formatLabel(key),
        type: editorType,
        value,
        options: editorType === "select" ? this.selectOptions[key] || [] : undefined,
        readOnly,
      });
    });

    return out;
  },

  getFieldType(keyOrPath, value) {
    const key = String(keyOrPath).split(".").pop();
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (this.selectOptions[key]) return "select";
    if (this.fieldHints[key]) return this.fieldHints[key];
    if (typeof value === "string" && value.length > 100) return "textarea";
    return "text";
  },

  isImagePathField(path, value) {
    if (typeof value !== "string") return false;
    const key = String(path).split(".").pop() || "";
    if (["image", "src", "logo", "icon"].includes(key)) return true;
    return value.startsWith("/images/") || value.startsWith("/api/media/file/");
  },

  isAutoNumberField(path) {
    if (!/\.items\[\d+\]\.number$/.test(path)) return false;
    const parentPath = path.replace(/\.items\[\d+\]\.number$/, "");
    const parent = this.getNestedValue(this.currentData, parentPath);
    return !!(parent && parent.type === "itemsGrid" && parent.mediaType === "number");
  },

  normalizeStructuredArrays() {
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      if (node.type === "itemsGrid" && node.mediaType === "number" && Array.isArray(node.items)) {
        node.items = node.items.map((item, idx) => ({ ...item, number: String(idx + 1) }));
      }

      Object.values(node).forEach(walk);
    };

    walk(this.currentData);
  },

  shouldHideField(key) {
    return this.hiddenFields.has(key);
  },

  getAddTypeOptions(path) {
    if (this.currentFile === "custom-pages.json" && path === "pages") {
      return [{ value: "customPage", label: "Pagina personalizada" }];
    }

    if (this.currentFile === "custom-pages.json" && path.endsWith(".blocks")) {
      return [
        { value: "text", label: "Bloque de texto" },
        { value: "cardsGrid", label: "Grid de cards" },
        { value: "tip", label: "Tip / cita" },
        { value: "cta", label: "CTA (boton o enlace)" },
      ];
    }

    if (this.currentFile === "estudiantes.json" && path === "sections") {
      return [
        { value: "participacion", label: "Estudiantes: Participacion" },
        { value: "desafio", label: "Estudiantes: Desafio" },
        { value: "habilidades", label: "Estudiantes: Habilidades" },
        { value: "formato", label: "Estudiantes: Formato" },
        { value: "certificados", label: "Estudiantes: Certificados" },
      ];
    }

    if (/\.tabs$/.test(path)) {
      const parentPath = path.replace(/\.tabs$/, "");
      const parent = this.getNestedValue(this.currentData, parentPath);
      if (parent && (parent.type === "tabsGuide" || parent.type === "teacherInstructionsTabs")) {
        return [{ value: "tabStep", label: "Pestana" }];
      }
    }

    if (/\.tabs\[\d+\]\.items$/.test(path)) {
      return [{ value: "tabItem", label: "Elemento de pestana" }];
    }

    if (/\.items$/.test(path)) {
      const parentPath = path.replace(/\.items$/, "");
      const parent = this.getNestedValue(this.currentData, parentPath);
      if (parent && parent.type === "itemsGrid") {
        return [{ value: "gridItem", label: "Item de card" }];
      }
      if (parent && parent.type === "featureList") {
        return [{ value: "featureItem", label: "Item de lista" }];
      }
    }

    if (/\.categories$/.test(path)) {
      const parentPath = path.replace(/\.categories$/, "");
      const parent = this.getNestedValue(this.currentData, parentPath);
      if (parent && parent.type === "studentsAgeCategories") {
        return [{ value: "ageCategoryItem", label: "Categoria" }];
      }
    }

    if (/\.rows$/.test(path)) {
      const parentPath = path.replace(/\.rows$/, "");
      const parent = this.getNestedValue(this.currentData, parentPath);
      if (parent && parent.type === "studentsScoringTable") {
        return [{ value: "scoringRow", label: "Fila de tabla" }];
      }
    }

    if (/\.summaryCards$/.test(path)) {
      const parentPath = path.replace(/\.summaryCards$/, "");
      const parent = this.getNestedValue(this.currentData, parentPath);
      if (parent && parent.type === "studentsScoringTable") {
        return [{ value: "scoringSummary", label: "Resumen" }];
      }
    }

    return null;
  },

  createTypedArrayItem(path, selectedType) {
    if (this.currentFile === "custom-pages.json" && path === "pages") {
      const slugBase = this.generateUniqueSlug("nueva-pagina");
      return {
        id: slugBase,
        title: "Nueva pagina",
        slug: slugBase,
        description: "Describe aqui la nueva pagina.",
        navLabel: "Nueva pagina",
        showInHeader: false,
        blocks: [
          {
            type: "text",
            sectionTag: "Seccion",
            heading: "Titulo",
            paragraphs: ["Contenido inicial."],
          },
        ],
      };
    }

    if (this.currentFile === "custom-pages.json" && path.endsWith(".blocks")) {
      if (selectedType === "text") {
        return {
          type: "text",
          sectionTag: "Seccion",
          heading: "Titulo",
          paragraphs: ["Escribe aqui el contenido."],
        };
      }
      if (selectedType === "cardsGrid") {
        return {
          type: "cardsGrid",
          sectionTag: "Grid",
          heading: "Titulo de cards",
          columns: 3,
          cards: [
            { title: "Card 1", description: "Descripcion de la card." },
            { title: "Card 2", description: "Descripcion de la card." },
            { title: "Card 3", description: "Descripcion de la card." },
          ],
        };
      }
      if (selectedType === "tip") {
        return {
          type: "tip",
          sectionTag: "Tip",
          heading: "Nota",
          text: "Texto destacado tipo cita o recomendacion.",
        };
      }
      if (selectedType === "cta") {
        return {
          type: "cta",
          sectionTag: "CTA",
          heading: "Llamado a la accion",
          text: "Descripcion opcional del llamado a la accion.",
          variant: "button",
          action: {
            label: "Ver mas",
            href: "/",
          },
        };
      }
    }

    if (path === "components") {
      if (selectedType === "faqQuestions") {
        return {
          type: "faqQuestions",
          categories: [
            {
              title: "Nueva seccion FAQ",
              items: [
                {
                  question: "Nueva pregunta",
                  answer: "Nueva respuesta",
                },
              ],
            },
          ],
        };
      }

      if (selectedType === "faqAccordion") {
        return {
          type: "faqAccordion",
          categories: [
            {
              title: "Nueva seccion FAQ",
              items: [{ question: "Nueva pregunta", answer: "Nueva respuesta" }],
            },
          ],
        };
      }

      if (selectedType === "sectionRichText") {
        return {
          type: "sectionRichText",
          tag: "Seccion",
          heading: "Titulo de seccion",
          paragraphs: ["Parrafo de ejemplo"],
          tip: "Tip opcional",
          linkLabel: "",
          linkHref: "",
        };
      }

      if (selectedType === "itemsGrid") {
        return {
          type: "itemsGrid",
          tag: "Cards",
          heading: "Titulo de cards",
          intro: "Texto introductorio opcional",
          columns: 3,
          mediaType: "icon",
          items: [
            { title: "Card 1", description: "Descripcion", icon: "monitor" },
            { title: "Card 2", description: "Descripcion", icon: "wifi" },
          ],
        };
      }

      if (selectedType === "itemsGridIcon") {
        return {
          type: "itemsGrid",
          tag: "Cards",
          heading: "Grid con iconos",
          intro: "Seccion de cards con iconos.",
          columns: 3,
          mediaType: "icon",
          items: [
            { title: "Card 1", description: "Descripcion", icon: "monitor" },
            { title: "Card 2", description: "Descripcion", icon: "wifi" },
          ],
        };
      }

      if (selectedType === "itemsGridImage") {
        return {
          type: "itemsGrid",
          tag: "Cards",
          heading: "Grid con imagenes",
          intro: "Seccion de cards con imagen.",
          columns: 3,
          mediaType: "image",
          items: [
            { title: "Card 1", description: "Descripcion", image: "/images/sponsor-placeholder.svg" },
            { title: "Card 2", description: "Descripcion", image: "/images/sponsor-placeholder.svg" },
          ],
        };
      }

      if (selectedType === "itemsGridNumber") {
        return {
          type: "itemsGrid",
          tag: "Pasos",
          heading: "Grid numerado",
          intro: "Seccion de pasos numerados.",
          columns: 3,
          mediaType: "number",
          items: [
            { number: "1", title: "Paso 1", description: "Descripcion" },
            { number: "2", title: "Paso 2", description: "Descripcion" },
          ],
        };
      }

      if (selectedType === "itemsGridSimple") {
        return {
          type: "itemsGrid",
          tag: "Cards",
          heading: "Grid simple",
          intro: "Seccion de cards sin media.",
          columns: 3,
          mediaType: "none",
          items: [
            { title: "Card 1", description: "Descripcion" },
            { title: "Card 2", description: "Descripcion" },
          ],
        };
      }

      if (selectedType === "linksList") {
        return {
          type: "linksList",
          tag: "Enlaces",
          heading: "Recursos",
          links: [{ label: "Bebras Internacional", href: "https://www.bebras.org/", description: "Sitio oficial" }],
        };
      }

      if (selectedType === "featureList") {
        return {
          type: "featureList",
          tag: "Habilidades",
          heading: "Titulo de listado",
          intro: "Texto introductorio",
          items: [{ title: "Punto 1", desc: "Descripcion" }],
          outro: "Texto de cierre",
        };
      }

      if (selectedType === "statsGrid") {
        return {
          type: "statsGrid",
          tag: "Estadisticas",
          heading: "Titulo de estadisticas",
          columns: 3,
          stats: [
            { value: "15", label: "Preguntas" },
            { value: "45", label: "Minutos" },
          ],
          paragraphs: ["Descripcion del bloque."],
        };
      }

      if (selectedType === "studentsAgeCategories") {
        return {
          type: "studentsAgeCategories",
          sectionTag: "Niveles",
          heading: "Categorias por Edad",
          subtitle: "Seis niveles disenados para desafiar a cada grupo de edad",
          categories: [
            { name: "Kits", age: "6-8 anos", emoji: "🧩", color: "rose", desc: "Primeros pasos en el pensamiento logico" },
            { name: "Castors", age: "8-10 anos", emoji: "🦫", color: "amber", desc: "Descubriendo patrones y secuencias" },
          ],
        };
      }

      if (selectedType === "studentsScoringTable") {
        return {
          type: "studentsScoringTable",
          sectionTag: "Puntuacion",
          heading: "Sistema de Puntuacion",
          subtitle: "Cada tarea pertenece a una categoria de dificultad. Inicias con 45 puntos.",
          tableHeaders: ["Resultado", "Cat. A", "Cat. B", "Cat. C"],
          rows: [
            { label: "Correcta", values: ["+6", "+9", "+12"], status: "positive" },
            { label: "Sin respuesta", values: ["0", "0", "0"], status: "neutral" },
            { label: "Incorrecta", values: ["-2", "-3", "-4"], status: "negative" },
          ],
          summaryCards: [
            { value: "45", label: "Puntaje inicial" },
            { value: "180", label: "Puntaje maximo" },
          ],
          summaryColumns: 2,
        };
      }

      if (selectedType === "tabsGuide") {
        return {
          type: "tabsGuide",
          sectionTag: "Guia",
          heading: "Instrucciones",
          subtitle: "Pasos por etapa",
          tabs: [
            {
              id: "antes",
              label: "Antes",
              heading: "Antes del desafio",
              items: [{ title: "Paso", desc: "Descripcion" }],
            },
          ],
        };
      }

      if (selectedType === "formContact") {
        return {
          type: "formContact",
          tag: "Formulario",
          heading: "Envianos un mensaje",
          fields: {
            name: { label: "Nombre completo", placeholder: "Tu nombre" },
            email: { label: "Email", placeholder: "tu@email.com" },
            role: { label: "Rol", placeholder: "Seleccionar...", options: ["Estudiante", "Docente", "Institucion", "Otro"] },
            message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
          },
          submitLabel: "Enviar mensaje",
          disclaimer: "Este formulario es solo una vista previa.",
        };
      }

      if (selectedType === "sponsorsCards") {
        return {
          type: "sponsorsCards",
          tag: "Nueva seccion de sponsors",
          columns: 3,
          cards: [
            {
              name: "Nuevo sponsor",
              desc: "Descripcion del sponsor.",
              image: "/images/sponsor-placeholder.svg",
            },
          ],
        };
      }

      if (selectedType === "docentesRegistro") {
        return {
          type: "docentesRegistro",
          tag: "Registro",
          heading: "Como inscriben a sus estudiantes?",
          intro: "El proceso de inscripcion es simple y gratuito.",
          columns: 3,
          steps: [
            { num: "1", title: "Registro del coordinador", desc: "Crear cuenta en la plataforma Bebras Bolivia." },
            { num: "2", title: "Inscripcion de estudiantes", desc: "Agregar estudiantes por categoria de edad." },
            { num: "3", title: "Dia del desafio", desc: "Supervisar la sesion en la escuela." },
          ],
        };
      }

      if (selectedType === "docentesRequisitos") {
        return {
          type: "docentesRequisitos",
          tag: "Requisitos",
          heading: "Que necesita la escuela?",
          columns: 2,
          requirements: [
            { icon: "monitor", title: "Computadoras con navegador web", desc: "Chrome, Firefox, Edge o Safari actualizados." },
            { icon: "wifi", title: "Conexion a internet", desc: "Estable durante los 45 minutos del desafio." },
          ],
        };
      }

      if (selectedType === "docentesAlcance") {
        return {
          type: "docentesAlcance",
          tag: "Alcance",
          heading: "Quien deberia participar?",
          content: ["Contenido de alcance para docentes."],
          tip: "Tip: El desafio no requiere conocimientos previos de programacion.",
        };
      }

      if (selectedType === "teacherInstructionsTabs") {
        return {
          type: "teacherInstructionsTabs",
          sectionTag: "Guia para coordinadores",
          heading: "Instrucciones para Coordinadores",
          subtitle: "Guia paso a paso para antes, durante y despues del desafio.",
          tabs: [
            {
              id: "antes",
              label: "Antes",
              heading: "Antes del Desafio",
              items: [{ title: "Registrarse como coordinador", desc: "Completar los datos de la escuela." }],
            },
          ],
        };
      }

      if (selectedType === "cta") {
        return {
          type: "cta",
          tag: "",
          heading: "No encontraste lo que buscabas?",
          text: "Contactanos y con gusto resolveremos tus dudas.",
          buttonLabel: "Ir a Contacto",
          buttonHref: "/contacto",
        };
      }

      if (selectedType === "blogIndex") {
        return {
          type: "blogIndex",
          emptyState: {
            tag: "Sin contenido",
            text: "No hay publicaciones aun. Vuelve pronto!",
          },
          readMoreLabel: "Leer mas",
        };
      }

      if (selectedType === "blogPostUi") {
        return {
          type: "blogPostUi",
          backLabel: "Volver al blog",
          ctaLabel: "Inscribirse al desafio",
        };
      }

      if (selectedType === "contactInfoCards") {
        return {
          type: "contactInfoCards",
          tag: "Informacion",
          heading: "Informacion de Contacto",
          cards: [
            {
              icon: "email",
              title: "Email",
              description: "Escribenos para cualquier consulta",
              linkLabel: "info@bebras.bo",
              linkHref: "mailto:info@bebras.bo",
            },
          ],
        };
      }

      if (selectedType === "contactInternational") {
        return {
          type: "contactInternational",
          tag: "Comunidad Internacional",
          links: [
            {
              label: "Bebras Internacional ->",
              href: "https://www.bebras.org/",
              description: "Sitio oficial Bebras",
            },
          ],
        };
      }

      if (selectedType === "contactForm") {
        return {
          type: "contactForm",
          tag: "Formulario",
          heading: "Envianos un Mensaje",
          fields: {
            name: { label: "Nombre completo", placeholder: "Tu nombre" },
            email: { label: "Email", placeholder: "tu@email.com" },
            role: {
              label: "Rol",
              placeholder: "Seleccionar...",
              options: ["Estudiante", "Docente / Coordinador", "Institucion", "Otro"],
            },
            message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
          },
          submitLabel: "Enviar mensaje",
          disclaimer: "Este formulario es solo una vista previa.",
        };
      }

      if (selectedType === "contactClassic") {
        return {
          type: "contactClassic",
          info: {
            tag: "Informacion",
            heading: "Informacion de Contacto",
            cards: [
              {
                icon: "email",
                title: "Email",
                description: "Escribenos para cualquier consulta",
                linkLabel: "info@bebras.bo",
                linkHref: "mailto:info@bebras.bo",
              },
            ],
          },
          international: {
            tag: "Comunidad Internacional",
            links: [
              {
                label: "Bebras Internacional ->",
                href: "https://www.bebras.org/",
                description: "Sitio oficial Bebras",
              },
            ],
          },
          form: {
            tag: "Formulario",
            heading: "Envianos un Mensaje",
            fields: {
              name: { label: "Nombre completo", placeholder: "Tu nombre" },
              email: { label: "Email", placeholder: "tu@email.com" },
              role: {
                label: "Rol",
                placeholder: "Seleccionar...",
                options: ["Estudiante", "Docente / Coordinador", "Institucion", "Otro"],
              },
              message: { label: "Mensaje", placeholder: "Escribe tu mensaje..." },
            },
            submitLabel: "Enviar mensaje",
            disclaimer: "Este formulario es solo una vista previa.",
          },
        };
      }
    }

    if (this.currentFile === "estudiantes.json" && path === "sections") {
      if (selectedType === "participacion") {
        return {
          id: "participacion",
          tag: "Participacion",
          heading: "Como participar",
          content: ["Parrafo"],
          link: { label: "Ver docentes", href: "/docentes" },
        };
      }
      if (selectedType === "desafio") {
        return {
          id: "desafio",
          tag: "Desafio",
          heading: "Que es el desafio",
          content: ["Parrafo"],
        };
      }
      if (selectedType === "habilidades") {
        return {
          id: "habilidades",
          tag: "Habilidades",
          heading: "Habilidades clave",
          intro: "Intro",
          skills: [{ title: "Habilidad", desc: "Descripcion" }],
          outro: "Cierre",
        };
      }
      if (selectedType === "formato") {
        return {
          id: "formato",
          tag: "Formato",
          heading: "Formato del desafio",
          stats: [
            { value: "15", label: "Preguntas" },
            { value: "45", label: "Minutos" },
          ],
          content: ["Parrafo"],
        };
      }
      if (selectedType === "certificados") {
        return {
          id: "certificados",
          tag: "Certificados",
          heading: "Certificados",
          content: ["Parrafo"],
          cta: { label: "Inscribirse", href: "/registro" },
        };
      }
    }

    if (selectedType === "tabStep") {
      return {
        id: `tab-${Date.now()}`,
        label: "Nueva pestana",
        heading: "Titulo de pestana",
        items: [{ title: "Nuevo punto", desc: "Descripcion" }],
      };
    }

    if (selectedType === "tabItem") {
      return { title: "Nuevo punto", desc: "Descripcion" };
    }

    if (selectedType === "gridItem") {
      const parentPath = path.replace(/\.items$/, "");
      const parent = this.getNestedValue(this.currentData, parentPath);
      if (parent && parent.type === "itemsGrid") {
        if (parent.mediaType === "icon") {
          return { title: "Nuevo item", description: "Descripcion", icon: "monitor" };
        }
        if (parent.mediaType === "image") {
          return { title: "Nuevo item", description: "Descripcion", image: "/images/sponsor-placeholder.svg" };
        }
        if (parent.mediaType === "number") {
          return { number: "", title: "Nuevo item", description: "Descripcion" };
        }
      }
      return { title: "Nuevo item", description: "Descripcion" };
    }

    if (selectedType === "featureItem") {
      return { title: "Nueva habilidad", desc: "Descripcion" };
    }

    if (selectedType === "ageCategoryItem") {
      return { name: "Nueva categoria", age: "0-0 anos", emoji: "🧩", color: "violet", desc: "Descripcion" };
    }

    if (selectedType === "scoringRow") {
      return { label: "Nueva fila", values: ["0", "0", "0"], status: "neutral" };
    }

    if (selectedType === "scoringSummary") {
      return { value: "0", label: "Resumen" };
    }

    return null;
  },

  createEmptyArrayItem(path) {
    const normalizedPath = String(path).replace(/\[\d+\]/g, "[]");

    if (this.currentFile === "faq.json" && normalizedPath.endsWith("categories[].items")) {
      return { question: "", answer: "" };
    }

    if (normalizedPath.endsWith("tabs[].items")) {
      return { title: "", desc: "" };
    }

    if (normalizedPath.endsWith(".items")) {
      const parentPath = String(path).replace(/\.items$/, "");
      const parent = this.getNestedValue(this.currentData, parentPath);
      if (parent && parent.type === "itemsGrid") {
        if (parent.mediaType === "icon") {
          return { title: "", description: "", icon: "monitor" };
        }
        if (parent.mediaType === "image") {
          return { title: "", description: "", image: "/images/sponsor-placeholder.svg" };
        }
        if (parent.mediaType === "number") {
          return { number: "", title: "", description: "" };
        }
        return { title: "", description: "" };
      }
    }

    return "";
  },

  isCollapsibleArray(path) {
    return path === "components" || path.endsWith(".components");
  },

  getArrayItemLabel(obj, idx) {
    if (obj && typeof obj === "object") {
      if (obj.type === "faqQuestions") return `#${idx + 1} — FAQ`;
      if (obj.type === "sponsorsCards") return `#${idx + 1} — Sponsors`;
      if (obj.type === "blogIndex") return `#${idx + 1} — Blog Index`;
      if (obj.type === "blogPostUi") return `#${idx + 1} — Blog Post UI`;
      if (obj.type === "contactInfoCards") return `#${idx + 1} — Contacto Info`;
      if (obj.type === "contactInternational") return `#${idx + 1} — Contacto Internacional`;
      if (obj.type === "contactForm") return `#${idx + 1} — Contacto Formulario`;
      if (obj.type === "contactClassic") return `#${idx + 1} — Contacto Clasico`;
      if (obj.type === "docentesRegistro") return `#${idx + 1} — Docentes Registro`;
      if (obj.type === "docentesRequisitos") return `#${idx + 1} — Docentes Requisitos`;
      if (obj.type === "docentesAlcance") return `#${idx + 1} — Docentes Alcance`;
      if (obj.type === "teacherInstructionsTabs") return `#${idx + 1} — Docentes Guia`;
      if (obj.type === "sectionRichText") return `#${idx + 1} — Texto`; 
      if (obj.type === "itemsGrid") return `#${idx + 1} — Grid de Cards`;
      if (obj.type === "linksList") return `#${idx + 1} — Lista de Enlaces`;
      if (obj.type === "featureList") return `#${idx + 1} — Lista de Caracteristicas`;
      if (obj.type === "statsGrid") return `#${idx + 1} — Grid de Estadisticas`;
      if (obj.type === "studentsAgeCategories") return `#${idx + 1} — Categorias de Edad`;
      if (obj.type === "studentsScoringTable") return `#${idx + 1} — Tabla de Puntaje`;
      if (obj.type === "faqAccordion") return `#${idx + 1} — FAQ Acordeon`;
      if (obj.type === "tabsGuide") return `#${idx + 1} — Guia en Tabs`;
      if (obj.type === "formContact") return `#${idx + 1} — Formulario`;
      if (obj.type === "cta") return `#${idx + 1} — CTA`;
      if (obj.title) return `#${idx + 1} — ${obj.title}`;
      if (obj.heading) return `#${idx + 1} — ${obj.heading}`;
      if (obj.label) return `#${idx + 1} — ${obj.label}`;
      if (obj.tag) return `#${idx + 1} — ${obj.tag}`;
      if (obj.type) return `#${idx + 1} — ${obj.type}`;
    }
    return `#${idx + 1}`;
  },

  async openAddComponentModal(path, currentArr) {
    const options = this.getComponentOptions(path);
    if (!options.length) return;

    if (window.CMSModal && typeof window.CMSModal.openPicker === "function") {
      const selected = await window.CMSModal.openPicker({
        title: "Agregar componente",
        subtitle: "Selecciona el componente que deseas agregar.",
        options,
      });
      if (selected) {
        this.addArrayItem(path, currentArr, selected);
      }
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "editor-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "editor-modal";
    modal.innerHTML = `
      <div class="editor-modal-header">
        <h3>Agregar componente</h3>
        <button type="button" class="editor-modal-close" aria-label="Cerrar">${App.icon("x")}</button>
      </div>
      <p class="editor-modal-subtitle">Selecciona el componente que deseas agregar.</p>
      <div class="editor-modal-list"></div>
    `;

    const list = modal.querySelector(".editor-modal-list");
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor-modal-option";
      btn.innerHTML = `<span class="title">${this.escapeForPre(opt.label)}</span><span class="desc">${this.escapeForPre(opt.description || "")}</span>`;
      btn.addEventListener("click", () => {
        this.addArrayItem(path, currentArr, opt.value);
        closeModal();
      });
      list.appendChild(btn);
    });

    const closeModal = () => {
      overlay.remove();
      document.body.classList.remove("editor-modal-open");
      document.removeEventListener("keydown", onEsc);
    };

    const onEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    modal.querySelector(".editor-modal-close").addEventListener("click", closeModal);
    document.addEventListener("keydown", onEsc);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add("editor-modal-open");
  },

  getComponentOptions(path) {
    if (path === "components") {
      return [
        {
          value: "sectionRichText",
          label: "Seccion de Texto",
          description: "Titulo, parrafos y tip opcional",
        },
        {
          value: "itemsGridIcon",
          label: "Grid cards + icono",
          description: "Cards con icono visual",
        },
        {
          value: "itemsGridImage",
          label: "Grid cards + imagen",
          description: "Cards con imagen",
        },
        {
          value: "itemsGridNumber",
          label: "Grid cards + numero",
          description: "Cards tipo pasos numerados",
        },
        {
          value: "itemsGridSimple",
          label: "Grid cards simple",
          description: "Cards sin icono ni imagen",
        },
        {
          value: "linksList",
          label: "Lista de Enlaces",
          description: "Listado de recursos o enlaces externos",
        },
        {
          value: "featureList",
          label: "Lista de Caracteristicas",
          description: "Lista con checks y texto introductorio",
        },
        {
          value: "statsGrid",
          label: "Grid de Estadisticas",
          description: "Metricas en tarjetas con texto inferior",
        },
        {
          value: "studentsAgeCategories",
          label: "Categorias de Edad",
          description: "Categorias completas y editables",
        },
        {
          value: "studentsScoringTable",
          label: "Tabla de Puntaje",
          description: "Tabla completa y editable",
        },
        {
          value: "faqAccordion",
          label: "FAQ Acordeon",
          description: "Preguntas y respuestas en acordeon",
        },
        {
          value: "tabsGuide",
          label: "Guia en Tabs",
          description: "Contenido por pestanas",
        },
        {
          value: "formContact",
          label: "Formulario",
          description: "Formulario de contacto editable",
        },
        {
          value: "blogIndex",
          label: "Blog Index",
          description: "Estado vacio y texto Leer mas",
        },
        {
          value: "blogPostUi",
          label: "Blog Post UI",
          description: "Textos de volver y CTA del post",
        },
        {
          value: "contactClassic",
          label: "Contacto Clasico",
          description: "Bloque completo como diseno anterior",
        },
        {
          value: "cta",
          label: "CTA",
          description: "Bloque de titulo, texto y boton",
        },
      ];
    }
    return [];
  },

  generateUniqueSlug(base) {
    const pages = Array.isArray(this.currentData?.pages) ? this.currentData.pages : [];
    const used = new Set(pages.map((p) => p.slug));
    if (!used.has(base)) return base;
    let i = 2;
    while (used.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  },

  toHexColor(str) {
    // Try to interpret as a valid color for the color picker
    if (/^#[0-9a-fA-F]{6}$/.test(str)) return str;
    if (/^#[0-9a-fA-F]{3}$/.test(str)) {
      return "#" + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
    }
    // Fallback: try parsing named colors via a canvas
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.fillStyle = str;
      return ctx.fillStyle;
    } catch {
      return "#000000";
    }
  },

  // ── Deep get/set by path ────────────────────────────────
  // Supports dot notation and bracket notation: "foo.bar[0].baz"

  escapeForPre(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  parsePath(path) {
    const parts = [];
    const regex = /([^.\[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = regex.exec(path)) !== null) {
      if (match[1] !== undefined) {
        parts.push(match[1]);
      } else if (match[2] !== undefined) {
        parts.push(parseInt(match[2], 10));
      }
    }
    return parts;
  },

  getNestedValue(obj, path) {
    const parts = this.parsePath(path);
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  },

  setNestedValue(obj, path, value) {
    const parts = this.parsePath(path);
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null) {
        // Auto-create intermediate objects/arrays
        current[part] = typeof parts[i + 1] === "number" ? [] : {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  },
};
