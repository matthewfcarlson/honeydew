import { createRouter, createWebHistory } from 'vue-router'
import IndexView from '../views/IndexView.vue';
import SignoutView from '../views/SignoutView.vue'
import SignupView from '../views/SignupView.vue'
import NotFoundView from '../views/404View.vue'
import { useUserStore } from '@/store';

import 'vue-router'
declare module 'vue-router' {
  interface RouteMeta {
    // if not defined, we assume auth is not required
    noAuthRequired?: boolean
  }
}

const routes = [
  {
    path: '/',
    name: 'index',
    component: IndexView
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  },
  {
    path: '/signout',
    name: 'signout',
    component: SignoutView,
    meta: {
      noAuthRequired: false,
    }
  },
  {
    path: '/signup',
    name: 'signup',
    component: SignupView,
  },
  {
    path: '/recover',
    name: 'recover',
    component: () => import(/* webpackChunkName: "recovery" */ '../views/RecoveryView.vue'),
  },
  {
    path: '/error',
    name: '400',
    component: () => import(/* webpackChunkName: "error" */ '../views/400View.vue')
  },
  {
    path: "/household",
    name: "Household",
    component: () => import(/* webpackChunkName: "admin" */ '../views/HouseholdView.vue'),
    meta: {
      noAuthRequired: false,
    }
  },
  {
    path: "/recipes",
    name: "Recipes",
    component: () => import(/* webpackChunkName: "recipes" */ '../views/RecipesView.vue'),
    meta: {
      noAuthRequired: false,
    }
  },
  {
    path: "/chores",
    name: "Chores",
    component: () => import(/* webpackChunkName: "chores" */ '../views/ChoresView.vue'),
    meta: {
      noAuthRequired: false,
    }
  },
  {
    path: "/projects",
    name: "Projects",
    component: () => import(/* webpackChunkName: "projects" */ '../views/ProjectsView.vue'),
    meta: {
      noAuthRequired: false,
    }
  },
  {
    path: "/outfits",
    name: "Outfits",
    component: () => import(/* webpackChunkName: "outfits" */ '../views/OutfitsView.vue'),
    meta: {
      noAuthRequired: false,
    }
  },
  {
    path: "/closet",
    redirect: "/outfits",
  },
  {
    path: "/projects/:id",
    name: "projects Tasks",
    component: () => import(/* webpackChunkName: "projects" */ '../views/TasksView.vue'),
    meta: {
      noAuthRequired: false,
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: NotFoundView,
    meta: {
      noAuthRequired: true,
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from) => {
  if (useUserStore().isLoggedIn) {
    return true;
  }
  if (to.meta.noAuthRequired == undefined) return true;
  if (to.meta.noAuthRequired == false) {
    const loginError = (window as any).login_error;
    const msg = loginError || 'AUTH_REQUIRED';
    return { name: '400', query: { msg } };
  }
})

export default router
