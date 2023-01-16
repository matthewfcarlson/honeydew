<template>
  <a class="panel-block recipe-block">
    <figure class="media-left">
      <p class="image is-128x128">
        <img :src="recipe.recipe.image">
      </p>
    </figure>
    <div class="media-content">
      <div class="content">
        <p>
          <strong>{{ recipe.recipe.name }}</strong> |
          <small>@{{ source }}</small> | 
          <small v-if="recipe.meal_prep"> Meal Prep</small>
          <small v-else>{{ time }}</small>
          <br>
          Example ingredients: olive oil, onion, spicy italian sausages, chicken broth, orecchiette pasta, arugula,
          Parmigiano-Reggiano cheese
        </p>
      </div>
      <nav class="level is-mobile is-size-5">
        <div class="level-left">
          <a class="level-item" title="Edit Recipe (TBD)">
            <span class="icon is-small"><i class="fas fa-edit"></i></span>
          </a>
          <a class="level-item has-text-success" title="Read Recipe" :href="recipe.recipe.url" target="_blank">
            <i class="fab fa-readme"></i>
          </a>
          <a @click="markFavorite(recipe.recipe_id, false)" class="level-item has-text-danger" v-if="recipe.favorite"><i
              class="fa-solid fa-heart"></i></a>
          <a @click="markFavorite(recipe.recipe_id, true)" v-else class="level-item has-text-info has-text-danger"><i
              class="fa-regular fa-heart"></i></a>
          <a @click="markMealPrep(recipe.recipe_id, false)" class="level-item has-text-primary" v-if="recipe.meal_prep"><i
              class="far fa-calendar-check"></i></a>
          <a @click="markMealPrep(recipe.recipe_id, true)" v-else class="level-item has-text-info" ><i class="far fa-calendar"></i></a>

          <a @click="removeRecipe(recipe.recipe_id)" class="level-item has-text-danger"><i class="far fa-trash-can"></i></a>
        </div>
      </nav>
    </div>
  </a>
</template>

<script lang="ts">
//import type { AuthHouseholdMember } from 'functions/auth/auth_types';
import { useUserStore } from '@/store';
import { DbCardBoxRecipe } from 'functions/db_types';
import { defineComponent, PropType } from 'vue';


export default defineComponent({
  name: 'RecipePanelComponent',
  props: {
    recipe: {
      type: Object as PropType<DbCardBoxRecipe>,
      default: null,
    },
  },
  computed: {
    source: function () {
      const url = new URL(this.recipe.recipe.url)
      return url.hostname.slice(url.hostname.indexOf(".") + 1)
    },
    time: function () {
      const time = this.recipe.recipe.totalTime;
      if (time == 0) return "instant"
      if (time < 60) return time + " min"
      const hours = Math.floor(time / 60);
      if ((time - hours * 60) == 0) {
        if (hours == 1) return "1 hr";
        else return hours + " hrs";
      }
      if (hours == 1) return hours + " hr, " + (time - hours * 60) + " min";
      else return hours + " hrs, " + (time - hours * 60);
    },
  },
  methods: {
    markFavorite: async function (recipe_id: string, favored: boolean) {
      const status = await useUserStore().RecipeFavorite(recipe_id, favored);
      if (status.success == true) {
        return;
      }
      else {
        //this.error = status.message;
      }
    },
    markMealPrep: async function (recipe_id: string, prepared: boolean) {
      const status = await useUserStore().RecipeMarkMealPrep(recipe_id, prepared);
      if (status.success == true) {
        return;
      }
      else {
        //this.error = status.message;
      }
    },
    removeRecipe: async function (recipe_id: string) {
      const status = await useUserStore().RecipeRemove(recipe_id);
      if (status.success == true) {
        return;
      }
      else {
        //this.error = status.message;
      }
    },
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.recipe-block {
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0.5em 0.75em;
  text-align: inherit;
}

.recipe-block img {
  overflow: hidden;
  aspect-ratio: 1;
  /* will make width equal to height (500px container) */
  object-fit: cover;
  /* use the one you need */
}
</style>
