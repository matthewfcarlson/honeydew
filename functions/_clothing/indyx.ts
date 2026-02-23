// Indyx CSV import parser
// Indyx closet app exports data as CSV with columns for item attributes.
// This parser handles the expected CSV format and normalizes it into our clothing data model.

import { ClothingCategory, CLOTHING_CATEGORIES, CATEGORY_WASH_DEFAULTS } from '../db_types';

export interface IndyxClothingItem {
    name: string;
    category: ClothingCategory;
    brand: string;
    color: string;
    image_url: string;
    tags: string;
    heat_index: number;
    wear_count: number;
    wash_threshold: number | null;
}

// Map free-text category strings from Indyx to our enum
const CATEGORY_NORMALIZE: Record<string, ClothingCategory> = {
    'top': 'top',
    'tops': 'top',
    't-shirt': 'top',
    'tshirt': 'top',
    'shirt': 'top',
    'blouse': 'top',
    'sweater': 'top',
    'hoodie': 'top',
    'tank top': 'top',
    'tank': 'top',
    'polo': 'top',
    'bottom': 'bottom',
    'bottoms': 'bottom',
    'pants': 'bottom',
    'jeans': 'bottom',
    'shorts': 'bottom',
    'skirt': 'bottom',
    'trousers': 'bottom',
    'leggings': 'bottom',
    'outerwear': 'outerwear',
    'jacket': 'outerwear',
    'coat': 'outerwear',
    'vest': 'outerwear',
    'blazer': 'outerwear',
    'parka': 'outerwear',
    'windbreaker': 'outerwear',
    'shoes': 'shoes',
    'shoe': 'shoes',
    'sneakers': 'shoes',
    'boots': 'shoes',
    'sandals': 'shoes',
    'heels': 'shoes',
    'flats': 'shoes',
    'loafers': 'shoes',
    'socks': 'socks',
    'sock': 'socks',
    'accessory': 'accessory',
    'accessories': 'accessory',
    'hat': 'accessory',
    'belt': 'accessory',
    'scarf': 'accessory',
    'tie': 'accessory',
    'jewelry': 'accessory',
    'watch': 'accessory',
    'bag': 'accessory',
    'purse': 'accessory',
    'glasses': 'accessory',
    'sunglasses': 'accessory',
    'gloves': 'accessory',
};

function normalizeCategory(raw: string): ClothingCategory {
    const lower = raw.toLowerCase().trim();
    return CATEGORY_NORMALIZE[lower] || 'top';
}

// Mapping of common Indyx CSV column headers to our internal field names
type IndyxField = 'name' | 'category' | 'subcategory' | 'brand' | 'color' | 'image_url' | 'tags' | 'wear_count';
const COLUMN_MAP: Record<string, IndyxField> = {
    'name': 'name',
    'item name': 'name',
    'title': 'name',
    'item': 'name',
    'category': 'category',
    'type': 'category',
    'subcategory': 'subcategory',
    'sub-category': 'subcategory',
    'sub category': 'subcategory',
    'brand': 'brand',
    'designer': 'brand',
    'color': 'color',
    'colour': 'color',
    'image': 'image_url',
    'image url': 'image_url',
    'image_url': 'image_url',
    'photo': 'image_url',
    'photo url': 'image_url',
    'tags': 'tags',
    'season': 'tags',    // season gets merged into tags
    'location': 'tags',  // location gets merged into tags
    'wears': 'wear_count',
    'wear count': 'wear_count',
    'times worn': 'wear_count',
    'num wears': 'wear_count',
};

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current.trim());
    return result;
}

export function parseIndyxCSV(csvContent: string): IndyxClothingItem[] {
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return []; // need at least header + 1 data row

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

    // Map header indices to our field names
    const fieldMap: Array<{ index: number; field: IndyxField }> = [];
    // Track which indices map to "tags" so we can merge season/location/tags
    const tagIndices: number[] = [];

    headers.forEach((header, index) => {
        const mapped = COLUMN_MAP[header];
        if (mapped != null) {
            if (mapped === 'tags') {
                tagIndices.push(index);
            } else {
                fieldMap.push({ index, field: mapped });
            }
        }
    });

    const items: IndyxClothingItem[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        // Temporary raw values before normalization
        const raw: Record<string, string> = {
            name: '',
            category: '',
            subcategory: '',
            brand: '',
            color: '',
            image_url: '',
            wear_count: '0',
        };

        fieldMap.forEach(({ index, field }) => {
            if (index >= values.length) return;
            raw[field] = values[index];
        });

        // Merge all tag-like columns (tags, season, location)
        const tagParts: string[] = [];
        tagIndices.forEach((idx) => {
            if (idx < values.length && values[idx].trim().length > 0) {
                tagParts.push(values[idx].trim());
            }
        });
        // If there's a subcategory, add it to tags for searchability
        if (raw.subcategory.trim().length > 0) {
            tagParts.push(raw.subcategory.trim());
        }
        const tags = tagParts.join(',');

        // Normalize category
        const categoryRaw = raw.category || raw.subcategory;
        const category = normalizeCategory(categoryRaw);

        // Generate a name if none was found
        let name = raw.name;
        if (name === '') {
            const parts = [raw.brand, raw.color, raw.subcategory || raw.category].filter((x) => x.length > 0);
            name = parts.join(' ') || 'Unknown Item';
        }

        const item: IndyxClothingItem = {
            name,
            category,
            brand: raw.brand,
            color: raw.color,
            image_url: raw.image_url,
            tags,
            heat_index: 0,
            wear_count: parseInt(raw.wear_count, 10) || 0,
            wash_threshold: CATEGORY_WASH_DEFAULTS[category],
        };

        items.push(item);
    }

    return items;
}
