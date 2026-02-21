import { DbClothing, ClothingId } from "../db_types";

// Outfit slots that we compose an outfit from, in display order
export type OutfitSlot = "coat" | "shirt" | "pants" | "shoes" | "socks";

export const OUTFIT_DISPLAY_ORDER: OutfitSlot[] = ["coat", "shirt", "pants", "shoes"];

/**
 * Classify a clothing item into an outfit slot based on its category/subcategory.
 * Returns null if the item doesn't fit any known slot.
 */
export function classifyClothing(item: DbClothing): OutfitSlot | null {
    const cat = item.category.toLowerCase();
    const subcat = item.subcategory.toLowerCase();

    // Socks (check first - most specific)
    if (cat.includes("sock") || subcat.includes("sock")) return "socks";

    // Shoes / footwear
    if (cat.includes("shoe") || cat.includes("footwear") ||
        subcat.includes("shoe") || subcat.includes("boot") ||
        subcat.includes("sneaker") || subcat.includes("sandal") ||
        subcat.includes("loafer") || subcat.includes("slipper")) return "shoes";

    // Outerwear / coats
    if (cat.includes("outerwear") || cat.includes("coat") || cat.includes("jacket") ||
        subcat.includes("coat") || subcat.includes("jacket") ||
        subcat.includes("hoodie") || subcat.includes("parka") ||
        subcat.includes("blazer") || subcat.includes("vest")) return "coat";

    // Tops / shirts
    if (cat.includes("top") || cat.includes("shirt") ||
        subcat.includes("shirt") || subcat.includes("blouse") ||
        subcat.includes("tee") || subcat.includes("t-shirt") ||
        subcat.includes("polo") || subcat.includes("sweater") ||
        subcat.includes("pullover") || subcat.includes("tank") ||
        subcat.includes("henley") || subcat.includes("button")) return "shirt";

    // Bottoms / pants
    if (cat.includes("bottom") || cat.includes("pant") || cat.includes("trouser") ||
        subcat.includes("pant") || subcat.includes("jean") ||
        subcat.includes("short") || subcat.includes("skirt") ||
        subcat.includes("chino") || subcat.includes("trouser") ||
        subcat.includes("jogger") || subcat.includes("cargo")) return "pants";

    return null;
}

/** Items grouped by outfit slot */
export interface SlottedClothing {
    coat: DbClothing[];
    shirt: DbClothing[];
    pants: DbClothing[];
    shoes: DbClothing[];
    socks: DbClothing[];
}

/** A generated outfit with one item per slot (optional for coat) */
export interface GeneratedOutfit {
    coat: DbClothing | null;
    shirt: DbClothing | null;
    pants: DbClothing | null;
    shoes: DbClothing | null;
    sockColor: string | null;
    backupSockColor: string | null;
}

/**
 * Group clothing items into outfit slots, filtering to only clean items.
 */
export function groupCleanClothingBySlot(items: DbClothing[]): SlottedClothing {
    const result: SlottedClothing = {
        coat: [],
        shirt: [],
        pants: [],
        shoes: [],
        socks: [],
    };

    for (const item of items) {
        if (item.is_clean !== 1) continue;
        const slot = classifyClothing(item);
        if (slot != null) {
            result[slot].push(item);
        }
    }

    return result;
}

/**
 * Pick a random item from an array, or null if empty.
 */
function pickRandom<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}

/**
 * Get sock color recommendations from available clean socks.
 * Returns [primary, backup] colors.
 */
function pickSockColors(socks: DbClothing[]): [string | null, string | null] {
    if (socks.length === 0) return [null, null];

    const primary = pickRandom(socks);
    if (primary == null) return [null, null];

    const primaryColor = primary.color || primary.name;

    // Pick a backup that's a different color if possible
    const others = socks.filter(s => s.id !== primary.id && (s.color || s.name) !== primaryColor);
    const backup = pickRandom(others);
    const backupColor = backup ? (backup.color || backup.name) : null;

    return [primaryColor, backupColor];
}

/**
 * Generate an outfit from the available clean clothing.
 * Returns the outfit and a list of missing slots.
 */
export function generateOutfit(items: DbClothing[]): { outfit: GeneratedOutfit; missingSlots: OutfitSlot[] } {
    const slotted = groupCleanClothingBySlot(items);

    const coat = pickRandom(slotted.coat);
    const shirt = pickRandom(slotted.shirt);
    const pants = pickRandom(slotted.pants);
    const shoes = pickRandom(slotted.shoes);
    const [sockColor, backupSockColor] = pickSockColors(slotted.socks);

    const outfit: GeneratedOutfit = {
        coat,
        shirt,
        pants,
        shoes,
        sockColor,
        backupSockColor,
    };

    // Required slots: shirt, pants, shoes. Coat is optional.
    const missingSlots: OutfitSlot[] = [];
    if (shirt == null) missingSlots.push("shirt");
    if (pants == null) missingSlots.push("pants");
    if (shoes == null) missingSlots.push("shoes");

    return { outfit, missingSlots };
}

/**
 * Get all clothing item IDs from a generated outfit (non-null items only).
 */
export function getOutfitClothingIds(outfit: GeneratedOutfit): ClothingId[] {
    const ids: ClothingId[] = [];
    if (outfit.coat) ids.push(outfit.coat.id);
    if (outfit.shirt) ids.push(outfit.shirt.id);
    if (outfit.pants) ids.push(outfit.pants.id);
    if (outfit.shoes) ids.push(outfit.shoes.id);
    return ids;
}

/**
 * Get image URLs from outfit items, in display order (coat, shirt, pants, shoes).
 * Only includes items that have images.
 */
export function getOutfitImages(outfit: GeneratedOutfit): { url: string; caption: string }[] {
    const images: { url: string; caption: string }[] = [];
    for (const slot of OUTFIT_DISPLAY_ORDER) {
        const item = outfit[slot];
        if (item && item.image_url) {
            images.push({
                url: item.image_url,
                caption: item.name,
            });
        }
    }
    return images;
}
