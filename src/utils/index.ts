// 工号格式化工具函数
export const formatEmpNo = (empNo: any): string => {
  if (empNo === null || empNo === undefined) return ''
  
  // 转换为字符串并移除.0后缀
  let formatted = String(empNo).trim().replace(/\.0$/, '')
  
  // 确保是6位数字，不足6位前面补0
  if (/^\d+$/.test(formatted)) {
    formatted = formatted.padStart(6, '0')
  }
  
  return formatted
}

// 工号比较工具函数（用于匹配）
export const normalizeEmpNo = (empNo: any): string => {
  if (empNo === null || empNo === undefined) return ''
  
  // 转换为字符串并移除.0后缀，不进行补0操作
  return String(empNo).trim().replace(/\.0$/, '')
} 