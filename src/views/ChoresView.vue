<template>
  <div class="chores container">
    <div class="title is-4">Chores</div>
    <h2>Your Chores Per Day: {{ chores_per_day }}</h2>
    <progress class="progress" :class="your_chores_progress_status" :value="chores_per_day" max="1">{{
      chores_per_day
    }}</progress>
    <h2>Household Chores Per Day Per Person ({{ household_members.length }}): {{ chores_per_day_per_pers }}</h2>
    <progress class="progress" :value="chores_per_day_per_pers" max="1"
      :class="household_chores_progress_status">60%</progress>

    <a class="box" v-if="chores.length == 0">
      You don't have any chores yet
    </a>
    <div class="box" v-for="chore in chores" :key="chore.id">
      <div class>
        <TaskIconComponent :task_name="chore.name"/>
        <span class="title is-5">{{ chore.name }}</span>
        <span class="subtitle is-6"> every {{ chore.frequency }} days </span>
        <span> Last Done {{
          lastDoneToTime(currentDate, chore.lastDone)
        }}
        </span>
      </div>
      <button @click="complete_chore(chore.id)">Mark Done Today</button>
      <button @click="delete_chore(chore.id)">Delete</button>
      Assign to:
      <button @click="assign_chore(chore.id, null)">Anyone</button>
      <button v-for="member in household_members" :key="member.userid" @click="assign_chore(chore.id, member.userid)">{{
        member.name
      }}</button>
      {{ chore.doneByName }}
    </div>
    <hr />
    <div class="box">
      <div>Add a new chore to be done every {{ chore_freq }} days</div>
      <input v-model="chore_name" placeholder="Chore name" />
      <input v-model="chore_freq" type="number" placeholder="Chore name" />
      <button @click="add_chore">Add</button>
    </div>
  </div>
</template>


<script lang="ts">

import { defineComponent, computed } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";
import TaskIconComponent from '@/components/TaskIconComponent.vue';

const household_members = computed(() => {
  const household = useUserStore().household;
  if (household == null) return []
  else return household.members;
});
const chores_per_day = computed(() => {
  const chores = useUserStore().chores;
  if (chores == undefined) return 0;
  if (chores.length == 0) return 0;
  return (chores.map((x) => 1 / x.frequency).reduce((prev, x) => prev + x, 0));
});
const my_chores_per_day = computed(() => {
  const chores = useUserStore().chores;
  const user_id = useUserStore().userId;
  const num_household_members = household_members.value.length;
  if (chores == undefined) return 0;
  if (chores.length == 0) return 0;
  const my_chores = chores.filter((x) => x.doneBy == null || x.doneBy == user_id)
  return (my_chores.map((x) => (1 / x.frequency) / (x.doneBy == null ? num_household_members : 1)).reduce((prev, x) => prev + x, 0));
});

export default defineComponent({
  name: 'ChoreView',
  data() {
    return {
      chore_name: "",
      chore_freq: "1",
      error: "",
    }

  },
  components: {
    TaskIconComponent
  },
  computed: {
    your_chores_progress_status: function () {
      if (my_chores_per_day.value > 1) return "is-danger";
      return "is-info";
    },
    household_chores_progress_status: function () {
      const count = chores_per_day.value / household_members.value.length
      if (count > 1) return "is-danger";
      return "is-success";
    },
    household_members: function () {
      return household_members.value;
    },
    chores_per_day: function () {
      return my_chores_per_day.value.toFixed(2);
    },
    chores_per_day_per_pers: function () {
      return (chores_per_day.value / household_members.value.length).toFixed(2);
    },
    ...mapState(useUserStore, ["userName", "chores", "currentDate", "household", "userId", "currentChore"])
  },
  mounted: function () {
    useUserStore().ChoreFetch();
  },
  methods: {
    assign_chore: async function (chore_id: string, user_id: string | null) {
      console.log(chore_id, event);
      const status = await useUserStore().ChoreAssign(chore_id, user_id);
      if (status.success == false) {
        this.error = status.message;
      }
    },
    lastDoneToTime: function (currentDate: number, lastDone: number): string {
      const diff = currentDate - lastDone;
      if (diff < 0) return "The Future?"
      if (diff == 0) return "Today"
      if (diff == 1) return "Yesterday"
      if (diff < 30) return `${diff} days`
      return "a while"
    },
    add_chore: async function () {
      const chore_frequency = Number(this.chore_freq);
      if (Number.isNaN(chore_frequency)) {
        this.error = "Frequency must be a number";
        return;
      }
      const status = await useUserStore().ChoreAdd(this.chore_name, chore_frequency);
      if (status.success == true) {
        this.chore_name = "";
        this.chore_freq = "1";
      }
      else {
        this.error = status.message;
      }
    },
    delete_chore: async function (id: string) {
      const status = await useUserStore().ChoreDelete(id);
      if (status.success == false) {
        this.error = status.message
      }
    },
    complete_chore: async function (id: string|null) {
      if (id == null) {
        this.error="Chore ID is null";
        return;
      }
      const status = await useUserStore().ChoreComplete(id);
      if (status.success == false) {
        this.error = status.message
      }
    }
  }
});
</script>
