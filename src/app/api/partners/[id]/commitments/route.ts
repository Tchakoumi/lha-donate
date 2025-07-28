import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/partners/[id]/commitments - Get partner's commitments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id

    // Verify partner exists
    const partner = await prisma.partnerEnterprise.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner enterprise not found' },
        { status: 404 }
      )
    }

    // Get commitments with donation stats
    const commitments = await prisma.partnershipCommitment.findMany({
      where: { partnerEnterpriseId: partnerId },
      orderBy: { year: 'desc' }
    })

    // Calculate fulfillment for each commitment
    const commitmentsWithStats = await Promise.all(
      commitments.map(async (commitment) => {
        // Get donations for this partner in the commitment year
        const donations = await prisma.donation.findMany({
          where: {
            partnerEnterpriseId: partnerId,
            status: 'CONFIRMED',
            donationDate: {
              gte: new Date(`${commitment.year}-01-01`),
              lt: new Date(`${commitment.year + 1}-01-01`)
            }
          },
          select: { amount: true, donationDate: true }
        })

        const totalDonated = donations.reduce((sum, donation) => sum + Number(donation.amount), 0)
        const fulfillmentPercentage = Number(commitment.committedAmount) > 0 
          ? (totalDonated / Number(commitment.committedAmount)) * 100 
          : 0

        return {
          ...commitment,
          committedAmount: Number(commitment.committedAmount),
          totalDonated,
          fulfillmentPercentage: Math.round(fulfillmentPercentage * 100) / 100,
          donationCount: donations.length,
          remainingAmount: Math.max(0, Number(commitment.committedAmount) - totalDonated)
        }
      })
    )

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email
      },
      commitments: commitmentsWithStats
    })
  } catch (error) {
    console.error('Error fetching partner commitments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partner commitments' },
      { status: 500 }
    )
  }
}

// POST /api/partners/[id]/commitments - Create new commitment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id
    const body = await request.json()
    const { year, committedAmount, currency = 'XAF', description } = body

    // Validate required fields
    if (!year || !committedAmount) {
      return NextResponse.json(
        { error: 'Year and committed amount are required' },
        { status: 400 }
      )
    }

    // Verify partner exists
    const partner = await prisma.partnerEnterprise.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner enterprise not found' },
        { status: 404 }
      )
    }

    // Check if commitment for this year already exists
    const existingCommitment = await prisma.partnershipCommitment.findUnique({
      where: {
        partnerEnterpriseId_year: {
          partnerEnterpriseId: partnerId,
          year: parseInt(year)
        }
      }
    })

    if (existingCommitment) {
      return NextResponse.json(
        { error: `Commitment for year ${year} already exists for this partner` },
        { status: 409 }
      )
    }

    // Create new commitment
    const commitment = await prisma.partnershipCommitment.create({
      data: {
        year: parseInt(year),
        committedAmount: parseFloat(committedAmount),
        currency,
        description,
        partnerEnterpriseId: partnerId
      }
    })

    return NextResponse.json({
      ...commitment,
      committedAmount: Number(commitment.committedAmount)
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating partner commitment:', error)
    return NextResponse.json(
      { error: 'Failed to create partner commitment' },
      { status: 500 }
    )
  }
}