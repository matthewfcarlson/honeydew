<template>
    <nav class="navbar" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <router-link class="navbar-item" to="/">
                <img src="/images/text_logo.png" width="142">
            </router-link>

            <a role="button" class="navbar-burger" @click="handleBurger" :class="{'is-active':burgerOut}" aria-label="menu" aria-expanded="false"
                data-target="navbarBasicExample">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>
        </div>

        <div id="navbarBasicExample" class="navbar-menu" :class="{'is-active':burgerOut}">
            <div class="navbar-start">
                <template v-if="isLoggedIn">

                    <router-link to="recipes" class="navbar-item">
                        <i class="fa-solid fa-utensils"></i>&nbsp;
                        Meals
                    </router-link>

                    <router-link to="chores" class="navbar-item">
                        <i class="fa-solid fa-hand-sparkles"></i>&nbsp;
                        Chores
                    </router-link>

                    <router-link to="projects" class="navbar-item">
                        <i class="fa-solid fa-hammer"></i>&nbsp;
                        Projects
                    </router-link>
                </template>
                <template v-else>
                    <router-link to="about" class="navbar-item">
                        <i class="fa-solid fa-circle-info"></i>&nbsp;
                        About
                    </router-link>
                </template>

            </div>

            <div class="navbar-end">
                <div class="navbar-item">
                    <template v-if="isLoggedIn">
                        <router-link to="household" class="is-flex is-align-items-center user-name-item">
                            <strong>{{ userName }}</strong>
                            <UserIcon height="2.5em" />
                        </router-link>
                    </template>
                    <template v-else>
                        <router-link to="signup" class="button is-primary">
                            <span class="icon is-small">
                                <i class="fa-solid fa-user-plus"></i>
                            </span>
                            <strong>Sign up</strong>
                        </router-link>
                    </template>
                </div>
            </div>
        </div>
    </nav>
</template>

<script lang="ts">

import { useUserStore } from "@/store";
import { mapState } from "pinia";
import { defineComponent } from 'vue';
import UserIcon from "./UserIconComponent.vue";

export default defineComponent({
    name: 'HeaderComponent',
    components: {
        UserIcon
    },
    data() {
        return {
            burgerOut: false
        }

    },
    computed: {
        ...mapState(useUserStore, ["isLoggedIn", "userName"])
    },
    methods: {
        handleBurger: function() {
            this.burgerOut = !this.burgerOut;
        },
    }

});

</script>

  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.user-name-item strong {
    color: #363636;
    font-size: 1.2rem;
}

nav {
    margin-bottom: 1rem;
    box-shadow: 0 0.5em 1em -0.125em rgb(10 10 10 / 10%), 0 0px 0 1px rgb(10 10 10 / 2%);
}
</style>