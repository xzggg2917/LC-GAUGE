"""
太极图绘制程序
使用 matplotlib 绘制高质量的太极图（阴阳图）
包含完整的阴阳鱼造型和小圆点
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from matplotlib.path import Path


def draw_taiji(save_path=None, dpi=300, figsize=(10, 10)):
    """
    绘制太极图
    
    参数:
        save_path: 保存路径，如果为 None 则只显示不保存
        dpi: 图像分辨率，默认 300
        figsize: 图像大小，默认 (10, 10)
    """
    # 创建图形和坐标轴
    fig, ax = plt.subplots(1, 1, figsize=figsize)
    ax.set_aspect('equal')
    ax.axis('off')  # 隐藏坐标轴
    
    # 设置绘图范围
    ax.set_xlim(-1.2, 1.2)
    ax.set_ylim(-1.2, 1.2)
    
    # ============ 1. 绘制外圆边框 ============
    outer_circle = patches.Circle(
        (0, 0), 
        radius=1.0,
        facecolor='none',
        edgecolor='black',
        linewidth=3,
        zorder=10
    )
    ax.add_patch(outer_circle)
    
    # ============ 2. 绘制左半圆（白色部分 - 阳） ============
    # 使用 Wedge 绘制半圆
    left_half = patches.Wedge(
        (0, 0),           # 圆心
        r=1.0,            # 半径
        theta1=90,        # 起始角度
        theta2=270,       # 结束角度
        facecolor='white',
        edgecolor='none',
        zorder=1
    )
    ax.add_patch(left_half)
    
    # ============ 3. 绘制右半圆（黑色部分 - 阴） ============
    right_half = patches.Wedge(
        (0, 0),
        r=1.0,
        theta1=270,       # 起始角度
        theta2=90,        # 结束角度（跨越0度）
        facecolor='black',
        edgecolor='none',
        zorder=1
    )
    ax.add_patch(right_half)
    
    # ============ 4. 绘制上方小圆（白色阳鱼头） ============
    # 左侧白色阳鱼的头部在上方，所以画白色小圆
    upper_small_circle = patches.Circle(
        (0, 0.5),         # 圆心位置在上方
        radius=0.5,       # 半径为外圆的一半
        facecolor='white',
        edgecolor='none',
        zorder=2
    )
    ax.add_patch(upper_small_circle)
    
    # ============ 5. 绘制下方小圆（黑色阴鱼头） ============
    # 右侧黑色阴鱼的头部在下方，所以画黑色小圆
    lower_small_circle = patches.Circle(
        (0, -0.5),        # 圆心位置在下方
        radius=0.5,
        facecolor='black',
        edgecolor='none',
        zorder=2
    )
    ax.add_patch(lower_small_circle)
    
    # ============ 6. 绘制白色阳鱼眼中的黑色小点 ============
    # 阳中有阴：白色鱼头中的黑色小点
    upper_dot = patches.Circle(
        (0, 0.5),         # 与上方小圆同心
        radius=0.15,      # 小点半径
        facecolor='black',
        edgecolor='none',
        zorder=3
    )
    ax.add_patch(upper_dot)
    
    # ============ 7. 绘制黑色阴鱼眼中的白色小点 ============
    # 阴中有阳：黑色鱼头中的白色小点
    lower_dot = patches.Circle(
        (0, -0.5),        # 与下方小圆同心
        radius=0.15,
        facecolor='white',
        edgecolor='none',
        zorder=3
    )
    ax.add_patch(lower_dot)
    
    # ============ 8. 绘制S形分界线（增强视觉效果） ============
    # 使用参数方程绘制平滑的S曲线
    theta = np.linspace(0, 2*np.pi, 1000)
    
    # 上半部分S曲线（从右到左，向上弯曲）
    x_upper = 0.5 * np.cos(theta[500:1000])
    y_upper = 0.5 + 0.5 * np.sin(theta[500:1000])
    
    # 下半部分S曲线（从左到右，向下弯曲）
    x_lower = 0.5 * np.cos(theta[0:500])
    y_lower = -0.5 + 0.5 * np.sin(theta[0:500])
    
    # 绘制分界线（可选，增强视觉效果）
    # ax.plot(x_upper, y_upper, 'k-', linewidth=2, zorder=5, alpha=0.3)
    # ax.plot(x_lower, y_lower, 'k-', linewidth=2, zorder=5, alpha=0.3)
    
    # ============ 9. 添加标题和说明 ============
    plt.title('太极图 (Taiji Diagram)', fontsize=20, fontweight='bold', pad=20)
    
    # 在图形下方添加说明文字
    fig.text(0.5, 0.05, '阴阳调和 · 万物平衡', 
             ha='center', fontsize=14, style='italic')
    
    # ============ 10. 保存或显示图形 ============
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=dpi, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        print(f"太极图已保存至: {save_path}")
    
    plt.show()
    
    return fig, ax


def draw_taiji_advanced(save_path=None, dpi=300, figsize=(10, 10), 
                       show_grid=False, background_color='#f5f5f5'):
    """
    绘制高级版太极图（带渐变效果和装饰）
    
    参数:
        save_path: 保存路径
        dpi: 分辨率
        figsize: 图像大小
        show_grid: 是否显示网格（调试用）
        background_color: 背景颜色
    """
    fig, ax = plt.subplots(1, 1, figsize=figsize, facecolor=background_color)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_xlim(-1.3, 1.3)
    ax.set_ylim(-1.3, 1.3)
    
    if show_grid:
        ax.grid(True, alpha=0.3)
        ax.axis('on')
    
    # ============ 绘制外圈装饰圆环 ============
    decorative_ring = patches.Circle(
        (0, 0),
        radius=1.08,
        facecolor='none',
        edgecolor='#DAA520',  # 金色
        linewidth=4,
        linestyle='-',
        zorder=11
    )
    ax.add_patch(decorative_ring)
    
    # ============ 绘制主体太极图 ============
    # 外圆
    outer_circle = patches.Circle(
        (0, 0),
        radius=1.0,
        facecolor='white',
        edgecolor='black',
        linewidth=3,
        zorder=10
    )
    ax.add_patch(outer_circle)
    
    # 左半圆（白色 - 阳）
    left_half = patches.Wedge(
        (0, 0),
        r=1.0,
        theta1=90,
        theta2=270,
        facecolor='white',
        edgecolor='none',
        zorder=1
    )
    ax.add_patch(left_half)
    
    # 右半圆（黑色 - 阴）
    right_half = patches.Wedge(
        (0, 0),
        r=1.0,
        theta1=270,
        theta2=90,
        facecolor='black',
        edgecolor='none',
        zorder=1
    )
    ax.add_patch(right_half)
    
    # 上方黑色鱼头
    upper_circle = patches.Circle(
        (0, 0.5),
        radius=0.5,
        facecolor='black',
        edgecolor='none',
        zorder=2
    )
    ax.add_patch(upper_circle)
    
    # 下方白色鱼头
    lower_circle = patches.Circle(
        (0, -0.5),
        radius=0.5,
        facecolor='white',
        edgecolor='none',
        zorder=2
    )
    ax.add_patch(lower_circle)
    
    # 上方黑色鱼眼中的白色小点
    upper_dot = patches.Circle(
        (0, 0.5),
        radius=0.15,
        facecolor='white',
        edgecolor='none',
        zorder=3
    )
    ax.add_patch(upper_dot)
    
    # 下方白色鱼眼中的黑色小点
    lower_dot = patches.Circle(
        (0, -0.5),
        radius=0.15,
        facecolor='black',
        edgecolor='none',
        zorder=3
    )
    ax.add_patch(lower_dot)
    
    # ============ 添加八卦方位标记（可选） ============
    # 八个方位的角度
    angles = [0, 45, 90, 135, 180, 225, 270, 315]
    bagua_names = ['乾', '巽', '坎', '艮', '坤', '兑', '离', '震']
    
    for angle, name in zip(angles, bagua_names):
        rad = np.deg2rad(angle)
        x = 1.18 * np.cos(rad)
        y = 1.18 * np.sin(rad)
        ax.text(x, y, name, fontsize=12, ha='center', va='center',
               fontweight='bold', color='#8B4513')
    
    # ============ 添加标题 ============
    plt.title('太极八卦图', fontsize=22, fontweight='bold', pad=20, 
             family='SimHei')
    
    fig.text(0.5, 0.08, '道生一，一生二，二生三，三生万物', 
            ha='center', fontsize=13, style='italic', family='KaiTi')
    
    # 保存或显示
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=dpi, bbox_inches='tight',
                   facecolor=background_color, edgecolor='none')
        print(f"高级太极图已保存至: {save_path}")
    
    plt.show()
    
    return fig, ax


if __name__ == '__main__':
    print("=" * 60)
    print("太极图绘制程序")
    print("=" * 60)
    print("\n正在绘制标准太极图...")
    
    # 绘制标准太极图
    draw_taiji(save_path='taiji_standard.png', dpi=300)
    
    print("\n正在绘制高级太极八卦图...")
    
    # 绘制高级版太极图
    draw_taiji_advanced(save_path='taiji_advanced.png', dpi=300)
    
    print("\n" + "=" * 60)
    print("绘制完成！")
    print("生成文件:")
    print("  1. taiji_standard.png - 标准太极图")
    print("  2. taiji_advanced.png - 高级太极八卦图")
    print("=" * 60)
