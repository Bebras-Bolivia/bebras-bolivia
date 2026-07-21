const COLUMN_OPTIONS = [1, 2, 3, 4] as const;

interface Props {
  id?: string;
  value: string | number | boolean;
  label?: string;
  onChange: (next: number) => void;
}

export default function ColumnCountPicker({ id, value, label, onChange }: Props) {
  const current = Number(value);

  return (
    <div id={id} className="column-count-picker" role="radiogroup" aria-label={label}>
      {COLUMN_OPTIONS.map((columns) => {
        const selected = columns === current;
        return (
          <button
            key={columns}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${columns} ${columns === 1 ? "columna" : "columnas"}`}
            className={`column-count-option${selected ? " is-selected" : ""}`}
            onClick={() => onChange(columns)}
          >
            {columns}
          </button>
        );
      })}
    </div>
  );
}
