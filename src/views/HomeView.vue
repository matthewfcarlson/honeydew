<template>
  <div class="container">
    <section class="section maxh-25vh has-text-left">
      <p class="title"><span class="fw-300">Hello</span> {{ household_name }}</p>
      <p class="subtitle">Here's what's going on today</p>
    </section>
    
    <article class="panel">
      <p class="panel-heading">
        Today's meal
      </p>
      <a class="panel-block is-active">
        Example meal here
        <a href="https://www.americastestkitchen.com/" target="_blank">Link to meal</a>
      </a>
      <div class="panel-block">
        <button class="button is-warning">
          <span class="icon is-left">
            <i class="fas fa-forward" aria-hidden="true"></i>
          </span>
          <span>Skip This Meal</span>
        </button>
        <button class="button is-success">
          <span class="icon is-left">
            <i class="fas fa-check" aria-hidden="true"></i>
          </span>
          <span>We Made It</span>
        </button>
      </div>
    
    </article>
    <article class="panel">
      <p class="panel-heading">
        Today's Chores
      </p>
      <a class="panel-block is-active">
        <p>
          Example task like clean the downstairs bathroom
        </p>
        <button class="button is-warning">
          <span class="icon is-left">
            <i class="fas fa-forward" aria-hidden="true"></i>
          </span>
          <span>Skip This Meal</span>
        </button>
        <button class="button is-success">
          <span class="icon is-left">
            <i class="fas fa-check" aria-hidden="true"></i>
          </span>
          <span>We Made It</span>
        </button>
      </a>
      <div class="panel-block">
        
      </div>
      <a class="panel-block is-active">
        Other people's tasks Example task like clean the downstairs bathroom
      </a>
    
    </article>
    <article class="panel">
      <p class="panel-heading">
        Today's Project
      </p>
      <a class="panel-block is-active">
        Example simple 1hour or less task that's easy to do
      </a>
      <div class="panel-block">
        <button class="button is-warning">
          <span class="icon is-left">
            <i class="fas fa-forward" aria-hidden="true"></i>
          </span>
          <span>I already did it, give me another</span>
        </button>
        <button class="button is-success">
          <span class="icon is-left">
            <i class="fas fa-check" aria-hidden="true"></i>
          </span>
          <span>I did It</span>
        </button>
      </div>
      <a class="panel-block is-active">
        The tasks that other people in the house have
      </a>
    
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
//import HelloWorld from '@/components/HelloWorld.vue'; // @ is an alias to /src
import { useUserStore } from "@/store";

export default defineComponent({
  name: 'HomeView',
  components: {
    
  },
  computed: {
      household_name: function() {
        const household = useUserStore().household;
        if (household == null) return "";
        return household.name;
      },
  },
  data() {
    return {
    }

  },
});
</script>
