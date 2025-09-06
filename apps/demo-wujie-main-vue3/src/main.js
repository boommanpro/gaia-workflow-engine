import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 引入样式
import './styles.css'

// 引入微前端框架 wujie
import { setupApp } from 'wujie'
import WujieVue from 'wujie-vue3'

// 配置wujie
setupApp({
  name: 'freelayout-editor',
  url: 'http://localhost:3000',
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