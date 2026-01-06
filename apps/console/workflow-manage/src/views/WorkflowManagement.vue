<template>
  <div class="workflow-management">
    <div class="header">
      <h1>工作流管理</h1>
      <el-button type="primary" @click="showCreateModal">新建工作流</el-button>
    </div>

    <!-- 工作流列表 -->
    <div class="section">
      <el-row :gutter="20">
        <el-col
          v-for="workflow in workflows"
          :key="workflow.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          @click="editWorkflowDetail(workflow)"
          style="margin-bottom: 20px; cursor: pointer;"
        >
          <el-card class="workflow-card" shadow="hover">
            <div class="card-header">
              <h3>{{ workflow.workflowName || '未命名工作流' }}</h3>
              <el-icon class="delete-icon" @click.stop="deleteWorkflow(workflow.id)">
                <Delete />
              </el-icon>
            </div>
            <p class="workflow-code">{{ workflow.workflowCode }}</p>
            <p class="workflow-desc">{{ workflow.workflowDesc || '暂无描述' }}</p>
            <div class="card-meta">
              <div>模板编码: {{ workflow.templateCode }}</div>
              <div>当前版本ID: {{ workflow.currentVersionId }}</div>
              <div>创建时间: {{ formatDate(workflow.createdAt) }}</div>
              <div>更新时间: {{ formatDate(workflow.updatedAt) }}</div>
            </div>
            <div class="card-actions">
              <el-button @click.stop="editWorkflow(workflow)">编辑</el-button>
              <el-button @click.stop="showLogsModal(workflow)">查看日志</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="workflows.length === 0" description="暂无工作流，点击'新建工作流'开始创建" />
    </div>

    <!-- 创建/编辑工作流弹窗 -->
    <el-dialog v-model="showWorkflowModal" :title="isEditing ? '编辑工作流' : '新建工作流'" width="600px">
      <el-form :model="workflowForm" label-width="120px">
        <el-form-item label="工作流编码:" prop="workflowCode">
          <el-input
            v-model="workflowForm.workflowCode"
            :disabled="isEditing"
            placeholder="请输入工作流编码"
          />
        </el-form-item>
        <el-form-item label="工作流名称:" prop="workflowName">
          <el-input
            v-model="workflowForm.workflowName"
            placeholder="请输入工作流名称"
          />
        </el-form-item>
        <el-form-item label="工作流描述:" prop="workflowDesc">
          <el-input
            v-model="workflowForm.workflowDesc"
            type="textarea"
            :rows="3"
            placeholder="请输入工作流描述"
          />
        </el-form-item>
        <el-form-item label="模板编码:" prop="templateCode">
          <el-select
            v-model="workflowForm.templateCode"
            placeholder="请选择模板"
            :disabled="templates.length === 0"
            style="width: 100%"
          >
            <el-option
              v-for="template in templates"
              :key="template.templateCode"
              :label="template.templateName"
              :value="template.templateCode"
            />
          </el-select>
        </el-form-item>
        <!-- 仅在编辑模式下显示当前版本ID，且为只读 -->
        <el-form-item v-if="isEditing" label="当前版本ID:" prop="currentVersionId">
          <el-input
            v-model.number="workflowForm.currentVersionId"
            disabled
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeWorkflowModal">取消</el-button>
          <el-button type="primary" @click="saveWorkflow">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 日志管理弹窗 -->
    <el-dialog v-model="showLogsModalFlag" :title="'执行日志 - ' + currentWorkflow.workflowName" width="900px">
      <el-table :data="logs" style="width: 100%" max-height="400">
        <el-table-column prop="executionId" label="执行ID" :show-overflow-tooltip="true">
          <template #default="scope">
            {{ truncateText(scope.row.executionId, 15) }}
          </template>
        </el-table-column>
        <el-table-column prop="versionNumber" label="版本号" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间">
          <template #default="scope">
            {{ formatDate(scope.row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间">
          <template #default="scope">
            {{ formatDate(scope.row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="executionDuration" label="执行时长(ms)" />
      </el-table>

      <el-empty v-if="logs.length === 0" description="暂无执行日志" />

      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="closeLogsModal">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

const router = useRouter()

// 工作流数据
const workflows = ref([])
const logs = ref([])
const templates = ref([])

// 当前选中的工作流
const currentWorkflow = ref({})

// 弹窗控制
const showWorkflowModal = ref(false)
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

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'running': return 'info'
    default: return ''
  }
}

// 截断文本
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
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

// 获取模板列表
const loadTemplates = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/template/list`)
    if (response.ok) {
      templates.value = await response.json()
    } else {
      ElMessage.error('获取模板列表失败')
    }
  } catch (error) {
    console.error('获取模板列表异常:', error)
    ElMessage.error('获取模板列表异常: ' + error.message)
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

// 编辑工作流详情
const editWorkflowDetail = (workflow) => {
  router.push(`/editor/${workflow.id}`)
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
    if (!workflowForm.value.templateCode) {
      ElMessage.warning('请选择模板编码')
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
        body: JSON.stringify({
          id: parseInt(workflowForm.value.id),
          workflowCode: workflowForm.value.workflowCode,
          workflowName: workflowForm.value.workflowName,
          workflowDesc: workflowForm.value.workflowDesc,
          currentVersionId: workflowForm.value.currentVersionId,
          templateCode: workflowForm.value.templateCode
        })
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

// 组件挂载时加载工作流列表和模板列表
onMounted(() => {
  loadWorkflows()
  loadTemplates()
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  position: relative;
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

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
