<template>
  <div class="about container">
    <h1>This is an chores page</h1>
    <h2>Chores Per Day: {{ chores_per_day }}</h2>
    <article class="panel">
      <p class="panel-heading">
        Chores
      </p>
      <a class="panel-block" v-if="chores.length == 0">
        You don't have any favorites yet
      </a>
      <div class="panel-block" v-for="chore in chores" :key="chore.id">
        <span>{{ chore.name }} </span>
        <span>&nbsp;every {{ chore.frequency }} days</span>: Last done {{ lastDoneToTime(currentDate, chore.lastDone) }}
        <button @click="complete_chore(chore.id)">Complete</button>
        <button @click="delete_chore(chore.id)">Delete</button>
      </div>
    </article>
    <hr/>
    <input v-model="chore_name" placeholder="Chore name"/>
    <input v-model="chore_freq" type="number" placeholder="Chore name"/>
    <button @click="add_chore">Add</button>
  </div>
</template>


<script lang="ts">

import { defineComponent } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";

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
    // RecipePanelComponent
  },
  computed: {
    chores_per_day: function () {
      const chores = useUserStore().chores;
      if (chores == undefined) return 0;
      if (chores.length == 0) return 0;
      return (chores.map((x)=>1/x.frequency).reduce((prev,x)=>prev+x, 0)).toFixed(2);
    },
    ...mapState(useUserStore, ["userName", "chores", "currentDate"])
  },
  mounted: function () {
    useUserStore().ChoreFetch();
  },
  methods: {
    lastDoneToTime: function (currentDate: number, lastDone:number): string {
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
    delete_chore: async function(id:string) {
      const status = await useUserStore().ChoreDelete(id);
      if (status.success == false) {
        this.error = status.message
      }
    },
    complete_chore: async function(id:string) {
      const status = await useUserStore().ChoreComplete(id);
      if (status.success == false) {
        this.error = status.message
      }
    }
  }
});
</script>
