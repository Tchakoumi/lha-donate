import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/donors - List all donors
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
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [donors, total] = await Promise.all([
      prisma.donor.findMany({
        where,
        include: {
          donations: {
            select: { amount: true, currency: true, donationDate: true }
          },
          _count: {
            select: { donations: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.donor.count({ where })
    ])

    // Calculate stats for each donor
    const donorsWithStats = donors.map(donor => ({
      ...donor,
      totalDonated: donor.donations.reduce((sum, donation) => sum + Number(donation.amount), 0),
      donationCount: donor._count.donations,
      lastDonation: donor.donations.length > 0 
        ? donor.donations.sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime())[0].donationDate
        : null,
      donations: undefined, // Remove donations array from response
      _count: undefined // Remove count object from response
    }))

    return NextResponse.json({
      donors: donorsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching donors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donors' },
      { status: 500 }
    )
  }
}

// POST /api/donors - Create new donor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, country } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    if (email) {
      const existingDonor = await prisma.donor.findUnique({
        where: { email }
      })
      
      if (existingDonor) {
        return NextResponse.json(
          { error: 'A donor with this email already exists' },
          { status: 409 }
        )
      }
    }

    const donor = await prisma.donor.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        country
      }
    })

    return NextResponse.json(donor, { status: 201 })
  } catch (error) {
    console.error('Error creating donor:', error)
    return NextResponse.json(
      { error: 'Failed to create donor' },
      { status: 500 }
    )
  }
}