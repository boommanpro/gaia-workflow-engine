<template>
  <div class="workflow-editor-frame">
<!--    <div v-if="!subAppMounted" class="loading-container">-->
<!--      <div class="loading-animation">-->
<!--        <div class="spinner"></div>-->
<!--        <div class="loading-text">工作流编辑器加载中...</div>-->
<!--      </div>-->
<!--    </div>-->
    <WujieVue
      width="100%"
      height="100%"
      :name="name"
      :url="url"
      :sync="true"
      :props="workflowProps"
      @message="handleMessage"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useWorkflowStore } from '../store'
import WujieVue from 'wujie-vue3'
import { bus } from 'wujie'

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

const emit = defineEmits(['workflowCreated', 'workflowUpdated'])

const name = ref('workflow-editor')
const url = ref(import.meta.env.VITE_CHILD_APP_URL || 'http://localhost:3000')
const workflowStore = useWorkflowStore()
const workflowData = ref(null)
const dataLoaded = ref(false)
const subAppMounted = ref(false)

// 计算属性，传递给微应用的props
const workflowProps = computed(() => {
  return {
    workflowId: props.workflowId,
    workflowData: workflowData.value
  }
})

onMounted(() => {
  console.log('WorkflowEditorFrame mounted')
  console.log('Workflow ID:', props.workflowId)
  console.log('Example ID:', props.exampleId)
  console.log('Workflow Editor URL:', url.value)

  // 加载数据
  loadData()

  // 监听来自子应用的消息
  bus.$on('sub-app-mounted', handleSubAppMounted)
  bus.$on('workflowSaved', handleWorkflowSaved)
  bus.$on('saveWorkflow', handleSaveWorkflow)
  bus.$on('getWorkflow', handleGetWorkflow)
  bus.$on('workflowLoaded', handleWorkflowLoaded)
})

onUnmounted(() => {
  bus.$off('sub-app-mounted', handleSubAppMounted)
  bus.$off('workflowSaved', handleWorkflowSaved)
  bus.$off('saveWorkflow', handleSaveWorkflow)
  bus.$off('getWorkflow', handleGetWorkflow)
  bus.$off('workflowLoaded', handleWorkflowLoaded)
})

const loadData = async () => {
  console.log('开始加载数据...')
  // 如果有工作流ID，则加载工作流数据
  if (props.workflowId && props.workflowId !== 'new') {
    const workflow = workflowStore.getWorkflowById(props.workflowId)
    if (workflow) {
      workflowData.value = {
        id: workflow.id,
        name: workflow.name,
        content: workflow.content
      }
      console.log('加载工作流数据:', workflowData.value)
    }
  } else if (props.exampleId) {
    // 如果是示例工作流，则加载示例数据
    try {
      console.log('加载示例工作流数据:', props.exampleId)
      // 使用绝对路径访问public目录下的文件
      const url = `./workflows/${props.exampleId}/workflow.json`
      console.log('请求URL:', url)
      const response = await fetch(url)
      console.log('响应状态:', response.status)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const exampleData = await response.json()
      workflowData.value = {
        id: `example-${props.exampleId}`,
        name: `示例工作流-${props.exampleId}`,
        content: exampleData
      }
      console.log('加载示例工作流数据成功:', workflowData.value)
    } catch (error) {
      console.error('加载示例工作流失败:', error)
    }
  } else if (props.workflowId === 'new') {
    // 新建空白工作流
    workflowData.value = {
      id: 'new',
      name: '新建工作流',
      content: {
        "nodes": [
          {
            "id": "start_0",
            "type": "start",
            "meta": {
              "position": {
                "x": 180,
                "y": 0
              }
            },
            "data": {
              "title": "开始节点",
              "outputs": {
                "type": "object",
                "properties": {
                  "query": {
                    "type": "string",
                    "default": "Hello Flow."
                  },
                  "enable": {
                    "type": "boolean",
                    "default": true
                  },
                  "array_obj": {
                    "type": "array",
                    "items": {
                      "type": "integer"
                    },
                    "default": "[1,2,3]"
                  }
                },
                "required": []
              }
            }
          },
          {
            "id": "end_0",
            "type": "end",
            "meta": {
              "position": {
                "x": 640,
                "y": 0
              }
            },
            "data": {
              "title": "结束节点",
              "inputsValues": {
                "success": {
                  "type": "constant",
                  "content": true,
                  "schema": {
                    "type": "boolean"
                  },
                  "extra": {
                    "index": 0
                  }
                },
                "query": {
                  "type": "ref",
                  "content": [
                    "start_0",
                    "query"
                  ],
                  "extra": {
                    "index": 1
                  }
                }
              },
              "inputs": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean"
                  },
                  "query": {
                    "type": "string"
                  }
                }
              }
            }
          }
        ],
        "edges": [
          {
            "sourceNodeID": "start_0",
            "targetNodeID": "end_0"
          }
        ]
      }
    }
    console.log('创建空白工作流数据:', workflowData.value)
  } else {
    // 默认空白工作流
    workflowData.value = {
      id: null,
      name: '工作流编辑器',
      content: {
        nodes: [],
        edges: []
      }
    }
    console.log('创建默认空白工作流数据:', workflowData.value)
  }

  // 标记数据加载完成
  dataLoaded.value = true

  // 发送数据给微前端
  sendWorkflowDataToMicroApp()
}

