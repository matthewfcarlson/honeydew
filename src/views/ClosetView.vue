<template>
  <div class="closet container">
    <div class="title is-4">Closet</div>
    <div class="notification is-danger" v-if="error.length > 0">{{ error }}</div>
    <div class="notification is-success" v-if="successMsg.length > 0">{{ successMsg }}</div>

    <!-- Filter bar -->
    <div class="field is-grouped is-grouped-multiline mb-4">
      <div class="control">
        <div class="select is-small">
          <select v-model="filterCategory">
            <option value="">All Categories</option>
            <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ categoryLabel(cat) }}</option>
          </select>
        </div>
      </div>
      <div class="control">
        <div class="select is-small">
          <select v-model="filterClean">
            <option value="">All Status</option>
            <option value="clean">Clean</option>
            <option value="needs-wash">Needs Wash</option>
          </select>
        </div>
      </div>
      <div class="control">
        <input class="input is-small" v-model="searchQuery" type="text" placeholder="Search...">
      </div>
    </div>

    <!-- Clothing items -->
    <div class="columns is-multiline">
      <div class="column is-4" v-for="item in filteredClothes" :key="item.id">
        <div class="card">
          <div class="card-image" v-if="item.image_url">
            <figure class="image is-4by3">
              <img :src="item.image_url" :alt="item.name">
            </figure>
          </div>
          <div class="card-content">
            <p class="title is-5">{{ item.name }}</p>
            <p class="subtitle is-6" v-if="item.brand">{{ item.brand }}</p>
            <div class="tags">
              <span class="tag is-info">{{ categoryLabel(item.category) }}</span>
              <span class="tag" v-if="item.color">{{ item.color }}</span>
              <span class="tag is-light" :title="'Heat index: ' + item.heat_index">
                {{ heatLabel(item.heat_index) }}
              </span>
              <span class="tag" :class="needsWash(item) ? 'is-warning' : 'is-success'">
                {{ needsWash(item) ? 'Needs Wash' : 'Clean' }}
              </span>
            </div>
            <div class="tags" v-if="item.tags">
              <span class="tag is-light" v-for="tag in item.tags.split(',').filter((t: string) => t.trim())" :key="tag">{{ tag.trim() }}</span>
            </div>
            <p class="is-size-7">
              Worn {{ item.wear_count }} time{{ item.wear_count === 1 ? '' : 's' }}
              <span v-if="item.wash_threshold !== null">
                &middot; {{ item.wears_since_wash }}/{{ item.wash_threshold }} wears since wash
              </span>
            </p>
          </div>
          <footer class="card-footer">
            <a class="card-footer-item" @click="mark_worn(item.id)">Wear</a>
            <a class="card-footer-item" v-if="item.wears_since_wash > 0" @click="mark_clean(item.id)">Wash</a>
            <a class="card-footer-item has-text-danger" @click="delete_item(item.id)">Delete</a>
          </footer>
        </div>
      </div>
    </div>

    <div class="box" v-if="filteredClothes.length === 0 && clothes.length > 0">
      No items match your filters.
    </div>
    <div class="box" v-if="clothes.length === 0">
      Your closet is empty. Add items manually or import from Indyx below.
    </div>

    <hr />

    <!-- Add single item -->
    <article class="panel is-primary">
      <p class="panel-heading">Add Clothing Item</p>
      <div class="panel-block">
        <div class="field" style="width:100%">
          <div class="columns">
            <div class="column">
              <label class="label">Name *</label>
              <input class="input" v-model="newItem.name" placeholder="Item name" :disabled="thinking">
            </div>
            <div class="column">
              <label class="label">Brand</label>
              <input class="input" v-model="newItem.brand" placeholder="Brand" :disabled="thinking">
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <label class="label">Category</label>
              <div class="select is-fullwidth">
                <select v-model="newItem.category" :disabled="thinking" @change="onCategoryChange">
                  <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ categoryLabel(cat) }}</option>
                </select>
              </div>
            </div>
            <div class="column">
              <label class="label">Heat Index</label>
              <div class="select is-fullwidth">
                <select v-model.number="newItem.heat_index" :disabled="thinking">
                  <option :value="0">0 - Lightest</option>
                  <option :value="1">1 - Light</option>
                  <option :value="2">2 - Medium</option>
                  <option :value="3">3 - Heavy</option>
                </select>
              </div>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <label class="label">Color</label>
              <input class="input" v-model="newItem.color" placeholder="Color" :disabled="thinking">
            </div>
            <div class="column">
              <label class="label">Washes after (wears)</label>
              <input class="input" v-model.number="newItem.wash_threshold" type="number" min="1" placeholder="Auto from category" :disabled="thinking || newItem.category === 'accessory'">
              <p class="help" v-if="newItem.category === 'accessory'">Accessories don't need washing</p>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <label class="label">Image URL</label>
              <input class="input" v-model="newItem.image_url" placeholder="https://..." :disabled="thinking">
            </div>
            <div class="column">
              <label class="label">Tags (comma-separated)</label>
              <input class="input" v-model="newItem.tags" placeholder="casual, summer, work" :disabled="thinking">
            </div>
          </div>
          <button class="button is-primary" :disabled="thinking || !newItem.name" @click="add_item">Add Item</button>
        </div>
      </div>
    </article>

    <!-- Import from Indyx -->
    <article class="panel is-info">
      <p class="panel-heading">Import from Indyx</p>
      <div class="panel-block">
        <div class="field" style="width:100%">
          <p class="mb-3">Paste your Indyx CSV export data below. You can request a CSV export from Indyx by contacting their support.</p>
          <textarea class="textarea" v-model="csvContent" placeholder="Paste CSV content here..." rows="6" :disabled="thinking"></textarea>
          <button class="button is-info mt-3" :disabled="thinking || !csvContent" @click="import_indyx">
            <span v-if="thinking">Importing...</span>
            <span v-else>Import from Indyx</span>
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

