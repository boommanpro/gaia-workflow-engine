<template>
  <div class="workflow-management">
    <div class="header">
      <h1>工作流管理</h1>
      <el-button type="primary" @click="showCreateModal" size="large">
        <template #icon>
          <el-icon><Plus /></el-icon>
        </template>
        新建工作流
      </el-button>
    </div>

    <!-- 工作流列表 -->
    <div class="section">
      <el-row :gutter="24">
        <el-col
          v-for="workflow in workflows"
          :key="workflow.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          @click="editWorkflowDetail(workflow)"
          style="margin-bottom: 24px; cursor: pointer;"
        >
          <el-card class="workflow-card" shadow="never">
            <div class="card-header">
              <h3>
                <el-icon><Document /></el-icon>
                {{ workflow.workflowName || '未命名工作流' }}
              </h3>
              <el-popconfirm
                title="确定要删除这个工作流吗？此操作不可恢复"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="deleteWorkflow(workflow.id)"
              >
                <template #reference>
                  <el-button class="delete-btn" type="danger" plain size="small">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
            <p class="workflow-code">{{ workflow.workflowCode }}</p>
            <p class="workflow-desc">{{ workflow.workflowDesc || '暂无描述' }}</p>
            <div class="card-meta">
              <div><el-icon><FolderOpened /></el-icon> 模板编码: {{ workflow.templateCode }}</div>
              <div><el-icon><Tickets /></el-icon> 当前版本: {{ workflow.currentVersionId }}</div>
              <div><el-icon><Calendar /></el-icon> 创建: {{ formatDate(workflow.createdAt) }}</div>
              <div><el-icon><Clock /></el-icon> 更新: {{ formatDate(workflow.updatedAt) }}</div>
            </div>
            <div class="card-actions">
              <el-button @click.stop="editWorkflow(workflow)" size="small">编辑</el-button>
              <el-button @click.stop="showLogsModal(workflow)" size="small" type="info">查看日志</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="workflows.length === 0" description="暂无工作流，点击'新建工作流'开始创建" :image-size="120" />
    </div>

    <!-- 创建/编辑工作流弹窗 -->
    <el-dialog v-model="showWorkflowModal" :title="isEditing ? '编辑工作流' : '新建工作流'" width="600px" destroy-on-close>
      <el-form :model="workflowForm" label-width="120px" size="default">
        <el-form-item label="工作流编码:" prop="workflowCode">
          <el-input
            v-model="workflowForm.workflowCode"
            :disabled="isEditing"
            placeholder="请输入工作流编码"
            clearable
          />
        </el-form-item>
        <el-form-item label="工作流名称:" prop="workflowName">
          <el-input
            v-model="workflowForm.workflowName"
            placeholder="请输入工作流名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="工作流描述:" prop="workflowDesc">
          <el-input
            v-model="workflowForm.workflowDesc"
            type="textarea"
            :rows="4"
            placeholder="请输入工作流描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="模板编码:" prop="templateCode">
          <el-select
            v-model="workflowForm.templateCode"
            placeholder="请选择模板"
            :disabled="templates.length === 0"
            style="width: 100%"
            clearable
            filterable
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
          <el-button @click="closeWorkflowModal" size="default">取消</el-button>
          <el-button type="primary" @click="saveWorkflow" size="default">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 日志管理弹窗 -->
    <el-dialog v-model="showLogsModalFlag" :title="'执行日志 - ' + currentWorkflow.workflowName" width="900px" destroy-on-close>
      <el-table :data="logs" style="width: 100%" max-height="400" stripe>
        <el-table-column prop="executionId" label="执行ID" :show-overflow-tooltip="true">
          <template #default="scope">
            {{ truncateText(scope.row.executionId, 15) }}
          </template>
        </el-table-column>
        <el-table-column prop="versionNumber" label="版本号" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" effect="light">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="executionDuration" label="执行时长(ms)" width="140" />
      </el-table>

      <el-empty v-if="logs.length === 0" description="暂无执行日志" />

      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="closeLogsModal" size="default">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus'
import { Delete, Plus, Document, FolderOpened, Tickets, Calendar, Clock } from '@element-plus/icons-vue'
import { API_BASE_URL } from '@/utils/apiConfig'

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
    default: return 'info'
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
const deleteWorkflow = async (id) => {
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
/* 现代化工作流管理页面样式 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section {
  margin-bottom: 32px;
}

.section h2 {
  margin-bottom: 15px;
  color: #333;
}

.workflow-card {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  background: #ffffff;
}

.workflow-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
  opacity: 0;
  transition: opacity 0.3s;
}

.workflow-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.workflow-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  position: relative;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.delete-icon {
  cursor: pointer;
  color: #f56c6c;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.delete-icon:hover {
  background-color: #fef0ef;
}

.workflow-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  margin: 12px 0;
  color: #666;
  font-size: 13px;
  border: 1px solid #e8eaed;
}

.workflow-desc {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f5f5;
}

.card-meta div {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .workflow-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
