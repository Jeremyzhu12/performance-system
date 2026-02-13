import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Input,
  Form,
  Space,
  Alert,
  message,
  Row,
  Col,
  Spin
} from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, SaveOutlined, ReloadOutlined, SettingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ApiConfig {
  url: string;
  workflow_id: string;
  pat: string;
}

const ApiManagement: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  // const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    url: '',
    workflow_id: '',
    pat: ''
  });
  // const [showPat, setShowPat] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  // const [pendingAction, setPendingAction] = useState<'save' | 'reload' | null>(null);
  const [showRestartAlert, setShowRestartAlert] = useState(false);

  const CORRECT_PASSWORD = '!nbdt2025';

  // 检查是否在Electron环境中
  const isElectronApp = typeof window !== 'undefined' && (window as any).electronAPI;

  // API调用函数
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      
      if (isElectronApp) {
        // 使用Electron IPC
        const result = await (window as any).electronAPI.getConfig();
        
        if (result.success) {
          const data = result.data;
          setApiConfig({
            url: data.VITE_COZE_API_URL || 'https://api.coze.cn/v1/workflow/stream_run',
            workflow_id: data.VITE_COZE_WORKFLOW_ID || '',
            pat: data.VITE_COZE_API_KEY || ''
          });
          message.success('配置加载成功');
        } else {
          if (result.error === '配置文件不存在') {
            message.warning('配置文件不存在，将使用默认配置');
            setApiConfig({
              url: 'https://api.coze.cn/v1/workflow/stream_run',
              workflow_id: '',
              pat: ''
            });
          } else {
            message.error(result.error || '加载配置失败');
          }
        }
      } else {
        message.error('请在Electron应用中使用此功能');
      }
    } catch (error) {
      message.error('加载配置时发生未知错误');
      console.error('Load config error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载保存的配置
  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
    }
  }, [isAuthenticated]);

  // 处理密码验证
  const handlePasswordSubmit = () => {
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
      message.success('验证成功，欢迎进入API管理页面');
    } else {
      setAuthError('密码错误，请重新输入');
      setPassword('');
    }
  };

  // 处理配置更新
  const handleConfigChange = (field: keyof ApiConfig, value: string) => {
    setApiConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const validateConfig = (config: ApiConfig): string[] => {
    const errors: string[] = [];
    
    // URL验证
    if (!config.url.trim()) {
      errors.push('API URL不能为空');
    } else if (!isValidUrl(config.url)) {
      errors.push('请输入有效的API URL（必须以http://或https://开头）');
    } else if (!config.url.includes('coze') && !config.url.includes('api')) {
      errors.push('API URL格式可能不正确，请确认是否为正确的API地址');
    }
    
    // Workflow ID验证
    if (!config.workflow_id.trim()) {
      errors.push('Workflow ID不能为空');
    } else if (config.workflow_id.length < 10) {
      errors.push('Workflow ID长度过短，请检查是否正确');
    }
    
    // PAT验证
    if (!config.pat.trim()) {
      errors.push('Personal Access Token不能为空');
    } else if (config.pat.length < 20) {
      errors.push('Personal Access Token长度过短，请检查是否正确');
    } else if (!config.pat.startsWith('pat_')) {
      errors.push('Personal Access Token格式可能不正确（通常以pat_开头）');
    }
    
    return errors;
  };

  // 保存配置
  const handleSave = async () => {
    // 验证配置
    const validationErrors = validateConfig(apiConfig);
    if (validationErrors.length > 0) {
      message.error(validationErrors[0]);
      return;
    }

    setIsSaving(true);
    try {
      if (isElectronApp) {
        // 使用Electron IPC
        const result = await (window as any).electronAPI.saveConfig({
          VITE_COZE_API_URL: apiConfig.url,
          VITE_COZE_WORKFLOW_ID: apiConfig.workflow_id,
          VITE_COZE_API_KEY: apiConfig.pat
        });

        if (result.success) {
          message.success('配置保存成功！');
          setShowRestartAlert(true);
          // 重新加载配置以确认保存成功
          await loadConfig();
        } else {
          message.error(result.error || '保存配置失败');
        }
      } else {
        message.error('请在Electron应用中使用此功能');
      }
    } catch (error) {
      message.error('保存配置时发生未知错误');
      console.error('Save config error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 重置配置
  const handleReset = () => {
    setApiConfig({
      url: 'https://api.coze.cn/v1/workflow/stream_run',
      workflow_id: '',
      pat: ''
    });
    message.success('配置已重置为默认值');
  };

  // 如果未验证，显示密码输入界面
  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <Card style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', padding: '24px 24px 0' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#e3f2fd',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <SettingOutlined style={{ fontSize: '24px', color: '#1976d2' }} />
            </div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              API管理系统
            </Title>
            <Text type="secondary">
              请输入管理员密码以继续
            </Text>
          </div>
          
          <div style={{ padding: '24px' }}>
            <Form onFinish={handlePasswordSubmit}>
              <Form.Item
                label="管理员密码"
                required
              >
                <Input.Password
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  onPressEnter={handlePasswordSubmit}
                />
              </Form.Item>
              
              {authError && (
                <Alert
                  message={authError}
                  type="error"
                  style={{ marginBottom: '16px' }}
                />
              )}
              
              <Button type="primary" htmlType="submit" block>
                验证登录
              </Button>
            </Form>
          </div>
        </Card>
      </div>
    );
  }

  // 验证通过后显示API管理界面
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <Title level={1} style={{ marginBottom: '8px' }}>
            API配置管理
          </Title>
          <Text type="secondary">
            管理系统API接口配置参数
          </Text>
        </div>
        
        {showRestartAlert && (
          <Alert
            message="配置已保存成功"
            description={
              <div>
                <p>环境变量已更新，需要重启开发服务器才能生效。</p>
                <p style={{ marginTop: '8px' }}>
                  <strong>重启步骤：</strong>
                </p>
                <ol style={{ marginTop: '4px', marginLeft: '16px' }}>
                  <li>1. 停止当前开发服务器 (Ctrl+C)</li>
                  <li>2. 重新运行 <code style={{ background: '#f5f5f5', padding: '2px 4px', borderRadius: '4px' }}>npm run dev</code></li>
                </ol>
              </div>
            }
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            closable
            onClose={() => setShowRestartAlert(false)}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Card>
          <div style={{ padding: '24px 24px 0' }}>
            <Title level={3} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <SettingOutlined />
              API配置参数
            </Title>
          </div>
          
          <Spin spinning={isLoading} tip="正在加载配置...">
            <div style={{ padding: '0 24px 24px' }}>
            <Form layout="vertical">
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="API URL"
                    help="API服务的基础URL地址"
                  >
                    <Input
                      type="url"
                      value={apiConfig.url}
                      onChange={(e) => handleConfigChange('url', e.target.value)}
                      placeholder="https://api.example.com"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Workflow ID"
                    help="工作流程的唯一标识符"
                  >
                    <Input
                      value={apiConfig.workflow_id}
                      onChange={(e) => handleConfigChange('workflow_id', e.target.value)}
                      placeholder="workflow_12345"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </Col>
                
                <Col xs={24}>
                  <Form.Item
                    label="Personal Access Token (PAT)"
                    help="用于API认证的个人访问令牌"
                  >
                    <Input.Password
                      value={apiConfig.pat}
                      onChange={(e) => handleConfigChange('pat', e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <div style={{ paddingTop: '16px' }}>
                <Space>
                  <Button 
                    type="primary" 
                    onClick={handleSave} 
                    loading={isSaving}
                    disabled={isLoading}
                    icon={<SaveOutlined />}
                  >
                    {isSaving ? '保存中...' : '保存配置'}
                  </Button>
                  
                  <Button 
                    onClick={handleReset} 
                    disabled={isLoading || isSaving}
                    icon={<ReloadOutlined />}
                  >
                    重置配置
                  </Button>
                  
                  <Button 
                    onClick={loadConfig} 
                    disabled={isLoading || isSaving}
                    icon={<ReloadOutlined />}
                  >
                    重新加载
                  </Button>
                </Space>
              </div>
            </Form>
            </div>
          </Spin>
        </Card>

        {/* 配置预览 */}
        <Card style={{ marginTop: '24px' }}>
          <div style={{ padding: '24px 24px 0' }}>
            <Title level={4}>当前配置预览</Title>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="small" /> 正在加载配置...
              </div>
            ) : (
              <div style={{ 
                background: '#f5f5f5', 
                borderRadius: '8px', 
                padding: '16px', 
                fontFamily: 'monospace', 
                fontSize: '14px' 
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#666' }}>URL:</span>{' '}
                    <span style={{ color: apiConfig.url ? '#1890ff' : '#ff4d4f' }}>
                      {apiConfig.url || '未配置'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Workflow ID:</span>{' '}
                    <span style={{ color: apiConfig.workflow_id ? '#52c41a' : '#ff4d4f' }}>
                      {apiConfig.workflow_id || '未配置'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>PAT:</span>{' '}
                    <span style={{ color: apiConfig.pat ? '#722ed1' : '#ff4d4f' }}>
                      {apiConfig.pat ? '●'.repeat(Math.min(apiConfig.pat.length, 20)) + (apiConfig.pat.length > 20 ? '...' : '') : '未配置'}
                    </span>
                  </div>
                </div>
                
                {(!apiConfig.url || !apiConfig.workflow_id || !apiConfig.pat) && (
                  <Alert
                    message="配置不完整"
                    description="请确保所有配置项都已正确填写，否则API调用可能失败。"
                    type="warning"
                    showIcon
                    style={{ marginTop: '16px' }}
                  />
                )}
                
                {(apiConfig.url && apiConfig.workflow_id && apiConfig.pat) && (
                  <Alert
                    message="配置完整"
                    description="所有必要的配置项都已设置，API调用应该可以正常工作。修改配置后请重启开发服务器。"
                    type="success"
                    showIcon
                    style={{ marginTop: '16px' }}
                  />
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ApiManagement;