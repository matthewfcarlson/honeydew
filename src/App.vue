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
#app {
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
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>

<style lang="scss">
@charset "utf-8";
// Import a Google Font
@import url('https://fonts.googleapis.com/css?family=Nunito:400,700');
@import "../node_modules/bulma/bulma.sass";

// Sailwind (Tailwind in SASS)
$sailwind_sizes: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 18,
  20,24, 32, 40, 42, 50, 56;

@each $size in $sailwind_sizes {
  .m-#{$size} {
    margin: #{$size}rem;
  }

  .mx-#{$size} {
    margin-left: #{$size}rem;
    margin-right: #{$size}rem;
  }

  .my-#{$size} {
    margin-top: #{$size}rem;
    margin-bottom: #{$size}rem;
  }

  .mt-#{$size} {
    margin-top: #{$size}rem;
  }

  .mr-#{$size} {
    margin-right: #{$size}rem;
  }

  .mb-#{$size} {
    margin-bottom: #{$size}rem;
  }

  .ml-#{$size} {
    margin-left: #{$size}rem;
  }

  .p-#{$size} {
    padding: #{$size}rem;
  }

  .px-#{$size} {
    padding-left: #{$size}rem;
    padding-right: #{$size}rem;
  }

  .py-#{$size} {
    padding-top: #{$size}rem;
    padding-bottom: #{$size}rem;
  }

  .pt-#{$size} {
    padding-top: #{$size}rem;
  }

  .pr-#{$size} {
    padding-right: #{$size}rem;
  }

  .pb-#{$size} {
    padding-bottom: #{$size}rem;
  }

  .pl-#{$size} {
    padding-left: #{$size}rem;
  }

}

// // Set your brand colors
// $green-light: #e9edc9;
// $green-dark: #ccd5ae;
// $beige: #f0ead2;
// $brown-light: #faedcd;
// $brown-dark: #d4a373;

// // Update Bulma's global variables
// $family-sans-serif: "Nunito", sans-serif;
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
</style>
