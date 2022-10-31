<template>
  <div class="home">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav>
    <button @click="signup">signup</button>
    <button @click="signout">Signout</button>
    <button @click="refresh">Refresh</button>
    {{ rick }}
    <hr />
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js App" />
  </div>
</template>

<script>
// @ is an alias to /src
import axios from "axios";
import HelloWorld from '@/components/HelloWorld.vue'

export default {
  name: 'HomeView',
  data() {
    return {
      rick: "Loading"
    }
  },
  components: {
    HelloWorld
  },
  mounted () {
    this.refresh()
  },
  methods: {
    signout: async function () {
      await axios.get("/api/logout");
      await this.refresh();
    },
    signup: async function () {
      await axios.get("/api/signup");
      await this.refresh();
    },
    refresh: async function () {
      this.rick = "TBF";
      try{
        const { data } = await axios.get("/api/rm/1");
        
        if (data != null && data['name'] != undefined) {
          this.rick = data["name"];
        }
      }
      catch (err) {
        this.rick = "API error";
      }
    },
  }
}
</script>
