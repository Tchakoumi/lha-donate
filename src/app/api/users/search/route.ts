import { NextRequest, NextResponse } from 'next/server';
import { searchUsers } from '@/lib/elasticsearch';

// GET /api/users/search - Search users using Elasticsearch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const role = searchParams.get('role') || undefined;
    const isActive = searchParams.get('isActive');
    const emailVerified = searchParams.get('emailVerified');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const from = (page - 1) * limit;
    const size = limit;

    const searchQuery = {
      query: query || undefined,
      role: role || undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      emailVerified: emailVerified ? emailVerified === 'true' : undefined,
      from,
      size,
    };

    const result = await searchUsers(searchQuery);

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
          query: query || 'all users',
          took: result.took,
          total: result.total,
        }
      }
    });

  } catch (error: any) {
    console.error('❌ User search API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}