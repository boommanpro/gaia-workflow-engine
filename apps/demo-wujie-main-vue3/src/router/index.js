import { createRouter, createWebHashHistory } from 'vue-router'
import WorkflowEditor from '../views/WorkflowEditor.vue'
import TemplateManagement from '../views/TemplateManagement.vue'
import WorkflowManagement from '../views/WorkflowManagement.vue'

const routes = [
  {
    path: '/editor/:id?',
    name: 'WorkflowEditor',
    component: WorkflowEditor,
    props: true,
    meta: {
      isFullScreen: true
    }
  },
  {
    path: '/templates',
    name: 'TemplateManagement',
    component: TemplateManagement
  },
  {
    path: '/',
    name: 'WorkflowManagement',
    component: WorkflowManagement
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
