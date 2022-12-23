<template>
  <div class="container">
    <section class="section maxh-25vh" v-if="!isLoggedIn">
      <p class="title">Signup</p>
      <p class="subtitle">Create a new account</p>
    </section>
    <section class="section" v-else>
      <p class="title">Welcome, {{ userName }}!</p>
      <p class="subtitle">To Honeydew</p>
    </section>
    <section class="hero">
      <div v-if="recovery_code">
        <p>Please write down this recovery code as it is the only way to get back into your account if you lose access
          to it</p>
        <div class="box">
          <p class="title">Recovery code: {{ recovery_code }}</p>
          <button @click=copyRecoveryCode class="button is-primary">Click To Copy To Clipboard</button>
          <p class="help is-danger" v-if="error.length != 0">{{ error }}</p>
        </div>
        <a href="/">Go Home</a>
      </div>
      <div v-else-if="isLoggedIn == false">
        <form ref="signup-form">
          <div class="field m-3">
            <label class="label">Your Name</label>
            <div class="field-body">
              <div class="field has-addons">
                <div class="control has-icons-left is-expanded">
                  <input :disabled="thinking" type="text" name="name" v-model="name" placeholder="Your name" class="input" />
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
          <cfturnstile
            :sitekey="turnstile_sitekey"
            @verify="turnstile_verify"
          />
        </form>
        <div v-if="invite_data.length == 0">
          <p>We'll create a new household for you that can invite as many people as you'd like.</p>
        </div>
        <div v-else>
          <p><b>You'll be joining an existing household since you are coming from an invite link</b></p>
        </div>
        <p>Already have an account? Go to a device you're signed in on and generate a magic key.</p>
        <p>Or if you are trying to recover your account, you <a href="/recover">can do that here</a>.</p>
      </div>
      <div v-else>
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
import Turnstile from 'cfturnstile-vue3';

export default defineComponent({
  name: 'SignupView',
  components: {
    "cfturnstile": Turnstile
  },
  data() {
    return {
      name: "",
      error: "",
      invite_data: new URLSearchParams(window.location.search).get('k') || '',
      thinking: false,
      recovery_code: "",
      turnstile_sitekey: "0x4AAAAAAABtOYbnvjMckFhC",
      turnstile_response: '',
    }

  },
  computed: {
    ...mapState(useUserStore, ["isLoggedIn", "userName"])
  },
  methods: {
    ...mapActions(useUserStore, ["signUp"]),
    turnstile_verify: function (token:string) {
      this.turnstile_response = token;
    },
    copyRecoveryCode: async function () {
      try {
        await navigator.clipboard.writeText(this.recovery_code);
      }
      catch {
        this.error = "Could not copy to clipboard";
      }
    },
    press_signup: async function () {
      if (this.$refs["signup-form"] == undefined) {
        this.error="Unable to find form";
        return;
      }
      this.thinking = true;
      this.error = "";
      const result = await this.signUp(this.name, this.invite_data, this.turnstile_response);
      if (result.success) {
        this.recovery_code = `${result.data.user_id}:${result.data.recovery_key}`;
      }
      else {
        this.error = result.message;
      }
      this.thinking = false;
    },
  }

});

</script>