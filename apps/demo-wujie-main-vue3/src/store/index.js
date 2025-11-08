import { defineStore } from 'pinia'

// 模拟本地数据库
const localStorageKey = 'workflow-db'

// 初始化本地数据
const initLocalData = () => {
  const data = localStorage.getItem(localStorageKey)
  if (!data) {
    const initialData = {
      workflows: []
    }
    localStorage.setItem(localStorageKey, JSON.stringify(initialData))
    return initialData
  }
  return JSON.parse(data)
}

// 保存数据到本地
const saveLocalData = (data) => {
  localStorage.setItem(localStorageKey, JSON.stringify(data))
}

export const useWorkflowStore = defineStore('workflow', {
  state: () => ({
    ...initLocalData()
  }),
  
  actions: {
    // 获取所有工作流
    getWorkflows() {
      const data = initLocalData()
      this.workflows = data.workflows
      return this.workflows
    },
    
    // 根据ID获取工作流
    getWorkflowById(id) {
      const data = initLocalData()
      return data.workflows.find(workflow => workflow.id === id)
    },
    
    // 添加工作流
    addWorkflow(workflow) {
      const data = initLocalData()
      const newWorkflow = {
        id: Date.now().toString(),
        name: workflow.name || '未命名工作流',
        description: workflow.description || '',
        content: workflow.content || { nodes: [], edges: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      data.workflows.push(newWorkflow)
      saveLocalData(data)
      this.workflows = data.workflows
      return newWorkflow
    },
    
    // 更新工作流
    updateWorkflow(id, updatedWorkflow) {
      const data = initLocalData()
      const index = data.workflows.findIndex(workflow => workflow.id === id)
      if (index !== -1) {
        // 保持原有的属性，只更新传入的属性
        data.workflows[index] = {
          ...data.workflows[index], // 保留原有的所有属性
          ...updatedWorkflow,       // 覆盖传入的属性
          updatedAt: new Date().toISOString()
        }
        saveLocalData(data)
        this.workflows = data.workflows
        return data.workflows[index]
      }
    },
    
    // 删除工作流
    deleteWorkflow(id) {
      const data = initLocalData()
      data.workflows = data.workflows.filter(workflow => workflow.id !== id)
      saveLocalData(data)
      this.workflows = data.workflows
    },
    
    // 创建默认工作流
    createDefaultWorkflow() {
      const defaultWorkflow = {
        name: '默认工作流',
        description: '这是一个默认的工作流示例',
        content: {
          nodes: [
            {
              id: 'start_0',
              type: 'start',
              meta: {
                position: {
                  x: 300,
                  y: 200
                }
              },
              data: {
                title: 'Start',
                description: '开始节点'
              }
            },
            {
              id: 'end_0',
              type: 'end',
              meta: {
                position: {
                  x: 300,
                  y: 400
                }
              },
              data: {
                title: 'End',
                description: '结束节点'
              }
            }
          ],
          edges: [
            {
              sourceNodeID: 'start_0',
              targetNodeID: 'end_0'
            }
          ]
        }
      }
      
      return this.addWorkflow(defaultWorkflow)
    }
  }
})