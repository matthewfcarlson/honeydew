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
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
      </div>
      <div class="control">
        <div class="select is-small">
          <select v-model="filterClean">
            <option value="">All Status</option>
            <option value="clean">Clean</option>
            <option value="dirty">Dirty</option>
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
              <span class="tag is-info" v-if="item.category">{{ item.category }}</span>
              <span class="tag is-primary" v-if="item.subcategory">{{ item.subcategory }}</span>
              <span class="tag" v-if="item.color">{{ item.color }}</span>
              <span class="tag" v-if="item.size">{{ item.size }}</span>
              <span class="tag" :class="item.is_clean ? 'is-success' : 'is-warning'">
                {{ item.is_clean ? 'Clean' : 'Dirty' }}
              </span>
            </div>
            <div class="tags" v-if="item.tags">
              <span class="tag is-light" v-for="tag in item.tags.split(',').filter((t: string) => t.trim())" :key="tag">{{ tag.trim() }}</span>
            </div>
            <p class="is-size-7">Worn {{ item.wear_count }} time{{ item.wear_count === 1 ? '' : 's' }}</p>
          </div>
          <footer class="card-footer">
            <a class="card-footer-item" @click="mark_worn(item.id)">Wear</a>
            <a class="card-footer-item" v-if="item.is_clean" @click="mark_dirty(item.id)">Mark Dirty</a>
            <a class="card-footer-item" v-else @click="mark_clean(item.id)">Mark Clean</a>
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
              <input class="input" v-model="newItem.category" placeholder="e.g. Tops, Bottoms, Outerwear" :disabled="thinking">
            </div>
            <div class="column">
              <label class="label">Subcategory</label>
              <input class="input" v-model="newItem.subcategory" placeholder="e.g. T-Shirt, Jeans" :disabled="thinking">
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <label class="label">Color</label>
              <input class="input" v-model="newItem.color" placeholder="Color" :disabled="thinking">
            </div>
            <div class="column">
              <label class="label">Size</label>
              <input class="input" v-model="newItem.size" placeholder="Size" :disabled="thinking">
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

    <!-- Import from Indyx Open Closet -->
    <article class="panel is-info">
      <p class="panel-heading">Import from Indyx</p>
      <div class="panel-block">
        <div class="field" style="width:100%">
          <label class="label">Open Closet URL or Username</label>
          <p class="mb-3 is-size-7">Enter your Indyx Open Closet URL or username to import your wardrobe and outfits.</p>
          <div class="field has-addons">
            <div class="control is-expanded">
              <input class="input" v-model="indyxUsername" placeholder="e.g. drxv42gj94 or https://opencloset.myindyx.com/user/..." :disabled="thinking">
            </div>
            <div class="control">
              <button class="button is-info" :disabled="thinking || !indyxUsername" @click="import_opencloset">
                <span v-if="thinking">Importing...</span>
                <span v-else>Import</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-block">
        <div class="field" style="width:100%">
          <label class="label">Or paste CSV export</label>
          <textarea class="textarea" v-model="csvContent" placeholder="Paste CSV content here..." rows="4" :disabled="thinking"></textarea>
          <button class="button is-info is-light mt-3" :disabled="thinking || !csvContent" @click="import_indyx">
            <span v-if="thinking">Importing...</span>
            <span v-else>Import CSV</span>
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

<script lang="ts">

import { defineComponent, computed } from 'vue';
import { useUserStore } from "@/store";
import { mapState } from "pinia";

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
      indyxUsername: "",
      newItem: {
        name: "",
        category: "",
        subcategory: "",
        brand: "",
        color: "",
        size: "",
        image_url: "",
        tags: "",
      },
    }
  },
  computed: {
    categories(): string[] {
      const cats = new Set(this.clothes.map((c: any) => c.category).filter((c: string) => c.length > 0));
      return Array.from(cats).sort();
    },
    filteredClothes(): any[] {
      let items = this.clothes;
      if (this.filterCategory) {
        items = items.filter((c: any) => c.category === this.filterCategory);
      }
      if (this.filterClean === 'clean') {
        items = items.filter((c: any) => c.is_clean);
      } else if (this.filterClean === 'dirty') {
        items = items.filter((c: any) => !c.is_clean);
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        items = items.filter((c: any) =>
          c.name.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.color.toLowerCase().includes(q) ||
          c.tags.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.subcategory.toLowerCase().includes(q)
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
        this.newItem = { name: "", category: "", subcategory: "", brand: "", color: "", size: "", image_url: "", tags: "" };
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
    mark_dirty: async function (id: string) {
      this.error = "";
      const status = await useUserStore().ClothesMarkDirty(id);
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
    import_opencloset: async function () {
      this.error = "";
      this.successMsg = "";
      if (!this.indyxUsername.trim()) {
        this.error = "Please enter an Indyx username or URL";
        return;
      }
      const status = await useUserStore().ClothesImportIndyxOpenCloset(this.indyxUsername);
      if (status.success) {
        const d = status.data;
        const parts = [`Imported ${d.imported_items} of ${d.total_items} items`];
        if (d.total_outfits > 0) parts.push(`${d.imported_outfits} of ${d.total_outfits} outfits`);
        this.successMsg = parts.join(' and ') + ' from Indyx';
        this.indyxUsername = "";
      } else {
        this.error = status.message;
      }
    },
  }
});
</script>
