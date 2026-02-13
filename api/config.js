import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取.env文件内容
function readEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const config = {};
      
      // 解析.env文件内容
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            config[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      return {
        success: true,
        config: {
          url: config.VITE_COZE_API_URL || 'https://api.coze.cn/v1/workflow/stream_run',
          workflow_id: config.VITE_COZE_WORKFLOW_ID || '',
          pat: config.VITE_COZE_API_KEY || ''
        }
      };
    } else {
      return {
        success: false,
        error: '.env文件不存在'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `读取.env文件失败: ${error.message}`
    };
  }
}

// 写入.env文件内容
function writeEnvFile(config) {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    // 构建新的.env文件内容
    const envContent = `# Coze API 配置
VITE_COZE_API_KEY=${config.pat}
VITE_COZE_WORKFLOW_ID=${config.workflow_id}
VITE_COZE_API_URL=${config.url}

# 注意：
# 1. 这个文件包含敏感信息，不应该提交到版本控制系统
# 2. 修改配置后需要重启开发服务器才能生效
# 3. 请确保.gitignore文件中包含.env以防止意外提交
`;
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    return {
      success: true,
      message: '配置保存成功，请重启开发服务器使配置生效'
    };
  } catch (error) {
    return {
      success: false,
      error: `写入.env文件失败: ${error.message}`
    };
  }
}

export {
  readEnvFile,
  writeEnvFile
};