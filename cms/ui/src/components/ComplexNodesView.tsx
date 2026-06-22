import React from "react";
import ArrayActionsView from "./ArrayActionsView";
import ArrayCollapseToggleView from "./ArrayCollapseToggleView";
import ArrayItemActionsView from "./ArrayItemActionsView";
import BrandColorSwatch from "./BrandColorSwatch";

export type EditorField = {
  path: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "url" | "select" | "brand-color";
  value: string | number | boolean;
  options?: string[];
  readOnly?: boolean;
};

export type ComplexNode =
  | {
      kind: "object";
      path: string;
      label: string;
      fields: EditorField[];
      children: ComplexNode[];
    }
  | {
      kind: "array";
      path: string;
      label: string;
      addOptions: Array<{ value: string; label: string }>;
      componentPicker?: boolean;
      /**
       * When true, the array's structure is fixed — no add, remove, or reorder.
       * Used for arrays whose items map to physical site files (e.g. nav links
       * pointing to .astro pages) where adding entries would create dead URLs.
       */
      locked?: boolean;
      items: Array<{
        idx: number;
        itemPath: string;
        label: string;
        collapsible: boolean;
        expanded: boolean;
        fields: EditorField[];
        advancedFields?: EditorField[];
        children: ComplexNode[];
      }>;
    };

interface Props {
  nodes: ComplexNode[];
  icons: Record<string, string>;
  onFieldChange: (path: string, value: string | number | boolean) => void;
  onAddArrayItem: (path: string, selectedType: string | null, componentPicker?: boolean) => void;
  onRemoveArrayItem: (path: string, idx: number) => void;
  onToggleArrayCollapse: (itemPath: string, expanded: boolean) => void;
  onMoveArrayItem: (path: string, fromIdx: number, toIdx: number) => void;
}

type RendererProps = Props & {
  expandedItems: Map<string, boolean>;
  setExpandedItems: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
  draftValues: Map<string, string>;
  setDraftValue: (path: string, value: string) => void;
};

function FieldInput({
  field,
  onFieldChange,
  draftValues,
  setDraftValue,
}: {
  field: EditorField;
  onFieldChange: Props["onFieldChange"];
  draftValues: Map<string, string>;
  setDraftValue: (path: string, value: string) => void;
}) {
  const value = field.value;
  const draftValue = draftValues.get(field.path) ?? String(value ?? "");

  React.useEffect(() => {
    setDraftValue(field.path, String(value ?? ""));
  }, [field.path, value, setDraftValue]);

  if (field.type === "textarea") {
    return (
      <textarea
        id={`field-${field.path}`}
        className="form-textarea"
        rows={3}
        maxLength={5000}
        value={draftValue}
        onChange={(e) => {
          setDraftValue(field.path, e.target.value);
          onFieldChange(field.path, e.target.value);
        }}
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <input
        id={`field-${field.path}`}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onFieldChange(field.path, e.target.checked)}
        style={{ width: "16px", height: "16px" }}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        id={`field-${field.path}`}
        className="form-select"
        value={String(value ?? "")}
        onChange={(e) => onFieldChange(field.path, e.target.value)}
      >
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === "brand-color") {
    return (
      <BrandColorSwatch
        id={`field-${field.path}`}
        path={field.path}
        value={value}
        onChange={(next) => onFieldChange(field.path, next)}
      />
    );
  }

  return (
    <input
      id={`field-${field.path}`}
      className="form-input"
      type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
      readOnly={Boolean(field.readOnly)}
      disabled={Boolean(field.readOnly)}
      maxLength={field.type === "url" ? 500 : undefined}
      value={draftValue}
      onChange={(e) => {
        setDraftValue(field.path, e.target.value);
        if (field.type === "number") {
          const parsed = Number(e.target.value);
          onFieldChange(field.path, Number.isNaN(parsed) ? 0 : parsed);
          return;
        }
        onFieldChange(field.path, e.target.value);
      }}
    />
  );
}

function formatItemLabel(rawLabel: string, idx: number): string {
  if (!rawLabel) return `Elemento ${idx + 1}`;
  // Strip a leading "#N — " or "#N -" that the backend may prepend, since we render the index chip separately.
  const stripped = rawLabel.replace(/^#\d+\s*[—\-:·]\s*/, "");
  if (!stripped) return rawLabel;
  // Convert SHOUTY UPPERCASE labels to title case for readability.
  if (stripped === stripped.toUpperCase() && /[A-Za-zÁ-Úá-ú]/.test(stripped)) {
    return stripped.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());
  }
  return stripped;
}

function getPrimaryLabelField(fields: EditorField[]): EditorField | undefined {
  return fields.find((field) => /\.(label|title|name|heading|tag)$/.test(field.path));
}

