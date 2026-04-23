import React from "react";

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
      label?: string;
    };

interface Props {
  nodes: ComplexNode[];
}
function NodeRenderer({ node }: { node: ComplexNode }) {
  if (node.kind === "array") {
    return <div data-complex-array-path={node.path}></div>;
  }

  return (
    <div className="field-section">
      <div className="field-section-title">{node.label}</div>
      {node.children.map((child) => (
        <NodeRenderer key={`${child.kind}:${child.path}`} node={child} />
      ))}
    </div>
  );
}

export default function ComplexNodesView({ nodes }: Props) {
  return (
    <>
      {nodes.map((node) => (
        <NodeRenderer key={`${node.kind}:${node.path}`} node={node} />
      ))}
    </>
  );
}
