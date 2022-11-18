import { defineStore } from 'pinia';
import axios, { AxiosError } from "axios";
import { z } from 'zod';

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

async function QueryAPI(endpoint: any, post_data?: any): APIResult<any> {
    try {
        const route = `/api/${endpoint.path}`;
        // TODO: handle param checking
        // if (endpoint.method == 'get' && "params" in endpoint) {
        //     route += `/` 
        // }
        if (post_data == null && endpoint.method == 'post') {
            return {
                status: 'error',
                message: 'POST data is needed'
            }
        }
        const result = (post_data != null) ? await axios.post(route, post_data) : await axios.get(route);
        const data = endpoint.parser(result.data);
        return {
            status: "ok",
            data,
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
            message: `Unknown error ${err}`
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
        async fetchUser(): APIResult<any> {
            // TODO: use cached information
            //if (this._userDataCurrent) return ;
            return {
                status: "error",
                message: "TBI"
            }
            // const result = await QueryAPI(API_ME);
            // if (result.status == 'error') return result;
            // return result;
        },
        async signOut(): APIResult<any> {
            // this._loggedIn = false;
            // this._userDataCurrent = false;
            // const result = await QueryAPI(API_SIGNOUT);
            // return result;
            return {
                status: "error",
                message: "TBI"
            }
        },
        async signUp(name: string, key: string): APIResult<any> {
            return {
                status: "error",
                message: "TBI"
            }
            // const data = {
            //     name,
            //     key,
            // }
            // const result = await QueryAPI(API_SIGNUP, data);
            // console.log(result);
            // if (result.status == 'error') {
            //     return result;
            // }
            // const parsed = ApiSignupResultZ.safeParse(result.data);
            // if (!parsed.success) {
            //     return {
            //         status: "error",
            //         message: parsed.error.toString()
            //     }
            // }
            // this._loggedIn = true;
            // this._userDataCurrent = false;
            // return {
            //     status: "ok",
            //     data: parsed.data
            // }
        }
    },
})