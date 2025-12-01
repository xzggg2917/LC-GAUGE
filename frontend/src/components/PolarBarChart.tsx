import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface PolarBarChartProps {
  scores: {
    S: number
    H: number
    E: number
    R: number
    D: number
    P: number
  }
}

const PolarBarChart: React.FC<PolarBarChartProps> = ({ scores }) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // 初始化或获取图表实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // 计算最大值用于设置坐标轴范围
    const values = [scores.S, scores.H, scores.E, scores.R, scores.D, scores.P]
    const maxValue = Math.max(...values)
    const axisMax = maxValue > 0 ? Math.ceil(maxValue * 1.15) : 100 // 留15%余量

    const option: echarts.EChartsOption = {
      polar: {
        radius: [45, '75%'],
        center: ['50%', '48%']  // 向上移动，从58%改为48%
      },
      angleAxis: {
        max: axisMax,
        startAngle: 75,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: true,
          color: '#999',
          fontSize: 10,
          margin: 8  // 增加间距，避免与图形重叠
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.08)',
            type: 'dashed'
          }
        }
      },
      radiusAxis: {
        type: 'category',
        data: [
          'S',
          'H',
          'E',
          'R',
          'D',
          'P'
        ],
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          fontSize: 12,
          color: '#666',
          margin: 15,  // 增加间距
          interval: 0
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#333',
          fontSize: 13
        },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); border-radius: 8px;',
        formatter: (params: any) => {
          const factorNames: { [key: string]: string } = {
            'S': 'Safety',
            'H': 'Health Hazard',
            'E': 'Environmental Impact',
            'R': 'Regeneration',
            'D': 'Disposal',
            'P': 'Power'
          }
          const colorMap: { [key: string]: string } = {
            'S': '#52c41a',
            'H': '#fa8c16',
            'E': '#1890ff',
            'R': '#f5222d',
            'D': '#722ed1',
            'P': '#eb2f96'
          }
          const color = colorMap[params.name] || '#666'
          return `
            <div style="font-weight: 600; color: ${color}; margin-bottom: 6px; font-size: 14px;">
              ${factorNames[params.name]} (${params.name})
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
              <span style="color: #666; font-size: 12px;">Score:</span>
              <span style="font-weight: 700; color: #333; font-size: 15px;">${params.value.toFixed(3)}</span>
            </div>
          `
        }
      },
      series: {
        type: 'bar',
        data: [
          {
            value: scores.S,
            name: 'S',
            itemStyle: { 
              color: '#52c41a',
              borderRadius: [0, 8, 8, 0]
            }
          },
          {
            value: scores.H,
            name: 'H',
            itemStyle: { 
              color: '#fa8c16',
              borderRadius: [0, 8, 8, 0]
            }
          },
          {
            value: scores.E,
            name: 'E',
            itemStyle: { 
              color: '#1890ff',
              borderRadius: [0, 8, 8, 0]
            }
          },
          {
            value: scores.R,
            name: 'R',
            itemStyle: { 
              color: '#f5222d',
              borderRadius: [0, 8, 8, 0]
            }
          },
          {
            value: scores.D,
            name: 'D',
            itemStyle: { 
              color: '#722ed1',
              borderRadius: [0, 8, 8, 0]
            }
          },
          {
            value: scores.P,
            name: 'P',
            itemStyle: { 
              color: '#eb2f96',
              borderRadius: [0, 8, 8, 0]
            }
          }
        ],
        coordinateSystem: 'polar',
        label: {
          show: false  // 不显示标签
        },
        barWidth: 20  // 增加条形宽度
      }
    }

    chartInstance.current.setOption(option, true)

    // 响应式调整
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scores])

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '500px'
      }} 
    />
  )
}

export default PolarBarChart
