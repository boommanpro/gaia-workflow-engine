<template>
  <div class="workflow-editor">
    <div class="editor-header">
      <button @click="goBack" class="btn-secondary">返回</button>
      <h2>{{ workflowId ? (workflowId === 'new' ? '新建工作流' : '编辑工作流') : (exampleId ? '示例工作流预览' : '新建工作流') }}</h2>
      <div class="spacer"></div>
      
      <!-- 版本下拉菜单 -->
      <el-dropdown v-if="workflowId && workflowId !== 'new'" @command="handleVersionCommand" class="version-dropdown">
        <button class="btn-secondary">
          版本管理 <el-icon><arrow-down /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-if="versions.length === 0" disabled>
              暂无版本
            </el-dropdown-item>
            
            <template v-for="version in versions" :key="version.id">
              <el-dropdown-item 
                :command="`view_${version.id}`" 
                :class="{'current-version-item': version.isCurrent === 1}"
              >
                <div class="version-item">
                  <div class="version-info">
                    <div class="version-number">{{ version.versionNumber }}</div>
                    <div class="version-desc">{{ version.versionDesc || '暂无描述' }}</div>
                    <div class="version-meta">
                      <span class="version-creator">{{ version.createdBy }}</span>
                      <span class="version-time">{{ formatDate(version.createdAt) }}</span>
                      <el-tag :type="version.isCurrent === 1 ? 'success' : 'info'" size="small">
                        {{ version.isCurrent === 1 ? '当前版本' : '历史版本' }}
                      </el-tag>
                    </div>
                  </div>
                  <div class="version-actions">
                    <el-button 
                      v-if="version.isCurrent !== 1" 
                      type="primary" 
                      size="small" 
                      text 
                      @click.stop="setCurrentVersion(version.id)"
                    >设为当前</el-button>
                    <el-button 
                      v-if="version.isCurrent !== 1" 
                      type="danger" 
                      size="small" 
                      text 
                      @click.stop="deleteVersion(version.id)"
                      :icon="Delete"
                    >
                    </el-button>
                  </div>
                </div>
              </el-dropdown-item>
            </template>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="editor-container">
      <WorkflowEditorFrame
        :workflow-id="workflowId"
        :example-id="exampleId"
        @workflow-created="handleWorkflowCreated"
        @workflow-updated="handleWorkflowUpdated"
        @show-version-modal="showVersionInput"
        ref="editorFrame"
      />
    </div>

    <!-- 版本信息输入弹窗 -->
    <VersionInputDialog 
      v-model="showVersionInputDialog" 
      @confirm="handleVersionConfirm"
      @cancel="handleVersionCancel"
    />
    
    <!-- AI助手组件 -->
    <AIAssistant />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, ElDropdown, ElDropdownItem, ElDropdownMenu, ElIcon, ElTag, ElButton } from 'element-plus'
import { Delete, ArrowDown } from '@element-plus/icons-vue'
import { bus } from 'wujie'
import WorkflowEditorFrame from '../components/WorkflowEditorFrame.vue'
import VersionInputDialog from '../components/VersionInputDialog.vue'
import AIAssistant from '../components/AIAssistant.vue'
import { API_BASE_URL } from '@/utils/apiConfig'

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

// 组件挂载后将获取到的switchToVersion赋值给此组件
let switchToVersion = null

// 版本管理相关数据
// 移除弹窗相关变量
const currentWorkflow = ref({})
const versions = ref([])

// 版本信息输入弹窗
const showVersionInputDialog = ref(false)

