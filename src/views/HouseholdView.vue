<template>
    <div class="home container">
        <div v-if="household != null">
            <p v-if="error.length != 0">{{ error }}</p>
            <article class="panel is-info">
                <p class="panel-heading">
                    {{ household.name }}
                </p>
                <a class="panel-block" v-for="member in household.members" :key="member.userid">
                    <UserIcon class="panel-icon" :raw_color="member.color" :raw_icon="member.icon" />
                    <span>{{ member.name }}</span>
                </a>
                <div class="panel-block" v-if="invite_link.length == 0">
                    <button @click="get_invite" class="button is-success is-outlined is-fullwidth">
                        <span class="icon is-left">
                            <i class="fas fa-plus" aria-hidden="true"></i>
                        </span>
                        <span>Generate Invite Link</span>
                    </button>
                </div>
                <div class="panel-block" v-else>
                    <div class="has-text-justified is-flex-direction-column is-align-items-center">
                        <div class="has-text-justified">{{ invite_link }}</div>
                        <div>
                            <button class="button is-round" @click="copyInviteLink">Copy to Clipboard</button>
                        </div>
                    </div>
                </div>
            </article>

        </div>
        <hr />
        <router-link to="signout" class="button is-warning is-rounded is-large">
            <span class="icon is-small">
                <i class="fas fa-arrow-right-from-bracket"></i>
            </span>
            <span>Signout</span>
        </router-link>
        <button @click="getMagicLink" class="button is-success is-rounded  is-large" v-if="magic_link == ''">
            <span class="icon is-left">
                <i class="fas fa-magic" aria-hidden="true"></i>
            </span>
            <span>Generate Magic Link</span>
        </button>
        <div class="has-text-justified is-flex-direction-column is-align-items-center" v-else>
            <div class="has-text-justified">{{ magic_link }}</div>
            <div>
                <button class="button is-round" @click="copyMagicLink">Copy to Clipboard</button>
            </div>
        </div>
        <hr />
        <div class="box block">
            The hour that you want to be assigned new chores (UTC)
            <input class="input" type="number" v-model="autoassign_hour" />
            <button class="button is-round" @click="setAutoassignTime">Set Autoassign Time</button>
        </div>
        <div class="box block">
            The hour your household wants outfit suggestions via Telegram (UTC). Leave empty to disable.
            <input class="input" type="number" min="0" max="23" v-model="outfit_hour" />
            <button class="button is-round" @click="setOutfitHour">Set Outfit Hour</button>
            <button class="button is-round" @click="clearOutfitHour">Disable Outfit Notifications</button>
            <hr />
            <label class="checkbox">
                <input type="checkbox" v-model="outfit_opted_in" @change="toggleOutfitReminders" />
                Receive outfit reminder notifications for me
            </label>
        </div>
        <div class="box block">
            Expecting? When did it start?
            <input class="input" type="date" :max="max_expecting_date" v-model="expecting_date" />
            <button class="button is-round" @click="setExpectingDate">Set Expecting Time</button>
            <button class="button is-round" @click="clearExpectingDate">Clear Expecting Time</button>
        </div>

    </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";
import UserIcon from "@/components/UserIconComponent.vue";

export default defineComponent({
    name: 'HomeView',
    data() {
        const store = useUserStore();
        return {
            invite_link: "",
            error: "",
            magic_link: "",
            autoassign_hour: 8,
            outfit_hour: "",
            outfit_opted_in: store._user != null ? store._user.outfit_reminders === 1 : true,
            expecting_date: "",
            max_expecting_date: new Date().toISOString().split("T")[0],
        }

    },
    components: {
        UserIcon
    },
    computed: {
        ...mapState(useUserStore, ["userName", "household"])
    },
    methods: {
        copyInviteLink: async function () {
            try {
                await navigator.clipboard.writeText(this.invite_link);
            }
            catch {
                this.error = "Could not copy to clipboard";
            }
        },
        copyMagicLink: async function () {
            try {
                await navigator.clipboard.writeText(this.magic_link);
            }
            catch {
                this.error = "Could not copy to clipboard";
            }
        },
        setExpectingDate: async function () {
            this.error = "";
            const result = await useUserStore().HouseholdSetExpectingDate(this.expecting_date);
            if (result.success == false) {
                this.error = result.message;
            }
            else {
                if (this.expecting_date == "") {
                    this.error = "successfully cleared expecting"
                }
                else {
                    this.error = "successfully set expecting"
                }
            }
        },
        clearExpectingDate: async function () {
            this.expecting_date = "";
            // Issue an update so that it gets cleared in the DB
            this.setExpectingDate();
        },
        get_invite: async function () {
            this.invite_link = "";
            this.error = "";
            const invite = await useUserStore().getInviteLink();
            if (invite.success == true) {
                this.invite_link = invite.data;
            }
            else {
                this.error = invite.message;
            }
        },
        toggleOutfitReminders: async function () {
            this.error = "";
            const result = await useUserStore().SetOutfitReminders(this.outfit_opted_in);
            if (result.success == false) {
                this.error = result.message;
                this.outfit_opted_in = !this.outfit_opted_in;
            }
            else {
                this.error = this.outfit_opted_in ? "outfit reminders enabled for you" : "outfit reminders disabled for you";
            }
        },
        setOutfitHour: async function () {
            this.error = "";
            const hour = this.outfit_hour === "" ? null : Number(this.outfit_hour);
            if (hour != null && (isNaN(hour) || hour < 0 || hour >= 24)) {
                this.error = "Hour must be between 0 and 23";
                return;
            }
            const result = await useUserStore().HouseholdSetOutfitHour(hour);
            if (result.success == false) {
                this.error = result.message;
            }
            else {
                this.error = hour != null ? "successfully set outfit hour" : "outfit notifications disabled";
            }
        },
        clearOutfitHour: async function () {
            this.outfit_hour = "";
            const result = await useUserStore().HouseholdSetOutfitHour(null);
            if (result.success == false) {
                this.error = result.message;
            }
            else {
                this.error = "outfit notifications disabled";
            }
        },
        setAutoassignTime: async function () {
            this.invite_link = "";
            this.error = "";
            const result = await useUserStore().HouseholdSetSyncTime(this.autoassign_hour);
            if (result.success == false) {
                this.error = result.message;
            }
            else {
                this.error = "successfully set time"
            }
        },
        getMagicLink: async function () {
            this.magic_link = "";
            this.error = "";
            const invite = await useUserStore().getMagicLink();
            if (invite.success == true) {
                this.magic_link = invite.data;
            }
            else {
                this.error = invite.message;
            }
        },
    }
});
</script>
