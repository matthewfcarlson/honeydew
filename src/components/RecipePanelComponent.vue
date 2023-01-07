<template>
    <a class="panel-block">
        <figure class="media-left">
          <p class="image is-128x128">
            <img :src="recipe.recipe.image">
          </p>
        </figure>
        <div class="media-content">
          <div class="content">
            <p>
              <strong>{{ recipe.recipe.name }}</strong> <small>@{{source}}</small> <small>{{ recipe.recipe.totalTime }}</small>
              <br>
            </p>
          </div>
          <nav class="level is-mobile">
            <div class="level-left">
              <a class="level-item">
                <span class="icon is-small"><i class="fas fa-edit"></i></span>
              </a>
              <a class="level-item" :href="recipe.recipe.url" target="_blank">
                <span class="icon is-small"><i class="fab fa-readme"></i></span>
              </a>
            </div>
          </nav>
        </div>
        <div class="media-right">
          <a @click="markFavorite(recipe.recipe_id, false)" v-if="recipe.favorite"><i class="fa-solid fa-heart"></i></a>
          <a @click="markFavorite(recipe.recipe_id, true)" v-else><i class="fa-regular fa-heart"></i></a>
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
          return url.hostname.slice(url.hostname.indexOf(".")+1)
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
    }
});
</script>
  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
  