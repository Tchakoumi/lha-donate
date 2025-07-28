import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting minimal database seed...')

  // Create super admin user (essential for system access)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@lha-donate.org' },
    update: {
      // Update admin user if exists (ensure role is correct)
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@lha-donate.org',
      name: 'LHA Super Administrator',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  })

  console.log('✅ Created/updated super admin user:', adminUser.email)

  // Create essential system configuration
  await prisma.systemConfig.upsert({
    where: { key: 'app_settings' },
    update: {
      // Update existing config if needed
      value: {
        organizationName: "Let's Help Association",
        defaultCurrency: 'XAF',
        supportEmail: 'support@lha-donate.org',
        maintenanceMode: false,
        version: '1.0.0',
        initialized: true,
        setupCompleted: new Date().toISOString(),
      },
    },
    create: {
      key: 'app_settings',
      value: {
        organizationName: "Let's Help Association",
        defaultCurrency: 'XAF',
        supportEmail: 'support@lha-donate.org',
        maintenanceMode: false,
        version: '1.0.0',
        initialized: true,
        setupCompleted: new Date().toISOString(),
      },
    },
  })

  console.log('✅ Created/updated system configuration')

  // Create initial audit log entry for system initialization
  const existingInitLog = await prisma.auditLog.findFirst({
    where: {
      action: 'SYSTEM_INITIALIZED',
      entity: 'System',
    },
  })

  if (!existingInitLog) {
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_INITIALIZED',
        entity: 'System',
        details: {
          message: 'LHA Donate system initialized successfully',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        userId: adminUser.id,
      },
    })

    console.log('✅ Created system initialization audit log')
  } else {
    console.log('ℹ️  System already initialized, skipping audit log')
  }

  console.log('🎉 Minimal database seed completed successfully!')
  console.log('')
  console.log('📋 Summary:')
  console.log(`   - Super Admin: ${adminUser.email}`)
  console.log(`   - Organization: Let's Help Association`)
  console.log(`   - Default Currency: XAF`)
  console.log('')
  console.log('💡 Next steps:')
  console.log('   1. Log in with the super admin account')
  console.log('   2. Create additional user accounts as needed')
  console.log('   3. Set up your first donation campaign')
  console.log('   4. Configure organization-specific settings')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })