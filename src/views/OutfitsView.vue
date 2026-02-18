<template>
  <div class="outfits container">
    <div class="title is-4">Outfits</div>
    <div class="box has-text-centered">
      <span class="icon is-large">
        <i class="fa-solid fa-shirt fa-3x"></i>
      </span>
      <p class="title is-5 mt-4">Under Construction</p>
      <p class="subtitle is-6">We're working on helping you pick outfits. Check back soon!</p>
    </div>
  </div>
</template>


<script lang="ts">
import { defineComponent } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";

export default defineComponent({
  name: 'OutfitsView',
  computed: {
    ...mapState(useUserStore, ["userName", "household", "userId"])
  },
});
</script>
