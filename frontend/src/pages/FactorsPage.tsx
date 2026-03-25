import React, { useState, useEffect } from 'react'
import { Card, Typography, Button, InputNumber, Input, message, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import type { ReagentFactor } from '../contexts/AppContext'
import AddReagentModal from '../components/AddReagentModal'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'
import { calculateScores, FACTORS_DATA_VERSION, PREDEFINED_REAGENTS } from '../utils/defaultReagents'
import './FactorsPage.css'

const { Title } = Typography
const PREDEFINED_ID_SET = new Set(PREDEFINED_REAGENTS.map(r => r.id))

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
                  message.success(`Recovered ${backup.reagents.length} reagents from backup!`)
                }
              }
            } catch (backupError) {
              console.error('❌ 备份恢复失败:', backupError)
            }
          }
        }
        
        // 3. 如果数据存在，检查版本并自动升级
        if (stored && stored.length > 0) {
          console.log('📚 从全局试剂库加载', stored.length, '个试剂')
          
          // 🔄 版本检查：自动补充新增试剂
          const storedVersion = await StorageHelper.getJSON(STORAGE_KEYS.FACTORS_VERSION)
          const currentVersion = FACTORS_DATA_VERSION
          
          if (storedVersion !== currentVersion.toString()) {
            console.log(`🔄 检测到版本升级: v${storedVersion || 'unknown'} → v${currentVersion}`)

            // 升级策略：
            // 1) 预定义试剂始终以当前版本为准（修正历史错误数据）
            // 2) 非预定义ID的试剂视为用户自定义，完整保留
            const customReagents = stored.filter(r => !PREDEFINED_ID_SET.has(r.id))
            const preservedPresetCount = PREDEFINED_REAGENTS.reduce((count, predefined) => {
              const existing = stored.find(r => r.id === predefined.id)
              return existing?.isUserModifiedPreset ? count + 1 : count
            }, 0)

            const mergedPresets = PREDEFINED_REAGENTS.map(predefined => {
              const existing = stored.find(r => r.id === predefined.id)
              if (existing?.isUserModifiedPreset) {
                return existing
              }
              return predefined
            })

            const upgradedData = sortReagentsByName([...mergedPresets, ...customReagents])

            const correctedCount = PREDEFINED_REAGENTS.reduce((count, predefined) => {
              const old = stored.find(r => r.id === predefined.id)
              if (!old) return count

              const oldComparable = {
                name: old.name,
                density: old.density,
                releasePotential: old.releasePotential,
                fireExplos: old.fireExplos,
                reactDecom: old.reactDecom,
                acuteToxicity: old.acuteToxicity,
                irritation: old.irritation,
                chronicToxicity: old.chronicToxicity,
                persistency: old.persistency,
                airHazard: old.airHazard,
                waterHazard: old.waterHazard,
                regeneration: old.regeneration ?? 0,
                disposal: old.disposal,
              }

              const newComparable = {
                name: predefined.name,
                density: predefined.density,
                releasePotential: predefined.releasePotential,
                fireExplos: predefined.fireExplos,
                reactDecom: predefined.reactDecom,
                acuteToxicity: predefined.acuteToxicity,
                irritation: predefined.irritation,
                chronicToxicity: predefined.chronicToxicity,
                persistency: predefined.persistency,
                airHazard: predefined.airHazard,
                waterHazard: predefined.waterHazard,
                regeneration: predefined.regeneration ?? 0,
                disposal: predefined.disposal,
              }

              return JSON.stringify(oldComparable) !== JSON.stringify(newComparable) ? count + 1 : count
            }, 0)

            // 保存升级后的数据
            setReagents(upgradedData)
            await StorageHelper.setJSON(STORAGE_KEYS.FACTORS, upgradedData)
            await StorageHelper.setJSON(STORAGE_KEYS.FACTORS_VERSION, currentVersion.toString())

            // 保存备份
            const backupData = {
              version: currentVersion,
              lastModified: new Date().toISOString(),
              reagentsCount: upgradedData.length,
              reagents: upgradedData
            }
            if ((window as any).electronAPI?.writeAppData) {
              await (window as any).electronAPI.writeAppData('hplc_factors_backup', JSON.stringify(backupData))
            }

            message.success(
              `✅ Factors upgraded: ${correctedCount} predefined corrected, ${preservedPresetCount} user-edited preset kept, ${customReagents.length} custom preserved`,
              5
            )
            console.log(
              `✅ 升级完成：${stored.length} → ${upgradedData.length} 个试剂，修正 ${correctedCount} 个预定义试剂，保留 ${preservedPresetCount} 个用户修改预定义试剂`
            )

            // 通知其他页面
            window.dispatchEvent(new Event('factorsLibraryUpdated'))
            window.dispatchEvent(new Event('factorsDataUpdated'))
          } else {
            // 版本一致，正常加载
            setReagents(sortReagentsByName(stored))
          }
        } else {
          // 🆕 首次运行：自动加载预定义数据（S/H/E 已自动计算）
          console.log('🎯 首次运行，正在初始化默认试剂库...')
          const initialData = sortReagentsByName(PREDEFINED_REAGENTS)
          setReagents(initialData)
          
          // 保存到 userData（首次初始化）
          await StorageHelper.setJSON(STORAGE_KEYS.FACTORS, initialData)
          await StorageHelper.setJSON(STORAGE_KEYS.FACTORS_VERSION, FACTORS_DATA_VERSION.toString())
          
          // 同时保存备份
          const backupData = {
            version: FACTORS_DATA_VERSION,
            lastModified: new Date().toISOString(),
            reagentsCount: initialData.length,
            reagents: initialData
          }
          if ((window as any).electronAPI?.writeAppData) {
            await (window as any).electronAPI.writeAppData('hplc_factors_backup', JSON.stringify(backupData))
          }
          
          // 🔔 立即触发事件通知其他页面数据已就绪
          window.dispatchEvent(new Event('factorsLibraryUpdated'))
          window.dispatchEvent(new Event('factorsDataUpdated'))
          
          console.log('✅ 已初始化', initialData.length, '个预定义试剂（S/H/E 分数已自动计算）')
          message.success(`Initialized ${initialData.length} default reagents!`, 3)
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
      
      // 🔥 自动重新计算 S、H、E 分数（使用统一的计算函数）
      const scores = calculateScores(updatedReagent)
      Object.assign(updatedReagent, scores)

      if (PREDEFINED_ID_SET.has(r.id) && !r.isCustom) {
        updatedReagent.isUserModifiedPreset = true
      }
      
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
      // 使用已自动计算 S/H/E 的预定义数据
      const restored = sortReagentsByName([...PREDEFINED_REAGENTS])
      setReagents(restored)
      await saveToGlobalLibrary(restored)
      await StorageHelper.setJSON(STORAGE_KEYS.FACTORS_VERSION, FACTORS_DATA_VERSION.toString())
      
      setIsEditing(false)
      setIsDeletingMode(false)
      
      if (customReagents.length > 0) {
        message.success(`Restored ${restored.length} predefined reagents (S/H/E auto-calculated), deleted ${customReagents.length} custom reagent(s)`, 6)
      } else {
        message.success(`Restored ${restored.length} predefined reagents with auto-calculated scores!`, 5)
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
