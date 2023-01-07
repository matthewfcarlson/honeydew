import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";
import * as cheerio from 'cheerio';

// TODO: zod so we're confident it's what we expect
interface LdRecipeSchema {
    name: string;
    "@type": "Recipe" | string[];
    cookTime?: string // ISO 8601 duration format
    prepTime?: string; // ISO 8601 duration format
    totalTime?: string; // ISO 8061
    recipeIngredient?: string[];
    recipeInstructions?: any[];
    image?: {
        url?: string,
        height: number;
        width: number;
    }
}
interface LdGraphSchema {
    "@context": "https://schema.org";
    "@graph": LdRecipeSchema[];
}

function ExtractRecipe(recipes: LdRecipeSchema[], url: string): HoneydewScrapedRecipeData | null {
    for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (recipe["@type"] == undefined) continue;
        if (recipe["@type"] != "Recipe" && recipe["@type"].indexOf("Recipe") == -1) continue;
        return {
            name: recipe.name,
            url,
            image: recipe.image?.url || "", // TODO: placeholder image
        }
    }
    return null;
}

export default class JsonScraper implements AbstractRecipeScraper {
    public canParseUrl(url: URL): boolean {
        return true;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        try {
            const url_str = url.toString();
            const raw_response = await fetch(url_str);
            const raw_text = await raw_response.text();
            const html = cheerio.load(raw_text);
            const jsonLdFromHtml = html("script[type=\"application/ld+json\"]");
            let recipe: HoneydewScrapedRecipeData | null = null;
            Object.entries(jsonLdFromHtml).forEach(([, item]) => {
                let contents;
                try {
                    if (item && item.children && item.children[0] && (item.children[0] as any).data) {
                        contents = JSON.parse((item.children[0] as any).data);
                    }
                }
                catch (e) {
                    console.error('JsonLd: error parsing the json data', e);
                    // Fail silently, in case there are valid tags
                    return;
                }
                if (contents) {
                    const data = contents as LdRecipeSchema[] | LdGraphSchema | LdRecipeSchema
                    if ("@graph" in data) {
                        const raw_recipe = ExtractRecipe(data["@graph"], url_str);
                        if (raw_recipe == null) throw new Error("Unable to find recipe in graph");
                        else recipe = raw_recipe;
                        return;
                    }
                    if (Array.isArray(data)) {
                        const raw_recipe = ExtractRecipe(data, url_str);
                        if (raw_recipe == null) return;
                        else recipe = raw_recipe;
                        return;
                    }
                    const raw_recipe = ExtractRecipe([data,], url_str);
                    if (raw_recipe == null) return;
                    else recipe = raw_recipe;
                    return;
                }
            });
            if (recipe == null) {
                throw new Error("JsonScraper failed to find a recipe");
            }
            return recipe;
        }
        catch (e: any) {
            if (!e.stack.includes('\n')) {
                Error.captureStackTrace(e)
            }
            console.error("JsonScraper error", e);
            throw e;
        }
    }

}