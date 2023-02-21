<template>
    <span :class="{icon:is_icon, 'is-large': is_icon}" :style="{height: height}">
        <span class="fa-stack fa-lg" v-if="have_circle">
            <i :style=styles class="fas fa-circle fa-stack-2x"></i>
            <i :class=classes></i>
        </span>
        <i :class=classes v-else></i>
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

function hashCode(str: string): number {
    var h: number = 0;
    for (var i = 0; i < str.length; i++) {
        h = 31 * h + str.charCodeAt(i);
    }
    return h % 0xFFFFFFFF
}

// TODO: make this in a common place
export const chore_colors = [
  "#76C4AE",
  "#9FC2BA",
  "#BEE9E4",
  "#7CE0F9",
  "#CAECCF",
  "#D3D2B5",
  "#CABD80",
  "#E1CEB1",
  "#DDB0A0",
  "#D86C70",
]

export default defineComponent({
    name: 'ChoreIcon',
    props: {
        chore_name: {
            type: String,
            default: "",
        },
        height: {
            type: String,
            default: "2.5em",
        },
        is_icon: {
            type: Boolean, 
            default: true,
        },
        have_circle: {
            type: Boolean,
            default: true
        }
    },
    computed: {
        color: function() {
            // TODO: generate color based on name?
            if (this.chore_name == "") return "#003366";
            const chore_index = hashCode(this.chore_name);
            const color = chore_colors[chore_index % chore_colors.length];
            console.log(chore_index, color)
            return color;
        },
        icon: function() {
            if (this.chore_name == "") {
                return "fa-carrot"
            }
            const chore_name = this.chore_name.trim().toLowerCase();
            if (chore_name.includes("toilet")||chore_name.includes("toliet")) return "fa-toilet";
            if (chore_name.includes("dust")) return "fa-broom";
            if (chore_name.includes("paint")) return "fa-paint-roller";
            if (chore_name.includes("shower")) return "fa-shower";
            if (chore_name.includes("tesla")) return "fa-car";
            if (chore_name.includes("couch")||chore_name.includes("sofa")||chore_name.includes("sectional")) return "fa-couch";
            if (chore_name.includes("water")) return "fa-tint";
            if (chore_name.includes("outlet")) return "fa-plug";
            if (chore_name.includes("electrical")) return "fa-bolt";
            if (chore_name.includes("truck")) return "fa-truck";
            if (chore_name.includes("shampoo")) return "fa-wine-bottle";
            if (chore_name.includes("tree")) return "fa-tree";
            if (chore_name.includes("leftovers")) return "fa-drumstick-bite";
            if (chore_name.includes("HVAC")) return "fa-air-freshener";
            if (chore_name.includes("schedule")) return "fa-calendar-day";
            if (chore_name.includes("curtain")) return "fa-person-booth";
            if (chore_name.includes("closet")) return "fa-door-closed";
            if (chore_name.includes("install")) return "fa-screwdriver";
            if (chore_name.includes("tighten")) return "fa-screwdriver";
            if (chore_name.includes("organize")||chore_name.includes("tide")) return "fa-sitemap";
            if (chore_name.includes("sink")) return "fa-sink";
            if (chore_name.includes("freezer")) return "fa-snowflake";
            if (chore_name.includes("garage")) return "fa-warehouse";
            if (chore_name.includes("vacuum")) return "fa-blender-phone";
            if (chore_name.includes("fridge")) return "fa-temperature-low";
            if (chore_name.includes("cycl")) return "fa-recycle";
            if (chore_name.includes("scrub")) return "fa-hands-wash";
            if (chore_name.includes("spray")) return "fa-spray-can";
            if (chore_name.includes("texture")) return "fa-spray-can";
            if (chore_name.includes("measure")) return "fa-ruler-vertical";
            // make sure the dog bowl is higher
            if (chore_name.includes("dog bowl")) return "fa-paw";
            if (chore_name.includes(" cat") || chore_name.includes("cat ")) return "fa-cat";
            if (chore_name.includes("dog")) return "fa-dog";
            if (chore_name.includes("fan")) return "fa-fan";
            if (chore_name.includes("family")) return "fa-users";
            if (chore_name.includes("chair")) return "fa-chair";
            if (chore_name.includes("prime")) return "fa-brush";
            if (chore_name.includes("carry")) return "fa-people-carry";
            if (chore_name.includes("faucet")) return "fa-faucet";
            if (chore_name.includes("pool")) return "fa-swimming-pool";
            if (chore_name.includes("lightbulb")) return "fa-lightbulb";
            if (chore_name.includes("sheets")) return "fa-bed";
            if (chore_name.includes("tidy")) return "fa-align-justify";
            if (chore_name.includes("glass")) return "fa-glasses";
            if (chore_name.includes("sweep")) return "fa-broom";
            if (chore_name.includes("fix")) return "fa-wrench";
            if (chore_name.includes("lawn")) return "fa-seedling";
            if (chore_name.includes("flag")) return "fa-flag";
            if (chore_name.includes("cobweb")) return "fa-spider";
            if (chore_name.includes("mail")) return "fa-envelope";
            if (chore_name.includes("cut")) return "fa-cut";
            if (chore_name.includes("tidy")) return "fa-sitemap";
            if (chore_name.includes("sock")) return "fa-socks";
            if (chore_name.includes("declutter")) return "fa-sitemap";
            if (chore_name.includes("figure out")) return "fa-brain";
            if (chore_name.includes("plan")) return "fa-brain";
            if (chore_name.includes("nail ") || chore_name.includes(" nail")) return "fa-hammer";
            if (chore_name.includes("fill ") || chore_name.includes(" fill")) return "fa-fill-drip";
            if (chore_name.includes("weed")) return "fa-seedling";
            if (chore_name.includes("bathroom")) return "fa-restroom";
            if (chore_name.includes("bath")) return "fa-bath";
            if (chore_name.includes("safety")) return "fa-fire-extinguisher";
            if (chore_name.includes("laundry")) return "fa-tshirt";
            if (chore_name.includes("silverware")) return "fa-utensils";
            if (chore_name.includes("trash") || chore_name.includes("garbage")) return "fa-trash";
            if (chore_name.includes("filter")) return "fa-head-side-mask";
            if (chore_name.includes("mop")) return "fa-paint-brush";
            if (chore_name.includes("pledge")) return "fa-lemon";
            if (chore_name.includes("leash")) return "fa-leash";
            if (chore_name.includes("bed")) return "fa-bed";
            if (chore_name.includes(" car")||chore_name.includes("car ")) return "fa-car";
            if (chore_name.includes("wash")) return "fa-pump-soap";
            if (chore_name.includes("house")||chore_name.includes("home")) return "fa-home";
            if (chore_name.includes("clean")) return "fa-soap";
            if (chore_name.includes("kitchen")) return "fa-utensils";
            if (chore_name.includes("make")) return "fa-industry";
            if (chore_name.includes("assemble")) return "fa-industry";
            if (chore_name.includes("outside")) return "fa-tree";
            if (chore_name.includes("nature")) return "fa-tree";
            if (chore_name.includes("go to")) return "fa-route";
            return "fa-hand-sparkles";
        },
        classes: function () {
            let icon = this.icon;
            let rgb = hexToRgb(this.color) || [0,0,0];
            const color_dark = luminance(rgb[0], rgb[1], rgb[2]) < 0.5;
            const text_class = (color_dark) ? "icon-regular":"icon-inverted";
            if (this.have_circle) return [icon, text_class, "fas", "fa-stack-1x", "fa-inverse"]
            else return [icon, text_class, "fas"]
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
