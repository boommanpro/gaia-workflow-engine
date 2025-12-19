<template>
  <div class="workflow-management">
    <div class="header">
      <h1>工作流管理（new）</h1>
      <button @click="showCreateModal" class="btn-primary">新建工作流</button>
    </div>

    <!-- 工作流列表 -->
    <div class="section">
      <h2>工作流列表</h2>
      <div class="workflow-grid" v-if="workflows.length > 0">
        <div
          class="workflow-card"
          v-for="workflow in workflows"
          :key="workflow.id"
          @click="viewWorkflowDetail(workflow)"
        >
          <div class="card-header">
            <h3>{{ workflow.workflowName || '未命名工作流' }}</h3>
            <div class="card-tag">工作流</div>
          </div>
          <p class="workflow-code">{{ workflow.workflowCode }}</p>
          <p class="workflow-desc">{{ workflow.workflowDesc || '暂无描述' }}</p>
          <div class="card-meta">
            <span>模板编码: {{ workflow.templateCode }}</span>
            <span>当前版本ID: {{ workflow.currentVersionId }}</span>
            <span>创建时间: {{ formatDate(workflow.createdAt) }}</span>
            <span>更新时间: {{ formatDate(workflow.updatedAt) }}</span>
          </div>
          <div class="card-actions">
            <button @click.stop="editWorkflow(workflow)" class="btn-secondary">编辑</button>
            <button @click.stop="deleteWorkflow(workflow.id)" class="btn-danger">删除</button>
            <button @click.stop="showVersionsModal(workflow)" class="btn-secondary">版本管理</button>
            <button @click.stop="showLogsModal(workflow)" class="btn-secondary">查看日志</button>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>暂无工作流，点击"新建工作流"开始创建</p>
      </div>
    </div>

    <!-- 创建/编辑工作流弹窗 -->
    <div v-if="showWorkflowModal" class="modal-overlay" @click="closeWorkflowModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑工作流' : '新建工作流' }}</h3>
          <button class="close-button" @click="closeWorkflowModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>工作流编码:</label>
            <input
              v-model="workflowForm.workflowCode"
              class="form-control"
              :disabled="isEditing"
              placeholder="请输入工作流编码"
            />
          </div>
          <div class="form-group">
            <label>工作流名称:</label>
            <input
              v-model="workflowForm.workflowName"
              class="form-control"
              placeholder="请输入工作流名称"
            />
          </div>
          <div class="form-group">
            <label>工作流描述:</label>
            <textarea
              v-model="workflowForm.workflowDesc"
              class="form-control description-editor"
              placeholder="请输入工作流描述"
            ></textarea>
          </div>
          <div class="form-group">
            <label>模板编码:</label>
            <input
              v-model="workflowForm.templateCode"
              class="form-control"
              placeholder="请输入模板编码"
            />
          </div>
          <!-- 仅在编辑模式下显示当前版本ID，且为只读 -->
          <div v-if="isEditing" class="form-group">
            <label>当前版本ID:</label>
            <input
              v-model.number="workflowForm.currentVersionId"
              type="number"
              class="form-control"
              disabled
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeWorkflowModal" class="btn-secondary">取消</button>
          <button @click="saveWorkflow" class="btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- 版本管理弹窗 -->
    <div v-if="showVersionsModalFlag" class="modal-overlay" @click="closeVersionsModal">
      <div class="modal-content versions-modal" @click.stop>
        <div class="modal-header">
          <h3>版本管理 - {{ currentWorkflow.workflowName }}</h3>
          <button class="close-button" @click="closeVersionsModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="version-grid" v-if="versions.length > 0">
            <div
              class="version-card"
              :class="{ 'current-version': version.isCurrent === 1 }"
              v-for="version in versions"
              :key="version.id"
            >
              <div class="card-header">
                <h4>{{ version.versionNumber }}</h4>
                <div class="card-tag" :class="{ 'current-tag': version.isCurrent === 1 }">
                  {{ version.isCurrent === 1 ? '当前版本' : '历史版本' }}
                </div>
              </div>
              <p class="version-desc">{{ version.versionDesc || '暂无描述' }}</p>
              <div class="card-meta">
                <span>创建者: {{ version.createdBy }}</span>
                <span>创建时间: {{ formatDate(version.createdAt) }}</span>
              </div>
              <div class="version-data-preview">
                <pre>{{ truncateJson(version.workflowData, 100) }}</pre>
              </div>
              <div class="card-actions">
                <button
                  v-if="version.isCurrent !== 1"
                  @click="setCurrentVersion(version.id)"
                  class="btn-secondary"
                >
                  设为当前版本
                </button>
                <button @click="editVersion(version)" class="btn-secondary">编辑</button>
                <button @click="deleteVersion(version.id)" class="btn-danger">删除</button>
              </div>
            </div>
          </div>
          <div class="empty-state" v-else>
            <p>暂无版本</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeVersionsModal" class="btn-primary">关闭</button>
        </div>
      </div>
    </div>

    <!-- 日志管理弹窗 -->
    <div v-if="showLogsModalFlag" class="modal-overlay" @click="closeLogsModal">
      <div class="modal-content logs-modal" @click.stop>
        <div class="modal-header">
          <h3>执行日志 - {{ currentWorkflow.workflowName }}</h3>
          <button class="close-button" @click="closeLogsModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="log-table" v-if="logs.length > 0">
            <div class="table-header">
              <div class="table-row">
                <div class="table-cell">执行ID</div>
                <div class="table-cell">版本号</div>
                <div class="table-cell">状态</div>
                <div class="table-cell">开始时间</div>
                <div class="table-cell">结束时间</div>
                <div class="table-cell">执行时长(ms)</div>
              </div>
            </div>
            <div class="table-body">
              <div class="table-row" v-for="log in logs" :key="log.id">
                <div class="table-cell" :title="log.executionId">{{ truncateText(log.executionId, 15) }}</div>
                <div class="table-cell">{{ log.versionNumber }}</div>
                <div class="table-cell">
                  <span :class="['status-badge', `status-${log.status}`]">{{ getStatusText(log.status) }}</span>
                </div>
                <div class="table-cell">{{ formatDate(log.startTime) }}</div>
                <div class="table-cell">{{ formatDate(log.endTime) }}</div>
                <div class="table-cell">{{ log.executionDuration }}</div>
              </div>
            </div>
          </div>
          <div class="empty-state" v-else>
            <p>暂无执行日志</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeLogsModal" class="btn-primary">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 工作流数据
