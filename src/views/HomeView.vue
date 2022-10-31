<template>
  <div class="home">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link> |
      <router-link to="/signup">Signup</router-link> |
      <router-link to="/login">Login</router-link> |
      <a href="/magic_link">Magic Link</a>
    </nav>
    <input type="text" v-model="name" placeholder="Your name"/>
    <button @click="signup">signup as {{name}}</button>
    <button @click="signout">Signout</button>
    <button @click="refresh">Refresh {{count}}</button>
    <button @click="count--">-</button>
    <button @click="count++">+</button>
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
      name: "Matthew",
      rick: "Loading",
      count:0,
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
      const data = {
        name: this.name
      }
      await axios.post("/api/signup", data);
      await this.refresh();
    },
    refresh: async function () {
      try{
        const { data } = await axios.get("/api/rm/"+this.count);
        
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
