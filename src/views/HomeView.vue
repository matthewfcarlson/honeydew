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
    <p>{{jwt}}</p>
    <pre>{{invite_link}}</pre>
    <button v-if="invite_link == ''" @click="get_invite">No invite link</button>
    <a v-else :href="invite_link">Invite Link</a>
    <hr />
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js App" />
  </div>
</template>

<script lang="ts">

import axios from "axios";
import { defineComponent } from 'vue';
import HelloWorld from '@/components/HelloWorld.vue'; // @ is an alias to /src

export default defineComponent({
  name: 'HomeView',
  components: {
    HelloWorld,
  },
  data() {
    return {
      name: "Matthew",
      rick: "Loading",
      count:0,
      jwt:"",
      invite_link: "",
    }

  },
  mounted () {
    this.refresh()
  },
  methods: {
    signout: async function () {
      await axios.get("/api/logout");
      await this.refresh();
      this.invite_link = "";
    },
    signup: async function () {
      const data = {
        name: this.name,
        //household:"b86eab0a-e4c0-4d1f-9b56-d2cb5cfd9649",
        //housekey:"8ed3f853-2b5d-48d6-9305-a81accbad87f",
      }
      await axios.post("/api/signup", data);
      await this.refresh();
      this.invite_link = "";
    },
    get_invite: async function () {
      const invite = await axios.get("/api/household/invite");
      if ("link" in invite.data){
        this.invite_link = invite.data.link;
      }
    },
    refresh: async function () {
      try{
        const me = await axios.get("/api/me");
        this.jwt = JSON.stringify(me.data);
        const { data } = await axios.get("/api/rm/"+this.count);
        
        if (data != null && data['name'] != undefined) {
          this.rick = data["name"];
        }
      }
      catch (err) {
        this.jwt = "";
        this.rick = "API error";
      }
    },
  }
});
</script>
