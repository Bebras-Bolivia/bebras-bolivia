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
  },

  hiddenFields: new Set(["id"]),

  // ── Render the editor for a file ────────────────────────
  async render(filename) {
    const main = document.getElementById("main-content");
    if (!main) return;

    this.currentFile = filename;
    this.dirty = false;

    try {
      this.currentData = await API.getContent(filename);

      const meta = App.contentMeta[filename] || { label: filename, desc: "" };

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

    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.textContent = this.formatLabel(key);
    label.setAttribute("for", `field-${path}`);
    group.appendChild(label);

    let input;
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
      input.type = "number";
      input.className = "form-input";
      input.value = String(value);
      input.setAttribute("data-value-type", "number");
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
    input.setAttribute("data-path", path);
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

    // Add item button
    const addOptions = this.getAddTypeOptions(path, arr);
    if (addOptions && addOptions.length > 0) {
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
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = App.icon("x");
      removeBtn.title = "Eliminar";
      removeBtn.addEventListener("click", () => {
        this.removeArrayItem(path, idx);
      });
      item.appendChild(removeBtn);

      // DnD events
      this.attachDragEvents(item, container, path);

      container.appendChild(item);
    });
  },

  renderObjectArray(container, arr, path, depth) {
    container.setAttribute("data-dnd-array", path);

    arr.forEach((obj, idx) => {
      const itemPath = `${path}[${idx}]`;
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
      labelSpan.textContent = `#${idx + 1}`;

      const leftGroup = document.createElement("span");
      leftGroup.style.cssText = "display:flex;align-items:center;";
      leftGroup.appendChild(handleSpan);
      leftGroup.appendChild(labelSpan);

      header.appendChild(leftGroup);
      item.appendChild(header);

      // Render each field in the object
      this.renderObject(item, obj, itemPath, depth + 1);

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = App.icon("x");
      removeBtn.title = "Eliminar";
      removeBtn.addEventListener("click", () => {
        this.removeArrayItem(path, idx);
      });
      item.appendChild(removeBtn);

      // DnD events
      this.attachDragEvents(item, container, path);

      container.appendChild(item);
    });
  },

  // ── Array mutations ─────────────────────────────────────

  addArrayItem(path, currentArr, selectedType = null) {
    if (selectedType) {
      const typedTemplate = this.createTypedArrayItem(path, selectedType);
      if (typedTemplate !== null) {
        this.setNestedValue(this.currentData, path, [...currentArr, typedTemplate]);
        this.dirty = true;
        this.collectFormData();
        const formContainer = document.getElementById("editor-form");
        formContainer.innerHTML = "";
        this.renderFields(formContainer, this.currentData, "");
        formContainer.addEventListener("input", () => {
          this.dirty = true;
        });
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
    this.dirty = true;
    // Re-render the whole form
    this.collectFormData();
    const formContainer = document.getElementById("editor-form");
    formContainer.innerHTML = "";
    this.renderFields(formContainer, this.currentData, "");
    formContainer.addEventListener("input", () => {
      this.dirty = true;
    });
  },

  removeArrayItem(path, idx) {
    this.collectFormData();
    const arr = this.getNestedValue(this.currentData, path);
    if (Array.isArray(arr)) {
      arr.splice(idx, 1);
      this.setNestedValue(this.currentData, path, arr);
    }
    this.dirty = true;
    const formContainer = document.getElementById("editor-form");
    formContainer.innerHTML = "";
    this.renderFields(formContainer, this.currentData, "");
    formContainer.addEventListener("input", () => {
      this.dirty = true;
    });
  },

  // ── Drag-and-drop reordering ────────────────────────────

  _dragState: null,

  attachDragEvents(item, container, arrayPath) {
    // Only allow drag when initiated from the handle
    const handle = item.querySelector(".drag-handle");

    if (handle) {
      handle.addEventListener("mousedown", () => {
        item.setAttribute("draggable", "true");
      });
      handle.addEventListener("mouseup", () => {
        item.setAttribute("draggable", "false");
      });
    }

    item.addEventListener("dragstart", (e) => {
      this._dragState = {
        arrayPath,
        fromIdx: parseInt(item.getAttribute("data-dnd-idx"), 10),
        container,
      };
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", ""); // Required for Firefox
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      item.setAttribute("draggable", "false");
      // Remove all drop indicators
      container.querySelectorAll(".array-item").forEach((el) => {
        el.classList.remove("drag-over-above", "drag-over-below");
      });
      this._dragState = null;
    });

    item.addEventListener("dragover", (e) => {
      if (!this._dragState || this._dragState.arrayPath !== arrayPath) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      // Determine if above or below midpoint
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isAbove = e.clientY < midY;

      // Clear all indicators in this container
      container.querySelectorAll(".array-item").forEach((el) => {
        el.classList.remove("drag-over-above", "drag-over-below");
      });

      item.classList.add(isAbove ? "drag-over-above" : "drag-over-below");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over-above", "drag-over-below");
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!this._dragState || this._dragState.arrayPath !== arrayPath) return;

      const fromIdx = this._dragState.fromIdx;
      const toIdx = parseInt(item.getAttribute("data-dnd-idx"), 10);

      // Determine final position based on indicator
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isAbove = e.clientY < midY;

      let targetIdx = isAbove ? toIdx : toIdx + 1;
      // Adjust if dragging from before the target
      if (fromIdx < targetIdx) targetIdx--;

      if (fromIdx !== targetIdx) {
        this.moveArrayItem(arrayPath, fromIdx, targetIdx);
      }

      // Cleanup
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

    this.dirty = true;
    const formContainer = document.getElementById("editor-form");
    formContainer.innerHTML = "";
    this.renderFields(formContainer, this.currentData, "");
    formContainer.addEventListener("input", () => {
      this.dirty = true;
    });
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

  getFieldType(keyOrPath, value) {
    const key = String(keyOrPath).split(".").pop();
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (this.selectOptions[key]) return "select";
    if (this.fieldHints[key]) return this.fieldHints[key];
    if (typeof value === "string" && value.length > 100) return "textarea";
    return "text";
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

    if (this.currentFile === "docentes.json" && path === "sections") {
      return [
        { value: "registro", label: "Docentes: Registro" },
        { value: "requisitos", label: "Docentes: Requisitos" },
        { value: "alcance", label: "Docentes: Alcance" },
        { value: "cta", label: "Docentes: CTA" },
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

    if (this.currentFile === "docentes.json" && path === "sections") {
      if (selectedType === "registro") {
        return {
          id: "registro",
          tag: "Registro",
          heading: "Titulo de registro",
          intro: "Introduccion",
          steps: [{ num: "1", title: "Paso", desc: "Descripcion" }],
        };
      }
      if (selectedType === "requisitos") {
        return {
          id: "requisitos",
          tag: "Requisitos",
          heading: "Titulo de requisitos",
          requirements: [{ icon: "monitor", title: "Requisito", desc: "Descripcion" }],
        };
      }
      if (selectedType === "alcance") {
        return {
          id: "alcance",
          tag: "Alcance",
          heading: "Titulo de alcance",
          content: ["Parrafo de alcance"],
          tip: "Tip destacado",
        };
      }
      if (selectedType === "cta") {
        return {
          id: "cta",
          heading: "Titulo CTA",
          content: ["Texto CTA"],
          cta: {
            label: "Accion",
            href: "/registro",
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

    return null;
  },

  createEmptyArrayItem(path) {
    const normalizedPath = String(path).replace(/\[\d+\]/g, "[]");

    if (this.currentFile === "faq.json" && normalizedPath.endsWith("categories[].items")) {
      return { question: "", answer: "" };
    }

    return "";
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
