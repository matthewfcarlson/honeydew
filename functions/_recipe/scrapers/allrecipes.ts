import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";
import * as cheerio from 'cheerio';

// TODO: zod so we're confident it's what we expect
interface AllRecipeSchema1_0 {
    name: string;
    "@type": "Recipe"| string[];
    cookTime?: string // ISO 8601 duration format
    prepTime?: string; // ISO 8601 duration format
    totalTime?: string; // ISO 8061
    recipeIngredient?: string[];
    recipeInstructions?: any[];
    image?: {
        url?: string,
        height:number;
        width:number;
    }
}


export default class AllRecipesScraper implements AbstractRecipeScraper {
    public canParseUrl(url: URL): boolean {
        const host = url.hostname.toLowerCase();
        if (host == "allrecipes.com") return true;
        if (host == "www.allrecipes.com") return true;
        return false;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        const url_str = url.toString();
        const raw_response = await fetch(url_str);
        const raw_text = await raw_response.text();
        const html = cheerio.load(raw_text);
        const json1_0 = html("script#allrecipes-schema_1-0");
        const raw_data = json1_0.html();
        if (raw_data == null) throw new Error("script#allrecipes-schema_1-0 not found");
        const data = JSON.parse(raw_data) as AllRecipeSchema1_0[];
        return {
            name: data[0].name,
            url: url_str,
            image: data[0].image?.url || "", // TODO: placeholder image
        }
    }

}