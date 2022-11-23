<template>
  <HeaderComponent />
  <router-view />
  <FooterComponent />
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import FooterComponent from '@/components/FooterComponent.vue'; // @ is an alias to /src
import HeaderComponent from './components/HeaderComponent.vue';
export default defineComponent({
  name: 'App',
  components: {
    HeaderComponent,
    FooterComponent,
  },
});
</script>

<style>
/* #app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
} */

/* nav a.router-link-exact-active {
  color: #42b983;
} */
</style>

<style lang="scss">
@charset "utf-8";
@import "./assets/variables.scss";

// Sailwind (Tailwind in SASS)
@each $space in $sailwind_sizes {
  .m-#{$space} {
    margin: #{$space/4}rem;
  }

  .mx-#{$space} {
    margin-left: #{$space/4}rem;
    margin-right: #{$space/4}rem;
  }

  .my-#{$space} {
    margin-top: #{$space/4}rem;
    margin-bottom: #{$space/4}rem;
  }

  .px-#{$space} {
    padding-left: #{$space/4}rem;
    padding-right: #{$space/4}rem;
  }

  .py-#{$space} {
    padding-top: #{$space/4}rem;
    padding-bottom: #{$space/4}rem;
  }

  .p-#{$space} {
    padding: #{$space/4}rem;
  }

  @each $side in $sides {
    .m#{str-slice($side, 0, 1)}-#{$space} {
      margin-#{$side}: #{$space/4}rem;
    }

    .p#{str-slice($side, 0, 1)}-#{$space} {
      padding-#{$side}: #{$space/4}rem;
    }
  }
}

@each $name, $hex in $sailwind_colors {
  .text-#{$name} {
    color: $hex;
  }
  .bg-#{$name} {
    background-color: $hex;
  }
}

@each $weight in $sailwind_weights {
  .fw-#{$weight} {
    font-weight: $weight !important;
  }
}

@each $perc in $sailwind_percents {
  .maxh-#{$perc}vh {
    max-height: #{$perc}vh;
  }
  .maxw-#{$perc}vw {
    max-width: #{$perc}vw;
  }
}

$primary: map-get($map: $sailwind_colors, $key: 'primary');
$success: map-get($map: $sailwind_colors, $key: 'success');
$info: map-get($map: $sailwind_colors, $key: 'info');
$link: map-get($map: $sailwind_colors, $key: 'link');
$warning: map-get($map: $sailwind_colors, $key: 'warning');
$danger: map-get($map: $sailwind_colors, $key: 'danger');
// // Update Bulma's global variables
$family-sans-serif: "Nunito", BlinkMacSystemFont, -apple-system, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
// // $background: $beige;
// // Text color
// $grey-dark: $brown-dark;
// $grey-light: $brown-light;
// // Button colors
// $primary: $green-dark;
// $info: $green-dark;
// $link: $green-light;
// $warning: $green-light;
// $danger: #ff0000;

// // Update some of Bulma's component variables
// // $body-background-color: $beige;
// $control-border-width: 2px;
// $input-border-color: transparent;
// $input-shadow: none;

// // Import only what you need from Bulma
// @import "../node_modules/bulma/sass/utilities/_all.sass";
// @import "../node_modules/bulma/sass/base/_all.sass";
// @import "../node_modules/bulma/sass/elements/button.sass";
// @import "../node_modules/bulma/sass/elements/container.sass";
// @import "../node_modules/bulma/sass/elements/title.sass";
// @import "../node_modules/bulma/sass/form/_all.sass";
// @import "../node_modules/bulma/sass/components/navbar.sass";
// @import "../node_modules/bulma/sass/layout/hero.sass";
// @import "../node_modules/bulma/sass/layout/section.sass";
// Import a Google Font
@import url('https://fonts.googleapis.com/css?family=Nunito:200,400,700');
@import "../node_modules/bulma/bulma.sass";
</style>
