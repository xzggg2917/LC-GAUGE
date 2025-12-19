import React, { useState, useEffect, useRef } from 'react'
import { Card, Typography, Button, Upload, message, Row, Col, Table, Empty } from 'antd'
import { UploadOutlined, DeleteOutlined, SwapOutlined } from '@ant-design/icons'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { decryptData } from '../utils/encryption'
import { useAppContext } from '../contexts/AppContext'
import { StorageHelper, STORAGE_KEYS } from '../utils/storage'
import { getColorHex } from '../utils/colorScale'

const { Title, Paragraph, Text } = Typography

interface FileData {
  id: string
  name: string
  data: {
    S: number
    H: number
    E: number
    R: number
    D: number
    P: number
    totalScore: number
  }
  color?: string // 基于总分的颜色
  scoreResults?: any // 保存完整的 scoreResults 用于详细展示
}

const ComparisonPage: React.FC = () => {
  const { data: allData, currentFilePath } = useAppContext()
  const [files, setFiles] = useState<FileData[]>([])
  
  // 异步加载对比文件数据（根据当前文件路径）
  useEffect(() => {
    const loadComparisonFiles = async () => {
      if (!currentFilePath) {
        console.log('📂 No current file, skipping comparison files load')
        return
      }
      const storageKey = `hplc_comparison_files_${currentFilePath}`
      const saved = await StorageHelper.getJSON<FileData[]>(storageKey)
      if (saved && saved.length > 0) {
        console.log('📂 Loaded comparison files for', currentFilePath, ':', saved.length)
        setFiles(saved)
      } else {
        console.log('📂 No saved comparison files for this file')
        setFiles([])
      }
    }
    loadComparisonFiles()
  }, [currentFilePath])
  const [loading, setLoading] = useState(false)
  const [updateTrigger, setUpdateTrigger] = useState(0) // 用于强制更新
  const hasLoadedCurrentFile = useRef(false) // 追踪是否已加载当前文件

  // 保存文件列表到存储（根据当前文件路径）
  useEffect(() => {
    const saveFiles = async () => {
      if (!currentFilePath) return
      const storageKey = `hplc_comparison_files_${currentFilePath}`
      await StorageHelper.setJSON(storageKey, files)
      console.log('💾 Saved comparison files for', currentFilePath, ':', files.length)
    }
    // 始终保存，即使是空数组
    saveFiles()
  }, [files, currentFilePath])

  // 监听 New File 事件，清空对比数据
  useEffect(() => {
    const handleNewFile = async () => {
      console.log('🔄 ComparisonPage: New file created event received')
      console.log('Current files before clear:', files.length)
      
      setFiles([])
      if (currentFilePath) {
        const storageKey = `hplc_comparison_files_${currentFilePath}`
        await StorageHelper.setJSON(storageKey, [])
      }
      hasLoadedCurrentFile.current = false // 重置加载标记
      
      console.log('Files cleared, triggering update')
      
      // 立即触发更新
      console.log('Triggering update after new file')
      setUpdateTrigger(prev => prev + 1)
    }

    console.log('📌 ComparisonPage: Registering newFileCreated listener')
    window.addEventListener('newFileCreated', handleNewFile)
    
    return () => {
      console.log('📌 ComparisonPage: Unregistering newFileCreated listener')
      window.removeEventListener('newFileCreated', handleNewFile)
    }
  }, [files.length]) // 添加 files.length 依赖，确保能看到最新的 files

  // 监听文件打开事件，清空对比数据
  useEffect(() => {
    const handleFileOpened = async () => {
      console.log('🔄 ComparisonPage: File opened event received')
      console.log('Current files before clear:', files.length)
      
      // 清空对比列表（会在 loadComparisonFiles useEffect 中自动加载新文件的对比数据）
      setFiles([])
      hasLoadedCurrentFile.current = false // 重置加载标记
      
      console.log('Files cleared for new file, triggering update')
      
      // 立即触发更新
      setUpdateTrigger(prev => prev + 1)
    }

    console.log('📌 ComparisonPage: Registering fileOpened listener')
    window.addEventListener('fileOpened', handleFileOpened)
    
    return () => {
      console.log('📌 ComparisonPage: Unregistering fileOpened listener')
      window.removeEventListener('fileOpened', handleFileOpened)
    }
  }, [files.length])

  // 监听数据更新事件
  useEffect(() => {
    const handleDataUpdated = (eventName: string) => {
      console.log(`🔄 ComparisonPage: ${eventName} - refreshing current file`)
      // 重置加载标记，强制重新加载当前文件数据
      hasLoadedCurrentFile.current = false
      setUpdateTrigger(prev => prev + 1)
    }

    const handleFactorsUpdated = async () => {
      console.log('🔄 ComparisonPage: Factors data updated - triggering recalculation')
      // Factors 数据变化后，需要触发重新计算
      // 发送事件通知 Methods 页面重新计算
      window.dispatchEvent(new CustomEvent('requestScoreRecalculation'))
      // 重置加载标记
      hasLoadedCurrentFile.current = false
      // 延迟一点触发更新，等待计算完成
      setTimeout(() => {
        setUpdateTrigger(prev => prev + 1)
      }, 100)
    }

    const handleScoreDataUpdated = () => handleDataUpdated('Score data updated')
    const handleMethodsDataUpdated = () => handleDataUpdated('Methods data updated')
    const handleGradientDataUpdated = () => handleDataUpdated('Gradient data updated')

    window.addEventListener('scoreDataUpdated', handleScoreDataUpdated)
    window.addEventListener('methodsDataUpdated', handleMethodsDataUpdated)
    window.addEventListener('gradientDataUpdated', handleGradientDataUpdated)
    window.addEventListener('factorsDataUpdated', handleFactorsUpdated)
    
    return () => {
      window.removeEventListener('scoreDataUpdated', handleScoreDataUpdated)
      window.removeEventListener('methodsDataUpdated', handleMethodsDataUpdated)
      window.removeEventListener('gradientDataUpdated', handleGradientDataUpdated)
      window.removeEventListener('factorsDataUpdated', handleFactorsUpdated)
    }
  }, [])

  // 自动加载当前打开的文件数据(包括未保存的新文件)
  // 在组件挂载时或文件更新时检查
  useEffect(() => {
    console.log('🔍 Current file effect triggered:', { 
      currentFilePath, 
      currentFilePathType: typeof currentFilePath,
      allData: allData ? 'exists' : 'null/undefined',
      allDataType: typeof allData,
      hasMethods: !!(allData?.methods), 
      updateTrigger,
      hasLoadedBefore: hasLoadedCurrentFile.current
    })
    
    // 如果没有当前文件或当前文件数据,跳过
    if (!currentFilePath || !allData) {
      console.log('❌ No current file or allData, skipping. currentFilePath:', currentFilePath, 'allData:', allData)
      return
    }
    
    const fileId = currentFilePath + '_current'
    
    // 检查当前文件是否已在列表中，如果不在则重置加载标记
    const existingFile = files.find(f => f.id === fileId)
    if (!existingFile) {
      console.log('🔄 Current file not in list, resetting loaded flag')
      hasLoadedCurrentFile.current = false
    }
    
    // 如果已经标记为加载过，跳过（防止重复添加）
    if (hasLoadedCurrentFile.current) {
      console.log('⏭️ File already loaded before, skipping')
      return
    }

    console.log('📝 Processing current file...')

    const loadCurrentFile = async () => {
      try {
        // 优先使用后端计算结果
        const scoreResults = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)
      
      if (scoreResults && scoreResults.instrument && scoreResults.preparation) {
        console.log('✅ Using backend scoreResults')
        
        const instMajor = scoreResults.instrument.major_factors
        const prepMajor = scoreResults.preparation.major_factors
        const additionalFactors = scoreResults.additional_factors || {}
        
        // 获取权重方案（与 Method Evaluation 一致）
        const finalWeights = scoreResults.schemes?.final_scheme || 'Standard'
        const weightMap: Record<string, { instrument: number, preparation: number }> = {
          'Standard': { instrument: 0.6, preparation: 0.4 },
          'Complex_Prep': { instrument: 0.3, preparation: 0.7 },
          'Direct_Online': { instrument: 0.8, preparation: 0.2 },
          'Equal': { instrument: 0.5, preparation: 0.5 }
        }
        const weights = weightMap[finalWeights] || weightMap['Standard']
        
        // 所有大因子都使用加权平均（与 Method Evaluation 完全一致）
        const avgS = instMajor.S * weights.instrument + prepMajor.S * weights.preparation
        const avgH = instMajor.H * weights.instrument + prepMajor.H * weights.preparation
        const avgE = instMajor.E * weights.instrument + prepMajor.E * weights.preparation
        
        const instR = additionalFactors.instrument_R || 0
        const instD = additionalFactors.instrument_D || 0
        const instP = additionalFactors.instrument_P || 0
        const prepR = additionalFactors.pretreatment_R || 0
        const prepD = additionalFactors.pretreatment_D || 0
        const prepP = additionalFactors.pretreatment_P || 0
        
        const avgR = instR * weights.instrument + prepR * weights.preparation
        const avgD = instD * weights.instrument + prepD * weights.preparation
        const avgP = instP * weights.instrument + prepP * weights.preparation
        
        const totalScore = scoreResults.final?.score3 || 0
        const color = getColorHex(totalScore)
        
        // 从 currentFilePath 提取干净的文件名
        const displayName = currentFilePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.(hplc|json)$/, '') || 'Current Method'
        
        const newFileData: FileData = {
          id: fileId,
          name: displayName,
          data: {
            S: avgS,
            H: avgH,
            E: avgE,
            R: avgR,
            D: avgD,
            P: avgP,
            totalScore
          },
          color,
          scoreResults: scoreResults // 保存 scoreResults
        }
        
        setFiles(prev => {
          const filtered = prev.filter(f => f.id !== fileId)
          return [...filtered, newFileData]
        })
        
        hasLoadedCurrentFile.current = true
        console.log('✅ Current file data loaded:', newFileData)
        return
      }
      
      // Fallback: 使用旧的计算逻辑
      console.log('⚠️ No backend scoreResults, using fallback calculation')
      const parsedData = allData
      const methodsData = parsedData.methods || { sampleCount: null, preTreatmentReagents: [], mobilePhaseA: [], mobilePhaseB: [] }
      const gradientData: any = parsedData.gradient || {}
      const factorsData = parsedData.factors || []

      const sampleCount = methodsData.sampleCount || 0
      const totalScores = { S: 0, H: 0, E: 0, R: 0, D: 0, P: 0 }
      
      console.log('Sample count:', sampleCount, 'Factors count:', factorsData.length)

      // 计算前处理试剂得分
      if (methodsData.preTreatmentReagents && Array.isArray(methodsData.preTreatmentReagents)) {
        methodsData.preTreatmentReagents.forEach((reagent: any) => {
          if (!reagent.name || reagent.volume <= 0) return
          const factor = factorsData.find((f: any) => f.name === reagent.name)
          if (!factor) return
          const mass = reagent.volume * factor.density
          totalScores.S += mass * factor.safetyScore
          totalScores.H += mass * factor.healthScore
          totalScores.E += mass * factor.envScore
          totalScores.R += mass * (factor.regeneration || 0)
          totalScores.D += mass * factor.disposal
          // P is method-level, not reagent-level
        })
      }

      // 计算流动相得分
      const calculations = gradientData?.calculations
      if (calculations) {
        if (calculations.mobilePhaseA?.components) {
          calculations.mobilePhaseA.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return
            const factor = factorsData.find((f: any) => f.name === component.reagentName)
            if (!factor) return
            const mass = component.volume * factor.density
            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * (factor.regeneration || 0)
            totalScores.D += mass * factor.disposal
            // P is method-level, not reagent-level
          })
        }
        
        if (calculations.mobilePhaseB?.components) {
          calculations.mobilePhaseB.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return
            const factor = factorsData.find((f: any) => f.name === component.reagentName)
            if (!factor) return
            const mass = component.volume * factor.density
            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * (factor.regeneration || 0)
            totalScores.D += mass * factor.disposal
            // P is method-level, not reagent-level
          })
        }
      }

      const sumOfAllScores = totalScores.S + totalScores.H + totalScores.E + totalScores.R + totalScores.D + totalScores.P
      const totalScore = sampleCount > 0 ? sumOfAllScores / sampleCount : 0

      const color = getColorHex(totalScore)
      
      const fileData: FileData = {
        id: fileId,
        name: currentFilePath.replace('.hplc', '').replace('.json', '') + ' (Current)',
        color,
        data: {
          S: totalScores.S,
          H: totalScores.H,
          E: totalScores.E,
          R: totalScores.R,
          D: totalScores.D,
          P: totalScores.P,
          totalScore: totalScore
        }
      }

      // 使用函数式更新来安全地检查和添加/更新文件
      setFiles(prev => {
        const existingIndex = prev.findIndex(f => f.id === fileId)
        if (existingIndex >= 0) {
          // 更新已存在的文件
          console.log('✏️ Updating existing file at index:', existingIndex)
          const newFiles = [...prev]
          newFiles[existingIndex] = fileData
          return newFiles
        } else {
          // 添加新文件
          console.log('➕ Adding new file:', fileData.name)
          message.success(`Current file "${fileData.name}" added to comparison`)
          return [...prev, fileData]
        }
      })
      
      hasLoadedCurrentFile.current = true // 标记已加载
    } catch (error) {
      console.error('Error loading current file data:', error)
    }
  }
  
  loadCurrentFile()
  }, [currentFilePath, allData, updateTrigger, files]) // 添加 files 依赖，确保能检查文件是否在列表中

  // 处理已解密的数据
  const processDecryptedData = async (parsedData: any, fileName: string) => {
    try {
      console.log('Processing decrypted/plain data for:', fileName)
      console.log('Data structure:', parsedData)

      // 优先检查是否有 scoreResults（后端计算结果）
      if (parsedData.scoreResults?.instrument && parsedData.scoreResults?.preparation) {
        console.log('✅ Found scoreResults in uploaded file')
        const scoreResults = parsedData.scoreResults
        const instMajor = scoreResults.instrument.major_factors
        const prepMajor = scoreResults.preparation.major_factors
        const additionalFactors = scoreResults.additional_factors || {}
        
        // 计算平均值
        const avgS = (instMajor.S + prepMajor.S) / 2
        const avgH = (instMajor.H + prepMajor.H) / 2
        const avgE = (instMajor.E + prepMajor.E) / 2
        
        // R 和 D 使用平均值
        const instR = additionalFactors.instrument_R || 0
        const instD = additionalFactors.instrument_D || 0
        const prepR = additionalFactors.pretreatment_R || 0
        const prepD = additionalFactors.pretreatment_D || 0
        const avgR = (instR + prepR) / 2
        const avgD = (instD + prepD) / 2
        
        // P 因子使用加权平均
        const finalWeights = scoreResults.schemes?.final_scheme || 'Standard'
        const weightMap: Record<string, { instrument: number, preparation: number }> = {
          'Standard': { instrument: 0.6, preparation: 0.4 },
          'Complex_Prep': { instrument: 0.3, preparation: 0.7 },
          'Direct_Online': { instrument: 0.8, preparation: 0.2 },
          'Equal': { instrument: 0.5, preparation: 0.5 }
        }
        const weights = weightMap[finalWeights] || weightMap['Standard']
        const instP = additionalFactors.instrument_P || 0
        const prepP = additionalFactors.pretreatment_P || 0
        const avgP = instP * weights.instrument + prepP * weights.preparation
        
        const totalScore = scoreResults.final?.score3 || 0
        const color = getColorHex(totalScore)
        
        const fileData: FileData = {
          id: Date.now().toString() + Math.random(),
          name: fileName.replace('.hplc', '').replace('.json', ''),
          color,
          data: {
            S: avgS,
            H: avgH,
            E: avgE,
            R: avgR,
            D: avgD,
            P: avgP,
            totalScore
          },
          scoreResults: scoreResults // 保存完整的 scoreResults
        }

        setFiles(prev => [...prev, fileData])
        message.success(`File ${fileName} loaded successfully`)
        return
      }

      // Fallback: 使用旧的计算逻辑（如果没有 scoreResults）
      console.log('⚠️ No scoreResults found, using fallback calculation')
      
      const methodsData = parsedData.methods || {}
      const gradientData = parsedData.gradient || {}
      const factorsData = parsedData.factors || []

      const sampleCount = methodsData.sampleCount || 0
      const totalScores = { S: 0, H: 0, E: 0, R: 0, D: 0, P: 0 }

      // 计算前处理试剂得分
      if (methodsData.preTreatmentReagents && Array.isArray(methodsData.preTreatmentReagents)) {
        methodsData.preTreatmentReagents.forEach((reagent: any) => {
          if (!reagent.name || reagent.volume <= 0) return
          const factor = factorsData.find((f: any) => f.name === reagent.name)
          if (!factor) return
          const mass = reagent.volume * factor.density
          totalScores.S += mass * factor.safetyScore
          totalScores.H += mass * factor.healthScore
          totalScores.E += mass * factor.envScore
          totalScores.R += mass * (factor.regeneration || 0)
          totalScores.D += mass * factor.disposal
          // P is method-level, not reagent-level
        })
      }

      // 计算流动相得分
      const calculations = gradientData?.calculations
      if (calculations) {
        if (calculations.mobilePhaseA?.components) {
          calculations.mobilePhaseA.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return
            const factor = factorsData.find((f: any) => f.name === component.reagentName)
            if (!factor) return
            const mass = component.volume * factor.density
            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * (factor.regeneration || 0)
            totalScores.D += mass * factor.disposal
            // P is method-level, not reagent-level
          })
        }
        
        if (calculations.mobilePhaseB?.components) {
          calculations.mobilePhaseB.components.forEach((component: any) => {
            if (!component.reagentName || component.volume <= 0) return
            const factor = factorsData.find((f: any) => f.name === component.reagentName)
            if (!factor) return
            const mass = component.volume * factor.density
            totalScores.S += mass * factor.safetyScore
            totalScores.H += mass * factor.healthScore
            totalScores.E += mass * factor.envScore
            totalScores.R += mass * (factor.regeneration || 0)
            totalScores.D += mass * factor.disposal
            // P is method-level, not reagent-level
          })
        }
      }

      const sumOfAllScores = totalScores.S + totalScores.H + totalScores.E + totalScores.R + totalScores.D + totalScores.P
      const totalScore = sampleCount > 0 ? sumOfAllScores / sampleCount : 0

      const fileData: FileData = {
        id: Date.now().toString() + Math.random(),
        name: fileName.replace('.hplc', '').replace('.json', ''),
        color: getColorHex(totalScore),
        data: {
          S: totalScores.S,
          H: totalScores.H,
          E: totalScores.E,
          R: totalScores.R,
          D: totalScores.D,
          P: totalScores.P,
          totalScore: totalScore
        }
      }

      setFiles(prev => [...prev, fileData])
      message.success(`File ${fileName} loaded successfully`)
    } catch (error) {
      console.error('Error processing data:', error)
      message.error(`Failed to process file ${fileName}`)
      throw error
    }
  }

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    setLoading(true)
    try {
      console.log('Reading file:', file.name)
      const text = await file.text()
      
      let parsedContent
      try {
        parsedContent = JSON.parse(text)
      } catch (e) {
        message.error('File format error, cannot parse')
        setLoading(false)
        return false
      }

      // 检查是否为加密文件
      if (parsedContent.encrypted && parsedContent.data) {
        console.log('� 检测到旧加密文件，自动解密...')
        try {
          // 尝试解密旧文件（不需要密码）
          const decryptedData = decryptData(parsedContent.data, '')
          
          if (!decryptedData) {
            throw new Error('无法解密文件')
          }
          
          const parsedData = JSON.parse(decryptedData)
          console.log('✅ 旧加密文件解密成功')
          await processDecryptedData(parsedData, file.name)
        } catch (error) {
          console.error('解密失败:', error)
          message.error(`解密文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
        setLoading(false)
      } else {
        console.log('📂 非加密文件')
        await processDecryptedData(parsedContent, file.name)
        setLoading(false)
      }
      
      return false
    } catch (error) {
      console.error('Error reading file:', error)
      message.error(`Failed to read file ${file.name}`)
      setLoading(false)
      return false
    }
  }

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    message.success('File removed')
  }

  const handleClearAll = async () => {
    if (files.length === 0) return
    if (window.confirm(`Are you sure you want to remove all ${files.length} file(s)?`)) {
      setFiles([])
      if (currentFilePath) {
        const storageKey = `hplc_comparison_files_${currentFilePath}`
        await StorageHelper.setJSON(storageKey, [])
      }
      message.success('All files cleared')
    }
  }

  // 确保 files 数组中没有重复的 id（防御性编程）
  const uniqueFiles = React.useMemo(() => {
    const seen = new Set<string>()
    const result: FileData[] = []
    
    for (const file of files) {
      if (!seen.has(file.id)) {
        seen.add(file.id)
        result.push(file)
      } else {
        console.warn('⚠️ Duplicate file id detected and removed:', file.id)
      }
    }
    
    if (result.length !== files.length) {
      console.error('❌ Found duplicate files! Original:', files.length, 'Unique:', result.length)
      console.log('Files:', files.map(f => ({ id: f.id, name: f.name })))
    }
    
    return result
  }, [files])

  const radarData = React.useMemo(() => [
    { subject: 'Safety (S)', ...Object.fromEntries(uniqueFiles.map(f => [f.name, Number(f.data.S.toFixed(2))])) },
    { subject: 'Health (H)', ...Object.fromEntries(uniqueFiles.map(f => [f.name, Number(f.data.H.toFixed(2))])) },
    { subject: 'Environment (E)', ...Object.fromEntries(uniqueFiles.map(f => [f.name, Number(f.data.E.toFixed(2))])) },
    { subject: 'Recycle (R)', ...Object.fromEntries(uniqueFiles.map(f => [f.name, Number(f.data.R.toFixed(2))])) },
    { subject: 'Disposal (D)', ...Object.fromEntries(uniqueFiles.map(f => [f.name, Number(f.data.D.toFixed(2))])) },
    { subject: 'Power (P)', ...Object.fromEntries(uniqueFiles.map(f => [f.name, Number(f.data.P.toFixed(2))])) },
  ], [uniqueFiles])

  // 对数缩放函数（保留原始数值，但用对数刻度显示）
  const logScale = (value: number): number => {
    if (value <= 0) return 0
    // 使用 log(1 + value) 来处理小数值
    return Math.log10(1 + value) * 50 // 乘以50调整显示范围
  }

  // 应用对数缩放到雷达图数据
  const scaledRadarData = React.useMemo(() => radarData.map(item => {
    const scaled: any = { 
      subject: item.subject,
      _rawData: {} // 存储原始数据用于tooltip
    }
    
    files.forEach(f => {
      const rawValue = (item as any)[f.name]
      scaled._rawData[f.name] = rawValue
      scaled[f.name] = logScale(rawValue)
    })
    
    return scaled
  }), [radarData])

  // 自定义雷达图标签渲染函数（增加标签与图表的距离）
  const renderCustomTick = (props: any) => {
    const { x, y, payload } = props
    const centerX = props.cx || 0
    const centerY = props.cy || 0
    
    // 计算从中心到标签的角度
    const angle = Math.atan2(y - centerY, x - centerX)
    
    // 增加距离：在原有位置基础上向外延伸 25 像素
    const offset = 10
    const newX = x + Math.cos(angle) * offset
    const newY = y + Math.sin(angle) * offset
    
    return (
      <text
        x={newX}
        y={newY}
        textAnchor={newX > centerX ? 'start' : newX < centerX ? 'end' : 'middle'}
        dominantBaseline="central"
        style={{ fontWeight: 'bold', fontSize: 12 }}
      >
        {payload.value}
      </text>
    )
  }

  // 自定义雷达图 Tooltip（显示原始值）
  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{payload[0].payload.subject}</p>
          {payload.map((entry: any, index: number) => {
            const rawValue = entry.payload._rawData[entry.name]
            return (
              <p key={index} style={{ margin: '3px 0', color: entry.color }}>
                {entry.name}: {typeof rawValue === 'number' ? rawValue.toFixed(2) : rawValue}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  console.log('Radar Data:', radarData)
  console.log('Scaled Radar Data:', scaledRadarData)
  console.log('Files:', uniqueFiles)

  // ========== 构建6个大因子的雷达图数据 ==========
  
  // 提取每个文件的6个大因子数据（S、H、E、R、D、P）
  interface MajorFactorData {
    S: number
    H: number
    E: number
    R: number
    D: number
    P: number
  }

  interface FileMajorFactors {
    id: string
    name: string
    color: string
    preparation: MajorFactorData | null  // 前处理阶段
    instrument: MajorFactorData | null   // 仪器分析阶段
    average: MajorFactorData | null      // 平均值
  }

  const [filesMajorFactors, setFilesMajorFactors] = useState<FileMajorFactors[]>([])

  // 异步加载所有文件的大因子数据
  useEffect(() => {
    const loadMajorFactors = async () => {
      console.log('🔄 Loading major factors for', uniqueFiles.length, 'files')
      const majorFactorsArray: FileMajorFactors[] = []

      for (const file of uniqueFiles) {
        // 如果是当前文件，从 storage 读取
        if (file.id.endsWith('_current')) {
          const scoreResults = await StorageHelper.getJSON(STORAGE_KEYS.SCORE_RESULTS)
          
          if (scoreResults?.preparation?.major_factors && scoreResults?.instrument?.major_factors) {
            const prepMajor = scoreResults.preparation.major_factors
            const instMajor = scoreResults.instrument.major_factors
            const additionalFactors = scoreResults.additional_factors || {}
            
            // 从 additionalFactors 获取 R、D、P 的具体数据
            const instR = additionalFactors.instrument_R || 0
            const instD = additionalFactors.instrument_D || 0
            const instP = additionalFactors.instrument_P || 0
            const prepR = additionalFactors.pretreatment_R || 0
            const prepD = additionalFactors.pretreatment_D || 0
            const prepP = additionalFactors.pretreatment_P || 0
            
            // 计算加权平均值（对应 Method Evaluation 页面的汇总数据）
            const finalWeights = scoreResults.schemes?.final_scheme || 'Standard'
            const weightMap: Record<string, { instrument: number, preparation: number }> = {
              'Standard': { instrument: 0.6, preparation: 0.4 },
              'Complex_Prep': { instrument: 0.3, preparation: 0.7 },
              'Direct_Online': { instrument: 0.8, preparation: 0.2 },
              'Equal': { instrument: 0.5, preparation: 0.5 }
            }
            const weights = weightMap[finalWeights] || weightMap['Standard']
            
            // 所有因子都使用加权平均
            const avgS = instMajor.S * weights.instrument + prepMajor.S * weights.preparation
            const avgH = instMajor.H * weights.instrument + prepMajor.H * weights.preparation
            const avgE = instMajor.E * weights.instrument + prepMajor.E * weights.preparation
            const avgR = instR * weights.instrument + prepR * weights.preparation
            const avgD = instD * weights.instrument + prepD * weights.preparation
            const avgP = instP * weights.instrument + prepP * weights.preparation

            majorFactorsArray.push({
              id: file.id,
              name: file.name,
              color: file.color || '#8884d8',
              preparation: {
                S: prepMajor.S,
                H: prepMajor.H,
                E: prepMajor.E,
                R: prepR,
                D: prepD,
                P: prepP
              },
              instrument: {
                S: instMajor.S,
                H: instMajor.H,
                E: instMajor.E,
                R: instR,
                D: instD,
                P: instP
              },
              average: {
                S: avgS,
                H: avgH,
                E: avgE,
                R: avgR,
                D: avgD,
                P: avgP
              }
            })
          }
        } else {
          // 对于上传的文件，检查是否有 scoreResults
          if (file.scoreResults?.preparation?.major_factors && file.scoreResults?.instrument?.major_factors) {
            const scoreResults = file.scoreResults
            const prepMajor = scoreResults.preparation.major_factors
            const instMajor = scoreResults.instrument.major_factors
            const additionalFactors = scoreResults.additional_factors || {}
            
            const instR = additionalFactors.instrument_R || 0
            const instD = additionalFactors.instrument_D || 0
            const instP = additionalFactors.instrument_P || 0
            const prepR = additionalFactors.pretreatment_R || 0
            const prepD = additionalFactors.pretreatment_D || 0
            const prepP = additionalFactors.pretreatment_P || 0
            
            // 使用加权平均（与 Method Evaluation 一致）
            const finalWeights = scoreResults.schemes?.final_scheme || 'Standard'
            const weightMap: Record<string, { instrument: number, preparation: number }> = {
              'Standard': { instrument: 0.6, preparation: 0.4 },
              'Complex_Prep': { instrument: 0.3, preparation: 0.7 },
              'Direct_Online': { instrument: 0.8, preparation: 0.2 },
              'Equal': { instrument: 0.5, preparation: 0.5 }
            }
            const weights = weightMap[finalWeights] || weightMap['Standard']
            
            // 所有因子都使用加权平均
            const avgS = instMajor.S * weights.instrument + prepMajor.S * weights.preparation
            const avgH = instMajor.H * weights.instrument + prepMajor.H * weights.preparation
            const avgE = instMajor.E * weights.instrument + prepMajor.E * weights.preparation
            const avgR = instR * weights.instrument + prepR * weights.preparation
            const avgD = instD * weights.instrument + prepD * weights.preparation
            const avgP = instP * weights.instrument + prepP * weights.preparation
            
            majorFactorsArray.push({
              id: file.id,
              name: file.name,
              color: file.color || '#8884d8',
              preparation: {
                S: prepMajor.S,
                H: prepMajor.H,
                E: prepMajor.E,
                R: prepR,
                D: prepD,
                P: prepP
              },
              instrument: {
                S: instMajor.S,
                H: instMajor.H,
                E: instMajor.E,
                R: instR,
                D: instD,
                P: instP
              },
              average: {
                S: avgS,
                H: avgH,
                E: avgE,
                R: avgR,
                D: avgD,
                P: avgP
              }
            })
          } else {
            // Fallback: 如果没有 scoreResults，使用汇总值
            majorFactorsArray.push({
              id: file.id,
              name: file.name,
              color: file.color || '#8884d8',
              preparation: {
                S: file.data.S,
                H: file.data.H,
                E: file.data.E,
                R: file.data.R,
                D: file.data.D,
                P: file.data.P
              },
              instrument: {
                S: file.data.S,
                H: file.data.H,
                E: file.data.E,
                R: file.data.R,
                D: file.data.D,
                P: file.data.P
              },
              average: {
                S: file.data.S,
                H: file.data.H,
                E: file.data.E,
                R: file.data.R,
                D: file.data.D,
                P: file.data.P
              }
            })
          }
        }
      }

      console.log('✅ Major factors loaded:', majorFactorsArray.length)
      setFilesMajorFactors(majorFactorsArray)
    }

    if (uniqueFiles.length > 0) {
      loadMajorFactors()
    } else {
      // 清空数据
      setFilesMajorFactors([])
    }
  }, [uniqueFiles])

  // 构建前处理阶段雷达图数据（6个大因子）
  const preparationRadarData = [
    { subject: 'Safety (S)', factor: 'S' },
    { subject: 'Health (H)', factor: 'H' },
    { subject: 'Environment (E)', factor: 'E' },
    { subject: 'Recycle (R)', factor: 'R' },
    { subject: 'Disposal (D)', factor: 'D' },
    { subject: 'Power (P)', factor: 'P' }
  ].map(item => {
    const dataPoint: any = { subject: item.subject, _rawData: {} }
    filesMajorFactors.forEach(file => {
      if (file.preparation) {
        const value = file.preparation[item.factor as keyof MajorFactorData]
        dataPoint[file.name] = value
        dataPoint._rawData[file.name] = value
      }
    })
    return dataPoint
  })

  // 构建仪器分析阶段雷达图数据（6个大因子）
  const instrumentRadarData = [
    { subject: 'Safety (S)', factor: 'S' },
    { subject: 'Health (H)', factor: 'H' },
    { subject: 'Environment (E)', factor: 'E' },
    { subject: 'Recycle (R)', factor: 'R' },
    { subject: 'Disposal (D)', factor: 'D' },
    { subject: 'Power (P)', factor: 'P' }
  ].map(item => {
    const dataPoint: any = { subject: item.subject, _rawData: {} }
    filesMajorFactors.forEach(file => {
      if (file.instrument) {
        const value = file.instrument[item.factor as keyof MajorFactorData]
        dataPoint[file.name] = value
        dataPoint._rawData[file.name] = value
      }
    })
    return dataPoint
  })

  // 构建总体雷达图数据（6个大因子的平均值）
  const averageRadarData = [
    { subject: 'Safety (S)', factor: 'S' },
    { subject: 'Health (H)', factor: 'H' },
    { subject: 'Environment (E)', factor: 'E' },
    { subject: 'Recycle (R)', factor: 'R' },
    { subject: 'Disposal (D)', factor: 'D' },
    { subject: 'Power (P)', factor: 'P' }
  ].map(item => {
    const dataPoint: any = { subject: item.subject, _rawData: {} }
    filesMajorFactors.forEach(file => {
      if (file.average) {
        const value = file.average[item.factor as keyof MajorFactorData]
        dataPoint[file.name] = value
        dataPoint._rawData[file.name] = value
      }
    })
    return dataPoint
  })

  const pieData = uniqueFiles.map(f => ({
    name: f.name,
    value: Number(f.data.totalScore.toFixed(2)),
    color: f.color, // 使用文件的颜色
    // 保存所有6个因子的数据用于tooltip
    details: {
      S: f.data.S,
      H: f.data.H,
      E: f.data.E,
      R: f.data.R,
      D: f.data.D,
      P: f.data.P
    }
  })).filter(item => item.value > 0)

  // 自定义饼图 Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          minWidth: '200px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px' }}>{data.name}</p>
          <p style={{ margin: '5px 0', color: '#1890ff' }}>
            <strong>Total Score:</strong> {data.value}
          </p>
          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />
          <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>Safety (S):</strong> {data.details.S.toFixed(2)}</p>
          <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>Health (H):</strong> {data.details.H.toFixed(2)}</p>
          <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>Environment (E):</strong> {data.details.E.toFixed(2)}</p>
          <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>Recycle (R):</strong> {data.details.R.toFixed(2)}</p>
          <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>Disposal (D):</strong> {data.details.D.toFixed(2)}</p>
          <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>Power (P):</strong> {data.details.P.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  console.log('Pie Data:', pieData)

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a28fd0', '#f4a261']

  const generateEvaluation = () => {
    if (uniqueFiles.length === 0) return null

    const sortedFiles = [...uniqueFiles].sort((a, b) => a.data.totalScore - b.data.totalScore)
    const best = sortedFiles[0]

    const getBestPerformance = (factor: keyof Omit<FileData['data'], 'totalScore'>) => {
      const sorted = [...uniqueFiles].sort((a, b) => a.data[factor] - b.data[factor])
      const best = sorted[0]
      return `${best.name} has the lowest value (${best.data[factor].toFixed(2)})`
    }

    return (
      <Card title="Evaluation" style={{ marginTop: 24 }}>
        <Paragraph>
          <Text strong>Total Score Comparison:</Text> Based on the comprehensive analysis of {uniqueFiles.length} methods, 
          <Text strong style={{ color: '#52c41a' }}> {best.name}</Text> demonstrates the best overall performance 
          with a total score of <Text strong>{best.data.totalScore.toFixed(3)}</Text> per sample.
        </Paragraph>
        
        <Paragraph>
          <Text strong>Individual Factor Analysis:</Text>
        </Paragraph>
        <ul>
          <li><Text strong>Safety (S):</Text> {getBestPerformance('S')}</li>
          <li><Text strong>Health (H):</Text> {getBestPerformance('H')}</li>
          <li><Text strong>Environment (E):</Text> {getBestPerformance('E')}</li>
          <li><Text strong>Recyclability (R):</Text> {getBestPerformance('R')}</li>
          <li><Text strong>Disposal (D):</Text> {getBestPerformance('D')}</li>
          <li><Text strong>Power (P):</Text> {getBestPerformance('P')}</li>
        </ul>

        <Paragraph style={{ marginTop: 16 }}>
          <Text strong>Recommendation:</Text> For applications prioritizing green chemistry principles, 
          <Text strong style={{ color: '#52c41a' }}> {best.name}</Text> is recommended. 
          However, specific factor requirements should be considered based on laboratory constraints and analytical needs.
        </Paragraph>
      </Card>
    )
  }

  const columns = [
    {
      title: 'Method Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 150,
      render: (text: string, record: any) => {
        // 合并三行显示
        if (record.rowType === 'prep') {
          return {
            children: <Text strong>{text}</Text>,
            props: { rowSpan: 3 }
          }
        }
        if (record.rowType === 'inst' || record.rowType === 'avg') {
          return { props: { rowSpan: 0 } }
        }
        return text
      }
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 150,
      render: (text: string) => <Text type={text === 'Overall' ? 'success' : 'secondary'}>{text}</Text>
    },
    {
      title: 'S',
      dataIndex: 'S',
      key: 'S',
      width: 80,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'H',
      dataIndex: 'H',
      key: 'H',
      width: 80,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'E',
      dataIndex: 'E',
      key: 'E',
      width: 80,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'R',
      dataIndex: 'R',
      key: 'R',
      width: 80,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'D',
      dataIndex: 'D',
      key: 'D',
      width: 80,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'P',
      dataIndex: 'P',
      key: 'P',
      width: 80,
      render: (val: number) => val.toFixed(2),
    },
    {
      title: 'Stage Score',
      dataIndex: 'stageScore',
      key: 'stageScore',
      width: 120,
      render: (val: number) => <Text strong>{val.toFixed(3)}</Text>
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right' as const,
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        if (record.rowType === 'prep') {
          return {
            children: (
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveFile(record.fileId)}
              >
                Remove
              </Button>
            ),
            props: { rowSpan: 3 }
          }
        }
        if (record.rowType === 'inst' || record.rowType === 'avg') {
          return { props: { rowSpan: 0 } }
        }
        return null
      },
    },
  ]

  // 构建展开的表格数据（每个文件3行：前处理、仪器、总体）
  const tableData = filesMajorFactors.flatMap((file) => {
    // 获取对应文件的 scoreResults
    const originalFile = uniqueFiles.find(f => f.id === file.id)
    const scoreResults = originalFile?.scoreResults
    
    // 提取各阶段的总分
    const prepScore = scoreResults?.preparation?.score2 || 0
    const instScore = scoreResults?.instrument?.score1 || 0
    const finalScore = scoreResults?.final?.score3 || originalFile?.data.totalScore || 0
    
    return [
      {
        key: `${file.id}-prep`,
        fileId: file.id,
        name: file.name,
        stage: 'Sample Preparation',
        rowType: 'prep',
        S: file.preparation?.S || 0,
        H: file.preparation?.H || 0,
        E: file.preparation?.E || 0,
        R: file.preparation?.R || 0,
        D: file.preparation?.D || 0,
        P: file.preparation?.P || 0,
        stageScore: prepScore
      },
      {
        key: `${file.id}-inst`,
        fileId: file.id,
        name: file.name,
        stage: 'Instrument Analysis',
        rowType: 'inst',
        S: file.instrument?.S || 0,
        H: file.instrument?.H || 0,
        E: file.instrument?.E || 0,
        R: file.instrument?.R || 0,
        D: file.instrument?.D || 0,
        P: file.instrument?.P || 0,
        stageScore: instScore
      },
      {
        key: `${file.id}-avg`,
        fileId: file.id,
        name: file.name,
        stage: 'Overall',
        rowType: 'avg',
        S: file.average?.S || 0,
        H: file.average?.H || 0,
        E: file.average?.E || 0,
        R: file.average?.R || 0,
        D: file.average?.D || 0,
        P: file.average?.P || 0,
        stageScore: finalScore
      }
    ]
  })

  return (
    <div className="comparison-page" style={{ padding: '24px' }}>
      <Title level={2}>
        <SwapOutlined /> Method Comparison
      </Title>
      <Paragraph>
        Upload multiple HPLC method files to compare their green chemistry performance across different dimensions.
      </Paragraph>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Upload
              accept=".hplc,.json"
              multiple
              showUploadList={false}
              beforeUpload={handleFileUpload}
              disabled={loading}
            >
              <Button icon={<UploadOutlined />} loading={loading}>
                Upload HPLC Files
              </Button>
            </Upload>
            <Text type="secondary" style={{ marginLeft: 16 }}>
              {uniqueFiles.length} file(s) loaded
            </Text>
          </Col>
          <Col>
            <Button danger onClick={handleClearAll} disabled={uniqueFiles.length === 0}>
              Clear All
            </Button>
          </Col>
        </Row>
      </Card>

      {uniqueFiles.length === 0 ? (
        <Card>
          <Empty description="No files uploaded. Please upload at least one HPLC method file to start comparison." />
        </Card>
      ) : (
        <>
          <Card title="Comparison Data" style={{ marginBottom: 24 }}>
            <Table
              columns={columns}
              dataSource={tableData}
              rowKey="key"
              pagination={false}
              scroll={{ x: 1200 }}
              size="small"
              bordered
            />
          </Card>

          {/* 第一行：前处理和仪器分析雷达图 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="Sample Preparation Stage - Major Factors">
                <div style={{ width: '100%', height: '450px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={preparationRadarData} margin={{ top: 50, right: 20, bottom: 30, left: 30 }}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={renderCustomTick} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      {filesMajorFactors.filter(f => f.preparation).map((file) => (
                        <Radar
                          key={file.id}
                          name={file.name}
                          dataKey={file.name}
                          stroke={file.color}
                          fill={file.color}
                          fillOpacity={0.3}
                          strokeWidth={3}
                        />
                      ))}
                      <Legend />
                      <Tooltip content={<CustomRadarTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Instrument Analysis Stage - Major Factors">
                <div style={{ width: '100%', height: '450px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={instrumentRadarData} margin={{ top: 50, right: 20, bottom: 30, left: 30 }}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={renderCustomTick} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      {filesMajorFactors.filter(f => f.instrument).map((file) => (
                        <Radar
                          key={file.id}
                          name={file.name}
                          dataKey={file.name}
                          stroke={file.color}
                          fill={file.color}
                          fillOpacity={0.3}
                          strokeWidth={3}
                        />
                      ))}
                      <Legend />
                      <Tooltip content={<CustomRadarTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 第二行：总体雷达图和总分饼状图 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="Overall Comparison - Major Factors Average">
                <div style={{ width: '100%', height: '450px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={averageRadarData} margin={{ top: 50, right: 20, bottom: 30, left: 30 }}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={renderCustomTick} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      {filesMajorFactors.filter(f => f.average).map((file) => (
                        <Radar
                          key={file.id}
                          name={file.name}
                          dataKey={file.name}
                          stroke={file.color}
                          fill={file.color}
                          fillOpacity={0.3}
                          strokeWidth={3}
                        />
                      ))}
                      <Legend />
                      <Tooltip content={<CustomRadarTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Total Score Comparison">
                <div style={{ width: '100%', height: '450px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          {generateEvaluation()}
        </>
      )}

    </div>
  )
}

export default ComparisonPage
