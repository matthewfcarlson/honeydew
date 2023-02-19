import { defineStore } from 'pinia';
import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from "../../functions/api/router";
import axios, { AxiosError } from "axios";
import { AuthCheck, AuthCheckZ, AuthSignupRequest, AuthSignupRequestZ, AuthSignupResponse, AuthSignupResponseZ } from "../../functions/auth/auth_types";
import { boolean, ZodError } from 'zod';
import { AugmentedDbProject, ChoreIdz, DbCardBoxRecipe, DbChore, DbProject, DbTask, ProjectId, UserIdZ, } from '../../functions/db_types'; // can I bring this in?
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

interface AugmentedDbChore extends DbChore {
    doneByName: string,
}

interface UserStoreState {
    _loggedIn: boolean;
    _currentChore: DbChore | null;
    _currentTask: DbTask | null;
    _user: null | AuthCheck;
    _recipeFavs: DbCardBoxRecipe[];
    _recipeToTry: DbCardBoxRecipe[];
    _chores: AugmentedDbChore[];
    _projects: AugmentedDbProject[];
    _thinking: boolean;
    _tasks: DbTask[];
}

export const useUserStore = defineStore("user", {
    state: () => {
        let _user = null;
        let _currentChore = null;
        let _currentTask = null;
        if ((window as any).user_data != undefined) {
            const raw_data = (window as any).user_data;
            const user_data = AuthCheckZ.strict().safeParse(raw_data, {});
            if (user_data.success) {
                _user = user_data.data;
                const current_user_member = _user.household.members.filter((x)=>x.userid == user_data.data.id);
                _currentChore = (current_user_member.length > 0) ? current_user_member[0].current_chore : null,
                _currentTask = user_data.data.household.current_task;
            }
            else console.error("Failed to parse: ", raw_data, user_data.error);
        }
        const state: UserStoreState = {
            _loggedIn: (window as any).logged_in || false,
            _currentChore,
            _currentTask,
            _user,
            _recipeFavs: [],
            _recipeToTry: [],
            _chores: [],
            _projects: [],
            _thinking: false,
            _tasks: [],
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
        thinking: (state) => {
            return state._thinking;
        },
        userIconColor: (state) => {
            if (!state._loggedIn) return null;
            if (state._user == null) return null;
            return [state._user.icon, state._user.color]
        },
        userId: (state) => {
            if (!state._loggedIn) return null;
            if (state._user == null) return null;
            return state._user.id;
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
        mealPlan: (state) => {
            return []
        },
        currentChore: (state) => {
            return state._currentChore
        },
        currentDate: (state) => {
            const date = new Date();
            const time = date.getTime(); // the timestamp, not necessarily using UTC as current time
            //return Math.floor((time / 86400000) - (date.getTimezoneOffset()/1440) + 2440587.5);
            return (time / 86400000) + 2440587.5;
        },
        projects: (state) => {
            return state._projects;
        },
        tasks: (state) => {
            return state._tasks;
        }
    },
    actions: {
        getUserName(id: string, myself: boolean = false): string {
            if (myself && this._user != null && this._user.id == id) return "Myself";
            if (this.household == null) return id;
            const members = this.household.members.filter((x) => x.userid == id);
            if (members.length == 0) return id;
            return members[0].name;
            return id;
        },
        async fetchUser(): APIResult<AuthCheck> {
            // TODO: use cached information
            if (this._user != null) return {
                success: true,
                data: this._user
            }
            this._thinking = true;
            const result = await this.QueryAPI(client.me.get.query);
            this._thinking = false;
            if (!result.success) return result;
            // Idk why the type inference is saying this is never[]
            this._user = result.data;
            return result;
        },
        async QueryAPI<R>(query: Query<R>): APIResult<R> {
            try {
                this._thinking = true;
                const result = await query();
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async getInviteLink(): APIResult<string> {
            return await this.QueryAPI(client.household.invite.query);
        },
        async getMagicLink(): APIResult<string> {
            return await this.QueryAPI(client.me.magic_link.query);
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
        async HouseholdSetSyncTime(hour: number) {
            try {
                const result = await client.household.setAutoAssign.query(hour);
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                return handleError(err);
            }
        },
        async RecipeFetch() {
            const favs = await this.QueryAPI(client.recipes.favorites.query);
            if (favs.success) {
                this._recipeFavs = favs.data;
            }
            const toTry = await this.QueryAPI(client.recipes.toTry.query);
            if (toTry.success) {
                this._recipeToTry = toTry.data;
            }
        },
        async RecipeAdd(url: string): APIResult<boolean> {
            try {
                this._thinking = true;
                const result = await client.recipes.add.query(url);
                this.RecipeFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async RecipeFavorite(id: string, favored: boolean): APIResult<boolean> {
            try {
                this._thinking = true;
                const recipe_id = RecipeIdZ.parse(id);
                if (favored) {
                    // First remove it from to try
                    const index = this.recipes.toTry.findIndex((x) => x.recipe_id == recipe_id);
                    if (index != -1) this.recipes.toTry.splice(index, 1);
                }
                else {
                    // First remove it from favorites
                    const index = this.recipes.favorites.findIndex((x) => x.recipe_id == recipe_id);
                    if (index != -1) this.recipes.favorites.splice(index, 1);
                }
                const result = await client.recipes.mark_favored.query({ recipe_id, favored });
                this.RecipeFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async RecipeRemove(id: string): APIResult<boolean> {
            try {
                this._thinking = true;
                const recipe_id = RecipeIdZ.parse(id);
                const result = await client.recipes.remove.query(recipe_id);
                this.RecipeFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async RecipeMarkMealPrep(id: string, prepared: boolean): APIResult<boolean> {
            try {
                const recipe_id = RecipeIdZ.parse(id);
                const result = await client.recipes.mark_meal_prep.query({ recipe_id, prepared });
                this.RecipeFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async RecipeMealPlan(): APIResult<any[]> {
            return this.QueryAPI(client.recipes.create_meal_plan.query);
        },
        async MealPlanFetch(): APIResult<boolean> {
            try {
                this._thinking = true;
                const result = await client.recipes.meal_plan.query();
                this._thinking = false;
                return {
                    success: true,
                    data: true
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        // Chores TODO: move to separate store module
        async ChoreFetch() {
            const current_chore = await this.QueryAPI(client.chores.next.query);
            if (current_chore.success) {
                this._currentChore = current_chore.data;
                console.log("New current chore", current_chore.data);
            }
            const chores = await this.QueryAPI(client.chores.all.query);
            if (chores.success) {
                const augmented_chores = chores.data.map((x) => {
                    return {
                        doneByName: x.doneBy == null ? "Anyone" : this.getUserName(x.doneBy),
                        ...x
                    }
                })
                this._chores = augmented_chores;
            }
        },
        async ChoreAdd(name: string, frequency: number): APIResult<boolean> {
            try {
                this._thinking = true;
                const result = await client.chores.add.query({ name, frequency });
                // TODO add the core to the list
                this.ChoreFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async ChoreAssign(chore_id_str: string, assignee_id_str: string | null): APIResult<boolean> {
            try {
                this._thinking = true;
                const chore_id = ChoreIdz.parse(chore_id_str);
                const assignee_id = UserIdZ.nullable().parse(assignee_id_str);
                const result = await client.chores.assignTo.query({ raw_choreid: chore_id, raw_assigneeid: assignee_id });
                // TODO assign the chore right now
                this.ChoreFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async ChoreComplete(id: string): APIResult<boolean> {
            try {
                this._thinking = true;
                const result = await client.chores.complete.query(id);
                this.ChoreFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },
        async ChoreGetAnother() {
            const result = await this.QueryAPI(client.chores.another.query);
            this._currentChore = null;
            this.ChoreFetch();
            return result;
        },
        async ChoreDelete(id: string): APIResult<boolean> {
            try {
                this._thinking = true;
                const result = await client.chores.delete.query(id);
                this.ChoreFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },

        async ProjectsFetch() {
            try {
                this._thinking = true;
                const result = await client.projects.get_projects.query();
                if (result != null) this._projects = result;
                this._thinking = false;
                return {
                    success: true,
                    data: true
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }

        },

        async ProjectAdd(name: string) {
            try {
                this._thinking = true;
                const result = await client.projects.add.query(name);
                // TODO add the core to the list
                this.ProjectsFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },

        async TaskAdd(description: string, project: ProjectId) {
            try {
                this._thinking = true;
                const result = await client.projects.add_task.query({
                    description,
                    project
                });
                this.ProjectsFetch(); // kick off a request to refresh this
                this._thinking = false;
                return {
                    success: true,
                    data: result
                }
            }
            catch (err) {
                this._thinking = false;
                return handleError(err);
            }
        },

        async TasksFetch(project_id: ProjectId|null) {
            console.log("TASKS FETCH", project_id);
            if (project_id == null) {
                this._tasks = [];
                return;
            }
            try {
                this._thinking = true;
                const result = await client.projects.get_tasks.query(project_id);
                if (result != null) this._tasks = result;
                this._thinking = false;
                return {
                    success: true,
                    data: true
                }
            }
            catch (err) {
                this._thinking = false;
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