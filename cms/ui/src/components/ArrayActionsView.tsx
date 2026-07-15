import React, { useState } from "react";
import SelectField from "./SelectField";

type Option = {
  value: string;
  label: string;
};

interface Props {
  options: Option[];
  onAdd: (selectedType: string | null) => void;
  showSelect?: boolean;
  buttonLabel?: string;
}

export default function ArrayActionsView({
  options,
  onAdd,
  showSelect = options.length > 0,
  buttonLabel,
}: Props) {
  const [selected, setSelected] = useState(options[0]?.value || "");

  if (showSelect && options.length > 0) {
    return (
      <div className="editor-block-picker">
        {options.length > 1 ? (
          <SelectField
            className="type-select"
            value={selected}
            options={options}
            onChange={setSelected}
            ariaLabel="Tipo de elemento"
          />
        ) : null}
        <button className="add-item-btn" type="button" onClick={() => onAdd(selected)}>
          <span aria-hidden="true">+</span> {buttonLabel || "Agregar"}
          {options.length === 1 ? ` ${options[0].label.toLowerCase()}` : ""}
        </button>
      </div>
    );
  }

  return (
    <button className="add-item-btn" type="button" onClick={() => onAdd(null)}>
      <span aria-hidden="true">+</span> {buttonLabel || "Agregar"}
    </button>
  );
}
