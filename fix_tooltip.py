#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""修复 MethodsPage.tsx 中的 Tooltip 命名冲突"""

file_path = r"d:\Projects\HPLC_improve\frontend\src\pages\MethodsPage.tsx"

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 替换第 898, 1124, 1338 行（注意 Python 索引从0开始）
target_lines = [897, 1123, 1337]  # 对应 898, 1124, 1338 行

for line_idx in target_lines:
    if line_idx < len(lines):
        lines[line_idx] = lines[line_idx].replace('<Tooltip ', '<RechartsTooltip ')

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ 修复完成！")
print(f"已将第 {[i+1 for i in target_lines]} 行的 <Tooltip 替换为 <RechartsTooltip")
