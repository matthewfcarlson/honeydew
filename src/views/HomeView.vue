<template>
  <div class="container">
    <section class="section top-section has-text-left">
      <p class="title"><span class="fw-300">Hello</span> {{ household_name }}</p>
      <p class="subtitle">Here's what's going on today</p>
    </section>

    <div v-if="error != ''" class="notification is-danger">{{ error }}</div>
    <div v-if="streakMessage != ''" class="notification is-success">{{ streakMessage }}</div>

    <div class="box" v-if="streaks.length > 0">
      <div class="title is-4">Streaks</div>
      <div v-for="member in streaks" :key="member.userid" class="level">
        <div class="level-left">
          <span class="has-text-weight-semibold">{{ member.name }}</span>
        </div>
        <div class="level-right">
          <span v-if="member.current_streak > 1">{{ member.current_streak }}-day streak</span>
          <span v-else class="has-text-grey">No streak</span>
        </div>
      </div>
    </div>

    <div class="box">
      <div class="title is-4">Your Chore</div>
      <div v-if="currentChore != null" class="level">
        <div class="level-left">
          <ChoreIconComponent :chore_name="currentChore.name" />
          <div class="is-size-4 is-capitalized has-text-weight-semibold"> {{ currentChore.name }} </div>
        </div>
        <div v-if="(currentChore.lastDone + 1) < currentDate" class="level-right">
          <button class="button is-primary" @click="complete_chore(currentChore?.id || null)">
            <i class="far fa-check-circle"></i> &nbsp;
            Mark Done Today
          </button>
          <button class="button is-warning" @click="complete_chore(currentChore?.id || null)">
            <i class="fas fa-minus-circle"></i> &nbsp;
            Still Clean
          </button>
        </div>
        <div v-else class="text-success level-right">
          <button class="button disable is-success" disabled>
            <i class="fas fa-check-circle"></i>
            Already Done!
          </button>
          <button class="button is-danger" @click="another_chore">
            <i class="fas fa-fire"></i> &nbsp;
            Give Me Another
          </button>
        </div>
      </div>
      <div v-else class="text-info level-right">
        <i class="fas fa-forward"></i>
        No Chore Today
      </div>
      <hr />
      <div v-for="chore in household_chores" :key="chore.id">
        <ChoreIconComponent :have_circle=false height="0.5rem" :chore_name="chore.chore_name" />
        {{ chore.user_name }} is {{ chore.chore_name }}
      </div>
    </div>

    <div class="box">
      <div class="title is-4">Project</div>
      <template v-if="currentTask != null">
        <div>Together you need to:</div>
        <div class="level">
          <div class="level-left">
            <ChoreIconComponent :chore_name="currentTask.description" />
            <div class="is-size-4 is-capitalized has-text-weight-semibold"> {{ currentTask.description }} </div> &nbsp;
            <div class="is-size-4" v-if="currentProject != null">{{ currentProject.description }}</div>
          </div>
          <div class="level-right" v-if="currentTask.completed == null">
            <a :href="'/projects/' + currentProject.id" v-if="currentProject != null">View Project</a> &nbsp;
            <button class="button is-primary" @click="complete_task(currentTask?.id||null)">
              <i class="far fa-check-circle"></i> &nbsp;
              Mark Done Today
            </button>
          </div>
          <div class="level-right" v-else>
            <a :href="'/projects/' + currentProject.id" v-if="currentProject != null">View Project</a> &nbsp;
            <button class="button">Already Complete!</button>
          </div>
        </div>
      </template>
      <template v-else>
        No Task Today
      </template>
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
import type {TaskId} from "../../functions/db_types";
import ChoreIconComponent from "@/components/ChoreIconComponent.vue";

export default defineComponent({
  name: 'HomeView',
  components: {
    ChoreIconComponent
  },
  computed: {
    household_name: function () {
      const household = useUserStore().household;
      if (household == null) return "";
      return household.name;
    },
    streaks: function () {
      const household = useUserStore().household;
      if (household == null) return [];
      return household.members;
    },
    ...mapState(useUserStore, ["currentDate", "currentChore", "household_chores", "currentTask", "currentProject"])
  },
  data() {
    return {
      error: "",
      streakMessage: ""
    }

  },
  methods: {
    complete_chore: async function (id: string | null) {
      if (id == null) {
        this.error = "Chore ID is null";
        return;
      }
      this.streakMessage = "";
      const status = await useUserStore().ChoreComplete(id);
      if (status.success == false) {
        this.error = status.message
      } else if (status.data.isFirstToday && status.data.streak && status.data.streak > 2) {
        this.streakMessage = `🔥 ${status.data.streak}-day streak!`;
      }
    },
    another_chore: async function () {
      const status = await useUserStore().ChoreGetAnother();
      if (status.success == false) {
        this.error = status.message
      }
    },
    complete_task:  async function (id: TaskId|null) {
      if (id == null) return;
      const status = await useUserStore().TaskComplete(id);
      if (status.success == false) {
        this.error = status.message
      }
    },
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
