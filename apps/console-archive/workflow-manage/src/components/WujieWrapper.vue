<template>
  <div class="workflow-editor-frame">
    <WujieVue
      width="100%"
      height="100%"
      :name="name"
      :url="url"
      :sync="true"
      :props="workflowPropsWithApiConfig"
      @message="handleMessage"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
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

// 从localStorage获取API配置并添加到props中
const workflowPropsWithApiConfig = computed(() => {
  const apiBaseUrl = localStorage.getItem('apiBaseUrl') || 'http://127.0.0.1:48080'
  console.log('从localStorage获取API配置:', apiBaseUrl)
  const newProps = {
    ...props.workflowProps,
    apiConfig: {
      apiBaseUrl
    }
  }
  console.log('传递给子应用的完整props:', newProps)
  return newProps
})

const handleMessage = (data) => {
  console.log('WujieWrapper received message:', data);
  
  // 当子应用发送 ready 消息时表示已完全准备好
  if (data?.type === 'appReady') {
    console.log('Sub-app is ready');
    emit('ready')
  } else if (data?.type === 'componentAdded') {
    // 转发组件添加结果到主应用
    console.log('Component added result received, forwarding to main app:', data.payload);
    // 通过window.postMessage转发到主应用的AI助手
    window.postMessage({
      type: 'componentAdded',
      payload: data.payload
    }, '*')
  } else {
    console.log('Forwarding other message type:', data.type);
    emit('message', data)
  }
}

// 在组件挂载时通知主应用子应用已准备就绪
onMounted(() => {
  console.log('WujieWrapper mounted, setting up bus listeners');
  // 组件挂载后通知主应用子应用已准备就绪
  setTimeout(() => {
    if (bus) {
      bus.$emit('sub-app-mounted')
      
      // 监听子应用通过wujie bus发送的componentAdded事件
      bus.$on('componentAdded', (data) => {
        console.log('WujieWrapper received componentAdded via bus:', data);
        // 转发到主应用
        window.postMessage({
          type: 'componentAdded',
          payload: data
        }, '*')
      });
    }
  }, 100)
})

// 清理工作
onUnmounted(() => {
  // 可以在这里做一些清理工作
  console.log('WujieWrapper unmounted');
  if (bus) {
    bus.$off('componentAdded');
  }
})
</script>