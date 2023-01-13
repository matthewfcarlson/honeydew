import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";
import * as cheerio from 'cheerio';
import { parseISO8601ToMinutes, parseUnstructuredTimeToMinutes } from "../../_utils";
import { number } from "zod";

// TODO: move this to zod?
interface ATKNextData {
    props: {
        isServer: boolean,
        initialProps : {

        },
        initialState : {
            origin: {
                isAuthenticated: boolean,
            }
            content: {
                documents: Record<string, AtkRecipe>
            },
            collections: {

            },
        },
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

interface AtkRecipe {
   id: number,
   slug: string,
   tags: any[],
   title: string,
   yields: string,
   ratings: any,
   documentType:"recipe"|string;
   recipeTimeNote: string;
   paywall: boolean,
   metaData: {
    id: number,
    fields: {
        squarePhoto?: {
            url:string,
            status: string,
        },
        photo: {
            url: string,
            status: string,
        }
    }
   }
}

export default class ATKScrapper implements AbstractRecipeScraper {

    public canParseUrl(url: URL): boolean {
        const host = url.hostname.toLowerCase();
        if (host == "www.americastestkitchen.com") return true;
        if (host == "americastestkitchen.com") return true;
        if (host == "www.cookscountry.com") return true;
        if (host == "cookscountry.com") return true;
        if (host == "www.cooksillustrated.com") return true;
        if (host == "cooksillustrated.com") return true;
        return false;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        try {
            // First we need to get the access token
            //await this.getAccessToken();
            const url_str = url.toString();
            const raw_response = await fetch(url_str, {
                method: "GET",
                redirect: "follow",
            });
            const raw_text = await raw_response.text();
            const html = cheerio.load(raw_text);
            const json1_0 = html("script#__NEXT_DATA__");
            const raw_data = json1_0.html();
            if (raw_data == null) throw new Error("script#__NEXT_DATA__");
            const data = JSON.parse(raw_data) as ATKNextData;
            const documents = data.props.initialState.content.documents;
            const keys = Object.keys(documents);
            for (let i = 0; i < keys.length; i++) {
                try {
                    const document = documents[keys[i]];
                    return {
                        name: document.title,
                        url: url_str,
                        ingredients: [],
                        image: document.metaData.fields.squarePhoto?.url || document.metaData.fields.photo.url,
                        totalTime: parseUnstructuredTimeToMinutes(document.recipeTimeNote)
                    }
                }
                catch (e:any) {
                    console.warn(e);
                    continue;
                }
            }
            throw new Error("No recipe found");
        }

        catch (e: any) {
            if (!e.stack.includes('\n')) {
                Error.captureStackTrace(e)
            }
            console.error("ATKScrapper error", e);
            throw e;
        }

    }

}