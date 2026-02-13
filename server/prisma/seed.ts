import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('开始数据库初始化...')

    // 1. 创建超级管理员员工记录
    const superAdmin = await prisma.employee.upsert({
        where: { empNo: '602667' },
        update: {
            name: '超级管理员',
            position: '系统管理员'
        },
        create: {
            empNo: '602667',
            name: '超级管理员',
            position: '系统管理员',
            station: '',
            area: '',
            workshop: '',
            center: '',
            company: '公司总部'
        }
    })

    console.log('✓ 超级管理员员工记录创建成功:', superAdmin.empNo)

    // 2. 创建超级管理员用户账号（密码: Nbdt2025!）
    const hashedPassword = await bcrypt.hash('Nbdt2025!', 10)

    const superAdminUser = await prisma.user.upsert({
        where: { empNo: '602667' },
        update: {
            role: 'SUPER_ADMIN',
            passwordHash: hashedPassword
        },
        create: {
            empNo: '602667',
            username: '602667',
            passwordHash: hashedPassword,
            role: 'SUPER_ADMIN'
        }
    })

    console.log('✓ 超级管理员用户账号创建成功')
    console.log('  用户名:', superAdminUser.username)
    console.log('  密码: Nbdt2025!')
    console.log('')
    console.log('数据库初始化完成! 🎉')
}

main()
    .catch((e) => {
        console.error('初始化失败:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
