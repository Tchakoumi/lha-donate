import { User, OrganizationalRole } from '@prisma/client';
import { indexUser, updateUser, deleteUser, UserDocument } from './elasticsearch';
import { prisma } from './prisma';

// Convert Prisma User to Elasticsearch UserDocument
function userToESDocument(user: User): UserDocument {
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role,
    organizationalRole: user.organizationalRole,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// Create user with automatic ES indexing
export async function createUserWithIndexing(userData: {
  email: string;
  name?: string;
  role?: string;
  organizationalRole?: OrganizationalRole;
  isActive?: boolean;
  emailVerified?: boolean;
}) {
  try {
    // Create user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        organizationalRole: userData.organizationalRole || 'USER',
        isActive: userData.isActive ?? true,
        emailVerified: userData.emailVerified ?? false,
      }
    });

    // Index in Elasticsearch
    const esDoc = userToESDocument(user);
    await indexUser(esDoc);

    console.log(`✅ Created and indexed user: ${user.email}`);
    return user;
  } catch (error) {
    console.error('❌ Failed to create user with indexing:', error);
    throw error;
  }
}

// Update user with automatic ES indexing
export async function updateUserWithIndexing(
  userId: string, 
  updates: Partial<{
    name: string;
    role: string;
    organizationalRole: OrganizationalRole;
    isActive: boolean;
    emailVerified: boolean;
  }>
) {
  try {
    // Update in PostgreSQL
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    // Update in Elasticsearch
    const esUpdates: Partial<UserDocument> = {
      ...updates,
      updatedAt: user.updatedAt.toISOString(),
    };
    await updateUser(userId, esUpdates);

    console.log(`✅ Updated and indexed user: ${user.email}`);
    return user;
  } catch (error) {
    console.error('❌ Failed to update user with indexing:', error);
    throw error;
  }
}

// Delete user with automatic ES cleanup
export async function deleteUserWithIndexing(userId: string) {
  try {
    // Delete from PostgreSQL
    const user = await prisma.user.delete({
      where: { id: userId }
    });

    // Delete from Elasticsearch
    await deleteUser(userId);

    console.log(`✅ Deleted and removed from index user: ${user.email}`);
    return user;
  } catch (error) {
    console.error('❌ Failed to delete user with indexing:', error);
    throw error;
  }
}

// Index existing user (for manual syncing if needed)
export async function indexExistingUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const esDoc = userToESDocument(user);
    await indexUser(esDoc);

    console.log(`✅ Indexed existing user: ${user.email}`);
    return user;
  } catch (error) {
    console.error('❌ Failed to index existing user:', error);
    throw error;
  }
}