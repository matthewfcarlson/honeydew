<template>
    <span class="icon is-large" :style="{height: height}">
        <span class="fa-stack fa-lg">
            <i :style=styles class="fas fa-circle fa-stack-2x"></i>
            <i :class=classes></i>
        </span>
    </span>
</template>

<script lang="ts">
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
    name: 'TaskIcon',
    props: {
        task_name: {
            type: String,
            default: "",
        },
        height: {
            type: String,
            default: "2.5em",
        }
    },
    computed: {
        color: function() {
            // TODO: generate color based on name?
            return "#003366"
        },
        icon: function() {
            if (this.task_name == "") {
                return "fa-carrot"
            }
            const task_name = this.task_name.trim().toLowerCase();
            if (task_name.includes("toilet")||task_name.includes("toliet")) return "fa-toilet";
            if (task_name.includes("dust")) return "fa-broom";
            if (task_name.includes("paint")) return "fa-paint-roller";
            if (task_name.includes("shower")) return "fa-shower";
            if (task_name.includes("tesla")) return "fa-car";
            if (task_name.includes("couch")||task_name.includes("sofa")||task_name.includes("sectional")) return "fa-couch";
            if (task_name.includes("water")) return "fa-tint";
            if (task_name.includes("truck")) return "fa-truck";
            if (task_name.includes("shampoo")) return "fa-wine-bottle";
            if (task_name.includes("tree")) return "fa-tree";
            if (task_name.includes("leftovers")) return "fa-drumstick-bite";
            if (task_name.includes("HVAC")) return "fa-air-freshener";
            if (task_name.includes("schedule")) return "fa-calendar-day";
            if (task_name.includes("closet")) return "fa-door-closed";
            if (task_name.includes("tighten")) return "fa-screwdriver";
            if (task_name.includes("organize")||task_name.includes("tide")) return "fa-sitemap";
            if (task_name.includes("sink")) return "fa-sink";
            if (task_name.includes("freezer")) return "fa-snowflake";
            if (task_name.includes("garage")) return "fa-warehouse";
            if (task_name.includes("vacuum")) return "fa-blender-phone";
            if (task_name.includes("fridge")) return "fa-temperature-low";
            if (task_name.includes("recycl")) return "fa-recycle";
            // make sure the dog bowl is higher
            if (task_name.includes("dog bowl")) return "fa-paw";
            if (task_name.includes(" cat") || task_name.includes("cat ")) return "fa-cat";
            if (task_name.includes("dog")) return "fa-dog";
            if (task_name.includes("fan")) return "fa-fan";
            if (task_name.includes("chair")) return "fa-chair";
            if (task_name.includes("faucet")) return "fa-faucet";
            if (task_name.includes("pool")) return "fa-swimming-pool";
            if (task_name.includes("lightbulb")) return "fa-lightbulb";
            if (task_name.includes("sheets")) return "fa-bed";
            if (task_name.includes("sweep")) return "fa-broom";
            if (task_name.includes("fix")) return "fa-wrench";
            if (task_name.includes("lawn")) return "fa-seedling";
            if (task_name.includes("weed")) return "fa-seedling";
            if (task_name.includes("bath")) return "fa-bath";
            if (task_name.includes("laundry")) return "fa-tshirt";
            if (task_name.includes("silverware")) return "fa-utensils";
            if (task_name.includes("trash") || task_name.includes("garbage")) return "fa-trash";
            if (task_name.includes("filter")) return "fa-head-side-mask";
            if (task_name.includes("mop")) return "fa-paint-brush";
            if (task_name.includes("pledge")) return "fa-lemon";
            if (task_name.includes("leash")) return "fa-leash";
            if (task_name.includes("bed")) return "fa-bed";
            if (task_name.includes(" car")||task_name.includes("car ")) return "fa-car";
            if (task_name.includes("wash")) return "fa-pump-soap";
            if (task_name.includes("clean")) return "fa-soap";
            return "fa-hand-sparkles";
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
