<template>
    <div class="container">
      <section class="section">
        <p class="title">Signup</p>
        <p class="subtitle">Create a new account</p>
      </section>
      <section class="hero">
        <div v-if="isLoggedIn == false">
          <div class="field m-1">
            <label class="label">Your Name</label>
            <div class="field-body">
              <div class="field has-addons">
                <div class="control has-icons-left is-expanded">
                  <input :disabled="thinking" type="text" v-model="name" placeholder="Your name" class="input" />
                  <span class="icon is-small is-left">
                    <i class="fa-regular fa-user"></i>
                  </span>
                </div>
                <div class="control">
                  <a disabled v-if="thinking" class="button is-primary">
                    Thinking
                  </a>
                  <a v-else @click="press_signup" class="button is-primary">
                    Create
                  </a>
                </div>
              </div>
            </div>
            <p class="help is-danger" v-if="error.length != 0">{{ error }}</p>
          </div>
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
          You're already signed in!
          <a href="/">Go Home</a>
        </div>
      </section>
    </div>
  </template>
  
  <script lang="ts">
  
  import { useUserStore } from "@/store";
  import { mapActions, mapState } from "pinia";
  import { defineComponent } from 'vue';
  
  export default defineComponent({
    name: 'SignupView',
    data() {
      return {
        name: "",
        error: "",
        invite_data: new URLSearchParams(window.location.search).get('k') || '',
        thinking: false,
        recovery_code: 
      }
  
    },
    computed: {
      ...mapState(useUserStore, ["isLoggedIn"])
    },
    methods: {
      ...mapActions(useUserStore, ["signUp"]),
      press_signup: async function () {
        this.thinking = true;
        this.error = "";
        const result = await this.signUp(this.name, this.invite_data);
        console.log(result);
        if (result.status == "error") {
          this.error = result.message;
        }
        this.thinking = false;
      },
    }
  
  });
  
  </script>