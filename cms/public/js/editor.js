// ── Bebras CMS — Content Editor ─────────────────────────
// Dynamic form generation for all 15 JSON content files.
// Reads the live JSON data, builds form fields, saves back via API.
// Preview uses a persistent Astro dev server with HMR for instant updates.
//
// Utilities (path helpers, templates, DnD) live in cms/ui/src/lib/*
// and are exposed at runtime via window.CMSEditorLib.

const Editor = {
  currentFile: null,
  currentData: null,
  dirty: false,
  devServerReady: false,
  devServerStarting: false,
  collapsedItems: new Set(),
  itemExpandedState: new Map(),

  _arrayActionTargets: [],
  _arrayItemActionTargets: [],
  _arrayCollapseTargets: [],

  // ── Lib accessor (populated by CMSEditorLib registration) ──
  get _lib() {
    return window.CMSEditorLib;
  },

  // ── Delegate: path helpers ─────────────────────────────
  get fileToPage()    { return this._lib?.fileToPage    || {}; },
  get fieldHints()    { return this._lib?.fieldHints    || {}; },
  get selectOptions() { return this._lib?.selectOptions || {}; },
  get hiddenFields()  { return this._lib?.hiddenFields  || new Set(); },

  parsePath(p)              { return this._lib.parsePath(p); },
  getNestedValue(o, p)      { return this._lib.getNestedValue(o, p); },
  setNestedValue(o, p, v)   { return this._lib.setNestedValue(o, p, v); },
  escapeForPre(s)            { return this._lib.escapeForPre(s); },
  toHexColor(s)              { return this._lib.toHexColor(s); },
  formatLabel(k)             { return this._lib.formatLabel(k); },

  shouldHideField(k)         { return this._lib.shouldHideField(k); },
  getFieldType(k, v)         { return this._lib.getFieldType(k, v); },
  isImagePathField(p, v)     { return this._lib.isImagePathField(p, v); },
  isAutoNumberField(p)       { return this._lib.isAutoNumberField(p, this.currentData); },
  isCollapsibleArray(p)      { return this._lib.isCollapsibleArray(p); },
  getArrayItemLabel(o, i)    { return this._lib.getArrayItemLabel(o, i); },
  getComponentOptions(p)     { return this._lib.getComponentOptions(p); },
  blankClone(o)              { return this._lib.blankClone(o); },

  getAddTypeOptions(path) {
    return this._lib.getAddTypeOptions(path, this.currentFile, this.currentData);
  },
  createTypedArrayItem(path, selectedType) {
    return this._lib.createTypedArrayItem(path, selectedType, this.currentFile, this.currentData);
  },
  createEmptyArrayItem(path) {
    return this._lib.createEmptyArrayItem(path, this.currentFile, this.currentData);
  },
  generateUniqueSlug(base) {
    return this._lib.generateUniqueSlug(this.currentData, base);
  },

  // ── Delegate: DnD ──────────────────────────────────────
  _dndCallbacks() {
    return {
      collectFormData:          () => this.collectFormData(),
      getCurrentData:           () => this.currentData,
      normalizeStructuredArrays:() => this.normalizeStructuredArrays(),
      setDirty:                 () => { this.dirty = true; },
      rerenderEditorForm:       () => this.rerenderEditorForm(),
      isReactEditorActive:      () => this.isReactEditorActive(),
    };
  },

  attachDragEvents(item, container, arrayPath) {
    this._lib.attachDragEvents(item, container, arrayPath, this._dndCallbacks());
  },

  moveArrayItem(path, fromIdx, toIdx) {
    this._lib.moveArrayItem(path, fromIdx, toIdx, this._dndCallbacks());
  },

  // ── React editor detection ─────────────────────────────
  isReactEditorActive() {
    return !!(window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function" && document.getElementById("react-editor-primitives-root"));
  },

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

  renderFields(container, data, path, depth = 0) {
    if (data === null || data === undefined) return;

    if (Array.isArray(data)) {
      this.renderArray(container, data, path, depth);
    } else if (typeof data === "object") {
      this.renderObject(container, data, path, depth);
    } else {
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
        const section = document.createElement("div");
        section.className = "field-section";

        const title = document.createElement("div");
        title.className = "field-section-title";
        title.textContent = this.formatLabel(key);
        section.appendChild(title);

        this.renderObject(section, val, fieldPath, depth + 1);
        container.appendChild(section);
      } else {
        this.renderPrimitive(container, val, fieldPath);
      }
    }
  },

  renderPrimitive(container, value, path) {
    const key = path.split(".").pop();
    const type = this.getFieldType(path, value);
    const isAutoNum = this.isAutoNumberField(path);

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
      input.type = isAutoNum ? "text" : "number";
      input.className = "form-input";
      input.value = String(value);
      if (isAutoNum) {
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

    if (arr.length > 0 && typeof arr[0] === "string") {
      this.renderStringArray(arrayContainer, arr, path);
    } else if (arr.length > 0 && typeof arr[0] === "object") {
      this.renderObjectArray(arrayContainer, arr, path, depth);
    }

    section.appendChild(arrayContainer);

    // Special: component picker modal for shared components arrays
    if (path === "components") {
      if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
        const actionId = `arr-action-${path}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this._arrayActionTargets.push({
          id: actionId, path, currentArr: arr, options: [],
          mode: "button", buttonLabel: "Agregar nuevo componente", action: "component-modal",
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
    const addOptions = this.getAddTypeOptions(path);
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

      if (window.CMSEditor && typeof window.CMSEditor.mountPrimitives === "function") {
        const actionId = `arr-item-${itemPath}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this._arrayItemActionTargets.push({ id: actionId, path, idx, inline: false });
        const placeholder = document.createElement("div");
        placeholder.setAttribute("data-array-item-action-placeholder", actionId);
        item.appendChild(placeholder);
      } else {
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = App.icon("trash");
        removeBtn.title = "Eliminar";
        removeBtn.addEventListener("click", () => {
          this.removeArrayItem(path, idx);
        });
        item.appendChild(removeBtn);
      }

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
        if (!this.isReactEditorActive()) {
          this.collectFormData();
        }
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
        const blank = this.blankClone(template);
        this.setNestedValue(this.currentData, path, [...currentArr, blank]);
      }
    }
    this.normalizeStructuredArrays();
    this.dirty = true;
    if (!this.isReactEditorActive()) {
      this.collectFormData();
    }
    this.rerenderEditorForm();
  },

  removeArrayItem(path, idx) {
    if (!this.isReactEditorActive()) {
      this.collectFormData();
    }
    const arr = this.getNestedValue(this.currentData, path);
    if (Array.isArray(arr)) {
      arr.splice(idx, 1);
      this.setNestedValue(this.currentData, path, arr);
    }
    this.normalizeStructuredArrays();
    this.dirty = true;
    this.rerenderEditorForm();
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

  async ensureDevServer() {
    const overlay = document.getElementById("preview-overlay");
    const overlayText = document.getElementById("preview-overlay-text");
    const iframe = document.getElementById("preview-frame");

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

    if (overlay) overlay.style.display = "flex";
    if (overlayText) overlayText.textContent = "Iniciando servidor de vista previa...";
    this.devServerStarting = true;

    try {
      const result = await API.startPreview();
      this.devServerReady = true;
      this.devServerStarting = false;
      this.devServerPort = result.port;

      await new Promise((r) => setTimeout(r, 500));

      this.loadPreviewIframe();
      Toast.success("Vista previa lista — los cambios se actualizan al guardar");
    } catch (err) {
      this.devServerStarting = false;
      Toast.error(`Error al iniciar vista previa: ${err.message}`);

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

  loadPreviewIframe(forceReload = false) {
    const iframe = document.getElementById("preview-frame");
    if (!iframe) return;

    const pagePath = this.fileToPage[this.currentFile] || "/";

    if (this.devServerReady && this.devServerPort) {
      const base = `http://localhost:${this.devServerPort}${pagePath}`;
      iframe.src = forceReload ? `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}` : base;
    } else {
      const base = `/preview-site${pagePath}`;
      iframe.src = forceReload ? `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}` : base;
    }
  },

  // ── React primitives mount ─────────────────────────────

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

  // ── Normalize structured arrays ─────────────────────────

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

  // ── Add component modal ────────────────────────────────

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
};
