import { createRouter, createWebHistory } from 'vue-router'
import IndexView from '../views/IndexView.vue';
import SignoutView from '../views/SignoutView.vue'
import SignupView from '../views/SignupView.vue'
import NotFoundView from '../views/404View.vue'

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
    component: () => import(/* webpackChunkName: "admin" */ '../views/HouseholdView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: NotFoundView,
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
