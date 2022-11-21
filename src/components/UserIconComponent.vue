<template>
    <div class="hello">
        User Icon goes here
    </div>
</template>
  
<script lang="ts">
//import type { AuthHouseholdMember } from 'functions/auth/auth_types';
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'UserIcon',
    props: {
        user: {
            type: String,
        }
    },
});
</script>
  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
    margin: 40px 0 0;
}

ul {
    list-style-type: none;
    padding: 0;
}

li {
    display: inline-block;
    margin: 0 10px;
}

a {
    color: #42b983;
}
</style>
  