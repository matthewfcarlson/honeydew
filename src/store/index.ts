import {defineStore} from 'pinia';
import axios from "axios";

export const useUserStore = defineStore("user", {
    state: () => ({
        _loggedIn: (window as any).logged_in || false,
        _userDataCurrent:false,
    }),
    getters: {
        isLoggedIn: (state) => state._loggedIn,
    },
    actions:{
        async fetchUser() {
            if (this._userDataCurrent) return;
            const data = await axios.get("/api/me");
            console.log(data);
        },
        async logOut() {
            this._loggedIn = false;
            this._userDataCurrent = false;
        }
    },
})