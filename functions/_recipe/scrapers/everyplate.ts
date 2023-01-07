import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";
import * as cheerio from 'cheerio';
import { parseISO8601ToMinutes } from "../../_utils";

// TODO: move this to zod?
interface EveryPlateNextData {
    props: {
        pageProps : {
            ssrPayload: {
                serverAuth: {
                    access_token: string,
                    token_type: string,
                }
            }
        }
        __N_SSP: boolean
    },
    page: string,
    query: {},
    buildId: string,
    assetPrefix: string,
    isFallback: boolean,
    dynamicIds: number[],
    gssp: boolean,
    appGip: boolean,
}

interface EveryPlateRecipe {
    active: boolean,
    allergens: any[]
    averageRating: number,
    cardLink: string, // a PDF for the card
    imageLink: string,
    imagePath: string,
    ingredients: any[],
    name: string,
    nutrition: any[],
    prepTime: string,
    totalTime: string,

}

export default class EveryPlateScraper implements AbstractRecipeScraper {
    private access_token:string = "";

    private async getAccessToken() {
        if (this.access_token != "") return;
        // TODO: get access token
        const raw_response = await fetch("https://www.everyplate.com/");
        const raw_text = await raw_response.text();
        const html = cheerio.load(raw_text);
        const json1_0 = html("script#__NEXT_DATA__");
        const raw_data = json1_0.html();
        if (raw_data == null) throw new Error("script#__NEXT_DATA__");
        const data = JSON.parse(raw_data) as EveryPlateNextData;
        const server_auth = data.props.pageProps.ssrPayload.serverAuth
        this.access_token = `${server_auth.token_type} ${server_auth.access_token}`;
    }

    public canParseUrl(url: URL): boolean {
        const host = url.hostname.toLowerCase();
        if (host == "www.everyplate.com") return true;
        if (host == "everyplate.com") return true;
        return false;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        try {
            // First we need to get the access token
            await this.getAccessToken();
            const url_str = url.toString();
            const parts = url_str.split("/");
            const last_part = parts[parts.length-1];
            const slug_parts = last_part.split("-");
            const slug = slug_parts[slug_parts.length-1];
            if (slug == "") throw new Error("Didn't find slug");
            const api_url = `https://www.everyplate.com/gw/recipes/recipes/${slug}?country=ER&locale=en-US`
            const raw_response = await fetch(api_url, {
                method: "GET",
                headers: {
                    "Content-Type": 'application/json, text/plain, */*',
                    "referer": url_str,
                    "authorization": this.access_token
                },
                redirect: "follow",
            });
            const text = await raw_response.text()
            if (raw_response.status != 200) {
                throw new Error(`Server did not return 200. ${raw_response.status} ${raw_response.statusText}`)
            }
            const data = JSON.parse(text) as EveryPlateRecipe;
            const prep_time = parseISO8601ToMinutes(data.prepTime) || 0;
            return {
                name: data.name,
                url: url_str,
                image: data.imageLink,
                totalTime: prep_time, // everplate lies and says their total time is their cook time
                ingredients: []
            }
        }

        catch (e: any) {
            if (!e.stack.includes('\n')) {
                Error.captureStackTrace(e)
            }
            console.error("EveryPlateScraper error", e);
            throw e;
        }

    }

}