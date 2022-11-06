<template>
    <div>
        <HomeView v-if="isLoggedIn"/>
        <LandingView v-else/>
    </div>
</template>
  
<script lang="ts">

import { defineComponent } from 'vue';
import HomeView from '@/views/HomeView.vue';
import LandingView from '@/views/LandingView.vue';
import { mapState } from 'pinia';
import { useUserStore } from '@/store';

export default defineComponent({
    name: 'IndexView',
    components: {
        HomeView,
        LandingView
    },
    computed: {
        ...mapState(useUserStore, ["isLoggedIn"])
    }
});
</script>
  