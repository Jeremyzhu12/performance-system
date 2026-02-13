import express from 'express';
import cors from 'cors';
import { readEnvFile, writeEnvFile } from './config.js';

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 读取API配置
app.get('/api/config', (req, res) => {
  try {
    const result = readEnvFile();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `服务器错误: ${error.message}`
    });
  }
});

// 保存API配置
app.post('/api/config', (req, res) => {
  try {
    const { url, workflow_id, pat } = req.body;
    
    // 验证必填字段
    if (!workflow_id || !pat) {
      return res.status(400).json({
        success: false,
        error: 'Workflow ID和PAT为必填项'
      });
    }
    
    // 验证URL格式
    if (url && !url.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'URL格式不正确，必须以http或https开头'
      });
    }
    
    const config = {
      url: url || 'https://api.coze.cn/v1/workflow/stream_run',
      workflow_id,
      pat
    };
    
    const result = writeEnvFile(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `服务器错误: ${error.message}`
    });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API服务器运行在端口 ${PORT}`);
});

export default app;