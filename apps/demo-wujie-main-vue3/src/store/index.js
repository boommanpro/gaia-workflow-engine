import { defineStore } from 'pinia'

// API基础地址
const API_BASE_URL = '/api'

export const useWorkflowStore = defineStore('workflow', {
  state: () => ({
    workflows: []
  }),
  
  actions: {
    // 获取所有工作流
    async getWorkflows() {
      try {
        const response = await fetch(`${API_BASE_URL}/workflow/list`)
        if (response.ok) {
          this.workflows = await response.json()
          return this.workflows
        } else {
          console.error('获取工作流列表失败')
          return []
        }
      } catch (error) {
        console.error('获取工作流列表异常:', error)
        return []
      }
    },
    
    // 根据ID获取工作流
    async getWorkflowById(id) {
      try {
        const response = await fetch(`${API_BASE_URL}/workflow/${id}`)
        if (response.ok) {
          return await response.json()
        } else {
          console.error('获取工作流详情失败')
          return null
        }
      } catch (error) {
        console.error('获取工作流详情异常:', error)
        return null
      }
    },
    
    // 根据工作流编码获取工作流
    async getWorkflowByCode(workflowCode) {
      try {
        const response = await fetch(`${API_BASE_URL}/workflow/code/${workflowCode}`)
        if (response.ok) {
          return await response.json()
        } else {
          console.error('根据编码获取工作流详情失败')
          return null
        }
      } catch (error) {
        console.error('根据编码获取工作流详情异常:', error)
        return null
      }
    },
    
    // 添加工作流
    async addWorkflow(workflow) {
      try {
        const response = await fetch(`${API_BASE_URL}/workflow/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workflowCode: workflow.workflowCode || `workflow_${Date.now()}`,
            workflowName: workflow.name || '未命名工作流',
            workflowDesc: workflow.description || '',
            currentVersionId: workflow.currentVersionId || null,
            templateCode: workflow.templateCode || ''
          })
        })
        
        if (response.ok) {
          const newWorkflow = await response.json()
          // 更新本地缓存
          await this.getWorkflows()
          return newWorkflow
        } else {
          console.error('创建工作流失败')
          return null
        }
      } catch (error) {
        console.error('创建工作流异常:', error)
        return null
      }
    },
    
    // 更新工作流
    async updateWorkflow(id, updatedWorkflow) {
      try {
        const workflowToUpdate = await this.getWorkflowById(id)
        if (!workflowToUpdate) {
          console.error('找不到要更新的工作流')
          return null
        }
        
        const response = await fetch(`${API_BASE_URL}/workflow/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: parseInt(id),
            workflowCode: updatedWorkflow.workflowCode || workflowToUpdate.workflowCode,
            workflowName: updatedWorkflow.name || workflowToUpdate.workflowName,
            workflowDesc: updatedWorkflow.description !== undefined ? updatedWorkflow.description : workflowToUpdate.workflowDesc,
            currentVersionId: updatedWorkflow.currentVersionId !== undefined ? updatedWorkflow.currentVersionId : workflowToUpdate.currentVersionId,
            templateCode: updatedWorkflow.templateCode || workflowToUpdate.templateCode
          })
        })
        
        if (response.ok) {
          // 更新本地缓存
          await this.getWorkflows()
          return await response.json()
        } else {
          console.error('更新工作流失败')
          return null
        }
      } catch (error) {
        console.error('更新工作流异常:', error)
        return null
      }
    },
    
    // 删除工作流
    async deleteWorkflow(id) {
      try {
        const response = await fetch(`${API_BASE_URL}/workflow/delete/${id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          // 更新本地缓存
          await this.getWorkflows()
          return true
        } else {
          console.error('删除工作流失败')
          return false
        }
      } catch (error) {
        console.error('删除工作流异常:', error)
        return false
      }
    },
    
    // 创建默认工作流
    async createDefaultWorkflow() {
      const defaultWorkflow = {
        name: '默认工作流',
        description: '这是一个默认的工作流示例',
        workflowCode: `default_workflow_${Date.now()}`
      }
      
      return await this.addWorkflow(defaultWorkflow)
    }
  }
})