<template>
  <div class="chores container" v-if="project != null">
    <h1 class="title is-2">
      <ChoreIconComponent :is_icon="false" :chore_name="project.description" />
      {{ project.description }}
      <span class="subtitle is-5">{{ project.ready_subtasks }} ready tasks |
        {{ project.total_subtasks - project.done_subtasks }} tasks left |
        {{ project.total_subtasks }} total tasks</span>
    </h1>
    <hr />
    <div class="subtitle is-3">Ready Tasks: </div>
    <div class="box" v-for="task in ready_tasks" :key="task.id">
      <ChoreIconComponent :chore_name="task.description" />
      <span class="title is-5">{{ task.description }}</span>
      <span class="subtitle is-6"> </span>
      {{ task }}
    </div>
    <div class="subtitle is-3">Future Tasks: </div>
    <div class="box" v-for="task in blocked_tasks" :key="task.id">
      <ChoreIconComponent :chore_name="task.description" />
      <span class="title is-5">{{ task.description }}</span>
      <span class="subtitle is-6"> </span>
      {{ task }}
    </div>
    <div class="subtitle is-3">Completed Tasks: </div>
    <div class="box" v-for="task in done_tasks" :key="task.id">
      <ChoreIconComponent :chore_name="task.description" />
      <span class="title is-5">{{ task.description }}</span>
      <span class="subtitle is-6"> </span>
      {{ task }}
    </div>
    <div class="box" v-if="tasks.length == 0">
      No tasks created yet
    </div>
    <hr />
    <div class="box">
      <div>Add a new task</div>
      <input v-model="task_name" placeholder="Project name" />
      <button @click="add_task">Add</button>
    </div>
  </div>
  <div v-else>
    Something went horribly wrong {{ project }}
  </div>
</template>

<script lang="ts">
import ChoreIconComponent from '@/components/ChoreIconComponent.vue';
import { defineComponent, computed } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";
import { AugmentedDbProject, ProjectId, ProjectIdZ } from '../../functions/db_types';

const annotated_tasks = computed(() => {
  const tasks = useUserStore().tasks;
  const done_tasks = new Map(
    tasks.map((x) => [x.id, x.completed != null && x.completed > 0])
  )
  return tasks.map((x) => {
    return {
      requirement1_done: x.requirement1 != null ? done_tasks.get(x.requirement1) : true,
      requirement2_done: x.requirement2 != null ? done_tasks.get(x.requirement2) : true,
      ...x
    }
  })
});

const not_done_tasks = computed(()=>{
  const tasks = annotated_tasks.value;
  return tasks.filter((x)=>x.completed == null || x.completed == 0);
});

export default defineComponent({
  name: 'TaskView',
  data() {
    return {
      task_name: "",
      error: "",
    }

  },
  components: {
    ChoreIconComponent
  },
  computed: {
    project_id: function (): ProjectId | null {
      const project_id_attempt = ProjectIdZ.safeParse(this.$route.params.id);
      if (project_id_attempt.success == false) return null;
      return project_id_attempt.data;
    },

    ready_tasks: function () {
      return not_done_tasks.value.filter((x) => x.requirement1_done == true && x.requirement2_done == true)
    },
    blocked_tasks: function () {
      return not_done_tasks.value.filter((x) => x.requirement1_done == false || x.requirement2_done == false)
    },
    done_tasks: function () {
      return annotated_tasks.value.filter((x) => x.completed != null && x.completed > 0)
    },
    project: function (): AugmentedDbProject | null {
      const project_id = this.project_id;
      const matching_projects = useUserStore().projects.filter((x) => x.id == project_id);
      if (matching_projects.length == 0) {
        return null;
      }
      return matching_projects[0];
    },
    ...mapState(useUserStore, ["userName", "household", "userId", "tasks"])
  },
  mounted: function () {
    useUserStore().ProjectsFetch();
    useUserStore().TasksFetch(this.project_id);
  },
  methods: {
    add_task: async function () {
      if (this.project_id == null) {
        this.error = "Unknown project";
        return;
      }
      const status = await useUserStore().TaskAdd(this.task_name, this.project_id);
      if (status.success == true) {
        useUserStore().TasksFetch(this.project_id);
        this.task_name = "";
      }
      else {
        this.error = (status as any).message || "unknown error";
      }
    }
  }
});
</script>