// 返回列表页
const goBack = () => {
  router.push('/')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 截断JSON字符串
const truncateJson = (jsonStr, maxLength) => {
  if (!jsonStr) return ''
  if (jsonStr.length <= maxLength) return jsonStr
  return jsonStr.substring(0, maxLength) + '...'
}

// 获取版本列表
const loadVersions = async () => {
  if (!workflowId.value || workflowId.value === 'new') {
    versions.value = []
    return
  }

  try {
    // 先获取工作流详情以获取workflowCode
    const response = await fetch(`${API_BASE_URL}/workflow/${workflowId.value}`)
    if (response.ok) {
      currentWorkflow.value = await response.json()
      
      // 获取版本列表
      const versionResponse = await fetch(`${API_BASE_URL}/workflow-version/list/${currentWorkflow.value.workflowCode}`)
      if (versionResponse.ok) {
        versions.value = await versionResponse.json()
      } else {
        ElMessage.error('获取版本列表失败')
        versions.value = []
      }
    } else {
      ElMessage.error('获取工作流详情失败')
      versions.value = []
    }
  } catch (error) {
    console.error('获取版本列表异常:', error)
    ElMessage.error('获取版本列表异常: ' + error.message)
    versions.value = []
  }
}

// 版本相关方法
// 删除版本
const deleteVersion = (id) => {
  ElMessageBox.confirm('确定要删除这个版本吗？此操作不可恢复', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/workflow-version/delete/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        ElMessage.success('删除版本成功')
        // 重新加载版本列表
        await loadVersions()
      } else {
        ElMessage.error('删除版本失败')
      }
    } catch (error) {
      console.error('删除版本异常:', error)
      ElMessage.error('删除版本异常: ' + error.message)
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 设置为当前版本
const setCurrentVersion = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workflow-version/set-current/${id}`, {
      method: 'PUT'
    })

    if (response.ok) {
      ElMessage.success('设置当前版本成功')
      // 重新加载版本列表
      await loadVersions()
    } else {
      ElMessage.error('设置当前版本失败')
    }
  } catch (error) {
    console.error('设置当前版本异常:', error)
    ElMessage.error('设置当前版本异常: ' + error.message)
  }
}

// 查看指定版本
const viewVersion = async (id) => {
  try {
    if (editorFrame.value && editorFrame.value.switchToVersion) {
      await editorFrame.value.switchToVersion(id)
      ElMessage.success('已切换到该版本进行查看')
      
      // 延迟一下，确保数据加载完成后再发送
      setTimeout(() => {
        if (editorFrame.value && editorFrame.value.sendWorkflowDataToMicroApp) {
          editorFrame.value.sendWorkflowDataToMicroApp()
        }
      }, 100)
    } else {
      ElMessage.error('无法切换版本')
    }
  } catch (error) {
    console.error('查看版本异常:', error)
    ElMessage.error('查看版本异常: ' + error.message)
  }
}



// 处理下拉菜单命令
const handleVersionCommand = async (command) => {
  if (command === 'new') {
    // 显示版本信息输入弹窗
    showVersionInputDialog.value = true
  } else if (command.startsWith('view_')) {
    // 查看版本
    const versionId = command.split('_')[1]
    await viewVersion(versionId)
  }
}

// 处理新建工作流完成事件
const handleWorkflowCreated = (id) => {
  console.log('工作流创建完成，ID:', id)
  workflowId.value = id

  // 更新路由但不刷新页面
  router.replace(`/editor/${id}`)
  
  // 加载版本列表
  loadVersions()
}

// 处理工作流更新事件
const handleWorkflowUpdated = () => {
  console.log('工作流更新完成')
  // 重新加载版本列表
  loadVersions()
}

// 显示版本信息输入弹窗
const showVersionInput = () => {
  showVersionInputDialog.value = true
}

// 处理版本信息确认
const handleVersionConfirm = async (versionInfo) => {
  showVersionInputDialog.value = false
  if (editorFrame.value) {
    editorFrame.value.handleVersionConfirm(versionInfo)
  }
  
  // 重新加载版本列表
  await loadVersions()
}

// 处理版本信息取消
const handleVersionCancel = () => {
  showVersionInputDialog.value = false
  if (editorFrame.value) {
    editorFrame.value.handleVersionCancel()
  }
}

onMounted(() => {
  console.log('WorkflowEditor mounted')
  console.log('Props ID:', props.id)
  console.log('Route params ID:', route.params.id)
  console.log('Workflow ID:', workflowId.value)
  console.log('Example ID:', exampleId.value)
  
  // 监听来自子应用的事件
  if (bus) {
    bus.$on('showVersionModal', showVersionInput)
  }
  
  // 如果是编辑现有工作流，加载版本列表
  if (workflowId.value && workflowId.value !== 'new') {
    loadVersions()
  }
})

// 监听路由参数变化
watch(
  () => route.params.id,
  (newId) => {
    workflowId.value = newId || (route.query.new ? 'new' : null)
    console.log('Workflow ID changed:', workflowId.value)
    // 更新tempProps以确保useWorkflowData能够响应变化
    tempProps.value.workflowId = workflowId.value
  }
)

watch(
  () => route.query,
  (newQuery) => {
    exampleId.value = newQuery.exampleId || null
    workflowId.value = route.params.id || (newQuery.new ? 'new' : null)
    console.log('Query changed - Example ID:', exampleId.value, 'Workflow ID:', workflowId.value)
    // 更新tempProps以确保useWorkflowData能够响应变化
    tempProps.value.exampleId = exampleId.value
    tempProps.value.workflowId = workflowId.value
  },
  { deep: true }
)

// 在组件卸载时移除事件监听
onUnmounted(() => {
  if (bus) {
    bus.$off('showVersionModal', showVersionInput)
  }
})
</script>

<style scoped>
.editor-header {
  display: inline-flex;
  align-items: center;
  z-index: 999;
  position: absolute;
  top: 20px;
  left: 20px;
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  padding: 10px 20px;
}

.editor-header h2 {
  margin: 0 20px;
  font-size: 18px;
}

.editor-header .spacer {
  flex: 1;
}

.btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background-color: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  position: relative;
}

.version-desc {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.version-data-preview {
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 16px;
  max-height: 100px;
  overflow: auto;
}

.version-data-preview pre {
  margin: 0;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.current-version {
  border: 2px solid #67c23a;
}

.delete-icon {
  cursor: pointer;
  color: #f56c6c;
}

/* 版本下拉菜单样式 */
.version-dropdown {
  margin-left: 10px;
}

.dropdown-header {
  padding: 5px 20px !important;
  background-color: #f5f5f5;
}

.dropdown-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-weight: bold;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 300px;
  padding: 8px 0;
}

.version-info {
  flex: 1;
  margin-right: 10px;
}

.version-number {
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.version-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.version-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #999;
}

.version-meta .el-tag {
  height: 20px;
  line-height: 20px;
  margin-left: 5px;
}

.version-actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.version-actions .el-button {
  padding: 2px 4px;
  font-size: 12px;
}

.current-version-item {
  background-color: #f0f9ff !important;
}
</style>
