<template>
  <div class="workflow-editor">
    <div class="editor-header">
      <button @click="goBack" class="btn-secondary">返回</button>
      <h2>{{ workflowId ? (workflowId === 'new' ? '新建工作流' : '编辑工作流') : (exampleId ? '示例工作流预览' : '新建工作流') }}</h2>
      <div class="spacer"></div>
      <button @click="saveWorkflow" class="btn-primary">保存</button>
    </div>

    <div class="editor-container">
      <WorkflowEditorFrame
        :workflow-id="workflowId"
        :example-id="exampleId"
        @workflow-created="handleWorkflowCreated"
        @workflow-updated="handleWorkflowUpdated"
        ref="editorFrame"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { bus } from 'wujie'
import WorkflowEditorFrame from '../components/WorkflowEditorFrame.vue'

// 定义 props
const props = defineProps({
  id: {
    type: String,
    default: null
  }
})

const router = useRouter()
const route = useRoute()
const workflowId = ref(props.id || route.params.id || (route.query.new ? 'new' : null))
const exampleId = ref(route.query.exampleId || null)
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
    // 使用wujie的bus
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

// 处理工作流更新事件
const handleWorkflowUpdated = () => {
  console.log('工作流更新完成')
}

onMounted(() => {
  console.log('WorkflowEditor mounted')
  console.log('Props ID:', props.id)
  console.log('Route params ID:', route.params.id)
  console.log('Workflow ID:', workflowId.value)
  console.log('Example ID:', exampleId.value)

  // 监听来自微应用的消息
  const handleWorkflowSaved = (data) => {
    console.log('收到微应用保存确认:', data)
  }

  bus.$on('workflowSaved', handleWorkflowSaved)
})

// 监听路由参数变化
watch(
  () => route.params.id,
  (newId) => {
    workflowId.value = newId || (route.query.new ? 'new' : null)
    console.log('Workflow ID changed:', workflowId.value)
  }
)

watch(
  () => route.query,
  (newQuery) => {
    exampleId.value = newQuery.exampleId || null
    workflowId.value = route.params.id || (newQuery.new ? 'new' : null)
    console.log('Query changed - Example ID:', exampleId.value, 'Workflow ID:', workflowId.value)
  },
  { deep: true }
)
</script>