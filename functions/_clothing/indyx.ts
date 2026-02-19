// Indyx CSV import parser
// Indyx closet app exports data as CSV with columns for item attributes.
// This parser handles the expected CSV format and normalizes it into our clothing data model.

export interface IndyxClothingItem {
    name: string;
    category: string;
    subcategory: string;
    brand: string;
    color: string;
    size: string;
    image_url: string;
    tags: string;
    wear_count: number;
}

// Mapping of common Indyx CSV column headers to our fields
const COLUMN_MAP: Record<string, keyof IndyxClothingItem> = {
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
    'size': 'size',
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
    const fieldMap: Array<{ index: number; field: keyof IndyxClothingItem }> = [];
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

        const item: IndyxClothingItem = {
            name: '',
            category: '',
            subcategory: '',
            brand: '',
            color: '',
            size: '',
            image_url: '',
            tags: '',
            wear_count: 0,
        };

        fieldMap.forEach(({ index, field }) => {
            if (index >= values.length) return;
            const value = values[index];
            if (field === 'wear_count') {
                item.wear_count = parseInt(value, 10) || 0;
            } else {
                item[field] = value;
            }
        });

        // Merge all tag-like columns (tags, season, location)
        const tagParts: string[] = [];
        tagIndices.forEach((idx) => {
            if (idx < values.length && values[idx].trim().length > 0) {
                tagParts.push(values[idx].trim());
            }
        });
        item.tags = tagParts.join(',');

        // Generate a name if none was found - use category + brand + color
        if (item.name === '') {
            const parts = [item.brand, item.color, item.subcategory || item.category].filter((x) => x.length > 0);
            item.name = parts.join(' ') || 'Unknown Item';
        }

        items.push(item);
    }

    return items;
}
