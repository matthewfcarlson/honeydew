// Central Texas Foodbank
import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";
import * as cheerio from 'cheerio';

export default class DebugScraper implements AbstractRecipeScraper {
    public canParseUrl(url: URL): boolean {
        const host = url.hostname.toLowerCase();
        if (host == "debugscraper.com") return true;
        if (host == "www.debugscraper.com") return true;
        return false;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        return {
           name: "Totally a real recipe",
           url: url.toString(),
           image: "https://via.placeholder.com/150",
           totalTime: 42,
           ingredients: ["2 lbs Potatoes", "1 can Tuna", "2 TBSP Butter", "1 gallon Heavy Cream"]
        }
    }

}