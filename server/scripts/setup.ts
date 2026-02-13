#!/usr/bin/env node

/**
 * 项目快速启动脚本
 * 用于帮助用户快速配置和启动项目
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim())
        })
    })
}

async function main() {
    console.log('\n🚀 绩效系统后端 - 快速启动\n')

    // 检查 .env 文件
    const envPath = path.join(process.cwd(), '.env')
    if (!fs.existsSync(envPath)) {
        console.log('📝 未找到 .env 文件，开始配置...\n')

        const dbHost = await question('MySQL主机地址 (默认localhost): ') || 'localhost'
        const dbPort = await question('MySQL端口 (默认3306): ') || '3306'
        const dbUser = await question('MySQL用户名 (默认root): ') || 'root'
        const dbPassword = await question('MySQL密码: ')
        const dbName = await question('数据库名称 (默认performance_system): ') || 'performance_system'

        const envContent = `# 数据库配置
DATABASE_URL="mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"

# JWT密钥
JWT_SECRET="${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}"
JWT_REFRESH_SECRET="${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}"

# 服务器配置
PORT=3001
NODE_ENV=development

# CORS配置
CORS_ORIGIN="http://localhost:5173"
`

        fs.writeFileSync(envPath, envContent)
        console.log('\n✓ .env 文件创建成功!\n')
    }

    // 检查是否需要安装依赖
    if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
        console.log('📦 安装依赖包...')
        execSync('npm install', { stdio: 'inherit' })
        console.log('✓ 依赖安装完成\n')
    }

    // 生成Prisma Client
    console.log('🔧 生成Prisma Client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✓ Prisma Client生成完成\n')

    // 询问是否运行数据库迁移
    const runMigration = await question('是否运行数据库迁移? (y/n): ')
    if (runMigration.toLowerCase() === 'y') {
        console.log('🗄️  运行数据库迁移...')
        execSync('npx prisma migrate dev --name init', { stdio: 'inherit' })
        console.log('✓ 数据库迁移完成\n')

        // 询问是否初始化超级管理员
        const runSeed = await question('是否初始化超级管理员账号(602667)? (y/n): ')
        if (runSeed.toLowerCase() === 'y') {
            console.log('👤 初始化超级管理员...')
            execSync('npm run prisma:seed', { stdio: 'inherit' })
            console.log('✓ 超级管理员初始化完成\n')
        }
    }

    console.log('✅ 配置完成!\n')
    console.log('启动开发服务器: npm run dev')
    console.log('打开Prisma Studio: npm run prisma:studio\n')

    rl.close()
}

main().catch((error) => {
    console.error('Error:', error)
    rl.close()
    process.exit(1)
})
