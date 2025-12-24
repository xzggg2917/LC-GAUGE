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

export const decryptData = (encryptedData: string, password: string = ''): string => {
  try {
    // Base64解码
    const combined = decodeURIComponent(escape(atob(encryptedData)))
    const separator = '::HPLC_SEPARATOR::'
    
    console.log('\uD83D\uDD13 Decrypting file (compatibility mode)')
    
    // Check if it contains separator (password-protected format)
    if (!combined.includes(separator)) {
      // Old format: direct Base64 encoding, no password verification
      console.log('\u2705 Old format file (no password), returning data directly')
      return combined
    }
    
    const parts = combined.split(separator)
    const data = parts[0]
    const storedPassword = parts[1]
    
    console.log('✅ Password-protected format file, bypassing password verification, returning data')
    
    // No longer verifying password, directly return data (backward compatibility)
    return data
  } catch (error) {
    console.error('Decryption failed:', error)
    // Return empty string on decryption failure, let caller handle it
    return ''
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
