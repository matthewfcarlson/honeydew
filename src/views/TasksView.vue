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
    <vue-mermaid-string :value="diagram" />
    <div class="subtitle is-3">Ready Tasks: </div>
    <div class="box" v-for="task in ready_tasks" :key="task.id" :id="task.id">
      <div class="level">
        <div class="level-left">
          <ChoreIconComponent :chore_name="task.description" />
          <span class="title is-5">{{ task.description }}</span>
        </div>
        <div class="level-right">
          <span class="is-6"> from {{ task.added_by_name }} | </span>
          <button class="button is-success" @click="complete_task(task.id)">Complete</button>
          <button class="button is-danger" @click="delete_task(task.id)">Delete</button>
        </div>
      </div>
    </div>
    <div class="subtitle is-3">Future Tasks: </div>
    <div class="box" v-for="task in blocked_tasks" :key="task.id" :id="task.id">
      <div class="level">
        <div class="level-left">
          <ChoreIconComponent :chore_name="task.description" />
          <span class="title is-5">{{ task.description }}</span>
        </div>
        <div>{{ task.requirement1_desc }} {{ task.requirement2_desc }}</div>
        <div class="level-right">
          <div class="is-6"> from {{ task.added_by_name }} | </div>
          <button class="button is-danger" @click="delete_task(task.id)">Delete</button>
        </div>
      </div>
    </div>
    <div class="subtitle is-3">Completed Tasks: </div>
    <div class="box" v-for="task in done_tasks" :key="task.id" :id="task.id">
      <div class="level">
        <div class="level-left">
          <ChoreIconComponent :chore_name="task.description" />
          <span class="title is-5">{{ task.description }}</span>
        </div>
        <div class="level-right">
          <span class="subtitle is-6"> from {{ task.added_by_name }}</span>
        </div>
      </div>
    </div>
    <div class="box" v-if="tasks.length == 0">
      No tasks created yet
    </div>
    <hr />
    <div class="box">
      <div>Add a new task and any requirements</div>
      <input v-model="task_name" placeholder="Task name" />
      <select v-model="requirement1">
        <option value=""> - </option>
        <option :value="task.id" v-for="task in unfinished_tasks" :key="task.id"> {{ task.description }} </option>
      </select>
      <select v-model="requirement2">
        <option value=""> - </option>
        <option :value="task.id" v-for="task in requirement2_tasks" :key="task.id"> {{ task.description }} </option>
      </select>
      <button @click="add_task">Add</button>
      <div class="is-italic is-small">A task should be less than an hour, consider breaking it up if it's longer</div>
      <br/>
      <button @click="delete_project" class="button is-danger" v-if="total_task_count == 0">Delete Project</button>
      <button disabled class="button is-danger disabled" v-else>Cannot Delete Project</button>
    </div>
  </div>
  <div v-else>
    Something went horribly wrong {{ project }}
  </div>
</template>

<script lang="ts">
import ChoreIconComponent from '@/components/ChoreIconComponent.vue';
import VueMermaidString from 'vue-mermaid-string'; // this is what causes the size bloat
import { defineComponent, computed } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";
import { AugmentedDbProject, DbTaskRaw, ProjectId, ProjectIdZ, TaskId, TaskIdZ } from '../../functions/db_types';

interface AnnotatedTask extends DbTaskRaw {
  requirement1_done: boolean;
  requirement1_desc: string;
  requirement2_done: boolean;
  requirement2_desc: string;
  added_by_name: string;
}

const annotated_tasks = computed((): AnnotatedTask[] => {
  const tasks = useUserStore().tasks;
  const household = useUserStore().household;
  if (household == null) {
    console.error("Failed to find household");
    return [];
  }
  const members = household.members;
  if (members == null) {
    console.error("Failed to find household members");
    return [];
  }
  const done_tasks = new Map(
    tasks.map((x) => [x.id, x.completed != null && x.completed > 0])
  )
  const task_names = new Map(
    tasks.map((x) => [x.id, x.description])
  )
  return tasks.map((x) => {
    const added_by = members.filter((m) => m.userid == x.added_by);
    return {
      requirement1_desc: x.requirement1 != null ? (task_names.get(x.requirement1) || "Unknown") : "",
      requirement1_done: x.requirement1 != null ? (done_tasks.get(x.requirement1) || false) : true,
      requirement2_desc: x.requirement2 != null ? (task_names.get(x.requirement2) || "Unknown") : "",
      requirement2_done: x.requirement2 != null ? (done_tasks.get(x.requirement2) || false) : true,
      added_by_name: (added_by.length > 0) ? added_by[0].name : "Unknown",
      ...x
    }
  })
});

