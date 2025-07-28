import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/partners - List all partner enterprises
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [partners, total] = await Promise.all([
      prisma.partnerEnterprise.findMany({
        where,
        include: {
          donations: {
            where: { status: 'CONFIRMED' },
            select: { amount: true, currency: true, donationDate: true }
          },
          commitments: {
            orderBy: { year: 'desc' },
            take: 5 // Get last 5 years of commitments
          },
          _count: {
            select: { donations: true, commitments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.partnerEnterprise.count({ where })
    ])

    // Calculate stats for each partner
    const partnersWithStats = partners.map(partner => {
      const totalDonated = partner.donations.reduce((sum, donation) => sum + Number(donation.amount), 0)
      const currentYear = new Date().getFullYear()
      const currentCommitment = partner.commitments.find(c => c.year === currentYear)
      
      return {
        ...partner,
        totalDonated,
        donationCount: partner._count.donations,
        lastDonation: partner.donations.length > 0 
          ? partner.donations.sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime())[0].donationDate
          : null,
        currentYearCommitment: currentCommitment ? {
          amount: Number(currentCommitment.committedAmount),
          currency: currentCommitment.currency,
          status: currentCommitment.status,
          description: currentCommitment.description
        } : null,
        commitmentFulfillment: currentCommitment 
          ? (totalDonated / Number(currentCommitment.committedAmount)) * 100 
          : 0,
        donations: undefined, // Remove donations array from response
        _count: undefined // Remove count object from response
      }
    })

    return NextResponse.json({
      partners: partnersWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partner enterprises' },
      { status: 500 }
    )
  }
}

// POST /api/partners - Create new partner enterprise
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, website, logo, email, phone, country, yearlyCommitment } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Partner name is required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    if (email) {
      const existingPartner = await prisma.partnerEnterprise.findUnique({
        where: { email }
      })
      
      if (existingPartner) {
        return NextResponse.json(
          { error: 'A partner with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Create partner enterprise
    const partner = await prisma.partnerEnterprise.create({
      data: {
        name,
        website,
        logo,
        email,
        phone,
        country
      }
    })

    // Create yearly commitment if provided
    if (yearlyCommitment && yearlyCommitment.amount && yearlyCommitment.year) {
      await prisma.partnershipCommitment.create({
        data: {
          year: parseInt(yearlyCommitment.year),
          committedAmount: parseFloat(yearlyCommitment.amount),
          currency: yearlyCommitment.currency || 'XAF',
          description: yearlyCommitment.description,
          partnerEnterpriseId: partner.id
        }
      })
    }

    // Return partner with commitment
    const partnerWithCommitment = await prisma.partnerEnterprise.findUnique({
      where: { id: partner.id },
      include: {
        commitments: {
          orderBy: { year: 'desc' }
        }
      }
    })

    return NextResponse.json(partnerWithCommitment, { status: 201 })
  } catch (error) {
    console.error('Error creating partner:', error)
    return NextResponse.json(
      { error: 'Failed to create partner enterprise' },
      { status: 500 }
    )
  }
}