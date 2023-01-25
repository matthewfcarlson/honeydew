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
        return {
            invite_link: "",
            error: "",
            magic_link: "",
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
  