<template>
    <div>
        <HomeView v-if="isLoggedIn"/>
        <LandingView v-else/>
    </div>
</template>
  
<script lang="ts">

import { defineComponent, defineAsyncComponent } from 'vue';
import { mapState } from 'pinia';
import { useUserStore } from '@/store';

export default defineComponent({
    name: 'IndexView',
    components: {
        HomeView: defineAsyncComponent(() => import(/* webpackChunkName: "home" */ '@/views/HomeView.vue')),
        LandingView: defineAsyncComponent(() => import(/* webpackChunkName: "landing" */ '@/views/LandingView.vue')),
    },
    computed: {
        ...mapState(useUserStore, ["isLoggedIn"])
    }
});
</script>
  