<template>
    <div class="home">
        <h1>{{userName}}</h1>
        <pre>{{ invite_link }}</pre>
        <pre>{{household}}</pre>
        <div v-if="household != null">
            <UserIcon v-for="user in household.members" :key="user.userid"/>
        </div>
        <p v-if="error.length > 0"> {{error}} </p>
        <button @click="get_invite">No invite link</button>
        <hr />
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
        }

    },
    components: {
        UserIcon
    },
    computed: {
        ...mapState(useUserStore, ["userName", "household"])
    },
    methods: {
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
    }
});
</script>
  