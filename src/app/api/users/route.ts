import { NextRequest, NextResponse } from 'next/server';
import { searchUsers } from '@/lib/elasticsearch';
import { updateUserWithIndexing } from '@/lib/user-service';
import { prisma } from '@/lib/prisma';

// GET /api/users - List/search users using Elasticsearch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const emailVerified = searchParams.get('emailVerified'); 
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const from = (page - 1) * limit;
    const size = limit;

    // Use Elasticsearch for search
    const result = await searchUsers({
      query: search || undefined,
      role: role || undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      emailVerified: emailVerified ? emailVerified === 'true' : undefined,
      from,
      size,
    });

    return NextResponse.json({
      success: true,
      data: {
        users: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
        searchInfo: {
          query: search || 'all users',
          took: result.took,
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Users API error:', error);
    
    // Fallback to PostgreSQL if Elasticsearch fails
    try {
      const search = new URL(request.url).searchParams.get('search');
      const page = parseInt(new URL(request.url).searchParams.get('page') || '1');
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      console.log('⚠️ Using PostgreSQL fallback for user search');

      return NextResponse.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          searchInfo: {
            query: search || 'all users',
            source: 'postgresql_fallback'
          }
        }
      });

    } catch (fallbackError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both Elasticsearch and PostgreSQL queries failed',
          message: fallbackError.message,
        },
        { status: 500 }
      );
    }
  }
}

// POST /api/users - Create user (if needed for admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role, isActive, emailVerified } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create user (this would typically be done through Better Auth)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'USER',
        isActive: isActive ?? true,
        emailVerified: emailVerified ?? false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: { user }
    });

  } catch (error: any) {
    console.error('❌ Create user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user',
        message: error.message,
      },
      { status: 500 }
    );
  }
}