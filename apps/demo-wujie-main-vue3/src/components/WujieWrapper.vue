<template>
  <div class="workflow-editor-frame">
    <WujieVue
      width="100%"
      height="100%"
      :name="name"
      :url="url"
      :sync="true"
      :props="workflowProps"
      @message="handleMessage"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import WujieVue from 'wujie-vue3'
import { bus } from 'wujie'

const props = defineProps({
  name: {
    type: String,
    default: 'workflow-editor'
  },
  url: {
    type: String,
    default: import.meta.env.VITE_CHILD_APP_URL || 'http://localhost:3000'
  },
  workflowProps: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['message', 'ready'])

const handleMessage = (data) => {
  // 当子应用发送 ready 消息时表示已完全准备好
  if (data?.type === 'appReady') {
    emit('ready')
  } else {
    emit('message', data)
  }
}

// 在组件挂载时通知主应用子应用已准备就绪
onMounted(() => {
  // 组件挂载后通知主应用子应用已准备就绪
  setTimeout(() => {
    if (bus) {
      bus.$emit('sub-app-mounted')
    }
  }, 100)
})

// 清理工作
onUnmounted(() => {
  // 可以在这里做一些清理工作
})
</script>
