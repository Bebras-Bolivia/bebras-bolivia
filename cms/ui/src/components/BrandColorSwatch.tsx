import React from "react";
import { BRAND_COLORS, BRAND_COLOR_HEX, BRAND_COLOR_LABEL, type BrandColor } from "../lib/templates";

const LEGACY_COLOR_ALIASES: Record<string, BrandColor> = {
  rose: "red",
  amber: "yellow",
  emerald: "green",
  sky: "blue",
  indigo: "blue",
  blueDark: "blue",
  violet: "blue",
};

function normalizeBrandColor(raw: unknown): BrandColor | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if ((BRAND_COLORS as readonly string[]).includes(value)) return value as BrandColor;
  if (LEGACY_COLOR_ALIASES[value]) return LEGACY_COLOR_ALIASES[value];
  return null;
}

interface Props {
  id?: string;
  value: string | number | boolean;
  onChange: (next: string) => void;
}

export default function BrandColorSwatch({ id, value, onChange }: Props) {
  const current = normalizeBrandColor(value);
  const [selectedColor, setSelectedColor] = React.useState<BrandColor | null>(current);

  React.useEffect(() => {
    setSelectedColor(current);
  }, [current]);

  function selectColor(color: BrandColor) {
    setSelectedColor(color);
    onChange(color);
  }

  return (
    <div id={id} className="brand-color-picker" role="radiogroup">
      {BRAND_COLORS.map((color) => {
        const selected = color === selectedColor;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            title={BRAND_COLOR_LABEL[color]}
            className={`brand-color-swatch${selected ? " is-selected" : ""}`}
            data-color={color}
            draggable={false}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectColor(color);
            }}
          >
            <span
              className="brand-color-swatch-chip"
              style={{ backgroundColor: BRAND_COLOR_HEX[color] }}
              aria-hidden="true"
            />
            <span className="brand-color-swatch-label">{BRAND_COLOR_LABEL[color]}</span>
          </button>
        );
      })}
    </div>
  );
}
