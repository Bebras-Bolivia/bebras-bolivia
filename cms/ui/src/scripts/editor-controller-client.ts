
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SafeAny = any;

const Editor = {
  currentFile: null as string | null,
  currentSection: null as string[] | null,
  currentSectionLabel: null as string | null,
  currentRootPath: null as string | null,
  currentCustomPageId: null as string | null,
  currentPreviewPath: null as string | null,
  currentData: null as SafeAny,
  customPagePaths: new Set<string>(),
  customPagesByPath: new Map<string, { id: string; title: string; active: boolean }>(),
  dirty: false,
  devServerReady: false,
  devServerStarting: false,
  devServerPort: null as number | null,
  previewMode: null as string | null,
  previewDraftTimer: null as ReturnType<typeof setTimeout> | null,
  previewDraftPromise: null as Promise<void> | null,
  previewSyncQueued: false,
  collapsedItems: new Set<string>(),
  itemExpandedState: new Map<string, boolean>(),
  renderRevision: 0,

  get lib() { return window.CMSEditorLib; },
  get fileToPage() { return this.lib.fileToPage; },
  get selectOptions() { return this.lib.selectOptions; },
  getSelectOptions(path: string, key: string) { return this.lib.getSelectOptions(path, key, this.currentFile); },

  escapeForPre(value: string) { return this.lib.escapeForPre(value); },
  formatLabel(key: string) { return this.lib.formatLabel(key); },
  getNestedValue(obj: SafeAny, path: string) { return this.lib.getNestedValue(obj, path); },
  setNestedValue(obj: SafeAny, path: string, value: unknown) { return this.lib.setNestedValue(obj, path, value); },
  getFieldType(path: string, value: unknown) { return this.lib.getFieldType(path, value); },
  getFieldLabel(path: string, key: string) {
    if (path === "header.subtitle") return "Descripcion visible";
    return this.formatLabel(key);
  },
  isAutoNumberField(path: string) { return this.lib.isAutoNumberField(path, this.currentData); },
  isCollapsibleArray(path: string) { return this.lib.isCollapsibleArray(path); },
  isLockedArray(_path: string): boolean {
    return false;
  },
  getArrayItemLabel(obj: SafeAny, idx: number) { return this.lib.getArrayItemLabel(obj, idx); },
  getAddTypeOptions(path: string) { return this.lib.getAddTypeOptions(path, this.currentFile, this.currentData) || []; },
  isComponentsPath(path: string) { return path === "components" || path.endsWith(".components"); },
  waitForPreviewUpdate() { return new Promise((resolve) => setTimeout(resolve, 850)); },
  getPreviewDependencyFiles(filename: string) {
    const dependencyMap: Record<string, string[]> = {
      "estudiantes.json": ["categories.json", "scoring.json", "page-composition.json"],
      "docentes.json": ["teacher-instructions.json", "page-composition.json"],
      "categories.json": ["estudiantes.json", "page-composition.json"],
      "scoring.json": ["estudiantes.json", "page-composition.json"],
      "teacher-instructions.json": ["docentes.json", "page-composition.json"],
      "page-composition.json": ["estudiantes.json", "docentes.json", "categories.json", "scoring.json", "teacher-instructions.json"],
    };

    return dependencyMap[filename] || [];
  },
  async syncPreviewDependencies(activeFile: string | null = null) {
    const sourceFile = activeFile ?? this.currentFile;
    if (!sourceFile) return;

    for (const filename of this.getPreviewDependencyFiles(sourceFile)) {
      if (filename === sourceFile) continue;
      try {
        const data = await window.API.getContent(filename);
        await window.API.syncPreviewDraft(filename, data);
      } catch {
        // Dependency preview sync is best-effort. The active draft below is the
        // one that must surface validation errors during save.
      }
    }
  },

  async render(filename: string, section: string[] | null = null, sectionLabel: string | null = null) {
    const main = document.getElementById("main-content");
    if (!main) return;
    const revision = ++this.renderRevision;

    this.currentFile = filename;
    this.currentSection = section;
    this.currentSectionLabel = sectionLabel;
    this.currentRootPath = null;
    this.currentCustomPageId = null;
    this.currentPreviewPath = null;
    this.dirty = false;

    try {
      const nextData = await window.API.getContent(filename);
      if (revision !== this.renderRevision || this.currentFile !== filename) return;
      this.customPagePaths = new Set();
      this.customPagesByPath = new Map();
      if (filename === "navigation.json") {
        const customPages = await window.API.getContent("custom-pages.json");
        if (revision !== this.renderRevision || this.currentFile !== filename) return;
        this.customPagePaths = new Set((customPages.pages || []).map((page: SafeAny) => `/${page.slug}`));
        this.customPagesByPath = new Map((customPages.pages || []).map((page: SafeAny) => [
          `/${page.slug}`,
          { id: page.id, title: page.title, active: page.active !== false },
        ]));
      }
      this.currentData = nextData;
      const meta = window.App.contentMeta[filename] || { label: filename };
      main.innerHTML = '<div id="react-editor-primitives-root"></div>';
      const root = document.getElementById("react-editor-primitives-root");
      if (root) this.mountReactPrimitives(root, meta.label, filename);
    } catch (err: SafeAny) {
      if (revision !== this.renderRevision) return;
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(err.message)}</p></div>`;
    }
  },

  async renderCustomPage(pageId: string) {
    const main = document.getElementById("main-content");
    if (!main) return;
    const revision = ++this.renderRevision;

    this.currentFile = "custom-pages.json";
    this.currentSection = null;
    this.currentSectionLabel = null;
    this.currentRootPath = null;
    this.currentCustomPageId = pageId;
    this.currentPreviewPath = null;
    this.dirty = false;

    try {
      const nextData = await window.API.getContent("custom-pages.json");
      if (revision !== this.renderRevision || this.currentCustomPageId !== pageId) return;
      const pageIndex = nextData.pages?.findIndex((page: SafeAny) => page.id === pageId) ?? -1;
      if (pageIndex < 0) throw new Error("La página solicitada no existe");
      const page = nextData.pages[pageIndex];
      this.currentData = nextData;
      const headerTitle = document.getElementById("header-title");
      if (headerTitle) headerTitle.textContent = `Editar: ${page.title}`;
      this.currentRootPath = `pages[${pageIndex}]`;
      this.currentPreviewPath = `/${page.slug}`;
      main.innerHTML = '<div id="react-editor-primitives-root"></div>';
      const root = document.getElementById("react-editor-primitives-root");
      if (root) this.mountReactPrimitives(root, page.title, "custom-pages.json");
    } catch (err: SafeAny) {
      if (revision !== this.renderRevision) return;
      main.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${window.App.escapeHtml(err.message)}</p></div>`;
    }
  },

  mountReactPrimitives(root: Element, title: string, filename: string) {
    const rootData = this.currentRootPath
      ? this.getNestedValue(this.currentData, this.currentRootPath)
      : this.currentData;
    const rootPath = this.currentRootPath || "";
    const fields = this.extractPrimitiveFields(rootData, rootPath, false);
    const complexNodes = this.buildComplexNodes(rootData, rootPath);
    const section = this.currentSection;
    window.CMSEditor.mountPrimitives(root, {
      title: this.currentSectionLabel || title,
      filename,
      fields: section
        ? fields.filter((field: SafeAny) => section.some((path) => field.path === path || field.path.startsWith(`${path}.`)))
        : fields,
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
      complexNodes: section ? complexNodes.filter((node: SafeAny) => section.includes(node.path)) : complexNodes,
      onAddArrayItem: (path: string, selectedType: string | null, componentPicker?: boolean) => {
        if (this.currentFile === "navigation.json" && path === "links") {
          return this.createCustomPage();
        }
        const currentArr = this.getNestedValue(this.currentData, path);
        if (!Array.isArray(currentArr)) return false;
        if (componentPicker) {
          return this.openAddComponentModal(path, currentArr);
        }
        return this.addArrayItem(path, currentArr, selectedType || null);
      },
      onRemoveArrayItem: (path: string, idx: number) => this.removeArrayItem(path, idx),
      onToggleArrayCollapse: (itemPath: string, expanded: boolean) => {
        this.itemExpandedState.set(itemPath, expanded);
        if (expanded) this.collapsedItems.delete(itemPath);
        else this.collapsedItems.add(itemPath);
      },
      onMoveArrayItem: (path: string, fromIdx: number, toIdx: number) => this.moveArrayItem(path, fromIdx, toIdx),
      onItemAction: (path: string, idx: number, action: string) => this.handleArrayItemAction(path, idx, action),
    });
  },

  rerenderEditorForm() {
    const root = document.getElementById("react-editor-primitives-root");
    if (!root || !this.currentFile) return;
    const meta = window.App.contentMeta[this.currentFile] || { label: this.currentFile };
    const rootTitle = this.currentRootPath
      ? this.getNestedValue(this.currentData, this.currentRootPath)?.title
      : null;
    this.mountReactPrimitives(root, rootTitle || meta.label, this.currentFile);
  },

  buildComplexNodes(obj: SafeAny, path = "") {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const nodes: SafeAny[] = [];
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
  splitFieldsByGroup(type: string | undefined, fields: SafeAny[]) {
    if (!this.lib.hasFieldGroups(type)) return { content: fields, advanced: [] as SafeAny[] };
    const content: SafeAny[] = [];
    const advanced: SafeAny[] = [];
    for (const field of fields) {
      const leaf = String(field.path).split(".").pop()?.replace(/\[\d+\]$/, "") || "";
      if (this.lib.isDesignField(type, leaf)) advanced.push(field);
      else content.push(field);
    }
    return { content, advanced };
  },

  buildArrayNode(arr: SafeAny[], path: string, key: string) {
    const addOptions = this.getAddTypeOptions(path);
    // Use the rich modal picker (name + description) when adding shared
    // components, or when the typed options carry descriptions (home sections).
    const usePicker = this.isComponentsPath(path) || addOptions.some((o: SafeAny) => o.description);
    return {
      kind: "array",
      path,
      label: this.formatLabel(key),
      addOptions,
      componentPicker: usePicker,
      buttonLabel: this.currentFile === "navigation.json" && path === "links" ? "Crear página" : "Agregar",
      locked: this.isLockedArray(path),
      removable: !(this.currentFile === "navigation.json" && path === "links"),
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
        const customPage = this.currentFile === "navigation.json" && path === "links"
          ? this.customPagesByPath.get(item?.href)
          : undefined;
        const isNavigationPage = this.currentFile === "navigation.json" && path === "links";
        const active = customPage ? customPage.active : item?.active !== false;
        const actionSubject = customPage?.title || item?.label || `página ${idx + 1}`;
        return {
          idx,
          itemPath,
          label: itemIsObject ? this.getArrayItemLabel(item, idx) : `#${idx + 1}`,
          collapsible,
          expanded,
          fields: content,
          advancedFields: advanced,
          statusLabel: isNavigationPage && !active ? "Inactiva" : undefined,
          actions: isNavigationPage
            ? [
                { id: "toggle-page", label: `${active ? "Desactivar" : "Activar"} ${actionSubject}`, icon: active ? "eye" : "eye-off" },
                ...(customPage ? [{ id: "delete-page", label: `Eliminar ${actionSubject}`, icon: "trash", tone: "danger" }] : []),
              ]
            : undefined,
          children: itemIsObject ? this.buildComplexNodes(item, itemPath) : [],
        };
      }),
    };
  },

  async handleArrayItemAction(path: string, idx: number, action: string) {
    if (this.currentFile !== "navigation.json" || path !== "links") return;
    const link = this.currentData?.links?.[idx];
    const page = link ? this.customPagesByPath.get(link.href) : null;
    if (!link) return;

    if (action === "toggle-page") {
      const active = page ? !page.active : link.active === false;
      const title = page?.title || link.label;
      const confirmed = await window.CMSModal.openConfirm({
        title: `${active ? "Activar" : "Desactivar"} ${title}`,
        message: active
          ? "La página volverá a estar disponible en el sitio y en la navegación pública."
          : page
            ? "La página dejará de estar disponible en el sitio público, pero conservará todo su contenido."
            : "La página se ocultará de la navegación pública, pero conservará su contenido y su URL.",
        confirmLabel: active ? "Activar" : "Desactivar",
        cancelLabel: "Cancelar",
      });
      if (!confirmed) return;

      try {
        if (page) {
          await window.API.setCustomPageActive(page.id, active);
          this.customPagesByPath.set(link.href, { ...page, active });
        } else {
          await window.API.setNavigationLinkActive(link.href, active);
          link.active = active;
        }
        this.rerenderEditorForm();
        await window.App.renderSidebarContentTree();
        window.Toast.success(active ? "Página activada" : "Página desactivada");
      } catch (err: SafeAny) {
        window.Toast.error(err?.message || "No se pudo cambiar el estado de la página");
      }
      return;
    }

    if (action === "delete-page") {
      if (!page) return;
      const requiredValue = page.title.toLocaleLowerCase("es");
      const confirmation = await window.CMSModal.openInput({
        title: `Eliminar ${page.title}`,
        subtitle: `Esta acción solo puede recuperarse desde un respaldo. Escribe “${requiredValue}” para confirmar.`,
        label: "Nombre de la página en minúsculas",
        placeholder: requiredValue,
        requiredValue,
        maxLength: 80,
        confirmLabel: "Eliminar página",
        cancelLabel: "Cancelar",
        tone: "danger",
      });
      if (confirmation !== requiredValue) return;

      try {
        const result = await window.API.deleteCustomPage(page.id);
        this.currentData.links = this.currentData.links.filter((item: SafeAny) => item.href !== link.href);
        if (!result.navigation?.cta && this.currentData.cta?.href === link.href) {
          delete this.currentData.cta;
        }
        this.customPagePaths.delete(link.href);
        this.customPagesByPath.delete(link.href);
        this.rerenderEditorForm();
        await window.App.renderSidebarContentTree();
        window.Toast.success("Página eliminada");
      } catch (err: SafeAny) {
        window.Toast.error(err?.message || "No se pudo eliminar la página");
      }
    }
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

  extractPrimitiveFields(obj: SafeAny, path = "", deep = true) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const out: SafeAny[] = [];
    Object.entries(obj).forEach(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key;
      if (this.lib.shouldHideField(key)) return;
      if (this.currentFile === "navigation.json" && key === "active" && /^links\[\d+\]$/.test(path)) return;
      if (
        this.currentFile === "custom-pages.json"
        && this.currentRootPath
        && ["title", "slug", "active"].includes(key)
        && path === this.currentRootPath
      ) return;
      if (this.isAutoNumberField(fieldPath)) return;
      if (value === null || value === undefined || Array.isArray(value)) return;
      if (typeof value === "object") {
        if (deep) out.push(...this.extractPrimitiveFields(value, fieldPath, true));
        return;
      }
      out.push(this.toPrimitiveField(fieldPath, key, value));
    });
    return out;
  },

  toPrimitiveField(path: string, key: string, value: SafeAny) {
    const parentPath = key === "image" ? path.replace(/\.image$/, "") : "";
    const parent = parentPath ? this.getNestedValue(this.currentData, parentPath) : null;
    const type = key === "columns"
      ? "column-count"
      : key === "image" && parent?.type === "organizerInstitution"
        ? "image"
      : this.getFieldType(path, value);
    const editorType = ["textarea", "boolean", "number", "url", "select", "brand-color", "column-count", "image"].includes(type) ? type : "text";
    return {
      path,
      label: this.getFieldLabel(path, key),
      type: editorType,
      value,
      options: editorType === "select" ? this.getSelectOptions(path, key) : undefined,
      readOnly:
        (editorType === "number" && this.isAutoNumberField(path))
        || (this.currentFile === "navigation.json" && /^links\[\d+\]\.href$/.test(path))
        || (this.currentFile === "navigation.json" && this.isCustomPageNavigationLabel(path))
        || (this.currentFile === "custom-pages.json" && /\.slug$/.test(path)),
    };
  },

  isCustomPageNavigationLabel(path: string) {
    const match = path.match(/^links\[(\d+)\]\.label$/);
    if (!match) return false;
    return this.customPagePaths.has(this.currentData?.links?.[Number(match[1])]?.href);
  },

  async createCustomPage() {
    const title = await window.CMSModal.openInput({
      title: "Crear página",
      subtitle: "La página se añadirá a la navegación y podrás construirla con componentes.",
      label: "Nombre de la página",
      placeholder: "Ej. Recursos para docentes",
      confirmLabel: "Crear página",
      cancelLabel: "Cancelar",
      maxLength: 80,
    });
    if (!title?.trim()) return false;

    try {
      const normalizedTitle = title.normalize("NFC").trim().replace(/\s+/g, " ");
      const result = await window.API.createCustomPage(normalizedTitle);
      const previewStatus = await window.API.previewStatus().catch(() => null);
      if (previewStatus?.running) {
        try {
          await window.API.stopPreview();
          this.devServerReady = false;
          this.devServerStarting = false;
          this.previewMode = null;
        } catch (previewError) {
          console.warn("No se pudo reiniciar la vista previa para la nueva página:", previewError);
        }
      }
      await window.App.renderSidebarContentTree();
      window.Toast.success("Página creada y añadida a la navegación");
      window.App.navigate(`/editor/custom-pages.json/${encodeURIComponent(result.page.id)}`);
      return true;
    } catch (err: SafeAny) {
      window.Toast.error(err?.message || "No se pudo crear la página");
      return false;
    }
  },

  addArrayItem(path: string, currentArr: SafeAny[], selectedType: string | null = null) {
    if (this.isLockedArray(path)) return false;
    const nextIdx = currentArr.length;
    if (selectedType) {
      const typed = this.lib.createTypedArrayItem(path, selectedType, this.currentFile, this.currentData);
      if (typed !== null) this.setNestedValue(this.currentData, path, [...currentArr, typed]);
      else return false;
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
    return true;
  },

  removeArrayItem(path: string, idx: number) {
    if (this.isLockedArray(path)) return false;
    const arr = this.getNestedValue(this.currentData, path);
    if (Array.isArray(arr)) {
      arr.splice(idx, 1);
      this.setNestedValue(this.currentData, path, arr);
    } else {
      return false;
    }
    this.normalizeStructuredArrays();
    this.dirty = true;
    this.rerenderEditorForm();
    this.schedulePreviewDraftUpdate();
    return true;
  },

  moveArrayItem(path: string, fromIdx: number, toIdx: number) {
    if (this.isLockedArray(path)) return false;
    const arr = this.getNestedValue(this.currentData, path);
    if (!Array.isArray(arr) || fromIdx === toIdx) return false;
    if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return false;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    this.setNestedValue(this.currentData, path, arr);
    this.normalizeStructuredArrays();
    this.dirty = true;
    this.rerenderEditorForm();
    this.schedulePreviewDraftUpdate();
    return true;
  },

  normalizeStructuredArrays() {
    const walk = (node: SafeAny) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === "itemsGrid" && node.mediaType === "number" && Array.isArray(node.items)) {
        node.items = node.items.map((item: SafeAny, idx: number) => ({ ...item, number: String(idx + 1) }));
      }
      Object.values(node).forEach(walk);
    };
    walk(this.currentData);
  },

  async openAddComponentModal(path: string, currentArr: SafeAny[]) {
    // Shared components have their own rich option list; typed arrays (e.g. home
    // sections) carry their options — with descriptions — via getAddTypeOptions.
    const componentOptions = this.lib.getComponentOptions(path).filter(
      (option: SafeAny) => this.currentFile !== "custom-pages.json" || !["blogIndex", "blogPostUi"].includes(option.value),
    );
    const options = componentOptions.length ? componentOptions : this.getAddTypeOptions(path);
    if (!options.length || !window.CMSModal?.openPicker) return false;
    const selected = await window.CMSModal.openPicker({
      title: this.isComponentsPath(path) ? "Agregar componente" : "Agregar sección",
      subtitle: "Selecciona lo que deseas agregar.",
      options,
    });
    if (!selected) return false;
    return this.addArrayItem(path, currentArr, selected);
  },

  async save() {
    try {
      if (this.currentFile === "custom-pages.json" && this.currentCustomPageId && this.currentRootPath) {
        const page = this.getNestedValue(this.currentData, this.currentRootPath);
        await window.API.saveCustomPage(this.currentCustomPageId, page);
        await window.App.renderSidebarContentTree();
        const headerTitle = document.getElementById("header-title");
        if (headerTitle) headerTitle.textContent = `Editar: ${page.title}`;
        this.rerenderEditorForm();
      } else {
        await window.API.saveContent(this.currentFile, this.currentData);
      }
      this.dirty = false;
      if (this.devServerReady) {
        await this.waitForPreviewUpdate();
        this.loadPreviewIframe(true);
      }
      window.Toast.success(this.devServerReady ? "Guardado - vista previa recargada" : "Contenido guardado");
      return true;
    } catch (err: SafeAny) {
      window.Toast.error(err.details ? `Error de validacion: ${err.details}` : `Error al guardar: ${err.message}`);
      return false;
    }
  },

  schedulePreviewDraftUpdate() {
    if (!this.currentFile) return;
    if (!this.devServerReady) {
      this.previewSyncQueued = true;
      return;
    }
    this.previewSyncQueued = false;
    if (this.previewDraftTimer) clearTimeout(this.previewDraftTimer);
    const revision = this.renderRevision;
    const filename = this.currentFile;
    const data = this.currentData;
    // 600ms debounce: long enough to coalesce typing bursts, short enough
    // that pausing for a beat shows the change in the iframe.
    this.previewDraftTimer = setTimeout(() => {
      this.previewDraftTimer = null;
      const previousPreview = this.previewDraftPromise ?? Promise.resolve();
      const previewWork = previousPreview.catch(() => undefined).then(async () => {
        if (revision !== this.renderRevision) return;
        try {
          await this.syncPreviewDependencies(filename);
          if (revision !== this.renderRevision) return;
          await window.API.syncPreviewDraft(filename, data);
          if (revision !== this.renderRevision) return;
          await this.waitForPreviewUpdate();
          if (revision !== this.renderRevision) return;
          this.loadPreviewIframe(true);
        } catch {
          // Stay silent — toasting every failed preview push during typing is noisy.
          // The user will see issues at save time, where errors are surfaced explicitly.
        }
      });
      this.previewDraftPromise = previewWork;
      void previewWork.finally(() => {
        if (this.previewDraftPromise === previewWork) this.previewDraftPromise = null;
      });
    }, 600);
  },

  cancelPendingWork() {
    this.renderRevision += 1;
    if (this.previewDraftTimer) {
      clearTimeout(this.previewDraftTimer);
      this.previewDraftTimer = null;
    }
    this.previewSyncQueued = false;
  },

  restoreDiscardedDraft() {
    const filename = this.currentFile;
    const pendingPreview = this.previewDraftPromise;
    this.cancelPendingWork();
    if (!filename) return Promise.resolve();

    const restoreWork = (pendingPreview ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        await window.API.restorePreviewDraft(filename);
      });
    this.previewDraftPromise = restoreWork;
    const clearRestoreWork = () => {
      if (this.previewDraftPromise === restoreWork) this.previewDraftPromise = null;
    };
    void restoreWork.then(clearRestoreWork, clearRestoreWork);
    return restoreWork;
  },

  async reset() {
    try {
      if (this.previewMode === "static") {
        this.loadPreviewIframe(true);
        window.Toast.info("Vista previa recargada. En produccion, guarda para publicar cambios.");
        return;
      }

      await window.API.syncPreviewDraft(this.currentFile, this.currentData);
      await this.syncPreviewDependencies();
      await this.waitForPreviewUpdate();
      this.loadPreviewIframe(true);
      window.Toast.info("Vista previa actualizada con tus cambios");
    } catch (err: SafeAny) {
      window.Toast.error(err?.message ? `No se pudo actualizar la vista previa: ${err.message}` : "No se pudo actualizar la vista previa");
    }
  },

  async ensureDevServer() {
    await window.CMSEditorPreview.ensure(this);
    if (this.previewSyncQueued && this.devServerReady) {
      this.schedulePreviewDraftUpdate();
    }
  },
  loadPreviewIframe(forceReload = false) { return window.CMSEditorPreview.load(this, forceReload); },
};

export function registerEditorController(): void {
  window.Editor = Editor;
}
