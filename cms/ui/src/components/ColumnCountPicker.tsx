import React from "react";

const COLUMN_OPTIONS = [1, 2, 3, 4] as const;

interface Props {
  id?: string;
  value: string | number | boolean;
  label?: string;
  onChange: (next: number) => void;
}

export default function ColumnCountPicker({ id, value, label, onChange }: Props) {
  const current = Number(value);
  const [selectedColumns, setSelectedColumns] = React.useState(current);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedColumns(current);
  }, [current]);

  function selectColumns(columns: number) {
    setSelectedColumns(columns);
    onChange(columns);
  }

  return (
    <div id={id} className="column-count-picker" role="radiogroup" aria-label={label}>
      {COLUMN_OPTIONS.map((columns) => {
        const selected = columns === selectedColumns;
        return (
          <button
            key={columns}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${columns} ${columns === 1 ? "columna" : "columnas"}`}
            className={`column-count-option${selected ? " is-selected" : ""}`}
            onClick={() => selectColumns(columns)}
          >
            {columns}
          </button>
        );
      })}
    </div>
  );
}
