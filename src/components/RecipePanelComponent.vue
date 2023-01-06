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
              <strong>{{ recipe.recipe.name }}</strong> <small>@johnsmith</small> <small>31m</small>
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
import { defineComponent } from 'vue';


export default defineComponent({
    name: 'RecipePanelComponent',
    props: {
        recipe: {
            type: Object,
            default: null,
        },
    },
    computed: {
        
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
  