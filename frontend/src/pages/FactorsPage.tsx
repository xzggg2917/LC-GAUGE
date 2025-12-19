import React, { useState, useEffect, useLayoutEffect } from 'react'
import { Card, Typography, Button, InputNumber, Input, message, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import { useAppContext } from '../contexts/AppContext'
import type { ReagentFactor } from '../contexts/AppContext'
import AddReagentModal from '../components/AddReagentModal'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'
import './FactorsPage.css'

const { Title } = Typography

// 预定义的试剂数据(基于您提供的表格)
const PREDEFINED_REAGENTS: ReagentFactor[] = [
  { id: '1', name: 'Acetone', density: 0.784, releasePotential: 0.698, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.297, irritation: 0.625, chronicToxicity: 0.185, persistency: 0.126, airHazard: 0.185, waterHazard: 0.000,safetyScore: 1.891, healthScore: 0.429, envScore: 0.316, regeneration: 0.5, disposal: 0.5 },
  { id: '2', name: 'Acetonitrile', density: 0.786, releasePotential: 0.613, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.509, irritation: 0.625, chronicToxicity: 0.431, persistency: 0.366, airHazard: 0.431, waterHazard: 0.000, safetyScore: 2.722, healthScore: 1.056, envScore: 0.797, regeneration: 0.750, disposal: 0.750 },
  { id: '3', name: 'Chloroform', density: 1.490, releasePotential: 0.681, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.393, irritation: 0.625, chronicToxicity: 0.800, persistency: 0.457, airHazard: 0.800, waterHazard: 0.178, safetyScore: 1.074, healthScore: 1.425, envScore: 1.435, regeneration: 1, disposal: 0.750 },
  { id: '4', name: 'CO2', density: 1.560, releasePotential: 1, fireExplos: 0, reactDecom: 0, acuteToxicity: 0.026, irritation: 0, chronicToxicity: 0.009, persistency: 0, airHazard: 0.009, waterHazard: 0, safetyScore: 1.026, healthScore: 0.009, envScore: 0.009, regeneration: 0.25, disposal: 0 },
  { id: '5', name: 'Dichloromethane', density: 1.327, releasePotential: 0.753, fireExplos: 1.000, reactDecom: 0.600, acuteToxicity: 0.264, irritation: 0.349, chronicToxicity: 0.290, persistency: 0.02, airHazard: 0.290, waterHazard: 0.031, safetyScore: 2.617, healthScore: 0.639, envScore: 0.341, regeneration: 0.75, disposal: 0.75 },
  { id: '6', name: 'Ethanol', density: 0.789, releasePotential: 0.579, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.292, irritation: 0.000, chronicToxicity: 0.205, persistency: 0.282, airHazard: 0.205, waterHazard: 0.000, safetyScore: 1.871, healthScore: 0.205, envScore: 0.487, regeneration: 0.6, disposal: 0.25 },
  { id: '7', name: 'Ethyl acetate', density: 0.897, releasePotential: 0.628, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.276, irritation: 0.625, chronicToxicity: 0.169, persistency: 0.026, airHazard: 0.169, waterHazard: 0.003, safetyScore: 1.904, healthScore: 0.794, envScore: 0.198, regeneration: 1, disposal: 0.25 },
  { id: '8', name: 'Heptane', density: 0.684, releasePotential: 0.557, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.368, irritation: 0.625, chronicToxicity: 0.158, persistency: 0.430, airHazard: 0.158, waterHazard: 0.500, safetyScore: 1.925, healthScore: 0.783, envScore: 1.088, regeneration: 1, disposal: 0.5},
  { id: '9', name: 'Hexane (n)', density: 0.661, releasePotential: 0.656, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.343, irritation: 0.625, chronicToxicity: 0.351, persistency: 0.426, airHazard: 0.351, waterHazard: 0.325, safetyScore: 1.999, healthScore: 0.976, envScore: 1.102, regeneration: 1, disposal: 0.5 },
  { id: '10', name: 'Isooctane', density: 0.690, releasePotential: 0.630, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.330, chronicToxicity: 0.000, persistency: 0.680, airHazard: 0.000, waterHazard: 0.875, safetyScore: 1.630, healthScore: 0.330, envScore: 1.555, regeneration: 1, disposal: 0.5 },
  { id: '11', name: 'Isopropanol', density: 0.786, releasePotential: 0.565, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.317, irritation: 0.625, chronicToxicity: 0.262, persistency: 0.280, airHazard: 0.262, waterHazard: 0.000, safetyScore: 1.882, healthScore: 0.887, envScore: 0.542, regeneration: 1, disposal: 0.25 },
  { id: '12', name: 'Methanol', density: 0.791, releasePotential: 0.625, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.266, irritation: 0.113, chronicToxicity: 0.316, persistency: 0.000, airHazard: 0.316, waterHazard: 0.000, safetyScore: 1.891, healthScore: 0.429, envScore: 0.316, regeneration: 0.5, disposal: 0.5 },
  { id: '13', name: 'Sulfuric acid 96%', density: 1.840, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.946, irritation: 1.000, chronicToxicity: 1.000, persistency: 0.485, airHazard: 1.000, waterHazard: 0.500, safetyScore: 1.746, healthScore: 2.000, envScore: 1.985, regeneration: 1, disposal: 0.750 },
  { id: '14', name: 't-butyl methyl ether', density: 0.740, releasePotential: 0.716, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.008, irritation: 0.220, chronicToxicity: 0.349, persistency: 0.710, airHazard: 0.349, waterHazard: 0.090, safetyScore: 1.724, healthScore: 0.569, envScore: 1.149, regeneration: 1, disposal: 0.5 },
  { id: '15', name: 'Tetrahydrofuran', density: 0.889, releasePotential: 0.680, fireExplos: 0.000, reactDecom: 0.600, acuteToxicity: 0.297, irritation: 0.625, chronicToxicity: 0.367, persistency: 0.535, airHazard: 0.367, waterHazard: 0.000, safetyScore: 1.577, healthScore: 0.992, envScore: 0.902, regeneration: 1, disposal: 0.750 },
  { id: '16', name: 'Water', density: 1, releasePotential: 0.552, fireExplos: 0, reactDecom: 0, acuteToxicity: 0, irritation: 0, chronicToxicity: 0, persistency: 0, airHazard: 0, waterHazard: 0, safetyScore: 0.552, healthScore: 0, envScore: 0, regeneration: 0.2, disposal: 0 },
  { id: '17', name: 'Hexane', density: 0.659, releasePotential: 0.655, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.343, irritation: 0.625, chronicToxicity: 0.351, persistency: 0.429, airHazard: 0.351, waterHazard: 0.325,safetyScore: 1.998, healthScore: 0.976, envScore: 1.105, regeneration: 0.75, disposal: 0.5 },
  { id: '18', name: 'Formic Acid', density: 1.220, releasePotential: 0.504, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.802, irritation: 1, chronicToxicity: 1, persistency: 0.130, airHazard: 1, waterHazard: 0.125, safetyScore: 1.306, healthScore: 2, envScore: 1.255, regeneration: 0.5, disposal: 0.75 },
  { id: '19', name: 'Ammonium Acetate', density: 1.170, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.000, chronicToxicity: 0.000, persistency:0.000, airHazard: 0.000, waterHazard: 0.000, safetyScore: 0.000, healthScore: 0.000, envScore: 0.000, regeneration: 1, disposal: 1 },
  { id: '20', name: 'Diethyl Ether', density: 0.714, releasePotential: 0.785, fireExplos: 1, reactDecom: 0.6, acuteToxicity: 0.3, irritation: 0.113, chronicToxicity: 0.183, persistency: 0.02, airHazard: 0.183, waterHazard: 0, safetyScore: 2.685, healthScore: 0.286, envScore: 0.203, regeneration: 0.5, disposal: 0.75 },
  { id: '21', name: 'Triethylamine', density: 0.726, releasePotential: 0.588, fireExplos: 1.000, reactDecom: 0.000, acuteToxicity: 0.511, irritation: 1, chronicToxicity: 0.737, persistency: 0.4, airHazard: 0.737, waterHazard: 0.125, safetyScore: 2.099, healthScore: 1.737, envScore: 1.262, regeneration: 1, disposal: 0.75 },
  { id: '22', name: 'Chloroform', density: 1.480, releasePotential: 0.681, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.393, irritation: 0.625, chronicToxicity: 0.680, persistency: 0.46, airHazard: 0.8, waterHazard: 0.178, safetyScore: 1.074, healthScore: 1.425, envScore: 1.438, regeneration: 1, disposal: 0.75 },
  { id: '23', name: 'Potassium dihydrogen phosphate', density: 1.880, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, safetyScore: 0.000, healthScore: 0.625, envScore: 0.000, regeneration: 1, disposal: 1 },
  { id: '24', name: 'Sodium Hydroxide', density: 2.130, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.990, irritation: 1, chronicToxicity: 1, persistency: 0.000, airHazard: 1, waterHazard: 0.500, safetyScore: 0.179, healthScore: 2, envScore: 1.5, regeneration: 1, disposal: 1 },
  { id: '25', name: 'Hydrochloric Acid', density: 1.180, releasePotential: 1, fireExplos: 0.000, reactDecom: 0.800, acuteToxicity: 0.772, irritation: 1, chronicToxicity: 0.705, persistency: 0.000, airHazard: 0.705, waterHazard: 0.5, safetyScore: 2.572, healthScore: 1.705, envScore: 1.205, regeneration: 1, disposal: 0.750 },
  { id: '26', name: 'Ammonium Carbonate', density: 1.5, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.600, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.111, persistency: 0.000, airHazard: 0.111, waterHazard: 0.125, safetyScore: 0.6, healthScore: 0.736, envScore: 0.000, regeneration: 0.2, disposal: 0.000 },
  { id: '27', name: 'Ammonium hydroxide', density: 0.890, releasePotential: 1, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.660, irritation: 1, chronicToxicity: 0.552, persistency: 0.000, airHazard: 0.552, waterHazard: 0.500, safetyScore: 1.660, healthScore: 1.552, envScore: 1.052, regeneration: 1, disposal: 0.75 },
  { id: '28', name: 'Dipotassium hydrogen phosphate', density: 2.440, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, safetyScore: 0.000, healthScore: 0.625, envScore: 0.000, regeneration: 1, disposal: 1 },
  { id: '29', name: 'Sodium phosphate dibasic', density: 1.064, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, safetyScore: 0.000, healthScore: 0.625, envScore: 0.000, regeneration: 1, disposal: 1 },
  { id: '30', name: 'Sodium Dihydrogen Phosphate', density: 1.91, releasePotential: 0.000, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.000, irritation: 0.625, chronicToxicity: 0.000, persistency: 0.000, airHazard: 0.000, waterHazard: 0.000, safetyScore: 0.000, healthScore: 0.625, envScore: 0.000, regeneration: 1, disposal: 1 },
  { id: '31', name: 'Trifluoroacetic Acid', density: 1.490, releasePotential: 0.644, fireExplos: 0.000, reactDecom: 0.000, acuteToxicity: 0.240, irritation: 1, chronicToxicity: 1, persistency: 0.303, airHazard: 1, waterHazard: 0.000, safetyScore: 0.884, healthScore: 2, envScore: 1.303, regeneration: 1, disposal: 1 },
]
const FACTORS_DATA_VERSION = 5 // Increment this when PREDEFINED_REAGENTS changes

// 自动按首字母排序函数
const sortReagentsByName = (reagents: ReagentFactor[]): ReagentFactor[] => {
  return [...reagents].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
}

const FactorsPage: React.FC = () => {
  // 🎯 全局试剂库模式 - 不依赖 Context，直接操作全局存储
  // 所有用户/所有文件共享同一个试剂库
  
  // 从全局存储初始化试剂库（⚠️ 必须用空数组初始化，然后在 useEffect 中异步加载）
  const [reagents, setReagents] = useState<ReagentFactor[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  // 异步加载全局试剂库（永不自动初始化，避免覆盖用户数据）
  useEffect(() => {
    const loadGlobalLibrary = async () => {
      try {
        // 1. 先尝试从主存储加载
        let stored = await StorageHelper.getJSON<ReagentFactor[]>(STORAGE_KEYS.FACTORS)
        
        // 2. 如果主存储为空，尝试从备份恢复
        if (!stored || stored.length === 0) {
          console.log('⚠️ 主存储为空，尝试从备份恢复...')
          
          if ((window as any).electronAPI?.readAppData) {
            try {
              const backupStr = await (window as any).electronAPI.readAppData('hplc_factors_backup')
              if (backupStr) {
                const backup = JSON.parse(backupStr)
                if (backup.reagents && backup.reagents.length > 0) {
                  console.log('✅ 从备份恢复', backup.reagents.length, '个试剂')
                  stored = backup.reagents
                  // 恢复到主存储
                  await StorageHelper.setJSON(STORAGE_KEYS.FACTORS, stored)
                  message.success(`Recovered ${stored.length} reagents from backup!`)
                }
              }
            } catch (backupError) {
              console.error('❌ 备份恢复失败:', backupError)
            }
          }
        }
        
        // 3. 如果数据存在，正常加载
        if (stored && stored.length > 0) {
          console.log('📚 从全局试剂库加载', stored.length, '个试剂')
          setReagents(sortReagentsByName(stored))
        } else {
          // 数据为空，显示空表（用户需要手动导入或添加）
          console.log('ℹ️ 试剂库为空，请使用 Add 或 Excel 导入添加数据')
          setReagents([])
        }
      } catch (error) {
        console.error('❌ 加载全局试剂库失败:', error)
        setReagents([])
        message.error('Failed to load reagent library')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadGlobalLibrary()
  }, [])
  const [editSnapshot, setEditSnapshot] = useState<ReagentFactor[]>([]) // 保存进入Edit模式时的快照
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isDeletingMode, setIsDeletingMode] = useState<boolean>(false)
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false)

  // 🔄 保存到全局试剂库（双重保存：app_data.json + 独立备份）
  const saveToGlobalLibrary = async (updatedReagents: ReagentFactor[]) => {
    try {
      // 1. 保存到 app_data.json（与其他数据一起）
      await StorageHelper.setJSON(STORAGE_KEYS.FACTORS, updatedReagents)
      
      // 2. 保存到独立的备份文件（防止数据丢失）
      const backupData = {
        version: FACTORS_DATA_VERSION,
        lastModified: new Date().toISOString(),
        reagentsCount: updatedReagents.length,
        reagents: updatedReagents
      }
      
      // 使用 Electron API 保存独立文件
      if ((window as any).electronAPI?.writeAppData) {
        await (window as any).electronAPI.writeAppData('hplc_factors_backup', JSON.stringify(backupData))
        console.log('✅ 双重保存成功: app_data.json + factors_backup')
      }
      
      console.log('✅ 已保存到全局试剂库:', updatedReagents.length, '个试剂')
      
      // 触发事件通知其他页面刷新数据
      window.dispatchEvent(new Event('factorsLibraryUpdated'))
      window.dispatchEvent(new Event('factorsDataUpdated'))
      
      message.success('Factors saved successfully')
    } catch (error) {
      console.error('❌ 保存全局试剂库失败:', error)
      message.error('Save failed')
    }
  }

  // 处理批量导入（覆盖已存在的同名试剂）
  const handleBatchImport = async (importedReagents: ReagentFactor[]) => {
    try {
      // 构建现有试剂的名称映射
      const existingMap = new Map(reagents.map(r => [r.name.toLowerCase(), r]))
      
      let addedCount = 0
      let updatedCount = 0
      
      // 处理每个导入的试剂
      importedReagents.forEach(imported => {
        const nameLower = imported.name.toLowerCase()
        const existing = existingMap.get(nameLower)
        
        if (existing) {
          // 已存在：覆盖数据，保留原 ID
          existingMap.set(nameLower, { ...imported, id: existing.id })
          updatedCount++
        } else {
          // 不存在：新增
          existingMap.set(nameLower, imported)
          addedCount++
        }
      })
      
      // 合并所有试剂并排序
      const updatedReagents = sortReagentsByName(Array.from(existingMap.values()))
      setReagents(updatedReagents)
      
      // 保存到全局试剂库
      await saveToGlobalLibrary(updatedReagents)
      
      message.success(`Import complete: ${addedCount} added, ${updatedCount} updated`)
    } catch (error) {
      console.error('批量导入失败:', error)
      message.error('Batch import failed')
    }
  }

  // 打开添加试剂模态窗口
  const addReagent = () => {
    setIsModalVisible(true)
  }

  // 处理模态窗口添加试剂
  const handleAddReagent = async (newReagent: ReagentFactor) => {
    // 为自定义试剂保存原始版本（用于Reset功能）
    const reagentWithOriginal = {
      ...newReagent,
      originalData: {
        id: newReagent.id,
        name: newReagent.name,
        density: newReagent.density,
        releasePotential: newReagent.releasePotential,
        fireExplos: newReagent.fireExplos,
        reactDecom: newReagent.reactDecom,
        acuteToxicity: newReagent.acuteToxicity,
        irritation: newReagent.irritation,
        chronicToxicity: newReagent.chronicToxicity,
        persistency: newReagent.persistency,
        airHazard: newReagent.airHazard,
        waterHazard: newReagent.waterHazard,
        regeneration: newReagent.regeneration,
        disposal: newReagent.disposal,
        isCustom: newReagent.isCustom,
        safetyScore: newReagent.safetyScore,
        healthScore: newReagent.healthScore,
        envScore: newReagent.envScore
      }
    }
    const updatedReagents = sortReagentsByName([...reagents, reagentWithOriginal])
    setReagents(updatedReagents)
    
    // 📚 保存到全局试剂库
    await saveToGlobalLibrary(updatedReagents)
    
    setIsModalVisible(false)
    message.success(`Reagent "${newReagent.name}" has been added to global library!`)
  }

  // Delete last reagent (old function, now toggle delete mode)
  const toggleDeleteMode = () => {
    setIsDeletingMode(!isDeletingMode)
    if (!isDeletingMode) {
      message.info('Please click the trash icon at the end of each row to delete that reagent')
    }
  }

  // Delete specific reagent
  const deleteReagent = async (id: string) => {
    const reagentToDelete = reagents.find(r => r.id === id)
    if (reagents.length <= 1) {
      message.warning('At least one reagent must be kept')
      return
    }
    if (window.confirm(`Are you sure to delete "${reagentToDelete?.name}" from global reagent library?`)) {
      const updatedReagents = sortReagentsByName(reagents.filter(r => r.id !== id))
      setReagents(updatedReagents)
      
      // 📚 保存到全局试剂库
      await saveToGlobalLibrary(updatedReagents)
      
      message.success(`Deleted "${reagentToDelete?.name}" from global reagent library`)
    }
  }

  // Update reagent data
  const updateReagent = (id: string, field: keyof ReagentFactor, value: string | number) => {
    setReagents(reagents.map(r => {
      if (r.id !== id) return r
      
      // 更新指定字段
      const updatedReagent = { ...r, [field]: value }
      
      // 🔥 自动重新计算 S、H、E 分数
      // Safety Score (S) = Release Potential + Fire/Explos + React/Decom + Acute Toxicity
      updatedReagent.safetyScore = Number((
        (updatedReagent.releasePotential || 0) +
        (updatedReagent.fireExplos || 0) +
        (updatedReagent.reactDecom || 0) +
        (updatedReagent.acuteToxicity || 0)
      ).toFixed(3))
      
      // Health Score (H) = Irritation + Chronic Toxicity
      updatedReagent.healthScore = Number((
        (updatedReagent.irritation || 0) +
        (updatedReagent.chronicToxicity || 0)
      ).toFixed(3))
      
      // Environment Score (E) = Persistency + Air Hazard + Water Hazard
      updatedReagent.envScore = Number((
        (updatedReagent.persistency || 0) +
        (updatedReagent.airHazard || 0) +
        (updatedReagent.waterHazard || 0)
      ).toFixed(3))
      
      console.log(`✅ updateReagent: ${updatedReagent.name} 更新后 S=${updatedReagent.safetyScore}, H=${updatedReagent.healthScore}, E=${updatedReagent.envScore}`)
      
      return updatedReagent
    }))
  }

  // Toggle edit mode
  const toggleEdit = async () => {
    if (isEditing) {
      // Save: 验证并保存数据
      const hasEmptyName = reagents.some(r => !r.name.trim())
      if (hasEmptyName) {
        message.error('Reagent name cannot be empty')
        return
      }
      
      await saveToGlobalLibrary(reagents)
      message.success('Data saved to global library')
      setIsEditing(false)
      setIsDeletingMode(false)
    } else {
      // 进入Edit模式，保存当前数据快照
      setEditSnapshot(JSON.parse(JSON.stringify(reagents))) // 深拷贝
      setIsEditing(true)
    }
  }

  // Cancel edit: 取消编辑，恢复到编辑前的状态
  const cancelEdit = () => {
    if (editSnapshot.length > 0) {
      setReagents(JSON.parse(JSON.stringify(editSnapshot))) // 恢复到编辑前的快照
      message.info('Edit cancelled')
    }
    setIsEditing(false)
    setIsDeletingMode(false)
  }

  // Reset to predefined data: 恢复到系统预定义数据
  const resetToDefault = async () => {
    // 分离自定义试剂和预定义试剂
    const customReagents = reagents.filter(r => r.isCustom === true)
    const hasModifiedData = reagents.some(r => !r.isCustom)
    
    if (!hasModifiedData && customReagents.length === 0) {
      message.info('No data to reset')
      return
    }
    
    // 检查自定义试剂是否被修改过
    const modifiedCustomCount = customReagents.filter(r => {
      if (!r.originalData) return false
      // 比较当前数据和原始数据是否有差异
      return JSON.stringify({
        density: r.density,
        releasePotential: r.releasePotential,
        fireExplos: r.fireExplos,
        reactDecom: r.reactDecom,
        acuteToxicity: r.acuteToxicity,
        irritation: r.irritation,
        chronicToxicity: r.chronicToxicity,
        persistency: r.persistency,
        airHazard: r.airHazard,
        waterHazard: r.waterHazard,
        disposal: r.disposal
      }) !== JSON.stringify({
        density: r.originalData.density,
        releasePotential: r.originalData.releasePotential,
        fireExplos: r.originalData.fireExplos,
        reactDecom: r.originalData.reactDecom,
        acuteToxicity: r.originalData.acuteToxicity,
        irritation: r.originalData.irritation,
        chronicToxicity: r.originalData.chronicToxicity,
        persistency: r.originalData.persistency,
        airHazard: r.originalData.airHazard,
        waterHazard: r.originalData.waterHazard,
        disposal: r.originalData.disposal
      })
    }).length
    
    let confirmMessage = ''
    if (customReagents.length > 0 && hasModifiedData) {
      confirmMessage = `Are you sure to reset all reagents to their original values?\n\n`
      confirmMessage += `- ${PREDEFINED_REAGENTS.length} predefined reagents will be reset\n`
      if (modifiedCustomCount > 0) {
        confirmMessage += `- ${modifiedCustomCount} custom reagent(s) will be reset to their original values\n`
      }
      if (customReagents.length > modifiedCustomCount) {
        confirmMessage += `- ${customReagents.length - modifiedCustomCount} custom reagent(s) are unchanged\n`
      }
    } else if (customReagents.length > 0) {
      confirmMessage = `Are you sure to reset custom reagents?\n\n${modifiedCustomCount} custom reagent(s) will be reset to original values.`
    } else {
      confirmMessage = 'Are you sure to reset all data to default values? This will override all modifications.'
    }
    
    if (window.confirm(confirmMessage)) {
      // 恢复自定义试剂到原始版本
      const resetCustomReagents = customReagents.map(r => {
        if (r.originalData) {
          // 有原始数据，恢复到原始版本
          return {
            ...r.originalData,
            isCustom: true,
            originalData: r.originalData // 保留原始数据引用
          } as ReagentFactor
        }
        // 没有原始数据（旧数据），保持不变
        return r
      })
      
      // 合并预定义试剂和恢复后的自定义试剂
      const resetData = sortReagentsByName([...PREDEFINED_REAGENTS, ...resetCustomReagents])
      setReagents(resetData)
      
      // 📚 保存到全局试剂库
      await saveToGlobalLibrary(resetData)
      
      setIsEditing(false)
      setIsDeletingMode(false)
      
      if (customReagents.length > 0) {
        if (modifiedCustomCount > 0) {
          message.success(`Global library reset: ${PREDEFINED_REAGENTS.length} predefined reagents + ${modifiedCustomCount} custom reagent(s) restored`)
        } else {
          message.success(`Predefined reagents reset, ${customReagents.length} custom reagent(s) unchanged`)
        }
      } else {
        message.success('Global reagent library has been reset to default data')
      }
    }
  }

  // 🆕 强制从预定义数据恢复（删除所有自定义试剂）
  const forceRestoreFromPredefined = async () => {
    const predefinedIds = PREDEFINED_REAGENTS.map(r => r.id)
    const customReagents = reagents.filter(r => !predefinedIds.includes(r.id))
    
    let confirmMessage = '⚠️ WARNING: This will restore TEMPLATE data (may be incorrect):\n\n'
    confirmMessage += `- Reset all ${PREDEFINED_REAGENTS.length} predefined reagents to TEMPLATE values\n`
    if (customReagents.length > 0) {
      confirmMessage += `- DELETE ${customReagents.length} custom reagent(s) permanently\n`
    }
    confirmMessage += '\n⚠️ Template data may be incorrect. You should edit after restore.\n'
    confirmMessage += 'This action CANNOT be undone. Continue?'
    
    if (window.confirm(confirmMessage)) {
      const restored = sortReagentsByName([...PREDEFINED_REAGENTS])
      setReagents(restored)
      await saveToGlobalLibrary(restored)
      await StorageHelper.setJSON(STORAGE_KEYS.FACTORS_VERSION, FACTORS_DATA_VERSION.toString())
      
      setIsEditing(false)
      setIsDeletingMode(false)
      
      if (customReagents.length > 0) {
        message.warning(`Restored ${restored.length} template reagents (please verify data), deleted ${customReagents.length} custom reagent(s)`, 10)
      } else {
        message.warning(`Restored ${restored.length} template reagents. Please edit to correct values!`, 8)
      }
    }
  }

  return (
    <div className="factors-page">`
      <Title level={2}>📚 Global Reagent Factor Library</Title>
      
      {/* 添加说明卡片 */}
      <Card 
        style={{ 
          marginBottom: '16px', 
          background: '#f6ffed', 
          borderColor: '#b7eb8f' 
        }}
      >
        <p style={{ margin: 0, fontSize: '14px' }}>
          <strong>🌐 Global Shared Reagent Library:</strong>
          This is the shared reagent factor database for all files and users. After adding, editing, or deleting reagents here,
          all method files and scoring calculations will automatically use the latest data.
        </p>
      </Card>

      {isLoading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading global reagent library...</p>
          </div>
        </Card>
      ) : (
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
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>Regeneration</th>
                <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>Disposal</th>
                {isDeletingMode && (
                  <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center', minWidth: '60px' }}>Action</th>
                )}
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
                        onChange={(value) => updateReagent(reagent.id, 'density', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'releasePotential', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'fireExplos', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'reactDecom', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'acuteToxicity', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'irritation', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'chronicToxicity', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'persistency', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'airHazard', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'waterHazard', value ?? 0)}
                        step={0.001}
                        precision={3}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.waterHazard || 0).toFixed(3)
                    )}
                  </td>
                  {/* Main factors - R and D only */}
                  <td>
                    {isEditing ? (
                      <InputNumber
                        value={reagent.regeneration}
                        onChange={(value) => updateReagent(reagent.id, 'regeneration', value ?? 0)}
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
                        onChange={(value) => updateReagent(reagent.id, 'disposal', value ?? 0)}
                        step={0.25}
                        precision={2}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      (reagent.disposal || 0).toFixed(2)
                    )}
                  </td>
                  {isDeletingMode && (
                    <td style={{ textAlign: 'center' }}>
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteReagent(reagent.id)}
                        disabled={reagents.length <= 1}
                        title="Delete this reagent"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Row gutter={16} style={{ marginTop: 16 }}>
          {!isEditing ? (
            // 非编辑模式：显示Add、Delete、Edit、Reset to Default
            <>
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
                  icon={<DeleteOutlined />}
                  onClick={() => message.info('Please enter Edit mode first')}
                  style={{ width: '100%' }}
                  disabled
                >
                  Delete
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  icon={<EditOutlined />}
                  onClick={toggleEdit}
                  style={{ width: '100%' }}
                >
                  Edit
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  onClick={resetToDefault}
                  style={{ width: '100%' }}
                >
                  Reset to Default
                </Button>
              </Col>
            </>
          ) : (
            // 编辑模式：显示Delete、Save、Cancel、Force Restore
            <>
              <Col span={6}>
                <Button
                  danger={isDeletingMode}
                  type={isDeletingMode ? 'primary' : 'default'}
                  icon={<DeleteOutlined />}
                  onClick={toggleDeleteMode}
                  style={{ width: '100%' }}
                >
                  {isDeletingMode ? 'Cancel Delete' : 'Delete'}
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={toggleEdit}
                  style={{ width: '100%' }}
                >
                  Save
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  onClick={cancelEdit}
                  style={{ width: '100%' }}
                >
                  Cancel
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  danger
                  onClick={forceRestoreFromPredefined}
                  style={{ width: '100%' }}
                  title="Force restore from predefined data (delete custom reagents)"
                >
                  Force Restore
                </Button>
              </Col>
            </>
          )}
        </Row>

  
      </Card>
      )}

      {/* 添加试剂模态窗口 */}
      <AddReagentModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleAddReagent}
        onBatchImport={handleBatchImport}
      />
    </div>
  )
}

export default FactorsPage