const not_done_tasks = computed(() => {
  const tasks = annotated_tasks.value;
  return tasks.filter((x) => x.completed == null || x.completed == 0);
});

export default defineComponent({
  name: 'TaskView',
  data() {
    return {
      task_name: "",
      error: "",
      requirement1: "",
      requirement2: "",
    }

  },
  components: {
    ChoreIconComponent,
    VueMermaidString
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
    requirement2_tasks: function () {
      if (this.requirement1 == "null") return [];
      const req1 = (this as any).requirement1;
      // TODO: sort them according to what makes sense?
      return not_done_tasks.value.filter((x) => x.id != req1);
    },
    unfinished_tasks: function () {
      return not_done_tasks.value
    },
    total_task_count: function () {
      return annotated_tasks.value.length;
    },
    blocked_tasks: function () {
      return not_done_tasks.value.filter((x) => x.requirement1_done == false || x.requirement2_done == false)
    },
    done_tasks: function () {
      return annotated_tasks.value.filter((x) => x.completed != null && x.completed > 0)
    },
    diagram: () => {
      const graph = ["graph LR"]
      if (annotated_tasks.value.length == 0) {
        graph.push(" no[[No Tasks Yet]]")
      }
      annotated_tasks.value.forEach((x)=>{
        const id = x.id.substring(3);
        const description = x.description.replaceAll('"', "#quot;");

        if (x.completed!=null && x.completed > 0) {
          graph.push(` style ${id} fill:#9cb984;`)
          graph.push(` ${id}("${description}")`)
        }
        else {
          graph.push(` ${id}["${description}"]`)
        }
        graph.push(` click ${id} "#${x.id}"`)
      })
      annotated_tasks.value.forEach((x)=>{
        if (x.requirement1 != null){
          graph.push(` ${x.requirement1.substring(3)} --> ${x.id.substring(3)}`)
        }
        if (x.requirement2 != null){
          graph.push(` ${x.requirement2.substring(3)} --> ${x.id.substring(3)}`)
        }
      })
      const value = graph.join("\n");
      console.log(value)
      return value;
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
    delete_project: async function() {
      const status = await useUserStore().ProjectDelete(this.project_id);
      if (status.success == true) {
        this.$router.push("/projects");
        return;
      }
      else {
        this.error = (status as any).message || "unknown error";
      }
    },
    complete_task: async function (id: TaskId) {
      const status = await useUserStore().TaskComplete(id);
      if (status.success == true) {
        useUserStore().TasksFetch(this.project_id);
      }
      else {
        this.error = (status as any).message || "unknown error";
      }
    },
    delete_task: async function (id: TaskId) {
      const status = await useUserStore().TaskDelete(id);
      if (status.success == true) {
        useUserStore().TasksFetch(this.project_id);
      }
      else {
        this.error = (status as any).message || "unknown error";
      }
    },
    add_task: async function () {
      if (this.project_id == null) {
        this.error = "Unknown project";
        return;
      }
      const parse_req1 = TaskIdZ.safeParse(this.requirement1);
      const parse_req2 = TaskIdZ.safeParse(this.requirement2);
      const req1 = (parse_req1.success) ? parse_req1.data : null;
      const req2 = (parse_req2.success) ? parse_req2.data : null;
      const status = await useUserStore().TaskAdd(this.task_name, this.project_id, req1, req2);
      if (status.success == true) {
        useUserStore().TasksFetch(this.project_id);
        this.task_name = "";
        this.requirement1 = "";
        this.requirement2 = "";
      }
      else {
        this.error = (status as any).message || "unknown error";
      }
    }
  }
});
</script>