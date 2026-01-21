import { ref } from 'vue'
import { bus } from 'wujie'
import { useWorkflowStore } from '../store'
import { API_BASE_URL } from '@/utils/apiConfig'

export function useWorkflowCommunication(workflowData, emits) {
  const subAppMounted = ref(false)
  const workflowStore = useWorkflowStore()
  let versionPromiseResolver = null

  // 发送工作流数据给微前端应用
  const sendWorkflowDataToMicroApp = () => {
    if (workflowData.value && bus) {
      console.log('发送工作流数据给子应用:', workflowData.value)
      try {
        bus.$emit('loadWorkflow', {
          type: 'loadWorkflow',
          payload: workflowData.value
        })
        console.log('已发送工作流数据给子应用')
      } catch (error) {
        console.error('发送工作流数据失败:', error)
      }
    } else if (!bus) {
      console.warn('bus未定义，无法发送数据')
    } else {
      console.log('没有工作流数据可以发送给子应用')
    }
  }

  const handleSubAppMounted = (data) => {
    console.log('子应用挂载完成:', data)
    subAppMounted.value = true
    // 注意：不在这里直接发送数据，而是在主组件中统一控制
    // 只有当数据加载完成且子应用已挂载时才发送数据
  }

  const handleWorkflowLoaded = (data) => {
    console.log('子应用加载完成:', data)
  }

  const handleWorkflowSaved = (data) => {
    console.log('子应用保存完成:', data)
    // 可以在这里处理保存完成后的逻辑
    if (data.success && data.content) {
     saveWorkflowVersion(data.content).then(r => {});
    }
  }

  // 保存工作流版本
  const saveWorkflowVersion = async (content) => {
    try {
      // 显示弹窗让用户输入版本信息
      const versionInfo = await showVersionInputDialog();

      if (!versionInfo) {
        console.log('用户取消了版本保存');
        return;
      }

      // 如果有当前工作流数据，则创建新版本
      if (workflowData.value && workflowData.value.id) {
        const result = await createWorkflowVersion(
          workflowData.value.id,
          workflowData.value.workflowCode,
          {
            versionNumber: versionInfo.versionNumber,
            versionDesc: versionInfo.versionDesc,
            workflowData: JSON.stringify(content),
            createdBy: 'admin', // 实际项目中应该从用户信息中获取
            isCurrent: 1
          }
        );

        if (result) {
          console.log('工作流版本保存成功:', result);
          // 可以在这里添加成功提示
        } else {
          console.error('工作流版本保存失败');
          // 可以在这里添加失败提示
        }
      } else {
        console.warn('缺少工作流信息，无法保存版本');
      }
    } catch (error) {
      console.error('保存工作流版本时发生错误:', error);
    }
  };

  // 显示版本信息输入弹窗（模拟实现）
  const showVersionInputDialog = () => {
    // 通知父组件显示模态框
    return new Promise((resolve) => {
      versionPromiseResolver = resolve
      emits('showVersionModal')
    })
  }

  // 处理版本信息确认
  const handleVersionConfirm = (versionInfo) => {
    if (versionPromiseResolver) {
      versionPromiseResolver(versionInfo)
      versionPromiseResolver = null
    }
  }

  // 处理版本信息取消
  const handleVersionCancel = () => {
    if (versionPromiseResolver) {
      versionPromiseResolver(null)
      versionPromiseResolver = null
    }
  }

  // 创建工作流版本
  async function createWorkflowVersion(workflowId, workflowCode, versionData) {
    try {
      const response = await fetch(`${API_BASE_URL}/workflow-version/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowCode: workflowCode,
          versionNumber: versionData.versionNumber,
          versionDesc: versionData.versionDesc,
          workflowData: versionData.workflowData,
          createdBy: versionData.createdBy,
          isCurrent: versionData.isCurrent
        })
      });

      if (response.ok) {
        const newVersion = await response.json();
        console.log('新版本已创建:', newVersion);
        return newVersion;
      } else {
        console.error('创建工作流版本失败:', response.status);
        return null;
      }
    } catch (error) {
      console.error('创建工作流版本异常:', error);
      return null;
    }
  }

  // 保存工作流
  const handleSaveWorkflow = async (data) => {
    console.log('处理保存工作流请求:', data)
    if (data.id && data.id !== 'new') {
      // 更新现有工作流
      const updatedWorkflow = await updateWorkflow(data.id, {
        name: data.name || '未命名工作流',
        description: data.description || '',
        content: data.content || data
      })
      console.log('工作流已更新:', updatedWorkflow)

      // 通知子应用保存成功
      if (bus) {
        bus.$emit('workflowSaveSuccess', {
          type: 'workflowSaveSuccess',
          payload: { success: true, id: data.id }
        })
      }

      // 通知父组件工作流已更新
      emits('workflowUpdated')
    } else {
      // 创建新工作流
      const result = await createWorkflow({
        name: data.name || '未命名工作流',
        description: data.description || '',
        content: data.content || data
      })

      console.log('新工作流已创建:', result)
      // 通知父组件ID已生成
      emits('workflowCreated', result.id)

      // 通知子应用保存成功
      if (bus) {
        bus.$emit('workflowSaveSuccess', {
          type: 'workflowSaveSuccess',
          payload: { success: true, id: result.id }
        })
      }
    }
  }

  // 获取工作流数据
  const handleGetWorkflow = () => {
    console.log('处理获取工作流请求')
    return workflowData.value ? workflowData.value.content : null
  }

  // 创建新工作流
  async function createWorkflow(workflow) {
    try {
      // 首先创建工作流
      const workflowResponse = await fetch(`${API_BASE_URL}/workflow/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowCode: `workflow_${Date.now()}`,
          workflowName: workflow.name || '未命名工作流',
          workflowDesc: workflow.description || '',
          currentVersionId: null,
          templateCode: ''
        })
      })

      if (workflowResponse.ok) {
        const newWorkflow = await workflowResponse.json()

        // 然后创建工作流版本
        const versionResponse = await fetch(`${API_BASE_URL}/workflow-version/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            workflowCode: newWorkflow.workflowCode,
            versionNumber: 'v1.0',
            versionDesc: '初始版本',
            workflowData: JSON.stringify(workflow.content || {}),
            createdBy: 'admin',
            isCurrent: 1
          })
        })

        if (versionResponse.ok) {
          const newVersion = await versionResponse.json()
          console.log('新工作流及版本已创建:', newWorkflow, newVersion)
          return newWorkflow
        } else {
          console.error('创建工作流版本失败')
          return null
        }
      } else {
        console.error('创建工作流失败')
        return null
      }
    } catch (error) {
      console.error('创建工作流异常:', error)
      return null
    }
  }

  // 更新工作流
  async function updateWorkflow(id, updatedWorkflow) {
    try {
      // 首先获取现有工作流信息
      const workflowToUpdate = await workflowStore.getWorkflowById(id)
      if (!workflowToUpdate) {
        console.error('找不到要更新的工作流')
        return null
      }

      // 更新工作流基本信息
      const workflowResponse = await fetch(`${API_BASE_URL}/workflow/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: parseInt(id),
          workflowCode: workflowToUpdate.workflowCode,
          workflowName: updatedWorkflow.name || workflowToUpdate.workflowName,
          workflowDesc: updatedWorkflow.description !== undefined ? updatedWorkflow.description : workflowToUpdate.workflowDesc,
          currentVersionId: workflowToUpdate.currentVersionId,
          templateCode: workflowToUpdate.templateCode
        })
      })

      if (!workflowResponse.ok) {
        console.error('更新工作流失败')
        return null
      }

      // 创建新的工作流版本
      const versionResponse = await fetch(`${API_BASE_URL}/workflow-version/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowCode: workflowToUpdate.workflowCode,
          versionNumber: `v${Date.now()}`,
          versionDesc: '更新版本',
          workflowData: JSON.stringify(updatedWorkflow.content || {}),
          createdBy: 'admin',
          isCurrent: 1
        })
      })

      if (versionResponse.ok) {
        const updatedResult = await workflowResponse.json()
        const newVersion = await versionResponse.json()
        console.log('工作流及版本已更新:', updatedResult, newVersion)
        return updatedResult
      } else {
        console.error('更新工作流版本失败')
        return null
      }
    } catch (error) {
      console.error('更新工作流异常:', error)
      return null
    }
  }

  return {
    subAppMounted,
    handleSubAppMounted,
    handleWorkflowLoaded,
    handleWorkflowSaved,
    handleSaveWorkflow,
    handleGetWorkflow,
    handleVersionConfirm,
    handleVersionCancel,
    sendWorkflowDataToMicroApp
  }
}
