import { AbstractRecipeScraper, HoneydewScrapedRecipeData } from "..";

export default class JsonScraper implements AbstractRecipeScraper {
    public canParseUrl(url: URL): boolean {
        return true;
    }
    public async parseUrl(url: URL): Promise<HoneydewScrapedRecipeData> {
        // pass a full url to a page that contains a recipe
        // process.env.LOGGING_ENABLED = "true";
        // const recipe = await recipeDataScraper(url.toString());
        // return {
        //     name: recipe.name || "Unknown",
        //     url: recipe.url || url.toString(),
        //     image: recipe.image || "", // TODO: placeholder image
        // }
        throw new Error("Not Implemented yet");
    }

}