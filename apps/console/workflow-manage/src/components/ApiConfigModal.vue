<template>
  <el-dialog
    v-model="dialogVisible"
    title="服务器地址配置"
    width="500px"
    :before-close="handleClose"
  >
    <el-form :model="form" label-width="120px" :rules="rules" ref="formRef">
      <el-form-item label="服务器地址" prop="apiBaseUrl">
        <el-input
          v-model="form.apiBaseUrl"
          placeholder="请输入服务器地址，例如: http://localhost:48080 或 https://your-domain.com"
          @input="handleInput"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSave">保存</el-button>
        <el-button @click="handleReset">重置为默认值</el-button>
      </el-form-item>
    </el-form>
    <div class="connection-status">
      <el-tag :type="statusTagType">{{ statusMessage }}</el-tag>
      <el-button 
        size="small" 
        @click="testConnection" 
        :disabled="!form.apiBaseUrl"
        style="margin-left: 10px;"
      >
        测试连接
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'ApiConfigModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'saved'],
  setup(props, { emit }) {
    // 从 localStorage 获取当前 API 地址
    const storedApiBaseUrl = localStorage.getItem('apiBaseUrl') || ''
    const defaultApiBaseUrl = 'http://127.0.0.1:48080/api'
    
    const dialogVisible = ref(props.modelValue)
    const statusMessage = ref('未测试')
    const statusTagType = ref('info')
    const formRef = ref()
    
    const form = reactive({
      apiBaseUrl: storedApiBaseUrl || defaultApiBaseUrl
    })
    
    const rules = {
      apiBaseUrl: [
        { required: true, message: '请输入服务器地址', trigger: 'blur' },
        { validator: validateUrl, trigger: 'blur' }
      ]
    }
    
    function validateUrl(rule, value, callback) {
      if (!value) {
        callback(new Error('请输入服务器地址'))
      } else {
        try {
          new URL(value)
          callback()
        } catch (e) {
          callback(new Error('请输入有效的URL地址'))
        }
      }
    }
    
    watch(() => props.modelValue, (newValue) => {
      dialogVisible.value = newValue
    })
    
    watch(dialogVisible, (newValue) => {
      emit('update:modelValue', newValue)
    })
    
    const handleInput = () => {
      // 重置状态
      statusMessage.value = '输入中...'
      statusTagType.value = 'info'
    }
    
    const handleClose = () => {
      dialogVisible.value = false
    }
    
    const handleSave = async () => {
      try {
        await formRef.value.validate()
        localStorage.setItem('apiBaseUrl', form.apiBaseUrl)
        ElMessage.success('服务器地址已保存')
        
        // 触发全局事件，通知应用其他部分API地址已更改
        window.dispatchEvent(new CustomEvent('apiBaseUrlChanged', { detail: form.apiBaseUrl }));
        
        emit('saved', form.apiBaseUrl)
        handleClose()
      } catch (error) {
        console.error('验证失败:', error)
      }
    }
    
    const handleReset = () => {
      form.apiBaseUrl = defaultApiBaseUrl
      localStorage.removeItem('apiBaseUrl')
      statusMessage.value = '已重置为默认值'
      statusTagType.value = 'warning'
    }
    
    const testConnection = async () => {
      if (!form.apiBaseUrl) {
        statusMessage.value = '请先输入服务器地址'
        statusTagType.value = 'danger'
        return
      }
      
      statusMessage.value = '正在测试...'
      statusTagType.value = 'info'
      
      try {
        // 测试连接 - 发送一个简单的请求到服务器健康检查端点
        const response = await fetch(`${form.apiBaseUrl}/health`, {
          method: 'GET',
          mode: 'cors',
          timeout: 5000 // 5秒超时
        })
        
        if (response.ok) {
          statusMessage.value = '连接成功'
          statusTagType.value = 'success'
        } else {
          statusMessage.value = `连接失败 (${response.status})`
          statusTagType.value = 'danger'
        }
      } catch (error) {
        console.error('连接测试失败:', error)
        statusMessage.value = '连接失败 (网络错误)'
        statusTagType.value = 'danger'
      }
    }
    
    return {
      dialogVisible,
      form,
      formRef,
      rules,
      statusMessage,
      statusTagType,
      handleInput,
      handleClose,
      handleSave,
      handleReset,
      testConnection
    }
  }
}
</script>

<style scoped>
.connection-status {
  margin-top: 20px;
  display: flex;
  align-items: center;
}
</style>