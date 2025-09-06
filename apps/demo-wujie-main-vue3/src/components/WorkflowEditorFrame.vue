<template>
  <div class="workflow-editor-frame" ref="containerRef">
    <WujieVue
      v-if="url"
      :name="name"
      :url="url"
      :sync="true"
      :props="workflowProps"
      :attrs="wujieAttrs"
      @message="handleMessage"
      class="wujie-iframe"
    />
    <div v-else class="loading">
      加载中...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { bus } from 'wujie'
import WujieVue from 'wujie-vue3'
import { useWorkflowStore } from '../store'

const props = defineProps({
  workflowId: {
    type: String,
    default: null
  }
})

const name = ref('freelayout-editor')
const url = ref('')
const workflowData = ref(null)
const workflowStore = useWorkflowStore()
const containerRef = ref(null)

// 计算属性，传递给微应用的props
const workflowProps = computed(() => {
  return {
    workflowId: props.workflowId,
    workflowData: workflowData.value
  }
})

// wujie属性配置
const wujieAttrs = computed(() => {
  return {
    style: {
      width: '100%',
      height: '100%',
      border: 'none'
    }
  }
})

// 初始化微前端URL
onMounted(() => {
  console.log('WorkflowEditorFrame mounted')
  console.log('Container ref:', containerRef.value)
  
  // 这里配置freelayout微应用的地址
  url.value = 'http://localhost:3000' // 根据实际部署地址修改
  
  // 如果有工作流ID，则加载工作流数据
  if (props.workflowId) {
    workflowData.value = workflowStore.getWorkflowById(props.workflowId)
    console.log('加载工作流数据:', workflowData.value)
  }
  
  // 监听来自子应用的消息
  bus.$on('sub-app-mounted', handleSubAppMounted)
  bus.$on('workflowSaved', handleWorkflowSaved)
  bus.$on('testMessage', handleTestMessage)
})

onUnmounted(() => {
  bus.$off('sub-app-mounted', handleSubAppMounted)
  bus.$off('workflowSaved', handleWorkflowSaved)
  bus.$off('testMessage', handleTestMessage)
})

const handleSubAppMounted = (data) => {
  console.log('子应用挂载完成:', data)
  // 发送工作流数据给子应用
  if (workflowData.value && window.$wujie) {
    window.$wujie.bus.$emit('loadWorkflow', {
      type: 'loadWorkflow',
      payload: workflowData.value
    })
    console.log('已发送工作流数据给子应用')
  }
}

const handleWorkflowSaved = (data) => {
  console.log('子应用保存完成:', data)
  // 可以在这里处理保存完成后的逻辑
}

// 处理来自微前端的消息
const handleMessage = (data) => {
  console.log('收到来自微前端的消息:', data)
  
  // 处理保存请求
  if (data.type === 'saveWorkflow') {
    handleSaveWorkflow(data.payload)
  }
  
  // 处理数据请求
  if (data.type === 'getWorkflow') {
    handleGetWorkflow()
  }
  
  // 处理保存完成确认
  if (data.type === 'workflowSaved') {
    handleWorkflowSaved(data.payload)
  }
}

// 保存工作流
const handleSaveWorkflow = (data) => {
  console.log('处理保存工作流请求:', data)
  if (props.workflowId) {
    // 更新现有工作流
    const updatedWorkflow = workflowStore.updateWorkflow(props.workflowId, {
      name: data.name || '未命名工作流',
      description: data.description || '',
      content: data.content || data
    })
    console.log('工作流已更新:', updatedWorkflow)
    
    // 通知子应用保存成功
    if (window.$wujie) {
      window.$wujie.bus.$emit('workflowSaveSuccess', {
        type: 'workflowSaveSuccess',
        payload: { success: true, id: props.workflowId }
      })
    }
  } else {
    // 创建新工作流
    const result = workflowStore.addWorkflow({
      name: data.name || '未命名工作流',
      description: data.description || '',
      content: data.content || data
    })
    
    console.log('新工作流已创建:', result)
    // 通知父组件ID已生成
    emit('workflowCreated', result.id)
    
    // 通知子应用保存成功
    if (window.$wujie) {
      window.$wujie.bus.$emit('workflowSaveSuccess', {
        type: 'workflowSaveSuccess',
        payload: { success: true, id: result.id }
      })
    }
  }
}

// 获取工作流数据
const handleGetWorkflow = () => {
  console.log('处理获取工作流请求')
  return workflowData.value ? workflowData.value.content : null
}

const emit = defineEmits(['workflowCreated'])

// 监听工作流ID变化
watch(() => props.workflowId, (newId) => {
  if (newId) {
    workflowData.value = workflowStore.getWorkflowById(newId)
    console.log('工作流ID变化，重新加载数据:', workflowData.value)
  }
})

// 处理测试消息
const handleTestMessage = (data) => {
  console.log('收到测试消息:', data)
}
</script>
