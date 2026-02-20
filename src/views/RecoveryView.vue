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
                <input :disabled="thinking" type="text" v-model="recovery_input" placeholder="U:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" class="input" />
                <span class="icon is-small is-left">
                  <i class="fas fa-key"></i>
                </span>
              </div>
              <div class="control">
                <a disabled v-if="thinking" class="button is-primary">
                  Thinking
                </a>
                <a v-else @click="press_recover" class="button is-success">
                  Recover
                </a>
              </div>
            </div>
          </div>
          <p class="help">Enter your recovery key in the format: user_id:recovery_key</p>
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
  import { mapActions, mapState } from "pinia";
  import { defineComponent } from 'vue';

  export default defineComponent({
    name: 'RecoveryView',
    data() {
      return {
        recovery_input: new URLSearchParams(window.location.search).get('k') || '',
        error: "",
      }
    },
    computed: {
      ...mapState(useUserStore, ["isLoggedIn", "thinking"])
    },
    methods: {
      ...mapActions(useUserStore, ["recover"]),
      press_recover: async function () {
        this.error = "";
        const input = this.recovery_input.trim();
        if (input.length == 0) {
          this.error = "Please enter your recovery key";
          return;
        }

        // Format is user_id:recovery_key where user_id is like U:uuid
        // So the full format is U:uuid:recovery_key_uuid
        // We need to split on the second colon
        const firstColon = input.indexOf(':');
        if (firstColon == -1) {
          console.warn("[Recovery] No colon found in input. Input length:", input.length);
          this.error = "Invalid recovery key format. Expected format: U:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
          return;
        }
        const secondColon = input.indexOf(':', firstColon + 1);
        if (secondColon == -1) {
          console.warn("[Recovery] Only one colon found. Prefix:", input.substring(0, firstColon), "Input length:", input.length);
          this.error = "Invalid recovery key format: only found one colon. Expected format: U:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
          return;
        }

        const user_id = input.substring(0, secondColon);
        const recovery_key = input.substring(secondColon + 1);

        if (user_id.length == 0 || recovery_key.length == 0) {
          console.warn("[Recovery] Empty user_id or recovery_key after parsing. user_id length:", user_id.length, "recovery_key length:", recovery_key.length);
          this.error = "Invalid recovery key format: user ID or recovery key is empty";
          return;
        }

        console.log("[Recovery] Attempting recovery. user_id:", user_id, "recovery_key length:", recovery_key.length);
        const result = await this.recover(user_id, recovery_key);
        if (result.success) {
          console.log("[Recovery] Recovery successful, redirecting to home");
          window.location.href = "/";
        } else {
          console.warn("[Recovery] Recovery failed:", result.message);
          this.error = result.message;
        }
      },
    }
  });

  </script>
