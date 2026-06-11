import React from "react";

interface Props {
  arrowIcon: string;
  expanded: boolean;
  onToggle: () => void;
}

export default function ArrayCollapseToggleView({ arrowIcon, expanded, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`array-collapse-btn ${expanded ? "expanded" : "collapsed"}`}
      aria-expanded={expanded ? "true" : "false"}
      title={expanded ? "Minimizar" : "Expandir"}
      onClick={onToggle}
    >
      <span dangerouslySetInnerHTML={{ __html: arrowIcon }}></span>
    </button>
  );
}
