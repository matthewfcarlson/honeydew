<template>
<div class="about container">
    <h1 class="title is-3 mt-5">Something went wrong</h1>
    <div class="notification" :class="notificationClass">
        <p class="is-size-5">{{ errorMessage }}</p>
        <p v-if="errorDetail" class="mt-2">{{ errorDetail }}</p>
    </div>
    <div class="mt-4">
        <router-link to="/" class="button is-link is-outlined">Take me home</router-link>
        <a v-if="magicKey" :href="'/auth/magic/' + magicKey" class="button is-primary is-outlined ml-2">Try magic link again</a>
    </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';

const ERROR_MESSAGES: Record<string, { message: string; detail?: string; type: string }> = {
    ALREADY_LOGGEDIN: {
        message: "You're already logged in.",
        detail: "Sign out first if you want to use a magic link for a different account.",
        type: "is-warning",
    },
    TELEGRAM_CRAWLER: {
        message: "Telegram tried to preview this link.",
        detail: "Open the magic link in your browser directly instead of previewing it in Telegram.",
        type: "is-info",
    },
    MAGICKEY_INVALID: {
        message: "This magic link is invalid.",
        detail: "The link appears to be malformed. Try generating a new magic link from a device that's already logged in.",
        type: "is-danger",
    },
    MAGICKEY_NOT_FOUND: {
        message: "This magic link has expired.",
        detail: "Magic links are only valid for 1 hour. Generate a new one from a device that's already logged in.",
        type: "is-warning",
    },
    MAGICKEY_CORRUPT: {
        message: "This magic link's data is corrupted.",
        detail: "Something went wrong on our end. Try generating a new magic link.",
        type: "is-danger",
    },
    USER_NOT_FOUND: {
        message: "The user for this magic link was not found.",
        detail: "The account associated with this magic link may have been deleted. Try signing up again.",
        type: "is-danger",
    },
    USER_DB_MISMATCH: {
        message: "Your account data is out of sync.",
        detail: "The magic link is valid, but the linked account could not be found in the database. This can happen after a database migration or reset. Try signing up again or contact your household admin.",
        type: "is-warning",
    },
    UNKNOWN_ERROR: {
        message: "An unexpected error occurred.",
        detail: "Something went wrong. Try again or generate a new magic link.",
        type: "is-danger",
    },
};

export default defineComponent({
    name: '400View',
    setup() {
        const route = useRoute();

        const msgCode = computed(() => {
            return (route.query.msg as string) || '';
        });

        const magicKey = computed(() => {
            return (route.query.k as string) || '';
        });

        const errorInfo = computed(() => {
            return ERROR_MESSAGES[msgCode.value] || {
                message: "Something went wrong.",
                detail: msgCode.value ? `Error code: ${msgCode.value}` : "An unknown error occurred.",
                type: "is-danger",
            };
        });

        const errorMessage = computed(() => errorInfo.value.message);
        const errorDetail = computed(() => errorInfo.value.detail);
        const notificationClass = computed(() => errorInfo.value.type);

        return {
            errorMessage,
            errorDetail,
            notificationClass,
            magicKey,
        };
    },
});
</script>
