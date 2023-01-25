import { defineStore } from 'pinia';
import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from "../../functions/api/router";
import axios, { AxiosError } from "axios";
import { AuthCheck, AuthCheckZ, AuthSignupRequest, AuthSignupRequestZ, AuthSignupResponse, AuthSignupResponseZ } from "../../functions/auth/auth_types";
import { boolean, ZodError } from 'zod';
import type { DbCardBoxRecipe, DbChore, } from '../../functions/db_types'; // can I bring this in?
import { RecipeIdZ } from '../../functions/db_types'; // can I bring this in?
import { TRPCError } from '@trpc/server';

interface APIResultSuccess<T> {
    success: true;
    data: T;
}
interface APIResultError {
    success: false;
    message: string;
    code?: number;
}

const client = createTRPCProxyClient<AppRouter>({
    links: [
        // TODO: figure out current url
        httpBatchLink({
            url: '/api',
            fetch(url, options) {
                return fetch(url, {
                    ...options,
                    credentials: 'same-origin',
                });
            },
        }),
    ],
});

export type APIResult<T> = Promise<APIResultSuccess<T> | APIResultError>;

type Query<T> = () => Promise<T>;

export function isTRPCClientError(
    cause: unknown,
): cause is TRPCClientError<AppRouter> {
    return cause instanceof TRPCClientError;
}

function handleError(err: unknown): APIResultError {
    if (isTRPCClientError(err)) {
        return {
            success: false,
            message: err.message || "Error querying API",
        }
    }
    return {
        success: false,
        message: `Unknown error ${err}`
    }
}

async function QueryAPI<R>(query: Query<R>): APIResult<R> {
    try {
        const result = await query();
        return {
            success: true,
            data: result
        }
    }
    catch (err) {
        return handleError(err);
    }
}

interface UserStoreState {
    _loggedIn: boolean;
    _user: null | AuthCheck;
    _recipeFavs: DbCardBoxRecipe[],
    _recipeToTry: DbCardBoxRecipe[],
    _chores: DbChore[],
}

