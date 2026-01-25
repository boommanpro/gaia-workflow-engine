<template>
  <div id="app">
    <nav class="navbar" v-if="!$route.meta.isFullScreen">
      <div class="nav-brand">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="workflow-icon">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>工作流管理系统</span>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'WorkflowManagement' }">工作流管理</router-link>
        <router-link to="/templates" class="nav-link" :class="{ active: $route.name === 'TemplateManagement' }">模板管理</router-link>
      </div>
      <!-- API配置按钮 -->
      <div class="nav-right">
        <button class="api-config-btn" @click="showApiConfig = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="setting-icon">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m12 8.66l-3.5 2.003M3.5 13.661l-3.5-2.003m0 0 3.5-2.003 3.5 2.003M10.5 4.339l3.5-2.003 3.5 2.003" />
          </svg>
          服务器配置
        </button>
      </div>
    </nav>
    <div class="main-content" v-if="!$route.meta.isFullScreen">
      <router-view />
    </div>
    <div class="full-screen-content" v-else>
      <router-view />
    </div>
    <!-- API配置弹窗 -->
    <ApiConfigModal v-model="showApiConfig" @saved="onApiConfigSaved" />
  </div>
</template>

<script>
import ApiConfigModal from './components/ApiConfigModal.vue'

export default {
  name: 'App',
  components: {
    ApiConfigModal
  },
  data() {
    return {
      showApiConfig: false
    }
  },
  mounted() {
    // 监听来自子应用的API配置请求
    window.addEventListener('openApiConfigRequested', this.handleOpenApiConfigFromChild);
  },
  unmounted() {
    // 移除事件监听器
    window.removeEventListener('openApiConfigRequested', this.handleOpenApiConfigFromChild);
  },
  methods: {
    onApiConfigSaved(apiBaseUrl) {
      console.log('API配置已保存:', apiBaseUrl);
      // 可以在这里执行一些额外的操作，如刷新页面或重新初始化应用
    },
    handleOpenApiConfigFromChild(event) {
      console.log('收到子应用的API配置请求:', event.detail);
      // 显示API配置弹窗
      this.showApiConfig = true;
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.full-screen-content {
  flex: 1;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background-color: #ffffff;
  color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border-bottom: 1px solid #f0f0f0;
  backdrop-filter: blur(10px);
}

.nav-brand {
  font-size: 1.4rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1a1a1a;
}

.workflow-icon {
  color: #409EFF;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-right {
  display: flex;
  align-items: center;
}

.api-config-btn {
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.api-config-btn:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
}

.nav-link {
  color: #6c757d;
  text-decoration: none;
  padding: 10px 16px;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-weight: 500;
  position: relative;
}

.nav-link:hover {
  color: #495057;
  background-color: #f8f9fa;
}

.nav-link.active {
  color: #409EFF;
  background-color: rgba(64, 158, 255, 0.1);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 30%;
  height: 3px;
  background-color: #409EFF;
  border-radius: 2px;
}
</style>