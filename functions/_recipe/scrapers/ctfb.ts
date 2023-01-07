// Central Texas Foodbank
import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";
import * as cheerio from 'cheerio';

export default class CentralTexasFoodBankScraper implements AbstractRecipeScraper {
    public canParseUrl(url: URL): boolean {
        const host = url.hostname.toLowerCase();
        if (host == "www.centraltexasfoodbank.org") return true;
        if (host == "centraltexasfoodbank.org") return true;
        return false;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        try {
            const url_str = url.toString();
            const raw_response = await fetch(url_str);
            const raw_text = await raw_response.text();
            const html = cheerio.load(raw_text);
            const image_src = html(".middle-section")
                .find("img[typeof='foaf:Image']")
                .first()
                .prop("src");
            const image = (image_src == undefined) ? null : new URL(image_src, url.protocol + url.host);
            const name = html("#block-basis-page-title")
                .find("span")
                .text()
                .toLowerCase()
                .replace(/\b\w/g, l => l.toUpperCase());
            const ingredients: string[] = [];
            html(".ingredients-container")
                .find(".field-item")
                .each((i, el) => {
                    ingredients.push(
                        html(el)
                            .text()
                            .trim()
                    );
                });
            if (ingredients.length == 0) {
                html(".field-name-field-ingredients")
                    .children("div")
                    .children("div")
                    .each((i, el) => {
                        ingredients.push(
                            html(el)
                                .text()
                                .trim()
                        );
                    });
            }
            const time_prep_str = html(".field-name-field-prep-time")
                .find("div")
                .text();
            const time_cook_str = html(".field-name-field-cooking-time")
                .find("div")
                .text();
            const time_prep = time_prep_str.replace(/(^\d+)(.+$)/i,'$1');
            const time_cook = time_cook_str.replace(/(^\d+)(.+$)/i,'$1');
            const totalTime = Number(time_prep) + Number(time_cook);
            return {
                image: (image == null) ? "" : image.toString(),
                name: name || "Unknown",
                url: url_str,
                totalTime,
                ingredients,
            }
        }

        catch (e: any) {
            if (!e.stack.includes('\n')) {
                Error.captureStackTrace(e)
            }
            console.error("CentralTexasFoodBankScraper error", e);
            throw e;
        }

    }

}