// Indyx import parser
// Supports both CSV export and Open Closet API import.

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

export interface IndyxOutfitItem {
    name: string;
    image_url: string;
    /** Indyx item IDs referenced by this outfit */
    indyx_item_ids: string[];
}

export interface IndyxOpenClosetResult {
    items: IndyxClothingItem[];
    /** Indyx item IDs in the same order as items[], for mapping outfit references */
    indyx_item_ids: string[];
    outfits: IndyxOutfitItem[];
}

// -------------------------------------------------------
// Open Closet API types (subset of fields we care about)

interface IndyxAPIItem {
    id: string;
    itemNameOptional?: string | null;
    brand?: string | null;
    colorTextInput?: string | null;
    size?: string | null;
    thumbnailImageURL?: string | null;
    timesWorn?: number | null;
    seasonsStr?: string | null;
    categoryId?: string | null;
    subCategoryId?: string | null;
}

interface IndyxAPIOutfitLayoutPic {
    itemId: string;
    categoryId?: string;
}

interface IndyxAPIOutfit {
    id: string;
    name?: string | null;
    previewUrl?: string | null;
    layoutSerialized?: string | null;
}

interface IndyxAPIResponse {
    status: string;
    items: IndyxAPIItem[];
    outfits: IndyxAPIOutfit[];
}

// Known Indyx category UUID → name mapping.
// These are UUID v5 hashes that Indyx uses internally.
const INDYX_CATEGORY_MAP: Record<string, string> = {
    '07cb73df-a935-53ca-96f1-172da68877ba': 'Tops',
    '893619cd-f26b-5727-bba9-da6bfa80bf2e': 'Bottoms',
    'adfa4531-1a49-527f-ae67-c99797b9411d': 'Shoes',
    '8e43c286-720d-5132-90d5-7a4128bf0a9c': 'Outerwear',
    'c8953195-6429-5af7-90fd-0549e46161bf': 'Accessories',
    'b026bc01-c168-5e52-9a73-534b4521df49': 'Dresses',
    '53362e4d-fc75-5e2b-b789-4f9c8c2c9e4f': 'Activewear',
    '6d07b7a8-c89e-5b3c-8b0f-2f1e3d4a5b6c': 'Intimates',
    '7e18c8b9-d90f-5c4d-9c1e-3f2e4d5a6b7d': 'Swimwear',
    'a1b2c3d4-e5f6-5a7b-8c9d-0e1f2a3b4c5d': 'Handbags',
    'b2c3d4e5-f6a7-5b8c-9d0e-1f2a3b4c5d6e': 'Jewelry',
};

// Known Indyx subcategory UUID → name mapping
const INDYX_SUBCATEGORY_MAP: Record<string, string> = {
    '21c7d330-2bcb-540c-8145-97332170e31c': 'Shorts',
    '9a389241-4f72-5f8d-9aea-90ce4b305f28': 'Jeans',
    '426c510a-8ef9-59d6-ac26-75a24ba3384b': 'T-Shirt',
    '71151543-fa4c-5d04-bbeb-47afc7b73c23': 'Dress Shirt',
    'b9d58739-3849-5f86-843c-b51eb4a5a975': 'Sneakers',
    '22c8a879-d60a-5f05-9547-6d6d81f5df2c': 'Boots',
    '90c561df-e6e7-504e-a938-ff3b120c2672': 'Jacket',
    'a23f9d1c-74c4-5aed-9260-142ff64cbeca': 'Sweater',
    'c52ab9ff-690b-5096-9b71-2340db59775e': 'Pants',
    '9075e834-b485-593c-a4c0-a4ebe624d004': 'Polo',
    'bfd1d7d8-b1fc-53e2-9274-f0f0039009fc': 'Button-Down',
    '8e7c111c-1e37-51fc-81ac-b18ec1cb95af': 'Hoodie',
    'f9795395-7cc7-5c34-bc0b-ec1ed322e12a': 'Sandals',
};

const INDYX_OPEN_CLOSET_API = 'https://indyx-server-3tg67jmjeq-uc.a.run.app/users/v2/openCloset';

/**
 * Extract the username from an Indyx Open Closet URL or return as-is if already a username.
 * Handles: "drxv42gj94", "https://opencloset.myindyx.com/user/drxv42gj94", etc.
 */
export function extractIndyxUsername(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/opencloset\.myindyx\.com\/user\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    // If it looks like a plain username (no slashes or protocol), use as-is
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;
    return trimmed;
}

/**
 * Fetch and parse an Indyx Open Closet by username.
 */
export async function fetchIndyxOpenCloset(username: string): Promise<IndyxOpenClosetResult> {
    const response = await fetch(INDYX_OPEN_CLOSET_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, useCollections: true }),
    });

    if (!response.ok) {
        throw new Error(`Indyx API returned ${response.status}`);
    }

    const data = await response.json() as IndyxAPIResponse;
    if (data.status !== 'OK') {
        throw new Error(`Indyx API error: ${data.status}`);
    }

    return parseIndyxOpenClosetResponse(data);
}

/**
 * Parse the raw Indyx Open Closet API response into our data model.
 */
export function parseIndyxOpenClosetResponse(data: IndyxAPIResponse): IndyxOpenClosetResult {
    const items: IndyxClothingItem[] = [];
    const indyx_item_ids: string[] = [];

    for (const apiItem of data.items) {
        const category = (apiItem.categoryId && INDYX_CATEGORY_MAP[apiItem.categoryId]) || '';
        const subcategory = (apiItem.subCategoryId && INDYX_SUBCATEGORY_MAP[apiItem.subCategoryId]) || '';

        let name = apiItem.itemNameOptional || '';
        if (!name) {
            const parts = [apiItem.brand, apiItem.colorTextInput, subcategory || category].filter(Boolean);
            name = parts.join(' ') || 'Unknown Item';
        }

        items.push({
            name,
            category,
            subcategory,
            brand: apiItem.brand || '',
            color: apiItem.colorTextInput || '',
            size: apiItem.size || '',
            image_url: apiItem.thumbnailImageURL || '',
            tags: apiItem.seasonsStr || '',
            wear_count: apiItem.timesWorn || 0,
        });
        indyx_item_ids.push(apiItem.id);
    }

    const outfits: IndyxOutfitItem[] = [];

    for (const apiOutfit of (data.outfits || [])) {
        const indyx_item_ids: string[] = [];

        if (apiOutfit.layoutSerialized) {
            try {
                const layout = JSON.parse(apiOutfit.layoutSerialized);
                if (Array.isArray(layout.pics)) {
                    for (const pic of layout.pics as IndyxAPIOutfitLayoutPic[]) {
                        if (pic.itemId) indyx_item_ids.push(pic.itemId);
                    }
                }
            } catch {
                // layoutSerialized wasn't valid JSON, skip
            }
        }

        if (indyx_item_ids.length === 0) continue; // skip outfits with no items

        outfits.push({
            name: apiOutfit.name || '',
            image_url: apiOutfit.previewUrl || '',
            indyx_item_ids,
        });
    }

    return { items, indyx_item_ids, outfits };
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
