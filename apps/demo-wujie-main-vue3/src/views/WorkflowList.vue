<template>
  <div class="workflow-list">
    <div class="header">
      <h1>工作流管理</h1>
      <button @click="createWorkflow" class="btn-primary">新建工作流</button>
    </div>
    
    <div class="workflow-grid" v-if="workflows.length > 0">
      <div 
        class="workflow-card" 
        v-for="workflow in workflows" 
        :key="workflow.id"
        @click="editWorkflow(workflow.id)"
      >
        <h3>{{ workflow.name || '未命名工作流' }}</h3>
        <p>{{ workflow.description || '暂无描述' }}</p>
        <div class="card-footer">
          <span class="updated-at">更新于: {{ formatTime(workflow.updatedAt) }}</span>
          <div class="actions">
            <button @click.stop="deleteWorkflow(workflow.id)" class="btn-danger">删除</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <p>暂无工作流，点击"新建工作流"开始创建</p>
      <button @click="createDefaultWorkflow" class="btn-primary" style="margin-top: 20px;">创建默认工作流</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '../store'
import { formatTime } from '../utils/date'

const router = useRouter()
const workflowStore = useWorkflowStore()
const workflows = ref([])

// 获取工作流列表
const loadWorkflows = () => {
  workflows.value = workflowStore.getWorkflows()
}

// 新建工作流
const createWorkflow = () => {
  const newWorkflow = workflowStore.createDefaultWorkflow()
  router.push(`/editor/${newWorkflow.id}`)
}

// 编辑工作流
const editWorkflow = (id) => {
  router.push(`/editor/${id}`)
}

// 创建默认工作流
const createDefaultWorkflow = () => {
  const newWorkflow = workflowStore.createDefaultWorkflow()
  loadWorkflows()
}

// 删除工作流
const deleteWorkflow = (id) => {
  if (confirm('确定要删除这个工作流吗？')) {
    workflowStore.deleteWorkflow(id)
    loadWorkflows()
  }
}

onMounted(() => {
  loadWorkflows()
})
</script>