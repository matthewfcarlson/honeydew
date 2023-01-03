import { z } from "zod";
import { DbRecipeZRaw } from "../db_types";
import AllRecipesScraper from "./scrapers/allrecipes";
import CentralTexasFoodBankScraper from "./scrapers/ctfb";
import JsonScraper from "./scrapers/json";

export const ScrapedRecipeDataZ = DbRecipeZRaw.omit({id:true});
export type HoneydewScrapedRecipeData = z.infer<typeof ScrapedRecipeDataZ>;

const SCRAPERS = [
    new AllRecipesScraper(),
    new CentralTexasFoodBankScraper(),
    new JsonScraper(),
]

export abstract class AbstractRecipeScraper {
    public abstract canParseUrl(url: URL): boolean;
    public abstract parseUrl(url: URL): Promise<HoneydewScrapedRecipeData>;
}

export async function scrapeRecipe(raw_url: string): Promise<HoneydewScrapedRecipeData | null> {
    const url = new URL(raw_url);
    const available_scrapers = SCRAPERS.filter((x) => x.canParseUrl(url));
    if (available_scrapers.length == 0) return null;
    // Try them all at the same time for performance
    const scraping = available_scrapers.map((x)=>x.parseUrl(url));
    const results = await Promise.allSettled(scraping);
    // Take the first one that succeeded
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status == "rejected") continue;
        return result.value;
    }
    console.error(results);
    return null;
}