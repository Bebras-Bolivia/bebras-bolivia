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
      children: ComplexNode[];
    }
  | {
      kind: "array";
      path: string;
      label: string;
      addOptions: Array<{ value: string; label: string }>;
      componentPicker?: boolean;
      items: Array<{
        idx: number;
        itemPath: string;
        label: string;
        collapsible: boolean;
        expanded: boolean;
        fields: EditorField[];
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
};

function FieldInput({ field, onFieldChange }: { field: EditorField; onFieldChange: Props["onFieldChange"] }) {
  // Controlled directly from props — no local state, no effect-driven sync.
  const value = field.value;

  if (field.type === "textarea") {
    return (
      <textarea
        id={`field-${field.path}`}
        className="form-textarea"
        rows={3}
        value={String(value ?? "")}
        onChange={(e) => onFieldChange(field.path, e.target.value)}
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
      value={String(value ?? "")}
      onChange={(e) => {
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

function FieldGroup({ field, onFieldChange }: { field: EditorField; onFieldChange: Props["onFieldChange"] }) {
  return (
    <div className="form-group">
      <label htmlFor={`field-${field.path}`}>{field.label}</label>
      <FieldInput field={field} onFieldChange={onFieldChange} />
    </div>
  );
}

function NodeRenderer(props: RendererProps & { node: ComplexNode }) {
  const { node } = props;

  if (node.kind === "object") {
    return (
      <div className="field-section">
        <div className="field-section-title">{node.label}</div>
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

  return (
    <div className="field-section">
      <div className="field-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{node.label} ({node.items.length})</span>
      </div>
      <div className="array-field" data-array-path={node.path}>
        {node.items.map((item) => {
          const itemExpanded = expandedItems.get(item.itemPath) ?? item.expanded;
          const bodyVisible = !item.collapsible || itemExpanded;
          return (
            <div
              className="array-item"
              key={item.itemPath}
              draggable
              data-dnd-idx={item.idx}
              onDragStart={(e) => {
                setDragFrom(item.idx);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", "");
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom === null || dragFrom === item.idx) return;
                onMoveArrayItem(node.path, dragFrom, item.idx);
                setDragFrom(null);
              }}
            >
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span style={{ display: "flex", alignItems: "center" }}>
                  <span className="drag-handle" title="Arrastrar para reordenar" style={{ marginRight: "0.5rem" }} dangerouslySetInnerHTML={{ __html: icons.grip || "" }} />
                  <span>{item.label}</span>
                  {item.collapsible ? (
                    <ArrayCollapseToggleView
                      arrowIcon={icons.arrow || ""}
                      expanded={itemExpanded}
                      onToggle={() => {
                        const nextExpanded = !itemExpanded;
                        setExpandedItems((prev) => new Map(prev).set(item.itemPath, nextExpanded));
                        onToggleArrayCollapse(item.itemPath, nextExpanded);
                      }}
                    />
                  ) : null}
                </span>
                {item.collapsible ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <ArrayItemActionsView trashIcon={icons.trash || ""} inline onRemove={() => onRemoveArrayItem(node.path, item.idx)} />
                  </span>
                ) : null}
              </div>

              {bodyVisible ? (
                <div className="array-item-body">
                  {item.fields.map((field) => (
                    <FieldGroup key={field.path} field={field} onFieldChange={props.onFieldChange} />
                  ))}
                  {item.children.map((child) => (
                    <NodeRenderer key={`${child.kind}:${child.path}`} {...props} node={child} />
                  ))}
                </div>
              ) : null}

              {!item.collapsible ? (
                <ArrayItemActionsView trashIcon={icons.trash || ""} onRemove={() => onRemoveArrayItem(node.path, item.idx)} />
              ) : null}
            </div>
          );
        })}
      </div>
      <ArrayActionsView
        options={node.addOptions}
        showSelect={!node.componentPicker && node.addOptions.length > 0}
        buttonLabel={node.componentPicker ? "Agregar nuevo componente" : node.addOptions.length > 0 ? "Agregar bloque" : "Agregar"}
        onAdd={(selectedType) => onAddArrayItem(node.path, selectedType, node.componentPicker)}
      />
    </div>
  );
}

export default function ComplexNodesView(props: Props) {
  const [expandedItems, setExpandedItems] = React.useState(() => collectExpandedState(props.nodes));

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
        <NodeRenderer key={`${node.kind}:${node.path}`} {...props} expandedItems={expandedItems} setExpandedItems={setExpandedItems} node={node} />
      ))}
    </>
  );
}
