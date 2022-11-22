<template>
    <span class="icon is-large" :style="{height: height}">
        <span class="fa-stack fa-lg">
            <i :style=styles class="fas fa-circle fa-stack-2x"></i>
            <i :class=classes></i>
        </span>
    </span>
</template>
  
<script lang="ts">
//import type { AuthHouseholdMember } from 'functions/auth/auth_types';
import { useUserStore } from '@/store';
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'UserIcon',
    props: {
        color: {
            type: String,
            default: "",
        },
        icon: {
            type: String,
            default:""
        },
        height: {
            type: String,
            default: "2.5em",
        }
    },
    computed: {
        classes: function () {
            let icon = this.icon;
            if (icon == "") {
                const data = useUserStore().userIconColor;
                console.log(data)
                if (data != null) icon = data[0];
                else icon = "fa-carrot"
            }
            return [icon, "fas", "fa-stack-1x", "fa-inverse"]
        },
        styles: function () {
            let color = this.color;
            if (color == "") {
                const data = useUserStore().userIconColor;
                console.log(data)
                if (data != null) color = data[1];
                else color = "#003366"
            }
            return {color}
        },
    }
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
  