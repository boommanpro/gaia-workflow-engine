import { createRouter, createWebHashHistory } from 'vue-router'
import WorkflowList from '../views/WorkflowList.vue'
import WorkflowEditor from '../views/WorkflowEditor.vue'
import TemplateManagement from '../views/TemplateManagement.vue'
import WorkflowManagement from '../views/WorkflowManagement.vue'

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
  },
  {
    path: '/workflows',
    name: 'WorkflowManagement',
    component: WorkflowManagement
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router