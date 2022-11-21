import { defineStore } from 'pinia';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from "../../functions/api/router";
import axios, { AxiosError } from "axios";
import {AuthSignupRequest, AuthSignupRequestZ, AuthSignupResponse, AuthSignupResponseZ} from "../../functions/auth/auth_types";
import { ZodError } from 'zod';

interface APIResultSuccess<T> {
    status: "ok";
    data: T;
}
interface APIResultError {
    status: "error";
    message: string;
    code?: number;
}

const client = createTRPCProxyClient<AppRouter>({
    links: [
        // TODO: figure out current url
      httpBatchLink({
        url: '/api',
      }),
    ],
  });

export type APIResult<T> = Promise<APIResultSuccess<T> | APIResultError>;

type Query<T> = ()=>Promise<T>;

async function QueryAPI<R>(query: Query<R>): APIResult<R> {
    try {
        const result = await query();
        return {
            status: "ok",
            data: result
        }
    }
    catch (err) {
        console.log(err);
        console.log(typeof err);
        // if (err instanceof TRPCError) {
        //     return {
        //         status: "error",
        //         message: err.response?.data.message || "Error querying API",
        //     }
        // }
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
            const hello = await client.hello.query();
            console.log(hello);
            return {
                status: "error",
                message: "TBI"
            }
            // const result = await QueryAPI(API_ME);
            // if (result.status == 'error') return result;
            // return result;
        },
        async signOut(): APIResult<string> {
            try {
                await axios.get("/auth/signout");
                window.location.reload();
                return {
                    status: "ok",
                    data: "Signed Out"
                }
            }
            catch (err) {
                return {
                    status: "error",
                    message: "TBI"
                }
            }
        },
        async signUp(name: string, key?: string): APIResult<AuthSignupResponse> {
            const raw_body:AuthSignupRequest = {
                name,
                key,
            }
            try {
                const post_body = AuthSignupRequestZ.parse(raw_body);
                const result = await axios.post("/auth/signup", post_body);
                const data = AuthSignupResponseZ.parse(result.data);
                this._loggedIn = true;
                return {
                    status: "ok",
                    data
                }
            }
            catch (err) {
                if (err instanceof AxiosError) {
                    return {
                        status: "error",
                        message: "Server says no"
                    }
                }
                if (err instanceof ZodError) {
                    console.error("Zod error", err);
                    return {
                        status: "error",
                        message: err.message
                    }
                }
                return {
                    status: "error",
                    message: "Unknown error occurred"
                }
            }
        }
    },
})