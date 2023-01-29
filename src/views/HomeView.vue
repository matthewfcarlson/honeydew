<template>
  <div class="container">
    <section class="section top-section has-text-left">
      <p class="title"><span class="fw-300">Hello</span> {{ household_name }}</p>
      <p class="subtitle">Here's what's going on today</p>
    </section>

    <div v-if="error != ''">{{ error }}</div>
    <div class="box">
      <div class="title is-4">Chore</div>
      <template v-if="currentChore != null">
        <div>Today you need to:</div>
        <div>
          <TaskIcon :task_name="currentChore.name" />
          <span class="subtitle is-4"> {{ currentChore.name }} </span>
        </div>
        <div v-if="(currentChore.lastDone + 1) < currentDate">
          <button class="button is-primary" @click="complete_chore(currentChore?.id || null)">
            <i class="far fa-check-circle"></i> &nbsp;
            Mark Done Today
          </button>
          <button class="button is-warning" @click="complete_chore(currentChore?.id || null)">
            <i class="fas fa-minus-circle"></i> &nbsp;
            Still Clean
          </button>
        </div>
        <div v-else class="text-success">
          <button class="button disable is-success" disabled>
            <i class="fas fa-check-circle"></i>
            Already Done!
          </button>
          <button class="button is-danger" @click="another_chore">
            <i class="fas fa-fire"></i> &nbsp;
            Give Me Another
          </button>
        </div>
      </template>
      <div v-else class="text-info">
        <i class="fas fa-forward"></i>
        No Chore Today
      </div>
    </div>

    <!-- <div class="card is-rounded">
      <header class="card-header is-info">
        <p class="card-header-title">
          Today's Meal
        </p>

      </header>
      <a class="card-image" target="_blank" href="https://www.americastestkitchen.com/recipes/15318-multicooker-chicken-in-a-pot-with-lemon-herb-sauce">
        <figure class="image is-16by9">
          <img src="../assets/sample_meal.webp" alt="Placeholder image">
        </figure>
      </a>
      <div class="card-content">
        <div class="content">
          Multicooker Chicken in a Pot with Lemon-Herb Sauce
          SERVES: 4
          TIME: 1 hour
          <br/>
          <time datetime="2016-1-1">11:09 PM - 1 Jan 2016</time>
        </div>
      </div>
      <footer class="card-footer">
        <a href="#" class="card-footer-item is-info">Make it later</a>
        <a href="#" class="card-footer-item is-warning">Other Plans</a>
        <a href="#" class="card-footer-item is-success" >Ate it</a>
      </footer>
    </div>

    <article class="panel">
      <p class="panel-heading">
        Today's meal
      </p>
      <a class="panel-block is-active">
        Example meal here
        <a href="https://www.americastestkitchen.com/" target="_blank">Link to meal</a>
      </a>
      <div class="panel-block">
        <div class="buttons has-addons">

          <button class="button is-warning">
            <span class="icon is-left">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </span>
            <span>Make this another day</span>
          </button>
          <button class="button is-info">
            <span class="icon is-left">
              <i class="fas fa-forward" aria-hidden="true"></i>
            </span>
            <span>Ate something else</span>
          </button>
          <button class="button is-success">
            <span class="icon is-left">
              <i class="fas fa-check" aria-hidden="true"></i>
            </span>
            <span>Ate it</span>
          </button>
        </div>
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

        <div class="buttons has-addons">
          <button class="button is-warning">
            <span class="icon is-left">
              <i class="fas fa-forward" aria-hidden="true"></i>
            </span>
            <span>Done, Another!</span>
          </button>
          <button class="button is-success">
            <span class="icon is-left">
              <i class="fas fa-check" aria-hidden="true"></i>
            </span>
            <span>Cleaned it</span>
          </button>
        </div>
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
        <div class="buttons has-addons">
          <button class="button is-warning">
            <span class="icon is-left">
              <i class="fas fa-forward" aria-hidden="true"></i>
            </span>
            <span>Finished, Again!</span>
          </button>
          <button class="button is-success">
            <span class="icon is-left">
              <i class="fas fa-check" aria-hidden="true"></i>
            </span>
            <span>Did It</span>
          </button>
        </div>
      </div>

      <a class="panel-block is-active">
        The tasks that other people in the house have
      </a>

    </article> -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from "pinia";
import { useUserStore } from "@/store";
import TaskIcon from "@/components/TaskIconComponent.vue";

export default defineComponent({
  name: 'HomeView',
  components: {
    TaskIcon
  },
  computed: {
    household_name: function () {
      const household = useUserStore().household;
      if (household == null) return "";
      return household.name;
    },
    ...mapState(useUserStore, ["currentDate", "currentChore"])
  },
  data() {
    return {
      error: ""
    }

  },
  methods: {
    complete_chore: async function (id: string | null) {
      if (id == null) {
        this.error = "Chore ID is null";
        return;
      }
      const status = await useUserStore().ChoreComplete(id);
      if (status.success == false) {
        this.error = status.message
      }
    },
    another_chore : async function () {
      const status = await useUserStore().ChoreGetAnother();
      if (status.success == false) {
        this.error = status.message
      }
    }
  }
});
</script>

<style scoped lang="css">
.top-section {
  height: max(20vh, 8rem);
}
</style>

<style scoped lang="scss">
@import "../assets/variables.scss";

.container>* {
  margin-bottom: 2rem;
}

.card-footer a {
  font-weight: 700;
}

@import "../../node_modules/bulma/sass/utilities/_all.sass";

@each $type in $sailwind_types {
  .card-footer a.is-#{$type} {
    background-color: map-get($sailwind_colors, $type);
    color: findColorInvert(map-get($sailwind_colors, $type));
  }
}
</style>
