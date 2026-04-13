import React, { useState } from "react";

type Option = {
  value: string;
  label: string;
};

interface Props {
  options: Option[];
  onAdd: (selectedType: string | null) => void;
}

export default function ArrayActionsView({ options, onAdd }: Props) {
  const [selected, setSelected] = useState(options[0]?.value || "");

  if (options.length > 0) {
    return (
      <div className="editor-block-picker">
        <select className="form-select type-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button className="add-item-btn" type="button" onClick={() => onAdd(selected)}>
          Agregar bloque
        </button>
      </div>
    );
  }

  return (
    <button className="add-item-btn" type="button" onClick={() => onAdd(null)}>
      Agregar
    </button>
  );
}
