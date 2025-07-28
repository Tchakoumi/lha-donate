import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CampaignStatus } from '@prisma/client'

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as CampaignStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where = status ? { status } : {}

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          },
          donations: {
            select: { amount: true }
          },
          _count: {
            select: { donations: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.campaign.count({ where })
    ])

    // Calculate total raised for each campaign
    const campaignsWithStats = campaigns.map(campaign => ({
      ...campaign,
      totalRaised: campaign.donations.reduce((sum, donation) => sum + Number(donation.amount), 0),
      donationCount: campaign._count.donations,
      donations: undefined, // Remove donations array from response
      _count: undefined // Remove count object from response
    }))

    return NextResponse.json({
      campaigns: campaignsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, objective, goalAmount, startDate, endDate, createdBy } = body

    // Validate required fields
    if (!name || !objective || !goalAmount || !startDate || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        objective,
        goalAmount: parseFloat(goalAmount),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdBy,
        status: CampaignStatus.ACTIVE
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log campaign creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_CAMPAIGN',
        entity: 'Campaign',
        entityId: campaign.id,
        details: {
          campaignName: campaign.name,
          goalAmount: campaign.goalAmount
        },
        userId: createdBy
      }
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}