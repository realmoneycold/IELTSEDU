import re

file_path = '/home/ahror/Documents/IELTSPRACTICE2/src/routes/adminAuthRoutes.js'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Login query
content = content.replace("""    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        lastSeenAt: true
      }
    });""", """    const admin = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase().trim(),
        role: { in: ['ADMIN', 'CEO'] }
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
        lastSeenAt: true
      }
    });""")

# 2. bcrypt.compare
content = content.replace("bcrypt.compare(password, admin.passwordHash)", "bcrypt.compare(password, admin.password)")

# 3. prisma.admin.update
content = content.replace("""    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastSeenAt: new Date()
      }
    });""", """    await prisma.user.update({
      where: { id: admin.id },
      data: {
        lastSeenAt: new Date()
      }
    });""")

# 4. Success payload name
content = content.replace("""        admin: {
          id: admin.id,
          name: admin.name,""", """        admin: {
          id: admin.id,
          name: admin.full_name,""")

# 5. logLoginAttempt function definition & body
content = content.replace("""async function logLoginAttempt(adminId, ipAddress, deviceInfo, userAgent, success, reason) {
  try {
    // For now, just console log - will implement with LoginLog model later
    console.log(`Login Attempt: ${success ? 'SUCCESS' : 'FAILED'} | Admin: ${adminId || 'N/A'} | IP: ${ipAddress} | Device: ${deviceInfo} | Reason: ${reason}`);
    
    // TODO: Implement actual database logging when LoginLog model is added
    // await prisma.loginLog.create({
    //   data: {
    //     adminId,
    //     ipAddress,
    //     deviceInfo,
    //     userAgent,
    //     success,
    //     timestamp: new Date()
    //   }
    // });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}""", """async function logLoginAttempt(userId, ipAddress, deviceInfo, userAgent, success, reason) {
  try {
    console.log(`Login Attempt: ${success ? 'SUCCESS' : 'FAILED'} | User: ${userId || 'N/A'} | IP: ${ipAddress} | Device: ${deviceInfo} | Reason: ${reason}`);
    
    await prisma.loginLog.create({
      data: {
        userId,
        ipAddress,
        deviceInfo,
        userAgent,
        success,
        reason,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}""")

# 6. Seed route
content = content.replace("""    const adminCount = await prisma.admin.count();""", """    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });""")

content = content.replace("""    const admin = await prisma.admin.create({
      data: {
        name: 'Default Admin',
        email: 'admin@ieltspractice.com',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });""", """    const admin = await prisma.user.create({
      data: {
        full_name: 'Default Admin',
        email: 'admin@ieltspractice.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });""")

content = content.replace("""        admin: {
          id: admin.id,
          name: admin.name,""", """        admin: {
          id: admin.id,
          name: admin.full_name,""")

# 7. Verify route
content = content.replace("""    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true
      }
    });""", """    const adminRecord = await prisma.user.findFirst({
      where: { id: decoded.id, role: { in: ['ADMIN', 'CEO'] } },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true
      }
    });
    
    // Map full_name to name for frontend compatibility
    const admin = adminRecord ? { ...adminRecord, name: adminRecord.full_name } : null;""")

# 8. Reset password route
content = content.replace("""    const admin = await prisma.admin.update({
      where: { email: email.toLowerCase().trim() },
      data: { passwordHash: hashedPassword }
    });""", """    const existingAdmin = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), role: { in: ['ADMIN', 'CEO'] } }
    });
    
    if (!existingAdmin) {
      throw new Error('Admin not found');
    }

    const admin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { password: hashedPassword }
    });
    admin.name = admin.full_name; // for the success response
""")

with open(file_path, 'w') as f:
    f.write(content)

print(content[:100]) # just printing to show success
