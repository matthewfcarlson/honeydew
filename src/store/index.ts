import { defineStore } from 'pinia';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from "../../functions/api/router";
import axios, { AxiosError } from "axios";
import { AuthCheck, AuthCheckZ, AuthSignupRequest, AuthSignupRequestZ, AuthSignupResponse, AuthSignupResponseZ } from "../../functions/auth/auth_types";
import { ZodError } from 'zod';

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

async function QueryAPI<R>(query: Query<R>): APIResult<R> {
    try {
        const result = await query();
        return {
            success: true,
            data: result
        }
    }
    catch (err) {
        console.error(err);
        console.error(typeof err);
        // if (err instanceof TRPCError) {
        //     return {
        //         status: "error",
        //         message: err.response?.data.message || "Error querying API",
        //     }
        // }
        return {
            success: false,
            message: `Unknown error ${err}`
        }
    }
}

interface UserStoreState {
    _loggedIn: boolean;
    _user: null | AuthCheck;
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
            _user
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
        userIconColor: (state)=> {
            if (!state._loggedIn) return null;
            if (state._user == null) return null;
            return [state._user.icon, state._user.color]
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
        async signUp(name: string, key?: string): APIResult<AuthSignupResponse> {
            const raw_body: AuthSignupRequest = {
                name,
                key,
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