<script lang="ts">

import { defineComponent } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";

const CATEGORY_LABELS: Record<string, string> = {
  top: 'Top',
  bottom: 'Bottom',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  socks: 'Socks',
  accessory: 'Accessory',
};

const HEAT_LABELS = ['Lightest', 'Light', 'Medium', 'Heavy'];

const CATEGORY_WASH_DEFAULTS: Record<string, number | null> = {
  top: 1,
  bottom: 3,
  outerwear: 12,
  shoes: 10,
  socks: 1,
  accessory: null,
};

export default defineComponent({
  name: 'ClosetView',
  data() {
    return {
      error: "",
      successMsg: "",
      filterCategory: "",
      filterClean: "",
      searchQuery: "",
      csvContent: "",
      categoryOptions: ['top', 'bottom', 'outerwear', 'shoes', 'socks', 'accessory'] as string[],
      newItem: {
        name: "",
        category: "top" as 'top' | 'bottom' | 'outerwear' | 'shoes' | 'socks' | 'accessory',
        brand: "",
        color: "",
        image_url: "",
        tags: "",
        heat_index: 0,
        wash_threshold: 1 as number | null,
      },
    }
  },
  computed: {
    filteredClothes(): any[] {
      let items = this.clothes;
      if (this.filterCategory) {
        items = items.filter((c: any) => c.category === this.filterCategory);
      }
      if (this.filterClean === 'clean') {
        items = items.filter((c: any) => !this.needsWash(c));
      } else if (this.filterClean === 'needs-wash') {
        items = items.filter((c: any) => this.needsWash(c));
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        items = items.filter((c: any) =>
          c.name.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.color.toLowerCase().includes(q) ||
          c.tags.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        );
      }
      return items;
    },
    ...mapState(useUserStore, ["clothes", "thinking"])
  },
  mounted: function () {
    useUserStore().ClothesFetch();
  },
  methods: {
    categoryLabel(cat: string): string {
      return CATEGORY_LABELS[cat] || cat;
    },
    heatLabel(index: number): string {
      return HEAT_LABELS[index] || 'Unknown';
    },
    needsWash(item: any): boolean {
      if (item.wash_threshold === null) return false;
      return item.wears_since_wash >= item.wash_threshold;
    },
    onCategoryChange() {
      const defaults = CATEGORY_WASH_DEFAULTS[this.newItem.category];
      this.newItem.wash_threshold = defaults;
    },
    add_item: async function () {
      this.error = "";
      this.successMsg = "";
      if (!this.newItem.name) {
        this.error = "Name is required";
        return;
      }
      const status = await useUserStore().ClothesAdd(this.newItem);
      if (status.success) {
        this.successMsg = `Added "${this.newItem.name}" to closet`;
        this.newItem = { name: "", category: "top", brand: "", color: "", image_url: "", tags: "", heat_index: 0, wash_threshold: 1 };
      } else {
        this.error = status.message;
      }
    },
    delete_item: async function (id: string) {
      this.error = "";
      const status = await useUserStore().ClothesDelete(id);
      if (status.success == false) {
        this.error = status.message;
      }
    },
    mark_worn: async function (id: string) {
      this.error = "";
      const status = await useUserStore().ClothesMarkWorn(id);
      if (status.success == false) {
        this.error = status.message;
      }
    },
    mark_clean: async function (id: string) {
      this.error = "";
      const status = await useUserStore().ClothesMarkClean(id);
      if (status.success == false) {
        this.error = status.message;
      }
    },
    import_indyx: async function () {
      this.error = "";
      this.successMsg = "";
      if (!this.csvContent.trim()) {
        this.error = "Please paste CSV content first";
        return;
      }
      const status = await useUserStore().ClothesImportIndyx(this.csvContent);
      if (status.success) {
        this.successMsg = `Imported ${status.data.imported} of ${status.data.total} items from Indyx`;
        this.csvContent = "";
      } else {
        this.error = status.message;
      }
    },
  }
});
</script>
