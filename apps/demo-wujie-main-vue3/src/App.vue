<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-brand">工作流管理系统</div>
      <div class="nav-links">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'WorkflowList' }">工作流管理</router-link>
        <router-link to="/templates" class="nav-link" :class="{ active: $route.name === 'TemplateManagement' }">模板管理</router-link>
      </div>
    </nav>
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  name: 'App'
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