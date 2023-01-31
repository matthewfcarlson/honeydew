import { z } from "zod";
import { DbRecipeZRaw } from "../db_types";
import ATKScrapper from "./scrapers/atk";
import CentralTexasFoodBankScraper from "./scrapers/ctfb";
import DebugScraper from "./scrapers/debug";
import EveryPlateScraper from "./scrapers/everyplate";
import JsonScraper from "./scrapers/ld_json";
import JoshuaWeissmanScraper from "./scrapers/weissman";

export const ScrapedRecipeDataZ = DbRecipeZRaw.omit({id:true}).extend({
    ingredients: z.array(z.string())
});
export type HoneydewScrapedRecipeData = z.infer<typeof ScrapedRecipeDataZ>;

const SCRAPERS = [
    new JoshuaWeissmanScraper(),
    new ATKScrapper(),
    new EveryPlateScraper(),
    new CentralTexasFoodBankScraper(),
    new JsonScraper(),
]

const DEBUG_SCRAP = new DebugScraper();

export abstract class AbstractRecipeScraper {
    public abstract canParseUrl(url: URL): boolean;
    public abstract parseUrl(url: URL): Promise<HoneydewScrapedRecipeData>;
}

export async function scrapeRecipe(raw_url: string): Promise<HoneydewScrapedRecipeData | null> {
    const url = new URL(raw_url);
    if (DEBUG_SCRAP.canParseUrl(url)) return DEBUG_SCRAP.parseUrl(url);
    const available_scrapers = SCRAPERS.filter((x) => x.canParseUrl(url));
    if (available_scrapers.length == 0) return null;
    // Try them all at the same time for performance
    const scraping = available_scrapers.map((x)=>x.parseUrl(url));
    const results = await Promise.allSettled(scraping);
    // Take the first one that succeeded
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status == "rejected") {
            console.error("ScrapRecipe", raw_url, i, result.reason);
            continue;
        }
        const recipe = ScrapedRecipeDataZ.safeParse(result.value);
        if (recipe.success) return recipe.data;
        console.error("ScrapRecipe", "zod error", raw_url, i, result, recipe.error);
    }
    console.error("ScrapRecipe","none succeeded", raw_url, results);
    return null;
}