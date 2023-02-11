<template>
    <div class="container">
      <section class="section">
        <p class="title">Recovery</p>
        <p class="subtitle">Recover an account that has been lost.</p>
      </section>
      <section class="hero">
        <div v-if="isLoggedIn == false">
          <div class="field m-3">
          <label class="label">Recovery Key</label>
          <div class="field-body">
            <div class="field has-addons">
              <div class="control has-icons-left is-expanded">
                <input :disabled="thinking" type="text" v-model="name" placeholder="Your recovery key" class="input" />
                <span class="icon is-small is-left">
                  <i class="fas fa-key"></i>
                </span>
              </div>
              <div class="control">
                <a disabled v-if="thinking" class="button is-primary">
                  Thinking
                </a>
                <a v-else @click="press_signup" class="button is-success">
                  Recover
                </a>
              </div>
            </div>
          </div>
          <p class="help is-danger" v-if="error.length != 0">{{ error }}</p>
        </div>
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
  import { mapState } from "pinia";
  import { defineComponent } from 'vue';
  
  export default defineComponent({
    name: 'SignupView',
    data() {
      return {
        name: "",
        error: "",
        invite_data: new URLSearchParams(window.location.search).get('k') || '',
        recovery_code: "",
      }
  
    },
    computed: {
      ...mapState(useUserStore, ["isLoggedIn", "thinking"])
    },
    methods: {
      press_signup: async function () {
        this.error = "NOT IMPLEMENTED YET";
      },
    }
  
  });
  
  </script>