const workflows = ref([])
const versions = ref([])
const logs = ref([])

// 当前选中的工作流
const currentWorkflow = ref({})

// 弹窗控制
const showWorkflowModal = ref(false)
const showVersionsModalFlag = ref(false)
const showLogsModalFlag = ref(false)
const isEditing = ref(false)

// 表单数据
const workflowForm = ref({
  id: null,
  workflowCode: '',
  workflowName: '',
  workflowDesc: '',
  currentVersionId: null,
  templateCode: ''
})

// API基础地址
const API_BASE_URL = '/api'

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'running': return '运行中'
    default: return status
  }
}

// 截断文本
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 截断JSON字符串
const truncateJson = (jsonStr, maxLength) => {
  if (!jsonStr) return ''
  if (jsonStr.length <= maxLength) return jsonStr
  return jsonStr.substring(0, maxLength) + '...'
}

// 获取工作流列表
const loadWorkflows = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/workflow/list`)
    if (response.ok) {
      workflows.value = await response.json()
    } else {
      ElMessage.error('获取工作流列表失败')
    }
  } catch (error) {
    console.error('获取工作流列表异常:', error)
    ElMessage.error('获取工作流列表异常: ' + error.message)
  }
}

// 显示创建工作流弹窗
const showCreateModal = () => {
  isEditing.value = false
  workflowForm.value = {
    id: null,
    workflowCode: '',
    workflowName: '',
    workflowDesc: '',
    currentVersionId: null,
    templateCode: ''
  }
  showWorkflowModal.value = true
}

// 编辑工作流
const editWorkflow = (workflow) => {
  isEditing.value = true
  workflowForm.value = { ...workflow }
  showWorkflowModal.value = true
}

// 查看工作流详情
const viewWorkflowDetail = (workflow) => {
  ElMessage.info(`查看工作流 "${workflow.workflowName}" 的详情`)
}

// 显示版本管理弹窗
const showVersionsModal = async (workflow) => {
  currentWorkflow.value = workflow
  showVersionsModalFlag.value = true

  // 获取版本列表
  try {
    const response = await fetch(`${API_BASE_URL}/workflow-version/list/${workflow.workflowCode}`)
    if (response.ok) {
      versions.value = await response.json()
    } else {
      ElMessage.error('获取版本列表失败')
    }
  } catch (error) {
    console.error('获取版本列表异常:', error)
    ElMessage.error('获取版本列表异常: ' + error.message)
  }
}

// 关闭版本管理弹窗
const closeVersionsModal = () => {
  showVersionsModalFlag.value = false
  versions.value = []
}

// 显示日志管理弹窗
const showLogsModal = async (workflow) => {
  currentWorkflow.value = workflow
  showLogsModalFlag.value = true

  // 获取日志列表
  try {
    const response = await fetch(`${API_BASE_URL}/workflow-log/list/${workflow.workflowCode}`)
    if (response.ok) {
      logs.value = await response.json()
    } else {
      ElMessage.error('获取日志列表失败')
    }
  } catch (error) {
    console.error('获取日志列表异常:', error)
    ElMessage.error('获取日志列表异常: ' + error.message)
  }
}

// 关闭日志管理弹窗
const closeLogsModal = () => {
  showLogsModalFlag.value = false
  logs.value = []
}

// 保存工作流
const saveWorkflow = async () => {
  try {
    // 验证表单
    if (!workflowForm.value.workflowCode) {
      ElMessage.warning('请输入工作流编码')
      return
    }
    if (!workflowForm.value.workflowName) {
      ElMessage.warning('请输入工作流名称')
      return
    }

    let response
    if (isEditing.value) {
      // 更新工作流
      response = await fetch(`${API_BASE_URL}/workflow/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowForm.value)
      })
    } else {
      // 创建工作流
      response = await fetch(`${API_BASE_URL}/workflow/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowCode: workflowForm.value.workflowCode,
          workflowName: workflowForm.value.workflowName,
          workflowDesc: workflowForm.value.workflowDesc,
          currentVersionId: workflowForm.value.currentVersionId,
          templateCode: workflowForm.value.templateCode
        })
      })
    }

    if (response.ok) {
      ElMessage.success((isEditing.value ? '更新' : '创建') + '工作流成功')
      closeWorkflowModal()
      loadWorkflows()
    } else {
      const errorText = await response.text()
      ElMessage.error((isEditing.value ? '更新' : '创建') + '工作流失败: ' + errorText)
    }
  } catch (error) {
    console.error('保存工作流异常:', error)
    ElMessage.error('保存工作流异常: ' + error.message)
  }
}

// 删除工作流
const deleteWorkflow = (id) => {
  ElMessageBox.confirm('确定要删除这个工作流吗？此操作不可恢复', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/workflow/delete/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        ElMessage.success('删除工作流成功')
        loadWorkflows()
      } else {
        ElMessage.error('删除工作流失败')
      }
    } catch (error) {
      console.error('删除工作流异常:', error)
      ElMessage.error('删除工作流异常: ' + error.message)
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 关闭工作流弹窗
const closeWorkflowModal = () => {
  showWorkflowModal.value = false
}

// 版本相关方法
// 编辑版本
const editVersion = (version) => {
  ElMessage.info(`编辑版本 ${version.versionNumber}`)
}

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
        showVersionsModal(currentWorkflow.value)
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
      showVersionsModal(currentWorkflow.value)
    } else {
      ElMessage.error('设置当前版本失败')
    }
  } catch (error) {
    console.error('设置当前版本异常:', error)
    ElMessage.error('设置当前版本异常: ' + error.message)
  }
}

// 组件挂载时加载工作流列表
onMounted(() => {
  loadWorkflows()
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.header h1 {
  margin: 0;
  color: #333;
}

.section {
  margin-bottom: 30px;
}

.section h2 {
  margin-bottom: 15px;
  color: #333;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.workflow-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.workflow-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.workflow-code {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}

.workflow-desc {
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

.card-tag {
  background-color: #409eff;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
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

.versions-modal, .logs-modal {
  max-width: 900px;
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

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-control {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box;
}

.description-editor {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

/* 版本管理样式 */
.version-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.version-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.version-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.current-version {
  border: 2px solid #67c23a;
}

.version-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.version-card .card-header h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.version-desc {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.version-card .card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;
}

.current-tag {
  background-color: #67c23a;
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

.version-card .card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 日志管理样式 */
.log-table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.table-header {
  background-color: #f5f5f5;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  flex: 1;
  padding: 12px 15px;
  font-size: 14px;
  word-break: break-all;
}

.table-header .table-cell {
  font-weight: bold;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-success {
  background-color: #f0f9ff;
  color: #409eff;
  border: 1px solid #409eff;
}

.status-failed {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #f56c6c;
}

.status-running {
  background-color: #f4f4f5;
  color: #909399;
  border: 1px solid #909399;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background-color: #409eff;
  color: white;
  border: none;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #666;
  border: 1px solid #ddd;
}

.btn-danger {
  background-color: #f56c6c;
  color: white;
  border: none;
}
</style>
