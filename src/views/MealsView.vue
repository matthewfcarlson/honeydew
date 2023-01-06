<template>
  <div class="meals container">
    <p v-if="error.length != 0">{{ error }}</p>
    <article class="panel is-success">
      <p class="panel-heading">
        Favorites
      </p>
      <a class="panel-block" v-for="recipe in recipes.favorites" :key="recipe.recipe_id">
        <span>{{ recipe.recipe.name }}</span>
        <i class="fa-solid fa-heart" @click="markFavorite(recipe.recipe_id, false)"></i>
      </a>
    </article>
    <article class="panel is-info">
      <p class="panel-heading">
        To Try
      </p>
      <a class="panel-block" v-for="recipe in recipes.toTry" :key="recipe.recipe_id">
        <span>{{ recipe.recipe.name }}</span>
        <i class="fa-regular fa-heart" @click="markFavorite(recipe.recipe_id, true)"></i>
      </a>
    </article>

    <article class="panel is-info">
      Add recipe
      <input type="text" v-model="recipe_link"/>
      <button @click="add_recipe">Add</button>
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
  // components: {
  //     UserIcon
  // },
  computed: {
    ...mapState(useUserStore, ["userName", "recipes"])
  },
  mounted: function() {
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
    markFavorite: async function (recipe_id:string, favored:boolean) {
      const status = await useUserStore().RecipeFavorite(recipe_id, favored);
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
