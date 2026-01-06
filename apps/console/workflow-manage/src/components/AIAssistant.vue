<template>
  <div class="ai-assistant-container">
    <!-- 悬浮按钮 -->
    <div
      class="ai-float-button"
      @click="toggleDialog"
      :class="{ 'active': isDialogOpen }"
    >
      <div class="ai-icon">🤖</div>
      <span v-if="isDialogOpen" class="ai-label">AI助手</span>
    </div>

    <!-- AI对话弹窗 -->
    <div
      v-if="isDialogOpen"
      class="ai-dialog"
      :class="{ 'minimized': isMinimized }"
    >
      <div class="ai-dialog-header" @dblclick="toggleMinimize">
        <div class="ai-dialog-title">AI工作流助手</div>
        <div class="ai-dialog-controls">
          <button class="control-btn minimize-btn" @click="toggleMinimize">
            {{ isMinimized ? '❐' : '−' }}
          </button>
          <button class="control-btn close-btn" @click="closeDialog">×</button>
        </div>
      </div>

      <div v-if="!isMinimized" class="ai-dialog-body">
        <div class="ai-messages" ref="messagesContainer">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.sender]"
          >
            <div class="message-avatar">
              {{ msg.sender === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="message-content">
              <div v-if="msg.type === 'text'" class="message-text">{{ msg.content }}</div>
              <div v-else-if="msg.type === 'component-suggestion'" class="component-suggestion">
                <p>{{ msg.content }}</p>
                <div class="suggested-components">
                  <div
                    v-for="comp in msg.components"
                    :key="comp.id"
                    class="suggested-component"
                    @click="addComponent(comp)"
                  >
                    <div class="comp-icon">{{ comp.icon }}</div>
                    <div class="comp-info">
                      <div class="comp-name">{{ comp.name }}</div>
                      <div class="comp-desc">{{ comp.description }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="ai-input-area">
          <textarea
            v-model="inputMessage"
            @keydown.enter="handleEnter"
            placeholder="向AI助手描述您需要的工作流组件..."
            class="ai-input"
          ></textarea>
          <button @click="sendMessage" class="send-btn">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { bus } from 'wujie'

const isDialogOpen = ref(false)
const isMinimized = ref(false)
const inputMessage = ref('')
const messages = ref([
  {
    sender: 'ai',
    type: 'text',
    content: '您好！我是AI工作流助手，可以帮助您添加组件到工作流中。请告诉我您需要什么样的组件或功能。'
  }
])

const messagesContainer = ref(null)

// 模拟AI响应的组件建议
const componentSuggestions = {
  '条件判断': {
    id: 'condition',
    name: '条件判断',
    description: '根据条件执行不同分支',
    icon: '🔍',
    data: {
      type: 'condition',
      label: '条件判断',
      data: { condition: 'x > 10' }
    }
  },
  '数据处理': {
    id: 'dataProcessor',
    name: '数据处理器',
    description: '对数据进行处理和转换',
    icon: '⚙️',
    data: {
      type: 'dataProcessor',
      label: '数据处理器',
      data: { operation: 'transform' }
    }
  },
  'API调用': {
    id: 'apiCall',
    name: 'API调用',
    description: '调用外部API获取数据',
    icon: '🌐',
    data: {
      type: 'apiCall',
      label: 'API调用',
      data: { url: 'https://api.example.com', method: 'GET' }
    }
  },
  '消息通知': {
    id: 'notification',
    name: '消息通知',
    description: '发送通知消息',
    icon: '🔔',
    data: {
      type: 'notification',
      label: '消息通知',
      data: { type: 'email', content: '通知内容' }
    }
  },
  '循环处理': {
    id: 'loop',
    name: '循环处理',
    description: '循环处理数据集合',
    icon: '🔄',
    data: {
      type: 'loop',
      label: '循环处理',
      data: { collection: 'items', action: 'process' }
    }
  }
}

const toggleDialog = () => {
  isDialogOpen.value = !isDialogOpen.value
}

const closeDialog = () => {
  isDialogOpen.value = false
}

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

const handleEnter = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return

  // 添加用户消息
  messages.value.push({
    sender: 'user',
    type: 'text',
    content: inputMessage.value
  })

  const userMessage = inputMessage.value
  inputMessage.value = ''

  // 滚动到最新消息
  await nextTick()
  scrollToBottom()

  // 模拟AI处理
  setTimeout(() => {
    handleAIResponse(userMessage)
  }, 1000)
}

const handleAIResponse = (userMessage) => {
  // 简单的关键词匹配逻辑
  const lowerCaseMsg = userMessage.toLowerCase()

  // 检查是否包含组件相关的关键词
  const matchedComponents = []

  Object.keys(componentSuggestions).forEach(key => {
    if (lowerCaseMsg.includes(key.toLowerCase()) ||
        lowerCaseMsg.includes(componentSuggestions[key].name.toLowerCase()) ||
        lowerCaseMsg.includes(componentSuggestions[key].description.toLowerCase())) {
      matchedComponents.push(componentSuggestions[key])
    }
  })

  // 如果没有匹配到特定组件，提供所有组件选项
  if (matchedComponents.length === 0) {
    messages.value.push({
      sender: 'ai',
      type: 'component-suggestion',
      content: '我理解您想要创建工作流组件。以下是一些常用的组件类型，您可以选择添加：',
      components: Object.values(componentSuggestions)
    })
  } else {
    messages.value.push({
      sender: 'ai',
      type: 'component-suggestion',
      content: `根据您的需求，我建议添加以下组件：`,
      components: matchedComponents
    })
  }

  // 滚动到最新消息
  nextTick(() => {
    scrollToBottom()
  })
}

const addComponent = (component) => {
  console.log('Adding component:', component);
  // 通过wujie bus发送消息到微前端子应用，添加组件
  if (bus) {
    console.log('Emitting addWorkflowComponent event via bus:', component);
    bus.$emit('addWorkflowComponent', component)

    messages.value.push({
      sender: 'ai',
      type: 'text',
      content: `正在向工作流添加 "${component.name}" 组件...`
    })

    nextTick(() => {
      scrollToBottom()
    })
  } else {
    console.error('Bus is not available');
    messages.value.push({
      sender: 'ai',
      type: 'text',
      content: `错误：通信总线不可用`
    })
    nextTick(() => {
      scrollToBottom()
    })
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 处理来自子应用的消息
const handleSubAppMessage = (event) => {
  console.log('AIAssistant received message from sub-app:', event.data);
  if (event.data && event.data.type === 'componentAdded') {
    const payload = event.data.payload;
    if (payload.success) {
      messages.value.push({
        sender: 'ai',
        type: 'text',
        content: payload.message || `组件已成功添加到工作流中。`
      })
    } else {
      messages.value.push({
        sender: 'ai',
        type: 'text',
        content: payload.message || `添加组件时发生错误: ${payload.error}`
      })
    }

    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 监听来自子应用的消息
onMounted(() => {
  console.log('AIAssistant mounted, setting up message listeners');
  // 监听来自iframe子应用的消息
  window.addEventListener('message', handleSubAppMessage)

  if (bus) {
    console.log('Bus is available, setting up bus listeners');
    bus.$on('aiAssistantRequest', (data) => {
      console.log('收到子应用AI请求:', data)
      // 处理来自子应用的AI请求
    })
  } else {
    console.error('Bus is not available in AIAssistant');
  }
})

onUnmounted(() => {
  console.log('AIAssistant unmounted, cleaning up message listeners');
  // 移除事件监听器
  window.removeEventListener('message', handleSubAppMessage)

  if (bus) {
    bus.$off('aiAssistantRequest')
  }
})
</script>

<style scoped>
.ai-assistant-container {
  position: fixed;
  bottom: 100px;
  right: 20px;
  z-index: 9999;
}

.ai-float-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
}

.ai-float-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.ai-float-button.active {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
}

.ai-icon {
  font-size: 24px;
}

.ai-label {
  position: absolute;
  right: 70px;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.ai-dialog {
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 600px;
}

.ai-dialog.minimized {
  width: auto;
  height: auto;
  max-height: none;
}

.ai-dialog-header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.ai-dialog-title {
  font-weight: bold;
  font-size: 14px;
}

.ai-dialog-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ai-dialog-body {
  display: flex;
  flex-direction: column;
  height: 400px;
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f9f9f9;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 90%;
}

.message.user {
  align-self: flex-end;
}

.message-ai {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.message.user .message-avatar {
  background: #667eea;
  color: white;
}

.message-ai .message-avatar {
  background: #764ba2;
  color: white;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-text {
  background: white;
  padding: 10px 14px;
  border-radius: 18px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  line-height: 1.4;
}

.message.user .message-text {
  background: #667eea;
  color: white;
  border-bottom-right-radius: 4px;
}

.message-ai .message-text {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
}

.component-suggestion {
  background: white;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  line-height: 1.4;
}

.suggested-components {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggested-component {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggested-component:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateY(-2px);
}

.comp-icon {
  font-size: 20px;
}

.comp-info {
  flex: 1;
}

.comp-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.comp-desc {
  font-size: 12px;
  color: #666;
}

.ai-input-area {
  padding: 16px;
  border-top: 1px solid #e9ecef;
  background: white;
  display: flex;
  gap: 8px;
}

.ai-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  resize: none;
  height: 40px;
  font-size: 14px;
  outline: none;
}

.ai-input:focus {
  border-color: #667eea;
}

.send-btn {
  padding: 10px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.send-btn:hover {
  background: #5a6fd8;
}

/* 滚动条样式 */
.ai-messages::-webkit-scrollbar {
  width: 6px;
}

.ai-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.ai-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.ai-messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
