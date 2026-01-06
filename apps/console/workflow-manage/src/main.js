import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 引入Element Plus及其样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { ElMessage, ElMessageBox } from 'element-plus'

// 引入样式
import './styles.css'

// 引入微前端框架 wujie
import { setupApp } from 'wujie'
import WujieVue from 'wujie-vue3'

// 根据环境确定子应用URL
const getChildAppUrl = () => {
  // 检查是否存在环境变量
  if (import.meta.env?.VITE_CHILD_APP_URL) {
    return import.meta.env.VITE_CHILD_APP_URL
  }
  
  // 根据 NODE_ENV 环境变量判断
  const nodeEnv = process.env.NODE_ENV
  
  switch (nodeEnv) {
    case 'development':
      return 'http://localhost:3000'
    case 'test':
    case 'testing':
      return './workflow-editor'  // GitHub Pages 上的测试子应用路径
    case 'production':
      return './workflow-editor'  // GitHub Pages 上的生产子应用路径
    default:
      // 默认返回开发环境地址
      return 'http://localhost:3000'
  }
}

// 配置wujie
setupApp({
  name: 'freelayout-editor',
  url: getChildAppUrl(),
  alive: true,
  props: {
    // 可以传递给子应用的属性
  },
  // 配置通信事件
  bus: {
    // 可以在这里配置全局事件
  }
})

const app = createApp(App)
const pinia = createPinia()

// 使用 Element Plus
app.use(ElementPlus)
// 全局挂载 ElMessage 和 ElMessageBox
app.config.globalProperties.$message = ElMessage
app.config.globalProperties.$msgbox = ElMessageBox
app.config.globalProperties.$alert = ElMessageBox.alert
app.config.globalProperties.$confirm = ElMessageBox.confirm
app.config.globalProperties.$prompt = ElMessageBox.prompt

// 使用 wujie
app.use(WujieVue)
app.use(pinia)
app.use(router)

// 监听测试消息
const handleTestMessage = (data) => {
  console.log('Vue主应用收到测试消息:', data)
}

// 注册全局事件监听
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'testMessage') {
      handleTestMessage(event.data)
    }
  })
}

app.mount('#app')

// 确保根元素有正确的样式
const rootElement = document.getElementById('app')
if (rootElement) {
  rootElement.style.width = '100%'
  rootElement.style.height = '100%'
}