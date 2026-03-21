<template>
  <div class="projects container">
    <div class="title is-4">Projects</div>
    <div class="level is-mobile">
      <div class="has-text-centered level-item">
        <div>
          <p class="title">{{ ready_tasks }}</p>
          <p class="heading">Ready Tasks</p>
        </div>
      </div>
      <div class="has-text-centered level-item">
        <div>
          <p class="title">{{ total_tasks }}</p>
          <p class="heading">Days Left</p>
        </div>
      </div>
    </div>
    <div class="notification is-danger" v-if="error.length > 0">{{ error }}</div>
    <a class="box" v-if="projects.length == 0">
      You don't have any projects yet
    </a>
    <router-link class="box" v-for="project in projects" :key="project.id" :to="'/projects/' + project.id">
      <ChoreIconComponent :chore_name="project.description" />
      <span class="title is-5">{{ project.description }}</span>
      <div class="tags mt-1">
        <span class="tag is-info is-light">{{ project.prep_time }} min prep</span>
        <span class="tag is-primary is-light">{{ project.work_time }} min work</span>
      </div>
      <div v-if="project.total_subtasks > 0">
        <progress class="progress" :value="project.done_subtasks" :max="project.total_subtasks">{{
          Math.round(project.done_subtasks / project.total_subtasks * 100)
        }}%</progress>
      </div>
      {{ project.ready_subtasks }} ready tasks |
      {{ project.total_subtasks - project.done_subtasks }} tasks left |
      {{ project.total_subtasks }} total tasks
    </router-link>
    <div class="box">
      <div>Add a new project</div>
      <input v-model="project_name" placeholder="Project name" />
      <div class="field is-horizontal mt-2">
        <div class="field-body">
          <div class="field">
            <label class="label is-small">Prep time (min)</label>
            <input v-model.number="prep_time" type="number" min="0" placeholder="15" class="input is-small" />
          </div>
          <div class="field">
            <label class="label is-small">Work time (min)</label>
            <input v-model.number="work_time" type="number" min="0" placeholder="45" class="input is-small" />
          </div>
        </div>
      </div>
      <button @click="add_project">Add</button>
    </div>
  </div>
</template>


<script lang="ts">
import ChoreIconComponent from '@/components/ChoreIconComponent.vue';
import { defineComponent } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";

export default defineComponent({
  name: 'ProjectsView',
  data() {
    return {
      project_name: "",
      prep_time: 15,
      work_time: 45,
      error: "",
    }

  },
  components: {
    ChoreIconComponent
  },
  computed: {
    ready_tasks() {
      return useUserStore().projects.map((x) => x.ready_subtasks).reduce((x, y) => x + y, 0)
    },
    total_tasks() {
      return useUserStore().projects.map((x) => x.total_subtasks - x.done_subtasks).reduce((x, y) => x + y, 0)
    },
    ...mapState(useUserStore, ["userName", "household", "userId", "projects"])
  },
  mounted: function () {
    useUserStore().ProjectsFetch();
    useUserStore().TasksFetch(null);
  },
  methods: {
    add_project: async function () {
      const status = await useUserStore().ProjectAdd(this.project_name, this.prep_time, this.work_time);
      console.log(status);
      if (status.success == true) {
        this.project_name = "";
        this.prep_time = 15;
        this.work_time = 45;
      }
      else {
        this.error = status.message;
      }
    }
  }
});
</script>
