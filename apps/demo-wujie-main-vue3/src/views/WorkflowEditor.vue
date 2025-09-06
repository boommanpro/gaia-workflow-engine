<template>
  <div class="workflow-editor">
    <div class="editor-header">
      <button @click="goBack" class="btn-secondary">返回</button>
      <h2>{{ workflowId ? '编辑工作流' : '新建工作流' }}</h2>
      <div class="spacer"></div>
      <button @click="saveWorkflow" class="btn-primary">保存</button>
    </div>

    <div class="editor-container">
      <WorkflowEditorFrame
        :workflow-id="workflowId"
        @workflow-created="handleWorkflowCreated"
        ref="editorFrame"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { bus } from 'wujie'
import WorkflowEditorFrame from '../components/WorkflowEditorFrame.vue'

const router = useRouter()
const route = useRoute()
const workflowId = ref(route.params.id || null)
const editorFrame = ref(null)

// 返回列表页
const goBack = () => {
  router.push('/')
}

// 保存工作流
const saveWorkflow = () => {
  console.log('发送保存请求到微前端')
  // 向微前端发送保存消息
  try {
    // 使用wujie的postMessage
    if (window.$wujie) {
      window.$wujie.bus.$emit('saveWorkflow', { 
        type: 'saveWorkflow', 
        payload: { 
          workflowId: workflowId.value,
          timestamp: Date.now() 
        } 
      })
      console.log('通过wujie bus发送保存消息')
    }
        
    // 方法2: 直接使用bus
    bus.$emit('saveWorkflow', { 
      type: 'saveWorkflow', 
      payload: { 
        workflowId: workflowId.value,
        timestamp: Date.now() 
      } 
    })
    console.log('通过bus发送保存消息')
  } catch (error) {
    console.error('发送保存消息失败:', error)
  }
}

// 处理新建工作流完成事件
const handleWorkflowCreated = (id) => {
  console.log('工作流创建完成，ID:', id)
  workflowId.value = id
      
  // 更新路由但不刷新页面
  router.replace(`/editor/${id}`)
}

onMounted(() => {
  console.log('WorkflowEditor mounted')
  console.log('Workflow ID:', workflowId.value)

  // 监听来自微应用的消息
  const handleWorkflowSaved = (data) => {
    console.log('收到微应用保存确认:', data)
  }

  bus.$on('workflowSaved', handleWorkflowSaved)

  // 清理事件监听
  // onUnmounted(() => {
  //   bus.$off('workflowSaved', handleWorkflowSaved)
  // })
})

// 监听路由变化
watch(
  () => route.params.id,
  (newId) => {
    workflowId.value = newId || null
    console.log('Workflow ID changed:', workflowId.value)
  }
)
</script>
