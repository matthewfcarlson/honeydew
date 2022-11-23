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

const hexToRgb = (hex:string) => {
  return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m:string, r:string, g:string, b:string) => `#${r + r + g + g + b + b}`).substring(1).match(/.{2}/g)?.map(x => parseInt(x, 16))
}

// Determine relation of luminance in color
const luminance = (r:number, g:number, b:number) => {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928
      ? v / 12.92
      : ((v + 0.055) / 1.055) ** 2
  })

  return (a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722)
}

export default defineComponent({
    name: 'UserIcon',
    props: {
        raw_color: {
            type: String,
            default: "",
        },
        raw_icon: {
            type: String,
            default:""
        },
        height: {
            type: String,
            default: "2.5em",
        }
    },
    computed: {
        color: function() {
            if (this.raw_color == "") {
                const data = useUserStore().userIconColor;
                if (data != null) return data[1];
                return "#003366"
            }
            return this.raw_color;
        },
        icon: function() {
            if (this.raw_icon == "") {
                const data = useUserStore().userIconColor;
                if (data != null) return data[0];
                return "fa-carrot"
            }
            return this.raw_icon;
        },
        classes: function () {
            let icon = this.icon;
            let rgb = hexToRgb(this.color) || [0,0,0];
            const color_dark = luminance(rgb[0], rgb[1], rgb[2]) < 0.5;
            const text_class = (color_dark) ? "icon-regular":"icon-inverted";
            return [icon, text_class, "fas", "fa-stack-1x", "fa-inverse"]
        },
        styles: function () {
            let color = this.color;
            return {color}
        },
    }
});
</script>
  
  <!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.icon-inverted {
    color:rgba(0,0,0,.7);
}
.icon-regular {
    color:white;
}
</style>
  