<template>
  <div class="workflow-editor-container">
    <!-- 加载状态指示器 -->
    <div v-if="showLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>正在加载工作流编辑器...</p>
      </div>
    </div>

    <!-- 微前端容器 -->
    <WujieWrapper
      :name="name"
      :url="url"
      :workflow-props="workflowProps"
      @message="handleMessage"
      @ready="handleAppReady"
      ref="wujieRef"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { bus } from 'wujie'
import WujieWrapper from './WujieWrapper.vue'
import { useWorkflowData } from '../composables/useWorkflowData'
import { useWorkflowCommunication } from '../composables/useWorkflowCommunication'

const props = defineProps({
  workflowId: {
    type: String,
    default: null
  },
  exampleId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['workflowCreated', 'workflowUpdated', 'showVersionModal'])

const name = ref('workflow-editor')
const url = ref(import.meta.env.VITE_CHILD_APP_URL || 'http://localhost:3000')
const wujieRef = ref(null)
const appReady = ref(false)
const showLoading = ref(true) // 控制是否显示加载状态

// 使用组合式函数管理数据
const {
  workflowData,
  dataLoaded,
  loadData,
  switchToVersion
} = useWorkflowData(props)

// 使用组合式函数管理通信
const communication = useWorkflowCommunication(workflowData, combinedEmit)
const {
  subAppMounted,
  handleSubAppMounted,
  handleWorkflowLoaded,
  handleWorkflowSaved,
  handleSaveWorkflow,
  handleGetWorkflow,
  handleVersionConfirm,
  handleVersionCancel,
  sendWorkflowDataToMicroApp
} = communication

// 合并 emit 函数，同时触发自身事件和向上传递事件
function combinedEmit(event, ...args) {
  // 触发自身的事件
  emit(event, ...args)
  
  // 特殊处理 showVersionModal 事件，向上传递给父组件
  if (event === 'showVersionModal') {
    emit('showVersionModal')
  }
}

// 计算属性，传递给微应用的props
const workflowProps = computed(() => {
  return {
    workflowId: props.workflowId,
    workflowData: workflowData.value
  }
})

// 处理子应用完全准备好的状态
const handleAppReady = () => {
  console.log('子应用已完全准备好')
  appReady.value = true
}

// 监听数据加载完成、子应用挂载和应用准备好的状态，在所有条件满足时发送数据
watch([dataLoaded, subAppMounted, appReady], ([loaded, mounted, ready]) => {
  console.log('状态变化:', { loaded, mounted, ready })
  if (loaded && mounted && ready && workflowData.value) {
    // 所有条件都满足时发送数据
    sendWorkflowDataToMicroApp()

    // 在发送数据后延时100ms再隐藏加载状态
    setTimeout(() => {
      showLoading.value = false
    }, 300)
  } else if (loaded && mounted && !ready) {
    // 数据和子应用都已加载，但子应用还没完全准备好
    console.log('数据和子应用已加载，等待子应用完全准备好...')
  }
})

onMounted(() => {
  console.log('WorkflowEditorFrame mounted')
  console.log('Workflow ID:', props.workflowId)
  console.log('Example ID:', props.exampleId)
  console.log('Workflow Editor URL:', url.value)

  // 监听来自子应用的消息
  bus.$on('sub-app-mounted', handleSubAppMounted)
  bus.$on('workflowSaved', handleWorkflowSaved)
  bus.$on('saveWorkflow', handleSaveWorkflow)
  bus.$on('getWorkflow', handleGetWorkflow)
  bus.$on('workflowLoaded', handleWorkflowLoaded)

  // 加载数据
  loadData()
})

onUnmounted(() => {
  bus.$off('sub-app-mounted', handleSubAppMounted)
  bus.$off('workflowSaved', handleWorkflowSaved)
  bus.$off('saveWorkflow', handleSaveWorkflow)
  bus.$off('getWorkflow', handleGetWorkflow)
  bus.$off('workflowLoaded', handleWorkflowLoaded)
})

// 处理来自微前端的消息
const handleMessage = (data) => {
  console.log('收到来自微前端的消息:', data)

  // 处理保存请求
  if (data?.type === 'saveWorkflow') {
    handleSaveWorkflow(data.payload)
  }

  // 处理数据请求
  if (data?.type === 'getWorkflow') {
    handleGetWorkflow()
  }

  // 处理保存完成确认
  if (data?.type === 'workflowSaved') {
    handleWorkflowSaved(data.payload)
  }
}

// 暴露给父组件的方法
defineExpose({
  handleVersionConfirm,
  handleVersionCancel,
  // 添加重新加载数据的方法
  reloadData: loadData,
  // 添加发送工作流数据到微前端的方法
  sendWorkflowDataToMicroApp,
  // 添加切换版本的方法
  switchToVersion
})
</script>

<style scoped>
.workflow-editor-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  text-align: center;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #409eff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner p {
  margin: 0;
  font-size: 14px;
  color: #666;
}
</style>
