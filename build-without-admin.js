import builder from 'electron-builder';
import path from 'path';

async function buildApp() {
  console.log('🚀 开始打包应用...');
  
  try {
    // 配置打包选项，避免需要管理员权限的操作
    const config = {
      appId: 'com.performance.evaluation.system',
      productName: '绩效评估系统',
      directories: {
        output: 'F:/安装包'
      },
      files: [
        'dist/**/*',
        'electron/**/*',
        'package.json'
      ],
      win: {
        target: {
          target: 'dir', // 只生成目录，不生成安装包
          arch: ['x64']
        },
        forceCodeSigning: false
      },
      forceCodeSigning: false,
      nodeGypRebuild: false,
      buildDependenciesFromSource: false,
      compression: 'store', // 不压缩，加快打包速度
      // 跳过代码签名相关的下载和解压
      afterSign: null,
      beforeBuild: null
    };

    // 执行打包
    const result = await builder.build({
      targets: builder.Platform.WINDOWS.createTarget('dir', builder.Arch.x64),
      config: config,
      publish: 'never'
    });

    console.log('✅ 打包完成！');
    console.log('📁 输出目录: F:/安装包/win-unpacked/');
    console.log('🎯 可执行文件: F:/安装包/win-unpacked/绩效评估系统.exe');
    
  } catch (error) {
    console.error('❌ 打包失败:', error.message);
    
    if (error.message.includes('权限') || error.message.includes('privilege')) {
      console.log('\n💡 解决方案:');
      console.log('1. 以管理员身份运行PowerShell');
      console.log('2. 或者使用便携版打包: npm run electron:dist');
    }
  }
}

buildApp();