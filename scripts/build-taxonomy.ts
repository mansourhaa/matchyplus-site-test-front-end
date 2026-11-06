import * as fs from 'fs';
import * as path from 'path';

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  return rows;
}

function norm(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function main() {
  const dataDir = path.resolve('data/taxonomy');
  const outDir = path.resolve('apps/api/src/taxonomy');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Parse Tags & Concepts
  const tagsCsv = fs.readFileSync(path.join(dataDir, 'matchyplus_tags_metiers_interets.csv'), 'utf-8');
  const tagRows = parseCsv(tagsCsv);
  const tagHeaders = tagRows[0];

  const tagIdIdx = tagHeaders.indexOf('tag_id');
  const conceptIdIdx = tagHeaders.indexOf('concept_id');
  const tagIdx = tagHeaders.indexOf('tag');
  const normTagIdx = tagHeaders.indexOf('normalized_tag');
  const langCodeIdx = tagHeaders.indexOf('language_code');
  const tagTypeIdx = tagHeaders.indexOf('tag_type');
  const sectorIdIdx = tagHeaders.indexOf('sector_id');
  const sectorFrIdx = tagHeaders.indexOf('sector_fr');
  const sectorEnIdx = tagHeaders.indexOf('sector_en');
  const sectorArIdx = tagHeaders.indexOf('sector_ar');
  const weightIdx = tagHeaders.indexOf('match_weight');

  type TagEntry = {
    tagId: string;
    conceptId: string;
    tag: string;
    normalizedTag: string;
    languageCode: string;
    tagType: string;
    sectorId: number;
    sectorFr: string;
    sectorEn: string;
    sectorAr: string;
    weight: number;
  };

  const allTags: TagEntry[] = [];
  const lookupMap: Record<string, { conceptId: string; sectorId: number; tagType: string; weight: number }[]> = {};
  const conceptMap: Record<string, {
    conceptId: string;
    sectorId: number;
    tagType: string;
    variants: { tag: string; lang: string }[];
  }> = {};

  for (let i = 1; i < tagRows.length; i++) {
    const r = tagRows[i];
    if (r.length < 8) continue;
    const tag = r[tagIdx];
    const normalizedTag = norm(r[normTagIdx] || tag);
    const conceptId = r[conceptIdIdx];
    const sectorId = parseInt(r[sectorIdIdx] || '0', 10);
    const tagType = r[tagTypeIdx];
    const weight = parseFloat(r[weightIdx] || '1.0');

    const entry: TagEntry = {
      tagId: r[tagIdIdx],
      conceptId,
      tag,
      normalizedTag,
      languageCode: r[langCodeIdx],
      tagType,
      sectorId,
      sectorFr: r[sectorFrIdx] || '',
      sectorEn: r[sectorEnIdx] || '',
      sectorAr: r[sectorArIdx] || '',
      weight,
    };
    allTags.push(entry);

    if (!lookupMap[normalizedTag]) {
      lookupMap[normalizedTag] = [];
    }
    lookupMap[normalizedTag].push({
      conceptId,
      sectorId,
      tagType,
      weight,
    });

    // Also index individual constituent words (length >= 3)
    const words = normalizedTag.split(/[\s/,]+/).filter((w) => w.length >= 3);
    for (const w of words) {
      if (!lookupMap[w]) {
        lookupMap[w] = [];
      }
      if (!lookupMap[w].some((x) => x.conceptId === conceptId)) {
        lookupMap[w].push({
          conceptId,
          sectorId,
          tagType,
          weight: Math.round(weight * 0.95 * 100) / 100,
        });
      }
    }

    if (!conceptMap[conceptId]) {
      conceptMap[conceptId] = {
        conceptId,
        sectorId,
        tagType,
        variants: [],
      };
    }
    conceptMap[conceptId].variants.push({
      tag,
      lang: r[langCodeIdx],
    });
  }

  // 2. Parse Form Options
  const optCsv = fs.readFileSync(path.join(dataDir, 'matchyplus_form_options_3lang.csv'), 'utf-8');
  const optRows = parseCsv(optCsv);
  type FormOption = {
    fieldKey: string;
    optionCode: string;
    languageCode: string;
    optionLabel: string;
    sectorId: number;
    matchWeight: number;
  };
  const formOptions: FormOption[] = [];
  for (let i = 1; i < optRows.length; i++) {
    const r = optRows[i];
    if (r.length < 6) continue;
    formOptions.push({
      fieldKey: r[0],
      optionCode: r[1],
      languageCode: r[2],
      optionLabel: r[3],
      sectorId: parseInt(r[4] || '0', 10),
      matchWeight: parseFloat(r[5] || '1.0'),
    });
  }

  // 3. Field Priorities
  const fieldPriorities: Record<string, number> = {
    main_job_service: 1.0,
    service_type: 1.0,
    about: 0.8,
    interests_services: 0.75,
    main_goals: 0.7,
    tasks_services: 0.7,
  };

  // Write TypeScript files
  const typesContent = `/**
 * Autogenerated Taxonomy Types from Matchy+ specification CSVs.
 */
export type TaxonomyLanguage = 'fr' | 'en' | 'ar' | 'tn_ar' | 'tn_latn';

export type TaxonomyTagType = 'métier' | 'service' | 'compétence' | 'intérêt' | 'objectif';

export interface ConceptLookupResult {
  conceptId: string;
  sectorId: number;
  tagType: string;
  weight: number;
}

export interface ConceptDetail {
  conceptId: string;
  sectorId: number;
  tagType: string;
  variants: { tag: string; lang: string }[];
}

export interface FormOption {
  fieldKey: string;
  optionCode: string;
  languageCode: string;
  optionLabel: string;
  sectorId: number;
  matchWeight: number;
}
`;

  fs.writeFileSync(path.join(outDir, 'taxonomy-types.ts'), typesContent, 'utf-8');

  const dataContent = `/* eslint-disable */
// Autogenerated from data/taxonomy/*.csv — DO NOT EDIT MANUALLY
import { ConceptDetail, ConceptLookupResult, FormOption } from './taxonomy-types.js';

export const FIELD_PRIORITIES: Record<string, number> = ${JSON.stringify(fieldPriorities, null, 2)};

export const TAXONOMY_LOOKUP: Record<string, ConceptLookupResult[]> = ${JSON.stringify(lookupMap, null, 2)};

export const CONCEPTS_CATALOG: Record<string, ConceptDetail> = ${JSON.stringify(conceptMap, null, 2)};

export const FORM_OPTIONS: FormOption[] = ${JSON.stringify(formOptions, null, 2)};
`;

  fs.writeFileSync(path.join(outDir, 'taxonomy-data.ts'), dataContent, 'utf-8');

  console.log(`Generated taxonomy at ${outDir}:`);
  console.log(`- ${Object.keys(lookupMap).length} normalized lookup tags`);
  console.log(`- ${Object.keys(conceptMap).length} distinct concepts`);
  console.log(`- ${formOptions.length} multilingual form options`);
}

main();
