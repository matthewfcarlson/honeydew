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

    <article class="panel is-success">
      <p class="panel-heading">
        Favorites
      </p>
      <!-- <a class="panel-block" v-for="recipe in recipes.favorites" :key="recipe.recipe_id">
        <span>{{ recipe.recipe.name }}</span>
        <i class="fa-solid fa-heart" @click="markFavorite(recipe.recipe_id, false)"></i>
      </a> -->
      <a class="panel-block" v-if="recipes.favorites.length == 0">
        You don't have any favorites yet
      </a>
      <RecipePanelComponent v-for="recipe in recipes.favorites" :recipe="recipe" :key="recipe.recipe_id"/>
    </article>
    <article class="panel is-info">
      <p class="panel-heading">
        To Try
      </p>
      <RecipePanelComponent v-for="recipe in recipes.toTry" :recipe="recipe" :key="recipe.recipe_id"/>
      <a class="panel-block" v-if="recipes.toTry.length == 0">
        You don't have any favorites yet
      </a>
    </article>

    <div class="field has-addons">
      <label class="label">Add recipe</label>
      <div class="control is-expanded">
        <input class="input" v-model="recipe_link" type="text" placeholder="Recipe URL">
      </div>
      <div class="control">
        <button class="button is-primary" @click="add_recipe">Add</button>
      </div>
    </div>


  </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";
import RecipePanelComponent from "@/components/RecipePanelComponent.vue";

export default defineComponent({
  name: 'HomeView',
  data() {
    return {
      recipe_link: "",
      error: "",
    }

  },
  components: {
    RecipePanelComponent
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
