<template>
  <div id="app">
    <nav class="navbar" v-if="!$route.meta.isFullScreen">
      <div class="nav-brand">工作流管理系统</div>
      <div class="nav-links">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'WorkflowManagement' }">工作流管理</router-link>
        <router-link to="/templates" class="nav-link" :class="{ active: $route.name === 'TemplateManagement' }">模板管理</router-link>
      </div>
      <!-- API配置按钮 -->
      <div class="nav-right">
        <button class="api-config-btn" @click="showApiConfig = true">
          <i class="el-icon-setting"></i> 服务器配置
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
  padding: 15px 20px;
  background-color: #409eff;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,.1);
}

.nav-brand {
  font-size: 1.5em;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-right {
  display: flex;
  align-items: center;
}

.api-config-btn {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.3s;
}

.api-config-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s;
}

.nav-link:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
  color: white;
  background-color: rgba(255, 255, 255, 0.2);
}
</style>