function EditableItemLabel({
  fallbackLabel,
  primaryField,
  itemIndex,
  editIcon,
  onFieldChange,
  draftValues,
  setDraftValue,
}: {
  fallbackLabel: string;
  primaryField?: EditorField;
  itemIndex: number;
  editIcon: string;
  onFieldChange: Props["onFieldChange"];
  draftValues: Map<string, string>;
  setDraftValue: (path: string, value: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const primaryValue = primaryField ? draftValues.get(primaryField.path) ?? String(primaryField.value ?? "") : "";
  const displayLabel = primaryValue.trim() || formatItemLabel(fallbackLabel, itemIndex);

  if (!primaryField) {
    return <span className="array-item-label">{displayLabel}</span>;
  }

  if (editing) {
    return (
      <input
        className="array-item-label-input"
        value={primaryValue}
        maxLength={120}
        autoFocus
        onChange={(e) => {
          setDraftValue(primaryField.path, e.target.value);
          onFieldChange(primaryField.path, e.target.value);
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false);
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      className="array-item-label array-item-label-editable"
      title="Clic para editar el nombre"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <span>{displayLabel}</span>
      <span
        className="array-item-label-edit-icon"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: editIcon }}
      />
    </button>
  );
}

function FieldGroup({
  field,
  onFieldChange,
  draftValues,
  setDraftValue,
}: {
  field: EditorField;
  onFieldChange: Props["onFieldChange"];
  draftValues: Map<string, string>;
  setDraftValue: (path: string, value: string) => void;
}) {
  return (
    <div className="form-group">
      <label htmlFor={`field-${field.path}`}>{field.label}</label>
      <FieldInput field={field} onFieldChange={onFieldChange} draftValues={draftValues} setDraftValue={setDraftValue} />
    </div>
  );
}

function NodeRenderer(props: RendererProps & { node: ComplexNode }) {
  const { node } = props;

  if (node.kind === "object") {
    return (
      <div className="field-section">
        <div className="field-section-title">{node.label}</div>
        {node.fields.map((field) => (
          <FieldGroup
            key={field.path}
            field={field}
            onFieldChange={props.onFieldChange}
            draftValues={props.draftValues}
            setDraftValue={props.setDraftValue}
          />
        ))}
        {node.children.map((child) => (
          <NodeRenderer key={`${child.kind}:${child.path}`} {...props} node={child} />
        ))}
      </div>
    );
  }

  return <ArrayNode {...props} node={node} />;
}

function collectExpandedState(nodes: ComplexNode[], state = new Map<string, boolean>()) {
  nodes.forEach((node) => {
    if (node.kind === "object") {
      collectExpandedState(node.children, state);
      return;
    }

    node.items.forEach((item) => {
      if (item.collapsible) state.set(item.itemPath, item.expanded);
      collectExpandedState(item.children, state);
    });
  });
  return state;
}

function ArrayNode(props: RendererProps & { node: Extract<ComplexNode, { kind: "array" }> }) {
  const { node, icons, onAddArrayItem, onRemoveArrayItem, onToggleArrayCollapse, onMoveArrayItem, expandedItems, setExpandedItems } = props;
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);

  const locked = node.locked === true;

  return (
    <div className="field-section">
      <div className="field-section-title">
        <span>{node.label}</span>
        <span className="field-section-count">{node.items.length}</span>
        {locked ? (
          <span className="field-section-lock" title="Estructura fija: solo se pueden editar los campos existentes.">Fijo</span>
        ) : null}
      </div>
      <div className="array-field" data-array-path={node.path}>
        {node.items.map((item) => {
          const itemExpanded = expandedItems.get(item.itemPath) ?? item.expanded;
          const bodyVisible = !item.collapsible || itemExpanded;
          const primaryField = getPrimaryLabelField(item.fields);
          const isPrimitiveItem =
            !item.collapsible &&
            item.fields.length === 1 &&
            item.children.length === 0 &&
            (!item.advancedFields || item.advancedFields.length === 0) &&
            item.fields[0]?.path === item.itemPath;
          if (isPrimitiveItem) {
            return (
              <div
                className={locked ? "array-primitive-item array-item-locked" : "array-primitive-item"}
                key={item.itemPath}
              >
                <FieldGroup
                  field={item.fields[0]}
                  onFieldChange={props.onFieldChange}
                  draftValues={props.draftValues}
                  setDraftValue={props.setDraftValue}
                />
                {!locked ? (
                  <ArrayItemActionsView trashIcon={icons.trash || ""} onRemove={() => onRemoveArrayItem(node.path, item.idx)} />
                ) : null}
              </div>
            );
          }
          return (
            <div
              className={locked ? "array-item array-item-locked" : "array-item"}
              key={item.itemPath}
              draggable={!locked}
              data-dnd-idx={item.idx}
              onDragStart={(e) => {
                if (locked) {
                  e.preventDefault();
                  return;
                }
                const target = e.target as HTMLElement;
                if (target.closest("input, textarea, select, button")) {
                  e.preventDefault();
                  return;
                }
                setDragFrom(item.idx);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", "");
              }}
              onDragOver={(e) => {
                if (locked) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (locked) return;
                e.preventDefault();
                if (dragFrom === null || dragFrom === item.idx) return;
                onMoveArrayItem(node.path, dragFrom, item.idx);
                setDragFrom(null);
              }}
            >
              <div className="array-item-header">
                <span className="array-item-header-left">
                  {locked ? null : (
                    <span className="drag-handle" title="Arrastrar para reordenar" dangerouslySetInnerHTML={{ __html: icons.grip || "" }} />
                  )}
                  <span className="array-item-index">#{item.idx + 1}</span>
                  <EditableItemLabel
                    fallbackLabel={item.label}
                    primaryField={primaryField}
                    itemIndex={item.idx}
                    editIcon={icons.edit || ""}
                    onFieldChange={props.onFieldChange}
                    draftValues={props.draftValues}
                    setDraftValue={props.setDraftValue}
                  />
                  {item.collapsible ? (
                    <ArrayCollapseToggleView
                      arrowIcon={icons.chevron || icons.arrow || ""}
                      expanded={itemExpanded}
                      onToggle={() => {
                        const nextExpanded = !itemExpanded;
                        const siblings = node.items.map((it) => it.itemPath);
                        setExpandedItems((prev) => {
                          const next = new Map(prev);
                          if (nextExpanded) {
                            for (const sib of siblings) next.set(sib, false);
                            next.set(item.itemPath, true);
                          } else {
                            next.set(item.itemPath, false);
                          }
                          return next;
                        });
                        if (nextExpanded) {
                          for (const sib of siblings) {
                            if (sib !== item.itemPath) onToggleArrayCollapse(sib, false);
                          }
                        }
                        onToggleArrayCollapse(item.itemPath, nextExpanded);
                      }}
                    />
                  ) : null}
                </span>
                {item.collapsible && !locked ? (
                  <span className="array-item-header-right">
                    <ArrayItemActionsView trashIcon={icons.trash || ""} inline onRemove={() => onRemoveArrayItem(node.path, item.idx)} />
                  </span>
                ) : null}
              </div>

              <div className={`array-item-collapse${bodyVisible ? " open" : ""}`}>
                <div className="array-item-collapse-inner">
                  <div className="array-item-body">
                    {item.fields.map((field) => (
                      <FieldGroup
                        key={field.path}
                        field={field}
                        onFieldChange={props.onFieldChange}
                        draftValues={props.draftValues}
                        setDraftValue={props.setDraftValue}
                      />
                    ))}
                    {item.children.map((child) => (
                      <NodeRenderer key={`${child.kind}:${child.path}`} {...props} node={child} />
                    ))}
                    {item.advancedFields && item.advancedFields.length > 0 ? (
                      <details className="array-item-advanced">
                        <summary>Ajustes de diseño</summary>
                        <div className="array-item-advanced-body">
                          {item.advancedFields.map((field) => (
                            <FieldGroup
                              key={field.path}
                              field={field}
                              onFieldChange={props.onFieldChange}
                              draftValues={props.draftValues}
                              setDraftValue={props.setDraftValue}
                            />
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>
              </div>

              {!item.collapsible && !locked ? (
                <ArrayItemActionsView trashIcon={icons.trash || ""} onRemove={() => onRemoveArrayItem(node.path, item.idx)} />
              ) : null}
            </div>
          );
        })}
      </div>
      {locked ? null : (
        <ArrayActionsView
          options={node.addOptions}
          showSelect={!node.componentPicker && node.addOptions.length > 0}
          buttonLabel="Agregar"
          onAdd={(selectedType) => onAddArrayItem(node.path, selectedType, node.componentPicker)}
        />
      )}
    </div>
  );
}

export default function ComplexNodesView(props: Props) {
  const [expandedItems, setExpandedItems] = React.useState(() => collectExpandedState(props.nodes));
  const [draftValues, setDraftValues] = React.useState<Map<string, string>>(() => new Map());
  const setDraftValue = React.useCallback((path: string, value: string) => {
    setDraftValues((prev) => {
      if (prev.get(path) === value) return prev;
      const next = new Map(prev);
      next.set(path, value);
      return next;
    });
  }, []);

  React.useEffect(() => {
    const latest = collectExpandedState(props.nodes);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merging external nodes into local UI map
    setExpandedItems((prev) => {
      const next = new Map<string, boolean>();
      latest.forEach((expanded, itemPath) => {
        next.set(itemPath, prev.get(itemPath) ?? expanded);
      });
      return next;
    });
  }, [props.nodes]);

  return (
    <>
      {props.nodes.map((node) => (
        <NodeRenderer
          key={`${node.kind}:${node.path}`}
          {...props}
          expandedItems={expandedItems}
          setExpandedItems={setExpandedItems}
          draftValues={draftValues}
          setDraftValue={setDraftValue}
          node={node}
        />
      ))}
    </>
  );
}
