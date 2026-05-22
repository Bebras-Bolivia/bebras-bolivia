export type BrandColor = "yellow" | "red" | "green" | "blue" | "gray";

const colorAliases: Record<string, BrandColor> = {
  yellow: "yellow",
  amber: "yellow",
  red: "red",
  rose: "red",
  green: "green",
  emerald: "green",
  blue: "blue",
  sky: "blue",
  indigo: "blue",
  blueDark: "blue",
  gray: "gray",
};

const defaultPalette: BrandColor[] = ["yellow", "red", "green", "blue"];

export function normalizeBrandColor(color?: string): BrandColor {
  return color ? colorAliases[color] || "green" : "green";
}

export function normalizePalette(palette?: string[]): BrandColor[] {
  const normalized = (palette || []).map(normalizeBrandColor).filter(Boolean);
  return normalized.length > 0 ? normalized : defaultPalette;
}

export function getBrandCardClass(index: number, palette?: string[]) {
  const colors = normalizePalette(palette);
  const color = colors[index % colors.length];
  return `brand-card brand-card-${color}`;
}