export const useUserStore = defineStore("user", {
    state: () => {
        let _user = null;
        if ((window as any).user_data != undefined) {
            const raw_data = (window as any).user_data;
            const user_data = AuthCheckZ.strict().safeParse(raw_data, {});
            if (user_data.success) _user = user_data.data;
            else console.error("Failed to parse: ", raw_data, user_data.error);
        }
        const state: UserStoreState = {
            _loggedIn: (window as any).logged_in || false,
            _user,
            _recipeFavs: [],
            _recipeToTry: [],
            _chores: []
        }
        return state;
    },
    getters: {
        isLoggedIn: (state) => state._loggedIn,
        userName: (state) => {
            if (!state._loggedIn) return "NOT LOGGED IN";
            if (state._user == null) return "";
            if (state._user.name.indexOf(" ") == -1) return state._user.name;
            return state._user.name.substring(0, state._user.name.indexOf(" "));
        },
        household: (state) => {
            if (!state._loggedIn) return null;
            if (state._user == null) return null;
            return state._user.household;
        },
        userIconColor: (state) => {
            if (!state._loggedIn) return null;
            if (state._user == null) return null;
            return [state._user.icon, state._user.color]
        },
        recipes: (state) => {
            return {
                favorites: state._recipeFavs,
                toTry: state._recipeToTry,
            }
        },
        chores: (state) => {
            return state._chores
        },
        mealPlan: (state)=> {
            return []
        },
        currentDate: (state)=> {
            const date = new Date();
            const time = date.getTime(); // the timestamp, not neccessarely using UTC as current time
            //return Math.floor((time / 86400000) - (date.getTimezoneOffset()/1440) + 2440587.5);
            return Math.floor((time / 86400000) + 2440587.5);
        }
    },
    actions: {
        async fetchUser(): APIResult<AuthCheck> {
            // TODO: use cached information
            if (this._user != null) return {
                success: true,
                data: this._user
            }
            const result = await QueryAPI(client.me.get.query);
            if (!result.success) return result;
            // Idk why the type inference is saying this is never[]
            this._user = result.data;
            return result;
        },
        async getInviteLink(): APIResult<string> {
            return await QueryAPI(client.household.invite.query);
        },
        async getMagicLink(): APIResult<string> {
            return await QueryAPI(client.me.magic_link.query);
        },
        async signOut(): APIResult<string> {
            try {
                await axios.get("/auth/signout");
                window.location.reload();
                return {
                    success: true,
                    data: "Signed Out"
                }
            }
            catch (err) {
                return {
                    success: false,
                    message: "TBI"
                }
            }
        },
        async RecipeFetch() {
            const favs = await QueryAPI(client.recipes.favorites.query);
            if (favs.success) {
                this._recipeFavs = favs.data;
            }
            const toTry = await QueryAPI(client.recipes.toTry.query);
            if (toTry.success) {
                this._recipeToTry = toTry.data;
            }
            console.log(favs, toTry);
        },
        async RecipeAdd(url: string): APIResult<boolean> {
            try {
                const result = await client.recipes.add.query(url);
                this.RecipeFetch(); // kick off a request to refresh this
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        async RecipeFavorite(id: string, favored: boolean): APIResult<boolean> {
            try {
                const recipe_id = RecipeIdZ.parse(id);
                if (favored){
                    // First remove it from to try
                    const index = this.recipes.toTry.findIndex((x)=>x.recipe_id == recipe_id);
                    if (index != -1) this.recipes.toTry.splice(index, 1);
                }
                else {
                    // First remove it from favorites
                    const index = this.recipes.favorites.findIndex((x)=>x.recipe_id == recipe_id);
                    if (index != -1) this.recipes.favorites.splice(index, 1);
                }
                const result = await client.recipes.mark_favored.query({ recipe_id, favored });
                this.RecipeFetch(); // kick off a request to refresh this
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        async RecipeRemove(id: string): APIResult<boolean> {
            try {
                const recipe_id = RecipeIdZ.parse(id);
                const result = await client.recipes.remove.query(recipe_id);
                this.RecipeFetch(); // kick off a request to refresh this
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        async RecipeMarkMealPrep(id: string, prepared: boolean): APIResult<boolean> {
            try {
                const recipe_id = RecipeIdZ.parse(id);
                const result = await client.recipes.mark_meal_prep.query({ recipe_id, prepared });
                this.RecipeFetch(); // kick off a request to refresh this
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        async RecipeMealPlan(): APIResult<any[]> {
            return QueryAPI(client.recipes.create_meal_plan.query);
        },
        async MealPlanFetch(): APIResult<boolean> {
            try {
                const result = await client.recipes.meal_plan.query();
                console.log(result);
                return {
                    success: true,
                    data: true
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        // Chores TODO: move to separate store module
        async ChoreFetch() {
            const chores = await QueryAPI(client.chores.all.query);
            if (chores.success) {
                this._chores = chores.data;
            }
        },
        async ChoreAdd(name: string, frequency: number): APIResult<boolean> {
            try {
                const result = await client.chores.add.query({name, frequency});
                this.ChoreFetch(); // kick off a request to refresh this
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        async ChoreComplete(id: string): APIResult<boolean> {
            try {
                const result = await client.chores.complete.query(id);
                this.ChoreFetch(); // kick off a request to refresh this
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        async ChoreDelete(id: string): APIResult<boolean> {
            try {
                const result = await client.chores.delete.query(id);
                this.ChoreFetch(); // kick off a request to refresh this
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },

        async signUp(name: string, key?: string, turnstile: string = ""): APIResult<AuthSignupResponse> {
            const raw_body: AuthSignupRequest = {
                name,
                key,
                turnstile
            }
            try {
                const post_body = AuthSignupRequestZ.parse(raw_body);
                const result = await axios.post("/auth/signup", post_body);
                const data = AuthSignupResponseZ.parse(result.data);
                this._loggedIn = true;
                this._user = null;
                this.fetchUser();
                return {
                    success: true,
                    data
                }
            }
            catch (err) {
                if (err instanceof AxiosError) {
                    return {
                        success: false,
                        message: "Server says no"
                    }
                }
                if (err instanceof ZodError) {
                    console.error("Zod error", err);
                    return {
                        success: false,
                        message: err.message
                    }
                }
                return {
                    success: false,
                    message: "Unknown error occurred"
                }
            }
        }
    },
})