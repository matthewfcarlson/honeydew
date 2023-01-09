<template>
  <div class="meals container">
    <p v-if="error.length != 0">{{ error }}</p>
    <article class="panel is-primary">
      <p class="panel-heading">
        Meals For This Week
      </p>
      <a class="panel-block">
        TO BE IMPLEMENTED
      </a>
    </article>
  </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";

export default defineComponent({
  name: 'HomeView',
  data() {
    return {
      recipe_link: "",
      error: "",
    }

  },
  components: {
  },
  computed: {
    ...mapState(useUserStore, ["userName", "recipes"])
  },
  mounted: function () {
    useUserStore().FetchRecipes();
  },
  methods: {
    add_recipe: async function () {
      const status = await useUserStore().RecipeAdd(this.recipe_link);
      if (status.success == true) {
        this.recipe_link = "";
      }
      else {
        this.error = status.message;
      }
    },
  }
});
</script>
