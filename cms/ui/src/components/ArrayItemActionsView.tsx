import React from "react";

interface Props {
  trashIcon: string;
  onRemove: () => void;
  inline?: boolean;
}

export default function ArrayItemActionsView({ trashIcon, onRemove, inline = false }: Props) {
  return (
    <button className={`remove-btn${inline ? " inline-remove-btn" : ""}`} title="Eliminar" onClick={onRemove} type="button">
      <span dangerouslySetInnerHTML={{ __html: trashIcon }}></span>
    </button>
  );
}
