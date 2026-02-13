import fs from 'fs';
import path from 'path';

// 验证打包结果
const packagePath = 'F:/安装包/performance-evaluation-system-win32-x64';
const exePath = path.join(packagePath, 'performance-evaluation-system.exe');
const resourcesPath = path.join(packagePath, 'resources');

console.log('验证打包结果...');

// 检查主要文件是否存在
const requiredFiles = [
  'performance-evaluation-system.exe',
  'resources/app/package.json',
  'resources/app/dist/index.html',
  'resources/app/electron/main.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const fullPath = path.join(packagePath, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${file} 存在`);
  } else {
    console.log(`✗ ${file} 不存在`);
    allFilesExist = false;
  }
});

// 检查文件大小
if (fs.existsSync(exePath)) {
  const stats = fs.statSync(exePath);
  console.log(`可执行文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

if (allFilesExist) {
  console.log('\n✅ 打包验证成功！所有必要文件都存在。');
  console.log(`📦 应用已打包到: ${packagePath}`);
  console.log(`🚀 可执行文件: ${exePath}`);
} else {
  console.log('\n❌ 打包验证失败！缺少必要文件。');
}