// 发送工作流数据给微前端应用
const sendWorkflowDataToMicroApp = () => {
  if (dataLoaded.value && workflowData.value && bus) {
    console.log('发送工作流数据给子应用:', workflowData.value)
    bus.$emit('loadWorkflow', {
      type: 'loadWorkflow',
      payload: workflowData.value
    })
    console.log('已发送工作流数据给子应用')
  }
}

const handleSubAppMounted = (data) => {
  console.log('子应用挂载完成:', data)
  subAppMounted.value = true
  // 发送工作流数据给子应用
  sendWorkflowDataToMicroApp()
}

const handleWorkflowLoaded = (data) => {
  console.log('子应用加载完成:', data)
}

const handleWorkflowSaved = (data) => {
  console.log('子应用保存完成:', data)
  // 可以在这里处理保存完成后的逻辑
}

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

// 保存工作流
const handleSaveWorkflow = (data) => {
  console.log('处理保存工作流请求:', data)
  if (props.workflowId && props.workflowId !== 'new') {
    // 更新现有工作流
    const updatedWorkflow = workflowStore.updateWorkflow(props.workflowId, {
      name: data.name || '未命名工作流',
      description: data.description || '',
      content: data.content || data
    })
    console.log('工作流已更新:', updatedWorkflow)

    // 通知子应用保存成功
    if (bus) {
      bus.$emit('workflowSaveSuccess', {
        type: 'workflowSaveSuccess',
        payload: { success: true, id: props.workflowId }
      })
    }

    // 通知父组件工作流已更新
    emit('workflowUpdated')
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
    if (bus) {
      bus.$emit('workflowSaveSuccess', {
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

// 监听工作流ID变化
watch(() => props.workflowId, async (newId) => {
  console.log('Workflow ID changed:', newId)
  if (newId !== undefined) {
    dataLoaded.value = false
    subAppMounted.value = false
    await loadData()
  }
})

// 监听示例ID变化
watch(() => props.exampleId, async (newExampleId) => {
  console.log('Example ID changed:', newExampleId)
  if (newExampleId !== undefined) {
    dataLoaded.value = false
    subAppMounted.value = false
    await loadData()
  }
})
</script>

<style scoped>
.workflow-editor-frame {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 100;
}

.loading-animation {
  text-align: center;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 16px;
  color: #666;
  margin-top: 10px;
}
</style>
