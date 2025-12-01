import React, { useState, useEffect, useLayoutEffect } from 'react'
import { Card, Typography, Button, InputNumber, Input, message, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { useAppContext } from '../contexts/AppContext'
import type { ReagentFactor } from '../contexts/AppContext'
import AddReagentModal from '../components/AddReagentModal'
import './FactorsPage.css'

const { Title } = Typography

// 预定义的试剂数据(基于您提供的表格)
const PREDEFINED_REAGENTS: ReagentFactor[] = [
  { id: '1', name: 'Acetone', density: 0.791, releasePotential: 0.698, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.297, irritation: 0.625, chronicToxicity: 0.184, persistency: 0.126, airHazard: 0.184, waterHazard: 0.000, safetyScore: 1.995, healthScore: 0.809, envScore: 0.310, regeneration: 0, disposal: 2 },
  { id: '2', name: 'Acetonitrile', density: 0.786, releasePotential: 0.615, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.510, irritation: 0.625, chronicToxicity: 0.431, persistency: 0.341, airHazard: 0.431, waterHazard: 0.000, safetyScore: 2.724, healthScore: 1.056, envScore: 0.772, regeneration: 0, disposal: 2 },
  { id: '3', name: 'Chloroform', density: 1.483, releasePotential: 0.684, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.394, irritation: 0.625, chronicToxicity: 0.800, persistency: 0.457, airHazard: 0.800, waterHazard: 0.178, safetyScore: 1.077, healthScore: 1.425, envScore: 1.435, regeneration: 0, disposal: 2 },
  { id: '4', name: 'CO2', density: 0, releasePotential: 0, fireExplos: 0, reactDecom: 0, acuteToxicity: 0, irritation: 0, chronicToxicity: 0, persistency: 0, airHazard: 0, waterHazard: 0, safetyScore: 0, healthScore: 0, envScore: 0, regeneration: 0, disposal: 0 },
  { id: '5', name: 'Dichloromethane', density: 1.327, releasePotential: 0.753, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.265, irritation: 0.349, chronicToxicity: 0.289, persistency: 0.023, airHazard: 0.289, waterHazard: 0.031, safetyScore: 2.618, healthScore: 0.638, envScore: 0.343, regeneration: 0, disposal: 2 },
  { id: '6', name: 'Ethanol', density: 0.789, releasePotential: 0.580, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.292, irritation: 0.000, chronicToxicity: 0.204, persistency: 0.282, airHazard: 0.204, waterHazard: 0.000, safetyScore: 1.872, healthScore: 0.204, envScore: 0.485, regeneration: 0, disposal: 2 },
  { id: '7', name: 'Ethyl acetate', density: 0.902, releasePotential: 0.619, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.276, irritation: 0.625, chronicToxicity: 0.171, persistency: 0.026, airHazard: 0.171, waterHazard: 0.003, safetyScore: 1.895, healthScore: 0.796, envScore: 0.199, regeneration: 0, disposal: 2 },
  { id: '8', name: 'Heptane', density: 0.684, releasePotential: 0.557, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.368, irritation: 0.625, chronicToxicity: 0.159, persistency: 0.430, airHazard: 0.159, waterHazard: 0.500, safetyScore: 1.925, healthScore: 0.784, envScore: 1.089, regeneration: 0, disposal: 2 },
  { id: '9', name: 'Hexane (n)', density: 0.659, releasePotential: 0.661, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.343, irritation: 0.625, chronicToxicity: 0.349, persistency: 0.426, airHazard: 0.349, waterHazard: 0.325, safetyScore: 2.004, healthScore: 0.974, envScore: 1.100, regeneration: 0, disposal: 2 },
  { id: '10', name: 'Isooctane', density: 0.692, releasePotential: 0.630, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.330, chronicToxicity: 0.000, persistency: 0.680, airHazard: 0.000, waterHazard: 0.875, safetyScore: 1.630, healthScore: 0.330, envScore: 1.555, regeneration: 0, disposal: 2 },
  { id: '11', name: 'Isopropanol', density: 0.785, releasePotential: 0.556, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.318, irritation: 0.625, chronicToxicity: 0.260, persistency: 0.280, airHazard: 0.260, waterHazard: 0.000, safetyScore: 1.874, healthScore: 0.885, envScore: 0.540, regeneration: 0, disposal: 2 },
  { id: '12', name: 'Methanol', density: 0.791, releasePotential: 0.646, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.267, irritation: 0.113, chronicToxicity: 0.317, persistency: 0.000, airHazard: 0.317, waterHazard: 0.000, safetyScore: 1.912, healthScore: 0.430, envScore: 0.317, regeneration: 0, disposal: 2 },
  { id: '13', name: 'Sulfuric acid 96%', density: 1.84, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.956, irritation: 1.000, chronicToxicity: 1.000, persistency: 0.485, airHazard: 1.000, waterHazard: 0.500, safetyScore: 1.756, healthScore: 2.000, envScore: 1.985, regeneration: 0, disposal: 2 },
  { id: '14', name: 't-butyl methyl ether', density: 0.74, releasePotential: 0.720, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.220, chronicToxicity: 0.350, persistency: 0.710, airHazard: 0.350, waterHazard: 0.090, safetyScore: 1.720, healthScore: 0.570, envScore: 1.150, regeneration: 0, disposal: 2 },
  { id: '15', name: 'Tetrahydrofuran', density: 0.889, releasePotential: 0.667, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.298, irritation: 0.625, chronicToxicity: 0.365, persistency: 0.535, airHazard: 0.365, waterHazard: 0.000, safetyScore: 1.965, healthScore: 0.990, envScore: 0.900, regeneration: 0, disposal: 2 },
  { id: '16', name: 'Water', density: 0, releasePotential: 0, fireExplos: 0, reactDecom: 0, acuteToxicity: 0, irritation: 0, chronicToxicity: 0, persistency: 0, airHazard: 0, waterHazard: 0, safetyScore: 0, healthScore: 0, envScore: 0, regeneration: 0, disposal: 0 },
]

const FACTORS_DATA_VERSION = 5 // Increment this when PREDEFINED_REAGENTS changes

const FactorsPage: React.FC = () => {
  const { data, updateFactorsData, setIsDirty } = useAppContext()
  
  // Check if factors data needs update
  const checkAndUpdateFactorsData = (existingFactors: ReagentFactor[]) => {
    const storedVersion = localStorage.getItem('hplc_factors_version')
    const currentVersion = FACTORS_DATA_VERSION.toString()
    
    // If version doesn't match or missing reagents, update to latest
    if (storedVersion !== currentVersion) {
      console.log('🔄 FactorsPage: Updating factors data to version', currentVersion)
      localStorage.setItem('hplc_factors_version', currentVersion)
      return [...PREDEFINED_REAGENTS]
    }
    
    // Check if CO2 and Water exist
    const hasCO2 = existingFactors.some(f => f.name === 'CO2')
    const hasWater = existingFactors.some(f => f.name === 'Water')
    
    if (!hasCO2 || !hasWater) {
      console.log('🔄 FactorsPage: Missing CO2 or Water, updating to complete data')
      return [...PREDEFINED_REAGENTS]
    }
    
    // Check if data has sub-factor values (not all zeros)
    // Skip CO2 and Water as they legitimately have all zeros
    const hasValidSubFactors = existingFactors.some(f => 
      (f.name !== 'CO2' && f.name !== 'Water') && 
      (f.releasePotential > 0 || f.fireExplos > 0 || f.reactDecom > 0 || 
       f.acuteToxicity > 0 || f.irritation > 0 || f.chronicToxicity > 0 ||
       f.persistency > 0 || f.airHazard > 0 || f.waterHazard > 0)
    )
    
    if (!hasValidSubFactors) {
      console.log('🔄 FactorsPage: All sub-factors are zero, updating to complete data')
      localStorage.setItem('hplc_factors_version', currentVersion)
      return [...PREDEFINED_REAGENTS]
    }
    
    return existingFactors
  }
  
  // 使用Context中的数据初始化
  const [reagents, setReagents] = useState<ReagentFactor[]>(() => {
    // 如果Context中有数据就使用，否则使用预定义数据
    if (data.factors.length > 0) {
      return checkAndUpdateFactorsData(data.factors)
    }
    return [...PREDEFINED_REAGENTS]
  })
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false)

  // 监听Context数据变化，立即同步更新
  const lastSyncedFactors = React.useRef<string>('')
  const hasInitialized = React.useRef(false)
  
  useLayoutEffect(() => {
    const currentFactorsStr = JSON.stringify(data.factors)
    
    // 如果数据没有变化，跳过更新
    if (lastSyncedFactors.current === currentFactorsStr) {
      return
    }
    
    lastSyncedFactors.current = currentFactorsStr
    
    if (data.factors.length === 0 && !hasInitialized.current) {
      // 只在第一次遇到空数据时使用预定义数据
      hasInitialized.current = true
      console.log('🔄 FactorsPage: 检测到空数据，使用预定义试剂列表')
      const updatedReagents = [...PREDEFINED_REAGENTS]
      setReagents(updatedReagents)
      // 立即同步到Context，避免其他页面读取到空数据
      updateFactorsData(updatedReagents)
      // 🔥 立即写入localStorage，避免MethodsPage读取时为空
      localStorage.setItem('hplc_factors_data', JSON.stringify(updatedReagents))
      localStorage.setItem('hplc_factors_version', FACTORS_DATA_VERSION.toString())
      console.log('✅ FactorsPage: 已立即写入localStorage')
      // 🔥 触发事件通知其他页面factors数据已更新
      window.dispatchEvent(new Event('factorsDataUpdated'))
      console.log('📢 FactorsPage: 触发 factorsDataUpdated 事件')
    } else if (data.factors.length > 0) {
      // 有数据时检查是否需要更新
      hasInitialized.current = true
      const updatedReagents = checkAndUpdateFactorsData(data.factors)
      console.log('🔄 FactorsPage: 立即同步Context数据')
      setReagents(updatedReagents)
      
      // If data was updated, sync back
      if (JSON.stringify(updatedReagents) !== JSON.stringify(data.factors)) {
        updateFactorsData(updatedReagents)
        localStorage.setItem('hplc_factors_data', JSON.stringify(updatedReagents))
        localStorage.setItem('hplc_factors_version', FACTORS_DATA_VERSION.toString())
        window.dispatchEvent(new Event('factorsDataUpdated'))
        console.log('📢 FactorsPage: 数据已更新并同步')
      }
    }
  }, [data.factors, updateFactorsData])

  // 自动保存数据到 Context 和 localStorage
  // 使用 ref 来避免初始化时触发 dirty 和避免循环更新
  const isInitialMount = React.useRef(true)
  const lastLocalData = React.useRef<string>('')
  
  useEffect(() => {
    const currentLocalDataStr = JSON.stringify(reagents)
    
    localStorage.setItem('hplc_factors_data', currentLocalDataStr)
    
    // 跳过初始挂载时的更新
    if (isInitialMount.current) {
      isInitialMount.current = false
      lastLocalData.current = currentLocalDataStr
      return
    }
    
    // 如果本地数据没有变化（可能是从Context同步来的），跳过更新
    if (lastLocalData.current === currentLocalDataStr) {
      return
    }
    
    lastLocalData.current = currentLocalDataStr
    updateFactorsData(reagents)
    setIsDirty(true)
  }, [reagents, updateFactorsData, setIsDirty])
  
  // 监听文件数据变更事件
  useEffect(() => {
    const handleFileDataChanged = () => {
      console.log('📢 FactorsPage: 接收到 fileDataChanged 事件')
      // hasInitialized标记会在useLayoutEffect中处理数据更新
      // 这里只需要重置标记，让下次Context变化时能正确处理
      hasInitialized.current = false
      console.log('🔄 FactorsPage: 已重置初始化标记')
    }
    
    window.addEventListener('fileDataChanged', handleFileDataChanged)
    return () => {
      window.removeEventListener('fileDataChanged', handleFileDataChanged)
    }
  }, [])

  // 打开添加试剂模态窗口
  const addReagent = () => {
    setIsModalVisible(true)
  }

  // 处理模态窗口添加试剂
  const handleAddReagent = (newReagent: ReagentFactor) => {
    setReagents([...reagents, newReagent])
    setIsModalVisible(false)
    message.success(`试剂 "${newReagent.name}" 添加成功！`)
  }

  // Delete last reagent
  const deleteLastReagent = () => {
    if (reagents.length <= 1) {
      message.warning('At least one reagent must be kept')
      return
    }
    setReagents(reagents.slice(0, -1))
  }

  // Update reagent data
  const updateReagent = (id: string, field: keyof ReagentFactor, value: string | number) => {
    setReagents(reagents.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ))
  }

  // Toggle edit mode
  const toggleEdit = () => {
    if (isEditing) {
      // Validate data
      const hasEmptyName = reagents.some(r => !r.name.trim())
      if (hasEmptyName) {
        message.error('Reagent name cannot be empty')
        return
      }
      message.success('Data saved')
    }
    setIsEditing(!isEditing)
  }

  // Reset to predefined data (只还原预定义试剂，保留自定义试剂)
  const resetToDefault = () => {
    // 分离自定义试剂和预定义试剂
    const customReagents = reagents.filter(r => r.isCustom === true)
    const hasModifiedData = reagents.some(r => !r.isCustom)
    
    if (!hasModifiedData && customReagents.length === 0) {
      message.info('没有需要还原的数据')
      return
    }
    
    const confirmMessage = customReagents.length > 0
      ? `确定要还原预定义试剂数据吗？\n\n你添加的 ${customReagents.length} 个自定义试剂将被保留：\n${customReagents.map(r => `  • ${r.name}`).join('\n')}`
      : '确定要还原为默认数据吗？这将覆盖所有修改。'
    
    if (window.confirm(confirmMessage)) {
      // 合并预定义试剂和自定义试剂
      const resetData = [...PREDEFINED_REAGENTS, ...customReagents]
      setReagents(resetData)
      setIsEditing(false)
      
      if (customReagents.length > 0) {
        message.success(`已还原预定义试剂数据，保留了 ${customReagents.length} 个自定义试剂`)
      } else {
        message.success('已还原为默认数据')
      }
    }
  }

  return (
    <div className="factors-page">
      <Title level={2}>Factors</Title>

      <Card>
        <div className="factors-table-container" style={{ 
          overflowX: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: '8px'
        }}>
          <table className="factors-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>Substance</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>ρ (g/mL)</th>
                <th colSpan={4} style={{ textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Safety</th>
                <th colSpan={2} style={{ textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Health</th>
                <th colSpan={3} style={{ textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Environment</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>S</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>H</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>E</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>R</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>D</th>
              </tr>
              <tr>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Release potential</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Fire/Explos.</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>React./Decom.</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Acute toxicity</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Irritation</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Chronic toxicity</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Persis-tency</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Air Hazard</th>
                <th style={{ fontSize: '11px', padding: '4px', textAlign: 'center' }}>Water Hazard</th>
              </tr>
            </thead>
            <tbody>
              {reagents.map((reagent) => (
                <tr key={reagent.id}>
                  <td>
                    {isEditing ? (
                      <Input
                        value={reagent.name}
                        onChange={(e) => updateReagent(reagent.id, 'name', e.target.value)}
                        placeholder="Reagent name"
                      />
                    ) : (
                      reagent.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.density}
                        onChange={(value) => updateReagent(reagent.id, 'density', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      reagent.density.toFixed(3)
                    )}
                  </td>
                  {/* Safety sub-factors */}
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.releasePotential}
                        onChange={(value) => updateReagent(reagent.id, 'releasePotential', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.releasePotential || 0).toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.fireExplos}
                        onChange={(value) => updateReagent(reagent.id, 'fireExplos', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.fireExplos || 0).toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.reactDecom}
                        onChange={(value) => updateReagent(reagent.id, 'reactDecom', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.reactDecom || 0).toFixed(3)
                    )}
                  </td>
                  {/* Health sub-factors */}
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.acuteToxicity}
                        onChange={(value) => updateReagent(reagent.id, 'acuteToxicity', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.acuteToxicity || 0).toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.irritation}
                        onChange={(value) => updateReagent(reagent.id, 'irritation', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.irritation || 0).toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.chronicToxicity}
                        onChange={(value) => updateReagent(reagent.id, 'chronicToxicity', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.chronicToxicity || 0).toFixed(3)
                    )}
                  </td>
                  {/* Environment sub-factors */}
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.persistency}
                        onChange={(value) => updateReagent(reagent.id, 'persistency', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.persistency || 0).toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.airHazard}
                        onChange={(value) => updateReagent(reagent.id, 'airHazard', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.airHazard || 0).toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.waterHazard}
                        onChange={(value) => updateReagent(reagent.id, 'waterHazard', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.waterHazard || 0).toFixed(3)
                    )}
                  </td>
                  {/* Main factors */}
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.safetyScore}
                        onChange={(value) => updateReagent(reagent.id, 'safetyScore', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      reagent.safetyScore.toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.healthScore}
                        onChange={(value) => updateReagent(reagent.id, 'healthScore', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      reagent.healthScore.toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.envScore}
                        onChange={(value) => updateReagent(reagent.id, 'envScore', value || 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      reagent.envScore.toFixed(3)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.regeneration}
                        onChange={(value) => updateReagent(reagent.id, 'regeneration', value || 0)}
                        step={0.25}
                        precision={2}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.regeneration || 0).toFixed(2)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.disposal}
                        onChange={(value) => updateReagent(reagent.id, 'disposal', value || 0)}
                        step={1}
                        precision={0}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      reagent.disposal
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addReagent}
              style={{ width: '100%' }}
            >
              Add
            </Button>
          </Col>
          <Col span={6}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={deleteLastReagent}
              disabled={reagents.length <= 1 || !isEditing}
              style={{ width: '100%' }}
            >
              Delete
            </Button>
          </Col>
          <Col span={6}>
            <Button
              type={isEditing ? 'primary' : 'default'}
              icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
              onClick={toggleEdit}
              style={{ width: '100%' }}
            >
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </Col>
          <Col span={6}>
            <Button
              onClick={resetToDefault}
              style={{ width: '100%' }}
              disabled={isEditing}
            >
              Reset to Default
            </Button>
          </Col>
        </Row>

        <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
          <p><strong>Note:</strong></p>
          <ul>
            <li><strong>ρ</strong>: Density (g/mL)</li>
            <li><strong>Safety</strong>: Release potential, Fire/Explosives, Reaction/Decomposition</li>
            <li><strong>Health</strong>: Acute toxicity, Irritation, Chronic toxicity</li>
            <li><strong>Environment</strong>: Persistency, Air Hazard, Water Hazard</li>
            <li><strong>S/H/E</strong>: Aggregated Safety/Health/Environment Scores</li>
            <li><strong>R</strong>: Regeneration Factor (0-1, 0.25 per level)</li>
            <li><strong>D</strong>: Disposal Factor (0-2)</li>
          </ul>
          <p>All 9 sub-factors and 5 main factors (S, H, E, R, D) will be used in green chemistry assessment calculations in Methods and HPLC Gradient.</p>
        </div>
      </Card>

      {/* 添加试剂模态窗口 */}
      <AddReagentModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleAddReagent}
      />
    </div>
  )
}

export default FactorsPage
