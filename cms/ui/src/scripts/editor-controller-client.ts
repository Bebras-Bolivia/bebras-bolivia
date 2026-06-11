declare global {
  interface Window {
    API: any;
    Toast: any;
    App: any;
    CMSEditor?: any;
    CMSEditorLib: any;
    CMSEditorPreview: any;
    CMSModal?: any;
    Editor?: any;
  }
}

const Editor = {
  currentFile: null as string | null,
  currentData: null as any,
  dirty: false,
  devServerReady: false,
  devServerStarting: false,
  devServerPort: null as number | null,
  previewDraftTimer: null as ReturnType<typeof setTimeout> | null,
  collapsedItems: new Set<string>(),
  itemExpandedState: new Map<string, boolean>(),

  get lib() { return window.CMSEditorLib; },
  get fileToPage() { return this.lib.fileToPage; },
  get selectOptions() { return this.lib.selectOptions; },

  escapeForPre(value: string) { return this.lib.escapeForPre(value); },
  formatLabel(key: string) { return this.lib.formatLabel(key); },
  getNestedValue(obj: any, path: string) { return this.lib.getNestedValue(obj, path); },
  setNestedValue(obj: any, path: string, value: unknown) { return this.lib.setNestedValue(obj, path, value); },
  getFieldType(path: string, value: unknown) { return this.lib.getFieldType(path, value); },
  getFieldLabel(path: string, key: string) {
    if (path === "header.subtitle") return "Descripcion visible";
    return this.formatLabel(key);
  },
  isAutoNumberField(path: string) { return this.lib.isAutoNumberField(path, this.currentData); },
  isCollapsibleArray(path: string) { return this.lib.isCollapsibleArray(path); },
  isLockedArray(path: string): boolean {
    // Arrays whose items map to existing site pages or fixed structural slots.
    // Adding or removing entries here would create dead URLs or break layout —
    // we let users edit individual entries (labels, hrefs) but not the list shape.
    if (this.currentFile !== "navigation.json") return false;
    return (
      path === "links" ||
      path === "internationalLinks" ||
      path === "socialLinks" ||
      path === "footerColumns" ||
      /^footerColumns\[\d+\]\.links$/.test(path)
    );
  },
  getArrayItemLabel(obj: any, idx: number) { return this.lib.getArrayItemLabel(obj, idx); },
  getAddTypeOptions(path: string) { return this.lib.getAddTypeOptions(path, this.currentFile, this.currentData) || []; },
  waitForPreviewUpdate() { return new Promise((resolve) => setTimeout(resolve, 500)); },

  async render(filename: string) {
    const main = document.getElementById("main-content");
    if (!main) return;

    this.currentFile = filename;
    this.dirty = false;

    try {
      this.currentData = await window.API.getContent(filename);
      const meta = window.App.contentMeta[filename] || { label: filename };
      main.innerHTML = '<div id="react-editor-primitives-root"></div>';
      const root = document.getElementById("react-editor-primitives-root");
      if (root) this.mountReactPrimitives(root, meta.label, filename);
    } catch (err: any) {
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(err.message)}</p></div>`;
    }
  },

  mountReactPrimitives(root: Element, title: string, filename: string) {
      window.CMSEditor.mountPrimitives(root, {
      title,
      filename,
      fields: this.extractPrimitiveFields(this.currentData, "", false),
      icons: window.App.icons,
      onSave: () => this.save(),
      onReset: () => this.reset(),
      onFieldChange: (path: string, value: unknown) => {
        this.setNestedValue(this.currentData, path, value);
        this.dirty = true;
        this.schedulePreviewDraftUpdate();
      },
      onInitPreview: () => this.ensureDevServer(),
      onInitComplex: () => {},
      complexNodes: this.buildComplexNodes(this.currentData, ""),
      onAddArrayItem: (path: string, selectedType: string | null, componentPicker?: boolean) => {
        const currentArr = this.getNestedValue(this.currentData, path);
        if (!Array.isArray(currentArr)) return;
        if (componentPicker) {
          this.openAddComponentModal(path, currentArr);
          return;
        }
        this.addArrayItem(path, currentArr, selectedType || null);
      },
      onRemoveArrayItem: (path: string, idx: number) => this.removeArrayItem(path, idx),
      onToggleArrayCollapse: (itemPath: string, expanded: boolean) => {
        this.itemExpandedState.set(itemPath, expanded);
        if (expanded) this.collapsedItems.delete(itemPath);
        else this.collapsedItems.add(itemPath);
      },
      onMoveArrayItem: (path: string, fromIdx: number, toIdx: number) => this.moveArrayItem(path, fromIdx, toIdx),
    });
  },

  rerenderEditorForm() {
    const root = document.getElementById("react-editor-primitives-root");
    if (!root || !this.currentFile) return;
    const meta = window.App.contentMeta[this.currentFile] || { label: this.currentFile };
    this.mountReactPrimitives(root, meta.label, this.currentFile);
  },

  buildComplexNodes(obj: any, path = "") {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const nodes: any[] = [];
    Object.entries(obj).forEach(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key;
      if (this.lib.shouldHideField(key)) return;
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        nodes.push(this.buildArrayNode(value, fieldPath, key));
      } else if (typeof value === "object") {
        const fields = this.extractPrimitiveFields(value, fieldPath, false);
        const children = this.buildComplexNodes(value, fieldPath);
        if (fields.length > 0 || children.length > 0) nodes.push({ kind: "object", path: fieldPath, label: this.formatLabel(key), fields, children });
      }
    });
    return nodes;
  },

  // Partition a typed item's primitive fields into content vs. design groups.
  // The leaf key (last path segment) is matched against the type's design set.
  // Unknown types put everything in `content`, so other pages are unaffected.
  splitFieldsByGroup(type: string | undefined, fields: any[]) {
    if (!this.lib.hasFieldGroups(type)) return { content: fields, advanced: [] as any[] };
    const content: any[] = [];
    const advanced: any[] = [];
    for (const field of fields) {
      const leaf = String(field.path).split(".").pop()?.replace(/\[\d+\]$/, "") || "";
      if (this.lib.isDesignField(type, leaf)) advanced.push(field);
      else content.push(field);
    }
    return { content, advanced };
  },

  buildArrayNode(arr: any[], path: string, key: string) {
    const addOptions = this.getAddTypeOptions(path);
    // Use the rich modal picker (name + description) when adding shared
    // components, or when the typed options carry descriptions (home sections).
    const usePicker = path === "components" || addOptions.some((o: any) => o.description);
    return {
      kind: "array",
      path,
      label: this.formatLabel(key),
      addOptions,
      componentPicker: usePicker,
      locked: this.isLockedArray(path),
      items: arr.map((item, idx) => {
        const itemPath = `${path}[${idx}]`;
        const itemIsObject = item && typeof item === "object" && !Array.isArray(item);
        const collapsible = this.isCollapsibleArray(path);
        if (collapsible && !this.itemExpandedState.has(itemPath)) this.itemExpandedState.set(itemPath, false);
        const expanded = collapsible ? this.itemExpandedState.get(itemPath) === true : true;
        const allFields = itemIsObject
          ? this.extractPrimitiveFields(item, itemPath, false)
          : [this.toPrimitiveArrayField(itemPath, key, item, idx)];
        // Split a typed section's fields into content vs. design. Design fields
        // (numeral, accent, side labels, etc.) go to a collapsed "advanced"
        // group so a non-technical editor sees only content by default.
        const itemType = itemIsObject ? item.type : undefined;
        const { content, advanced } = this.splitFieldsByGroup(itemType, allFields);
        return {
          idx,
          itemPath,
          label: itemIsObject ? this.getArrayItemLabel(item, idx) : `#${idx + 1}`,
          collapsible,
          expanded,
          fields: content,
          advancedFields: advanced,
          children: itemIsObject ? this.buildComplexNodes(item, itemPath) : [],
        };
      }),
    };
  },

  toPrimitiveArrayField(path: string, key: string, value: unknown, idx: number) {
    const field = this.toPrimitiveField(path, key, value);
    if (key === "paragraphs") {
      return {
        ...field,
        label: `Párrafo ${idx + 1}`,
        type: "textarea",
      };
    }
    return field;
  },

  extractPrimitiveFields(obj: any, path = "", deep = true) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const out: any[] = [];
    Object.entries(obj).forEach(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key;
      if (this.lib.shouldHideField(key)) return;
      if (value === null || value === undefined || Array.isArray(value)) return;
      if (typeof value === "object") {
        if (deep) out.push(...this.extractPrimitiveFields(value, fieldPath, true));
        return;
      }
      out.push(this.toPrimitiveField(fieldPath, key, value));
    });
    return out;
  },

  toPrimitiveField(path: string, key: string, value: any) {
    const type = this.getFieldType(path, value);
    const editorType = ["textarea", "boolean", "number", "url", "select", "brand-color"].includes(type) ? type : "text";
    return {
      path,
      label: this.getFieldLabel(path, key),
      type: editorType,
      value,
      options: editorType === "select" ? this.selectOptions[key] || [] : undefined,
      readOnly: editorType === "number" && this.isAutoNumberField(path),
    };
  },

  addArrayItem(path: string, currentArr: any[], selectedType: string | null = null) {
    if (this.isLockedArray(path)) return;
    const nextIdx = currentArr.length;
    if (selectedType) {
      const typed = this.lib.createTypedArrayItem(path, selectedType, this.currentFile, this.currentData);
      if (typed !== null) this.setNestedValue(this.currentData, path, [...currentArr, typed]);
    } else if (currentArr.length === 0) {
      this.setNestedValue(this.currentData, path, [...currentArr, this.lib.createEmptyArrayItem(path, this.currentFile, this.currentData)]);
    } else {
      const template = currentArr[currentArr.length - 1];
      this.setNestedValue(this.currentData, path, [...currentArr, typeof template === "string" ? "" : this.lib.blankClone(template)]);
    }
    // Auto-expand the newly added item so users see its fields immediately
    // instead of a collapsed header that looks like nothing happened.
    if (this.isCollapsibleArray(path)) {
      this.itemExpandedState.set(`${path}[${nextIdx}]`, true);
    }
    this.normalizeStructuredArrays();
    this.dirty = true;
    this.rerenderEditorForm();
    this.schedulePreviewDraftUpdate();
  },

  removeArrayItem(path: string, idx: number) {
    if (this.isLockedArray(path)) return;
    const arr = this.getNestedValue(this.currentData, path);
    if (Array.isArray(arr)) {
      arr.splice(idx, 1);
      this.setNestedValue(this.currentData, path, arr);
    }
    this.normalizeStructuredArrays();
    this.dirty = true;
    this.rerenderEditorForm();
    this.schedulePreviewDraftUpdate();
  },

  moveArrayItem(path: string, fromIdx: number, toIdx: number) {
    if (this.isLockedArray(path)) return;
    const arr = this.getNestedValue(this.currentData, path);
    if (!Array.isArray(arr) || fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    this.setNestedValue(this.currentData, path, arr);
    this.normalizeStructuredArrays();
    this.dirty = true;
    this.rerenderEditorForm();
    this.schedulePreviewDraftUpdate();
  },

  normalizeStructuredArrays() {
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === "itemsGrid" && node.mediaType === "number" && Array.isArray(node.items)) {
        node.items = node.items.map((item: any, idx: number) => ({ ...item, number: String(idx + 1) }));
      }
      Object.values(node).forEach(walk);
    };
    walk(this.currentData);
  },

  async openAddComponentModal(path: string, currentArr: any[]) {
    // Shared components have their own rich option list; typed arrays (e.g. home
    // sections) carry their options — with descriptions — via getAddTypeOptions.
    const componentOptions = this.lib.getComponentOptions(path);
    const options = componentOptions.length ? componentOptions : this.getAddTypeOptions(path);
    if (!options.length || !window.CMSModal?.openPicker) return;
    const selected = await window.CMSModal.openPicker({
      title: path === "components" ? "Agregar componente" : "Agregar sección",
      subtitle: "Selecciona lo que deseas agregar.",
      options,
    });
    if (selected) this.addArrayItem(path, currentArr, selected);
  },

  async save() {
    try {
      await window.API.saveContent(this.currentFile, this.currentData);
      this.dirty = false;
      if (this.devServerReady) {
        await this.waitForPreviewUpdate();
        this.loadPreviewIframe(true);
      }
      window.Toast.success(this.devServerReady ? "Guardado - vista previa recargada" : "Contenido guardado");
    } catch (err: any) {
      window.Toast.error(err.details ? `Error de validacion: ${err.details}` : `Error al guardar: ${err.message}`);
    }
  },

  schedulePreviewDraftUpdate() {
    if (!this.devServerReady || !this.currentFile) return;
    if (this.previewDraftTimer) clearTimeout(this.previewDraftTimer);
    // 600ms debounce: long enough to coalesce typing bursts, short enough
    // that pausing for a beat shows the change in the iframe.
    this.previewDraftTimer = setTimeout(async () => {
      this.previewDraftTimer = null;
      try {
        await window.API.syncPreviewDraft(this.currentFile, this.currentData);
        await this.waitForPreviewUpdate();
        this.loadPreviewIframe(true);
      } catch {
        // Stay silent — toasting every failed preview push during typing is noisy.
        // The user will see issues at save time, where errors are surfaced explicitly.
      }
    }, 600);
  },

  async reset() {
    try {
      if (this.previewMode === "static") {
        this.loadPreviewIframe(true);
        window.Toast.info("Vista previa recargada. En produccion, guarda para publicar cambios.");
        return;
      }

      await window.API.syncPreviewDraft(this.currentFile, this.currentData);
      await this.waitForPreviewUpdate();
      this.loadPreviewIframe(true);
      window.Toast.info("Vista previa actualizada con tus cambios");
    } catch (err: any) {
      window.Toast.error(err?.message ? `No se pudo actualizar la vista previa: ${err.message}` : "No se pudo actualizar la vista previa");
    }
  },

  ensureDevServer() { return window.CMSEditorPreview.ensure(this); },
  loadPreviewIframe(forceReload = false) { return window.CMSEditorPreview.load(this, forceReload); },
};

export function registerEditorController(): void {
  window.Editor = Editor;
}
