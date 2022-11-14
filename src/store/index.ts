import { defineStore } from 'pinia';
import axios, { AxiosError } from "axios";
import { ApiUser } from "../../shared/types";

interface APIResultSuccess<T> {
    status: "ok";
    data: T;
}
interface APIResultError {
    status: "error";
    message: string;
    code?: number;
}

export type APIResult<T> = Promise<APIResultSuccess<T> | APIResultError>;

async function QueryAPI(route: string, post_data?: any): APIResult<any> {
    try {
        const result = (post_data != null) ? await axios.post(route, post_data) : await axios.get(route);
        console.log(result);
        return {
            status: "ok",
            data: result
        }
    }
    catch (err) {
        if (err instanceof AxiosError) {
            return {
                status: "error",
                message: err.response?.data.message || "Error querying API",
            }
        }
        return {
            status: "error",
            message: "Unknown error"
        }
    }
}

export const useUserStore = defineStore("user", {
    state: () => ({
        _loggedIn: (window as any).logged_in || false,
        _userDataCurrent: false,
    }),
    getters: {
        isLoggedIn: (state) => state._loggedIn,
    },
    actions: {
        async fetchUser(): APIResult<ApiUser> {
            // TODO: use cached information
            //if (this._userDataCurrent) return ;
            const data = await QueryAPI("/api/me");
            console.log(data);
            return {
                status: "error",
                message: "TBD"
            }
        },
        async signOut(): APIResult<unknown> {
            this._loggedIn = false;
            this._userDataCurrent = false;
            return await QueryAPI("/api/signout");
        },
        async signUp(name: string, key: string): APIResult<string> {
            const data = {
                name,
                key,
            }
            const result = await QueryAPI("/api/signup", data);
            console.log(result);
            if (result.status == 'error') {
                return result;
            }
            this._loggedIn = true;
            this._userDataCurrent = false;
            return {
                status: "ok",
                data: "TBD"
            }
        }
    },
})