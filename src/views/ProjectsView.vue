<template>
  <div class="projects container">
    <div class="title is-4">Projects</div>
    <div class="is-danger" v-if="error.length > 0">{{ error }}</div>
    <a class="box" v-if="projects.length == 0">
      You don't have any chores yet
    </a>
    <router-link class="box" v-for="project in projects" :key="project.id" :to="'/projects/' + project.id">
      <ChoreIconComponent :chore_name="project.description" />
      <span class="title is-5">{{ project.description }}</span>
      <div v-if="project.total_subtasks > 0">
        <progress class="progress" :value="project.total_subtasks - project.done_subtasks"
          :max="project.total_subtasks">{{
            project.total_subtasks - project.done_subtasks
          }}%</progress>
      </div>
      {{ project.ready_subtasks }} ready tasks |
      {{ project.total_subtasks - project.done_subtasks }} tasks left |
      {{ project.total_subtasks }} total tasks
    </router-link>
    <div class="box">
      <div>Add a new project</div>
      <input v-model="project_name" placeholder="Project name" />
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
      error: "",
    }

  },
  components: {
    ChoreIconComponent
  },
  computed: {
    ...mapState(useUserStore, ["userName", "household", "userId", "projects"])
  },
  mounted: function () {
    useUserStore().ProjectsFetch();
    useUserStore().TasksFetch(null);
  },
  methods: {
    add_project: async function () {
      const status = await useUserStore().ProjectAdd(this.project_name);
      console.log(status);
      if (status.success == true) {
        this.project_name = "";
      }
      else {
        this.error = (status as any).message || "unknown error";
      }
    }
  }
});
</script>
