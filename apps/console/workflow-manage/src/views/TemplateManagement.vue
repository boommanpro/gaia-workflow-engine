<template>
  <div class="template-management">
    <div class="header">
      <h1>模板管理</h1>
      <el-button type="primary" @click="showCreateModal">新建模板</el-button>
    </div>

    <!-- 模板列表 -->
    <div class="section">
      <el-row :gutter="20">
        <el-col
          v-for="template in templates"
          :key="template.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          @click="editTemplate(template)"
          style="cursor: pointer; margin-bottom: 20px;"
        >
          <el-card class="template-card" shadow="hover">
            <div class="card-header">
              <h3>{{ template.templateName || '未命名模板' }}</h3>
              <el-icon class="delete-icon" @click.stop="deleteTemplate(template.id)">
                <Delete />
              </el-icon>
            </div>
            <p class="template-code">{{ template.templateCode }}</p>
            <p class="template-desc">{{ template.templateDesc || '暂无描述' }}</p>
            <div class="card-meta">
              <div>创建时间: {{ formatDate(template.createdAt) }}</div>
              <div>更新时间: {{ formatDate(template.updatedAt) }}</div>
            </div>
            <div class="card-actions">
              <el-button @click.stop="editTemplate(template)">编辑</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="templates.length === 0" description="暂无模板，点击'新建模板'开始创建" />
    </div>

    <!-- 创建/编辑模板弹窗 -->
    <el-dialog v-model="showTemplateModal" :title="isEditing ? '编辑模板' : '新建模板'" width="600px">
      <el-form :model="templateForm" label-width="100px">
        <el-form-item label="模板编码:" prop="templateCode">
          <el-input
            v-model="templateForm.templateCode"
            :disabled="isEditing"
            placeholder="请输入模板编码"
          />
        </el-form-item>
        <el-form-item label="模板名称:" prop="templateName">
          <el-input
            v-model="templateForm.templateName"
            placeholder="请输入模板名称"
          />
        </el-form-item>
        <el-form-item label="模板描述:" prop="templateDesc">
          <el-input
            v-model="templateForm.templateDesc"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        <el-form-item label="模板数据:" prop="templateData">
          <el-input
            v-model="templateForm.templateData"
            type="textarea"
            :rows="5"
            placeholder='请输入JSON格式的模板数据，例如: {"nodes":[],"edges":[]}'
            resize="vertical"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeTemplateModal">取消</el-button>
          <el-button type="primary" @click="saveTemplate">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
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
const deleteTemplate = (id) => {
  ElMessageBox.confirm('确定要删除这个模板吗？此操作不可恢复', '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
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
  }).catch(() => {
    // 用户取消删除
  })
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

.template-code {
  font-family: monospace;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}

.template-desc {
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
}
</style>
