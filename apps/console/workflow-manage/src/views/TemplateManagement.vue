<template>
  <div class="template-management">
    <div class="header">
      <h1>模板管理</h1>
      <el-button type="primary" @click="showCreateModal" size="large">
        <template #icon>
          <el-icon><Plus /></el-icon>
        </template>
        新建模板
      </el-button>
    </div>

    <!-- 模板列表 -->
    <div class="section">
      <el-row :gutter="24">
        <el-col
          v-for="template in templates"
          :key="template.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          @click="editTemplate(template)"
          style="cursor: pointer; margin-bottom: 24px;"
        >
          <el-card class="template-card" shadow="never">
            <div class="card-header">
              <h3>
                <el-icon><Folder /></el-icon>
                {{ template.templateName || '未命名模板' }}
              </h3>
              <el-popconfirm
                title="确定要删除这个模板吗？此操作不可恢复"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="deleteTemplate(template.id)"
              >
                <template #reference>
                  <el-button class="delete-btn" type="danger" plain size="small">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
            <p class="template-code">{{ template.templateCode }}</p>
            <p class="template-desc">{{ template.templateDesc || '暂无描述' }}</p>
            <div class="card-meta">
              <div><el-icon><Calendar /></el-icon> 创建: {{ formatDate(template.createdAt) }}</div>
              <div><el-icon><Clock /></el-icon> 更新: {{ formatDate(template.updatedAt) }}</div>
            </div>
            <div class="card-actions">
              <el-button @click.stop="editTemplate(template)" size="small">编辑</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="templates.length === 0" description="暂无模板，点击'新建模板'开始创建" :image-size="120" />
    </div>

    <!-- 创建/编辑模板弹窗 -->
    <el-dialog v-model="showTemplateModal" :title="isEditing ? '编辑模板' : '新建模板'" width="600px" destroy-on-close>
      <el-form :model="templateForm" label-width="120px" size="default">
        <el-form-item label="模板编码:" prop="templateCode">
          <el-input
            v-model="templateForm.templateCode"
            :disabled="isEditing"
            placeholder="请输入模板编码"
            clearable
          />
        </el-form-item>
        <el-form-item label="模板名称:" prop="templateName">
          <el-input
            v-model="templateForm.templateName"
            placeholder="请输入模板名称"
            clearable
          />
        </el-form-item>
        <el-form-item label="模板描述:" prop="templateDesc">
          <el-input
            v-model="templateForm.templateDesc"
            type="textarea"
            :rows="4"
            placeholder="请输入模板描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="模板数据:" prop="templateData">
          <el-input
            v-model="templateForm.templateData"
            type="textarea"
            :rows="6"
            placeholder='请输入JSON格式的模板数据，例如: {"nodes":[],"edges":[]}'
            resize="vertical"
            :autosize="{ minRows: 4, maxRows: 8 }"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeTemplateModal" size="default">取消</el-button>
          <el-button type="primary" @click="saveTemplate" size="default">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus'
import { Delete, Plus, Folder, Calendar, Clock } from '@element-plus/icons-vue'
import { API_BASE_URL } from '@/utils/apiConfig'

// 模板数据
const templates = ref([])

// 弹窗控制
const showTemplateModal = ref(false)
const isEditing = ref(false)

// 表单数据
const templateForm = ref({
  id: null,
  templateCode: '',
  templateName: '',
  templateDesc: '',
  templateData: '{"nodes":[],"edges":[]}'
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
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

// 显示创建模板弹窗
const showCreateModal = () => {
  isEditing.value = false
  templateForm.value = {
    id: null,
    templateCode: '',
    templateName: '',
    templateDesc: '',
    templateData: '{"nodes":[],"edges":[]}'
  }
  showTemplateModal.value = true
}

// 编辑模板
const editTemplate = (template) => {
  isEditing.value = true
  templateForm.value = {
    id: template.id,
    templateCode: template.templateCode,
    templateName: template.templateName,
    templateDesc: template.templateDesc,
    templateData: template.templateData || '{"nodes":[],"edges":[]}'
  }
  showTemplateModal.value = true
}

// 保存模板
const saveTemplate = async () => {
  try {
    // 验证表单
    if (!templateForm.value.templateCode) {
      ElMessage.warning('请输入模板编码')
      return
    }
    if (!templateForm.value.templateName) {
      ElMessage.warning('请输入模板名称')
      return
    }

    // 验证JSON格式
    try {
      JSON.parse(templateForm.value.templateData)
    } catch (e) {
      ElMessage.warning('模板数据必须是有效的JSON格式')
      return
    }

    let response
    if (isEditing.value) {
      // 更新模板
      response = await fetch(`${API_BASE_URL}/template/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateForm.value)
      })
    } else {
      // 创建模板
      response = await fetch(`${API_BASE_URL}/template/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateCode: templateForm.value.templateCode,
          templateName: templateForm.value.templateName,
          templateDesc: templateForm.value.templateDesc,
          templateData: templateForm.value.templateData
        })
      })
    }

    if (response.ok) {
      ElMessage.success((isEditing.value ? '更新' : '创建') + '模板成功')
      closeTemplateModal()
      loadTemplates()
    } else {
      const errorText = await response.text()
      ElMessage.error((isEditing.value ? '更新' : '创建') + '模板失败: ' + errorText)
    }
  } catch (error) {
    console.error('保存模板异常:', error)
    ElMessage.error('保存模板异常: ' + error.message)
  }
}

// 删除模板
const deleteTemplate = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/template/delete/${id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      ElMessage.success('删除模板成功')
      loadTemplates()
    } else {
      ElMessage.error('删除模板失败')
    }
  } catch (error) {
    console.error('删除模板异常:', error)
    ElMessage.error('删除模板异常: ' + error.message)
  }
}

// 关闭模板弹窗
const closeTemplateModal = () => {
  showTemplateModal.value = false
}

// 组件挂载时加载模板列表
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
/* 现代化模板管理页面样式 */
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

.template-card {
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

.template-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #67C23A, #409EFF);
  opacity: 0;
  transition: opacity 0.3s;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.template-card:hover::before {
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

.template-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  margin: 12px 0;
  color: #666;
  font-size: 13px;
  border: 1px solid #e8eaed;
}

.template-desc {
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
