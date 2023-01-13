// joshuaweissman
import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";
import * as cheerio from 'cheerio';
import { z } from "zod";

const WixWarmupDataSchemaZ = z.object({
    platform: z.any(),
    appsWarmupData: z.object({
        dataBinding: z.object({
            schemas: z.any(),
            dataStore: z.any()
        }),
    }),
    ooi: z.object({
        failedInSsr: z.any()
    }),
})
interface WixWarmupDataSchema {
    platform: {};
    appsWarmupData: {
        dataBinding: {
            schemas: any,
            datastore: any
        }
    },
    ooi : {
        failedInSsr: {}
    }
}

export default class JoshuaWeissmanScraper implements AbstractRecipeScraper {
    public canParseUrl(url: URL): boolean {
        const host = url.hostname.toLowerCase();
        if (host == "www.joshuaweissman.com") return true;
        if (host == "joshuaweissman.com") return true;
        return false;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        try {
            const url_str = url.toString();
            const raw_response = await fetch(url_str);
            const raw_text = await raw_response.text();
            const html = cheerio.load(raw_text);
            const content_html = html("div[data-id=\"rich-content-viewer\"] p")
            // Extract the text from each item individually
            const content_text = content_html.text();
            console.error(content_text)
            
           throw new Error("Not Implemented");
        }

        catch (e: any) {
            if (!e.stack.includes('\n')) {
                Error.captureStackTrace(e)
            }
            console.error("JoshuaWeissmanScraper error", e);
            throw e;
        }

    }

}