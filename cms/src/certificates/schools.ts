import { readFileSync } from "fs";
import { resolve } from "path";
import { gunzipSync } from "zlib";

const CATALOG_PATH = resolve(import.meta.dir, "../../data/schools.ndjson.gz");

const DEPARTMENTS: Record<string, string> = {
  "LA PAZ": "la-paz",
  COCHABAMBA: "cochabamba",
  "SANTA CRUZ": "santa-cruz",
  ORURO: "oruro",
  POTOSI: "potosi",
  CHUQUISACA: "sucre",
  TARIJA: "tarija",
  BENI: "beni",
  PANDO: "pando",
};

const MINOR_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);

export type CatalogSchool = {
  code: string;
  name: string;
  department: string | null;
  city: string;
  district: string;
};

type IndexedSchool = CatalogSchool & { search: string };

let catalog: IndexedSchool[] | null = null;
let byCode: Map<string, IndexedSchool> | null = null;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word, index) => (index > 0 && MINOR_WORDS.has(word) ? word : word.replace(/\p{L}/u, (letter) => letter.toUpperCase())))
    .join(" ");
}

function townName(sec: string) {
  const capital = /^capital\s*\((.+)\)$/i.exec(sec.trim());
  return titleCase(capital ? capital[1] : sec);
}

function plain(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function load() {
  if (catalog && byCode) return { catalog, byCode };
  const lines = gunzipSync(readFileSync(CATALOG_PATH)).toString("utf8").split("\n");
  catalog = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as { codUe: string; name: string; dep: string; sec: string; dis: string };
    const name = titleCase(row.name);
    catalog.push({
      code: row.codUe,
      name,
      department: DEPARTMENTS[row.dep] ?? null,
      city: townName(row.sec),
      district: titleCase(row.dis),
      search: plain(row.name),
    });
  }
  catalog.sort((a, b) => a.search.localeCompare(b.search));
  byCode = new Map(catalog.map((school) => [school.code, school]));
  return { catalog, byCode };
}

function publicSchool({ search: _search, ...school }: IndexedSchool): CatalogSchool {
  return school;
}

export function searchSchools(query: string, department?: string) {
  const words = plain(query).split(" ").filter(Boolean);
  if (words.join("").length < 2) return [];
  const { catalog } = load();
  const matches = catalog.filter(
    (school) => (!department || school.department === department) && words.every((word) => school.search.includes(word))
  );
  const first = words[0];
  matches.sort((a, b) => Number(!a.search.startsWith(first)) - Number(!b.search.startsWith(first)));
  return matches.slice(0, 20).map(publicSchool);
}

export function findSchool(code: string) {
  const school = load().byCode.get(code.trim());
  return school ? publicSchool(school) : null;
}
