<template>
  <div class="signup">
    <h1>This is an signup page</h1>
    <div v-if="signed_up == false">
      <input :disabled="thinking" type="text" v-model="name" placeholder="Your name" />
      <button :disabled="thinking" @click="signup">signup as {{ name }}</button>
      <div class="text-red" v-if="error.length != 0">{{error}}</div>
      <div v-if="invite_data.length == 0">
        <p>We'll create a new household for you that can invite as many people as you'd like.</p>
      </div>
      <div v-else>
        <p><b>You'll be joining an existing household since you are coming from an invite link</b></p>
      </div>
      <p>Already have an account? Go to a device you're signed in on and generate a magic key.</p>
    </div>
    <div v-else>
      Welcome to Honeydew!
    </div>
    <router-link to="/">Home</router-link>
    <a href="/api/logout">Signout</a>
  </div>
</template>

<script lang="ts">

import axios from "axios";
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SignupView',
  data() {
    return {
      name: "",
      error: "",
      invite_data: new URLSearchParams(window.location.search).get('k') || '',
      thinking: false,
      signed_up:((window as any).logged_in||false),
    }

  },
  methods: {
    signup: async function () {
      try {
        this.thinking = true;
        const data = {
          name: this.name,
          //household:"b86eab0a-e4c0-4d1f-9b56-d2cb5cfd9649",
          //housekey:"8ed3f853-2b5d-48d6-9305-a81accbad87f",
        }
        await axios.post("/api/signup", data);
        this.signed_up = true;
      }
      catch(err) {
        console.error(err.response.data);
        this.error = err.response.data.message || "Unknown error occurerd";
      }
      this.thinking = false;
    },
  }

});

</script>