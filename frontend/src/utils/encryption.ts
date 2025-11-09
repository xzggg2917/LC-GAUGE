// 简单的加密/解密工具（使用Base64 + 密码混淆）
// 注意：这是基础加密，生产环境应使用更安全的加密库如 crypto-js

export const encryptData = (data: string, password: string): string => {
  try {
    // 将数据和密码混合
    const combined = data + '::HPLC_SEPARATOR::' + password
    // Base64编码
    return btoa(unescape(encodeURIComponent(combined)))
  } catch (error) {
    console.error('加密失败:', error)
    throw new Error('数据加密失败')
  }
}

export const decryptData = (encryptedData: string, password: string): string => {
  try {
    // Base64解码
    const combined = decodeURIComponent(escape(atob(encryptedData)))
    const separator = '::HPLC_SEPARATOR::'
    
    if (!combined.includes(separator)) {
      throw new Error('数据格式错误')
    }
    
    const parts = combined.split(separator)
    const data = parts[0]
    const storedPassword = parts[1]
    
    // 验证密码
    if (storedPassword !== password) {
      throw new Error('密码错误')
    }
    
    return data
  } catch (error) {
    if (error instanceof Error && error.message === '密码错误') {
      throw error
    }
    console.error('解密失败:', error)
    throw new Error('数据解密失败或密码错误')
  }
}

// 验证文件所有者
export const verifyFileOwner = (fileData: any, username: string): boolean => {
  return fileData.owner === username
}

// 生成文件指纹（用于验证文件完整性）
export const generateFileHash = (data: string): string => {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}
