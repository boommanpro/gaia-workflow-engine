import { createRouter, createWebHashHistory } from 'vue-router'
import WorkflowList from '../views/WorkflowList.vue'
import WorkflowEditor from '../views/WorkflowEditor.vue'
import TemplateManagement from '../views/TemplateManagement.vue'

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
  },
  {
    path: '/templates',
    name: 'TemplateManagement',
    component: TemplateManagement
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router