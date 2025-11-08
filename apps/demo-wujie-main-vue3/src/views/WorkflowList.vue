<template>
  <div class="workflow-list">
    <div class="header">
      <h1>工作流管理</h1>
      <button @click="createWorkflow" class="btn-primary">新建工作流</button>
    </div>
    
    <!-- 示例工作流 -->
    <div class="section">
      <h2>示例工作流</h2>
      <div class="workflow-grid" v-if="exampleWorkflows.length > 0">
        <div 
          class="workflow-card example-card" 
          v-for="workflow in exampleWorkflows" 
          :key="workflow.id"
          @click="editWorkflow(workflow)"
        >
          <h3>{{ workflow.name || '未命名工作流' }}</h3>
          <p>{{ workflow.description || '暂无描述' }}</p>
          <div class="card-footer">
            <span class="updated-at">更新于: {{ formatTime(workflow.updatedAt) }}</span>
            <div class="actions">
              <button @click.stop="showDescription(workflow)" class="btn-secondary">查看描述</button>
              <button @click.stop="copyToCustom(workflow)" class="btn-secondary">复制到自建</button>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>暂无示例工作流</p>
      </div>
    </div>
    
    <!-- 自建工作流 -->
    <div class="section">
      <h2>自建工作流</h2>
      <div class="workflow-grid" v-if="customWorkflows.length > 0">
        <div 
          class="workflow-card" 
          v-for="workflow in customWorkflows" 
          :key="workflow.id"
          @click="editWorkflow(workflow)"
        >
          <h3>{{ workflow.name || '未命名工作流' }}</h3>
          <p>{{ workflow.description || '暂无描述' }}</p>
          <div class="card-footer">
            <span class="updated-at">更新于: {{ formatTime(workflow.updatedAt) }}</span>
            <div class="actions">
              <button @click.stop="showDescription(workflow)" class="btn-secondary">查看描述</button>
              <button @click.stop="deleteWorkflow(workflow.id)" class="btn-danger">删除</button>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>暂无自建工作流，点击"新建工作流"开始创建</p>
        <button @click="createDefaultWorkflow" class="btn-primary" style="margin-top: 20px;">创建默认工作流</button>
      </div>
    </div>
    
    <!-- 描述弹窗 -->
    <div v-if="showDescriptionModal" class="modal-overlay" @click="closeDescriptionModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedWorkflow?.name }} - 描述</h3>
          <button class="close-button" @click="closeDescriptionModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="descriptionLoading" class="loading">加载中...</div>
          <div v-else>
            <div v-if="workflowDescription" v-html="workflowDescription"></div>
            <div v-else>暂无描述信息</div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDescriptionModal" class="btn-primary">关闭</button>
        </div>
      </div>
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
const exampleWorkflows = ref([])
const customWorkflows = ref([])

// 描述弹窗相关
const showDescriptionModal = ref(false)
const selectedWorkflow = ref(null)
const workflowDescription = ref('')
const descriptionLoading = ref(false)

// 获取工作流列表
const loadWorkflows = async () => {
  // 加载自建工作流
  customWorkflows.value = workflowStore.getWorkflows()
  
  // 加载示例工作流
  exampleWorkflows.value = await loadExampleWorkflows()
}

// 加载示例工作流
const loadExampleWorkflows = async () => {
  try {
    // 获取示例工作流索引
    const indexResponse = await fetch('/workflows/index.json')
    const indexData = await indexResponse.json()
    
    // 加载每个示例工作流的元数据
    const examples = []
    for (const exampleDir of indexData.examples) {
      try {
        const metadataResponse = await fetch(`/workflows/${exampleDir}/metadata.json`)
        const metadata = await metadataResponse.json()
        
        examples.push({
          id: `example-${exampleDir}`,
          name: metadata.name,
          description: metadata.description,
          updatedAt: metadata.updatedAt,
          isExample: true,
          exampleDir: exampleDir
        })
      } catch (error) {
        console.error(`加载示例工作流 ${exampleDir} 失败:`, error)
      }
    }
    
    return examples
  } catch (error) {
    console.error('加载示例工作流索引失败:', error)
    return []
  }
}

// 新建工作流
const createWorkflow = () => {
  router.push(`/editor?new=true`)
}

// 编辑工作流
const editWorkflow = (workflow) => {
  if (workflow.isExample) {
    // 示例工作流直接跳转到编辑器，传入exampleId参数
    router.push(`/editor?exampleId=${workflow.exampleDir}`)
  } else {
    router.push(`/editor/${workflow.id}`)
  }
}

// 复制示例工作流到自建
const copyToCustom = async (exampleWorkflow) => {
  try {
    // 获取示例工作流的完整数据
    const workflowResponse = await fetch(`/workflows/${exampleWorkflow.exampleDir}/workflow.json`)
    const workflowData = await workflowResponse.json()
    
    // 创建新的自建工作流
    const newWorkflow = workflowStore.addWorkflow({
      name: `${exampleWorkflow.name} (副本)`,
      description: exampleWorkflow.description,
      content: workflowData
    })
    
    // 刷新列表
    loadWorkflows()
    
    // 跳转到编辑页面
    router.push(`/editor/${newWorkflow.id}`)
  } catch (error) {
    console.error('复制示例工作流失败:', error)
    alert('复制示例工作流失败')
  }
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

// 显示工作流描述
const showDescription = async (workflow) => {
  selectedWorkflow.value = workflow
  showDescriptionModal.value = true
  descriptionLoading.value = true
  workflowDescription.value = ''
  
  try {
    if (workflow.isExample) {
      // 加载示例工作流的readme
      const response = await fetch(`/workflows/${workflow.exampleDir}/readme.md`)
      const text = await response.text()
      workflowDescription.value = convertMarkdownToHtml(text)
    } else {
      // 对于自建工作流，暂时显示描述字段
      workflowDescription.value = workflow.description || '暂无详细描述'
    }
  } catch (error) {
    console.error('加载描述失败:', error)
    workflowDescription.value = '加载描述失败'
  } finally {
    descriptionLoading.value = false
  }
}

// 简单的Markdown转HTML函数（只处理基本的换行）
const convertMarkdownToHtml = (markdown) => {
  return markdown.replace(/\n/g, '<br>')
}

// 关闭描述弹窗
const closeDescriptionModal = () => {
  showDescriptionModal.value = false
  selectedWorkflow.value = null
  workflowDescription.value = ''
}

onMounted(() => {
  loadWorkflows()
})
</script>

<style scoped>
.section {
  margin-bottom: 30px;
}

.section h2 {
  margin-bottom: 15px;
  color: #333;
}

.example-card {
  border: 2px solid #409eff;
  background-color: #f0f8ff;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 4px;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  text-align: right;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading {
  text-align: center;
  padding: 20px;
}
</style>