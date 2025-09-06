import { createRouter, createWebHistory } from 'vue-router'
import WorkflowList from '../views/WorkflowList.vue'
import WorkflowEditor from '../views/WorkflowEditor.vue'

const routes = [
  {
    path: '/',
    name: 'WorkflowList',
    component: WorkflowList
  },
  {
    path: '/editor/:id?',
    name: 'WorkflowEditor',
    component: WorkflowEditor,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router