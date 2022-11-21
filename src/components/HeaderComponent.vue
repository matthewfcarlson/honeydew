<template>
    <nav class="navbar" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <a class="navbar-item" href="/">
                <img src="/images/text_logo.png" width="142">
            </a>

            <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false"
                data-target="navbarBasicExample">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>
        </div>

        <div id="navbarBasicExample" class="navbar-menu">
            <div class="navbar-start">
                <template v-if="isLoggedIn">

                    <router-link to="meals" class="navbar-item">
                        Meals
                    </router-link>

                    <router-link to="chores" class="navbar-item">
                        Chores
                    </router-link>

                    <router-link to="projects" class="navbar-item">
                        Projects
                    </router-link>
                </template>
                <router-link to="about" class="navbar-item">
                    About
                </router-link>

            </div>

            <div class="navbar-end">
                <div class="navbar-item">
                    <div class="buttons">
                        <template v-if="isLoggedIn">
                            <router-link to="household" class="button is-link is-outlined">
                                <span class="icon is-small">
                                    <i class="fas fa-people-roof"></i>
                                </span>
                                <strong>Profile</strong>
                            </router-link>
                            <router-link to="signout" class="button is-warning">
                                <span class="icon is-small">
                                    <i class="fas fa-arrow-right-from-bracket"></i>
                                </span>
                                <strong>Logout</strong>
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
        </div>
    </nav>
</template>

<script lang="ts">

import { useUserStore } from "@/store";
import { mapState } from "pinia";
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'HeaderComponent',
    data() {
        return {
        }

    },
    computed: {
        ...mapState(useUserStore, ["isLoggedIn"])
    },
    methods: {
    }

});

</script>