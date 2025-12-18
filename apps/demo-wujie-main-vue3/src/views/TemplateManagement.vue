<template>
  <div class="template-management">
    <div class="header">
      <h1>模板管理</h1>
      <button @click="showCreateModal" class="btn-primary">新建模板</button>
    </div>

    <!-- 模板列表 -->
    <div class="section">
      <h2>模板列表</h2>
      <div class="template-grid" v-if="templates.length > 0">
        <div
          class="template-card"
          v-for="template in templates"
          :key="template.id"
          @click="editTemplate(template)"
        >
          <div class="card-header">
            <h3>{{ template.templateName || '未命名模板' }}</h3>
            <div class="card-tag">模板</div>
          </div>
          <p class="template-code">{{ template.templateCode }}</p>
          <p class="template-desc">{{ template.templateDesc || '暂无描述' }}</p>
          <div class="card-meta">
            <span>创建时间: {{ formatDate(template.createdAt) }}</span>
            <span>更新时间: {{ formatDate(template.updatedAt) }}</span>
          </div>
          <div class="card-actions">
            <button @click.stop="editTemplate(template)" class="btn-secondary">编辑</button>
            <button @click.stop="deleteTemplate(template.id)" class="btn-danger">删除</button>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <p>暂无模板，点击"新建模板"开始创建</p>
      </div>
    </div>

    <!-- 创建/编辑模板弹窗 -->
    <div v-if="showTemplateModal" class="modal-overlay" @click="closeTemplateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑模板' : '新建模板' }}</h3>
          <button class="close-button" @click="closeTemplateModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>模板编码:</label>
            <input 
              v-model="templateForm.templateCode" 
              class="form-control" 
              :disabled="isEditing"
              placeholder="请输入模板编码"
            />
          </div>
          <div class="form-group">
            <label>模板名称:</label>
            <input 
              v-model="templateForm.templateName" 
              class="form-control" 
              placeholder="请输入模板名称"
            />
          </div>
          <div class="form-group">
            <label>模板描述:</label>
            <textarea 
              v-model="templateForm.templateDesc" 
              class="form-control description-editor"
              placeholder="请输入模板描述"
            ></textarea>
          </div>
          <div class="form-group">
            <label>模板数据:</label>
            <textarea 
              v-model="templateForm.templateData" 
              class="form-control template-data-editor"
              placeholder='请输入JSON格式的模板数据，例如: {"nodes":[],"edges":[]}'
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeTemplateModal" class="btn-secondary">取消</button>
          <button @click="saveTemplate" class="btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

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

// API基础地址（根据vite proxy配置）
const API_BASE_URL = '/api'

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

.section h2 {
  margin-bottom: 15px;
  color: #333;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.template-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}

.template-card:hover {
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

.template-data-editor {
  width: 100%;
  min-height: 120px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  resize: vertical;
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