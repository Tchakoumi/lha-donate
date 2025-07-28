import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentMethod, DonationStatus, DonorType } from '@prisma/client'

// GET /api/donations - List all donations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const status = searchParams.get('status') as DonationStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    if (campaignId) where.campaignId = campaignId
    if (status) where.status = status

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        include: {
          donor: {
            select: { id: true, firstName: true, lastName: true, email: true, country: true }
          },
          partnerEnterprise: {
            select: { id: true, name: true, email: true, website: true, logo: true }
          },
          campaign: {
            select: { id: true, name: true }
          },
          recorder: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { donationDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.donation.count({ where })
    ])

    return NextResponse.json({
      donations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching donations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    )
  }
}

// POST /api/donations - Create new donation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      amount,
      currency = 'XAF',
      paymentMethod,
      transactionId,
      isRecurring = false,
      recurringPeriod,
      campaignId,
      recordedBy,
      donorType,
      donor,
      partnerId
    } = body

    // Validate required fields
    if (!amount || !paymentMethod || !recordedBy || !donorType) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, paymentMethod, recordedBy, donorType' },
        { status: 400 }
      )
    }

    // Validate donor type specific requirements
    if (donorType === 'INDIVIDUAL' && !donor) {
      return NextResponse.json(
        { error: 'Donor information is required for individual donations' },
        { status: 400 }
      )
    }

    if (donorType === 'PARTNER_ENTERPRISE' && !partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required for partner enterprise donations' },
        { status: 400 }
      )
    }

    let donationData: any = {
      amount: parseFloat(amount),
      currency,
      paymentMethod: paymentMethod as PaymentMethod,
      transactionId,
      isRecurring,
      recurringPeriod,
      status: DonationStatus.CONFIRMED,
      campaignId,
      recordedBy,
      donorType: donorType as DonorType
    }

    let donorInfo = null

    if (donorType === 'INDIVIDUAL') {
      // Create or find individual donor
      if (donor.email) {
        donorInfo = await prisma.donor.upsert({
          where: { email: donor.email },
          update: {
            firstName: donor.firstName,
            lastName: donor.lastName,
            phone: donor.phone,
            country: donor.country
          },
          create: {
            firstName: donor.firstName,
            lastName: donor.lastName,
            email: donor.email,
            phone: donor.phone,
            country: donor.country
          }
        })
      } else {
        donorInfo = await prisma.donor.create({
          data: {
            firstName: donor.firstName,
            lastName: donor.lastName,
            phone: donor.phone,
            country: donor.country
          }
        })
      }
      donationData.donorId = donorInfo.id
    } else {
      // Partner enterprise donation
      const partner = await prisma.partnerEnterprise.findUnique({
        where: { id: partnerId }
      })

      if (!partner) {
        return NextResponse.json(
          { error: 'Partner enterprise not found' },
          { status: 404 }
        )
      }

      donationData.partnerEnterpriseId = partnerId
      donorInfo = partner
    }

    // Create donation
    const donation = await prisma.donation.create({
      data: donationData,
      include: {
        donor: donorType === 'INDIVIDUAL' ? {
          select: { id: true, firstName: true, lastName: true, email: true, country: true }
        } : undefined,
        partnerEnterprise: donorType === 'PARTNER_ENTERPRISE' ? {
          select: { id: true, name: true, email: true, website: true, logo: true }
        } : undefined,
        campaign: {
          select: { id: true, name: true }
        },
        recorder: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log donation creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_DONATION',
        entity: 'Donation',
        entityId: donation.id,
        details: {
          amount: donation.amount,
          currency: donation.currency,
          paymentMethod: donation.paymentMethod,
          campaignId: donation.campaignId,
          donorType: donation.donorType,
          donorName: donorType === 'INDIVIDUAL' 
            ? `${donorInfo?.firstName} ${donorInfo?.lastName}`
            : donorInfo?.name
        },
        userId: recordedBy
      }
    })

    return NextResponse.json(donation, { status: 201 })
  } catch (error) {
    console.error('Error creating donation:', error)
    return NextResponse.json(
      { error: 'Failed to create donation' },
      { status: 500 }
    )
  }
}