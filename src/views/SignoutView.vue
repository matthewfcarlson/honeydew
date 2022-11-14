<template>
  <section v-if="isLoggedIn" class="hero is-warning">
    <h1 class="title">Are you sure you want to sign out?</h1>
    <p>Once signed out, you won't be able to sign out without a magic link from another signed in device or a recovery
      key.</p>
    <div class="container py-5">
      <button @click="signout" class="button is-danger is-large">Yes, Sign Me Out</button>
    </div>
  </section>
  <section class="hero" v-else>
    <h1 class="title">You're signed out!</h1>
  </section>

</template>
<script lang="ts">

import { useUserStore } from "@/store";
import { mapState } from "pinia";
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SignoutView',
  computed: {
    ...mapState(useUserStore, ["isLoggedIn"])
  },
  data() {
    return {
      error:"",
    }

  },
  methods: {
    signout: async function () {
      const store = useUserStore()
      const result = await store.signOut();
      if (result.status == 'error') {
        this.error = result.message;
      }
    },
  }
});
</script>