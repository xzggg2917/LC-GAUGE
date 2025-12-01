import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface NestedPieChartProps {
  mainFactors: {
    S: number
    H: number
    E: number
    R: number
    D: number
    P: number
  }
  subFactors: {
    releasePotential: number
    fireExplos: number
    reactDecom: number
    acuteToxicity: number
    irritation: number
    chronicToxicity: number
    persistency: number
    airHazard: number
    waterHazard: number
  }
}

const NestedPieChart: React.FC<NestedPieChartProps> = ({ mainFactors, subFactors }) => {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const chart = echarts.init(chartRef.current)

    // 过滤掉值为0的数据
    const mainFactorData = [
      { value: Number(mainFactors.S.toFixed(2)), name: 'S', itemStyle: { color: '#52c41a' } },
      { value: Number(mainFactors.H.toFixed(2)), name: 'H', itemStyle: { color: '#fa8c16' } },
      { value: Number(mainFactors.E.toFixed(2)), name: 'E', itemStyle: { color: '#1890ff' } },
      { value: Number(mainFactors.R.toFixed(2)), name: 'R', itemStyle: { color: '#f5222d' } },
      { value: Number(mainFactors.D.toFixed(2)), name: 'D', itemStyle: { color: '#722ed1' } },
      { value: Number(mainFactors.P.toFixed(2)), name: 'P', itemStyle: { color: '#eb2f96' } }
    ].filter(item => item.value > 0)

    const subFactorData = [
      { 
        value: Number(subFactors.releasePotential.toFixed(2)), 
        name: 'Release potential',
        itemStyle: { color: '#95de64' }
      },
      { 
        value: Number(subFactors.fireExplos.toFixed(2)), 
        name: 'Fire/Explos.',
        itemStyle: { color: '#73d13d' }
      },
      { 
        value: Number(subFactors.reactDecom.toFixed(2)), 
        name: 'React./Decom.',
        itemStyle: { color: '#52c41a' }
      },
      { 
        value: Number(subFactors.acuteToxicity.toFixed(2)), 
        name: 'Acute toxicity',
        itemStyle: { color: '#ffd666' }
      },
      { 
        value: Number(subFactors.irritation.toFixed(2)), 
        name: 'Irritation',
        itemStyle: { color: '#ffc53d' }
      },
      { 
        value: Number(subFactors.chronicToxicity.toFixed(2)), 
        name: 'Chronic toxicity',
        itemStyle: { color: '#fa8c16' }
      },
      { 
        value: Number(subFactors.persistency.toFixed(2)), 
        name: 'Persis-tency',
        itemStyle: { color: '#69c0ff' }
      },
      { 
        value: Number(subFactors.airHazard.toFixed(2)), 
        name: 'Air Hazard',
        itemStyle: { color: '#40a9ff' }
      },
      { 
        value: Number(subFactors.waterHazard.toFixed(2)), 
        name: 'Water Hazard',
        itemStyle: { color: '#1890ff' }
      }
    ].filter(item => item.value > 0)

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        show: false
      },
      grid: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
        containLabel: true
      },
      labelLayout: function (params: any) {
        // 只对内圈饼图（seriesIndex = 0）进行标签位置调整
        if (params.seriesIndex === 0) {
          const isLeft = params.labelRect.x < chart.getWidth() / 2
          const points = params.labelLinePoints as number[][]
          
          // 计算扇形中心角度
          const midAngle = ((params.startAngle || 0) + (params.endAngle || 0)) / 2
          const radius = params.seriesModel.getData().getItemLayout(params.dataIndex).r || 0
          const center = params.seriesModel.get('center')
          
          // 计算中心点坐标（处理百分比）
          const cx = typeof center[0] === 'string' ? 
            parseFloat(center[0]) / 100 * chart.getWidth() : center[0]
          const cy = typeof center[1] === 'string' ? 
            parseFloat(center[1]) / 100 * chart.getHeight() : center[1]
          
          // 将标签推到半径的85%位置
          const targetRadius = radius * 0.85
          const radian = midAngle * Math.PI / 180
          
          return {
            x: cx + Math.cos(radian) * targetRadius,
            y: cy + Math.sin(radian) * targetRadius,
            labelLinePoints: points
          }
        }
      },
      series: [
        // 内圈：6个大因子
        {
          name: 'Main Factors',
          type: 'pie',
          selectedMode: 'single',
          radius: [0, '35%'],  // 从30%增加到35%，饼图更大，标签更靠近绝对边缘
          center: ['50%', '45%'],
          label: {
            show: true,
            position: 'inside',
            fontSize: 13,
            fontWeight: 'bold',
            color: '#fff',
            formatter: (params: any) => {
              return params.name
            }
          },
          labelLine: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 15,
              fontWeight: 'bold'
            }
          },
          data: mainFactorData.map((item, index) => {
            const total = mainFactorData.reduce((sum, d) => sum + d.value, 0)
            const percent = (item.value / total) * 100
            
            // 计算该扇形的中间角度
            let startAngle = -90  // 从-90度开始（12点钟方向）
            for (let i = 0; i < index; i++) {
              startAngle += (mainFactorData[i].value / total) * 360
            }
            const endAngle = startAngle + (item.value / total) * 360
            const midAngle = (startAngle + endAngle) / 2
            const radian = midAngle * Math.PI / 180
            
            // 计算标签的径向偏移（向外移动到80%半径位置）
            const baseRadius = 0.35  // 对应radius的35%
            const targetRadiusRatio = 0.80  // 移动到半径的80%位置
            const offsetDistance = baseRadius * targetRadiusRatio * 100  // 转换为百分比坐标
            
            return {
              ...item,
              label: {
                fontSize: percent < 3 ? 9 : percent < 5 ? 11 : percent < 10 ? 12 : 14,
                // 使用position数组直接指定标签偏移量（相对于扇形中心）
                offset: [
                  Math.cos(radian) * offsetDistance * 0.8,  // x方向偏移
                  Math.sin(radian) * offsetDistance * 0.8   // y方向偏移
                ]
              }
            }
          })
        },
        // 外圈：9个小因子
        {
          name: 'Sub Factors',
          type: 'pie',
          radius: ['45%', '60%'],
          center: ['50%', '45%'],
          labelLine: {
            length: 15,
            length2: 8
          },
          label: {
            formatter: (params: any) => {
              return `{name|${params.name}}\n{value|${params.value}} {percent|(${params.percent}%)}`
            },
            rich: {
              name: {
                fontSize: 10,
                color: '#666',
                lineHeight: 16
              },
              value: {
                fontSize: 11,
                fontWeight: 'bold',
                color: '#333',
                lineHeight: 18
              },
              percent: {
                fontSize: 9,
                color: '#fff',
                backgroundColor: '#4C5058',
                padding: [2, 3],
                borderRadius: 3
              }
            },
            backgroundColor: '#F6F8FC',
            borderColor: '#8C8D8E',
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 6]
          },
          data: subFactorData
        }
      ]
    }

    chart.setOption(option)

    // 响应式调整
    const handleResize = () => {
      chart.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [mainFactors, subFactors])

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
}

export default NestedPieChart
