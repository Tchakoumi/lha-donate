import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // all, year, month, week

    // Calculate date filter based on period
    let dateFilter: any = {}
    const now = new Date()
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = { donationDate: { gte: weekAgo } }
        break
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        dateFilter = { donationDate: { gte: monthAgo } }
        break
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        dateFilter = { donationDate: { gte: yearAgo } }
        break
      default:
        dateFilter = {}
    }

    // Get basic counts
    const [
      totalCampaigns,
      activeCampaigns,
      totalDonors,
      totalDonations,
      totalExpenses,
      pendingExpenses
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      prisma.donor.count(),
      prisma.donation.count({ where: { status: 'CONFIRMED', ...dateFilter } }),
      prisma.expense.count(),
      prisma.expense.count({ where: { status: 'PENDING' } })
    ])

    // Get donation amounts
    const donationAmounts = await prisma.donation.aggregate({
      where: { status: 'CONFIRMED', ...dateFilter },
      _sum: { amount: true },
      _avg: { amount: true }
    })

    // Get expense amounts
    const expenseAmounts = await prisma.expense.aggregate({
      where: { status: { in: ['VALIDATED', 'DISBURSED', 'DONE'] } },
      _sum: { amount: true }
    })

    // Get top campaigns by donations
    const topCampaigns = await prisma.campaign.findMany({
      include: {
        donations: {
          where: { status: 'CONFIRMED' },
          select: { amount: true }
        },
        _count: {
          select: { donations: true }
        }
      },
      take: 5
    })

    const campaignStats = topCampaigns
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        totalRaised: campaign.donations.reduce((sum, donation) => sum + Number(donation.amount), 0),
        donationCount: campaign._count.donations,
        goalAmount: Number(campaign.goalAmount),
        progress: Number(campaign.goalAmount) > 0 
          ? (campaign.donations.reduce((sum, donation) => sum + Number(donation.amount), 0) / Number(campaign.goalAmount)) * 100 
          : 0
      }))
      .sort((a, b) => b.totalRaised - a.totalRaised)

    // Get monthly donation trends (last 12 months)
    const monthlyTrends = await prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
      SELECT 
        DATE_TRUNC('month', "donationDate") as month,
        SUM("amount")::float as total,
        COUNT(*)::int as count
      FROM donations 
      WHERE "status" = 'CONFIRMED' 
        AND "donationDate" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "donationDate")
      ORDER BY month ASC
    `

    // Get payment method distribution
    const paymentMethods = await prisma.donation.groupBy({
      by: ['paymentMethod'],
      where: { status: 'CONFIRMED', ...dateFilter },
      _sum: { amount: true },
      _count: { _all: true }
    })

    const stats = {
      overview: {
        totalCampaigns,
        activeCampaigns,
        totalDonors,
        totalDonations,
        totalExpenses,
        pendingExpenses
      },
      financial: {
        totalRaised: Number(donationAmounts._sum.amount) || 0,
        averageDonation: Number(donationAmounts._avg.amount) || 0,
        totalExpenses: Number(expenseAmounts._sum.amount) || 0,
        netAmount: (Number(donationAmounts._sum.amount) || 0) - (Number(expenseAmounts._sum.amount) || 0)
      },
      campaigns: campaignStats,
      trends: monthlyTrends.map(trend => ({
        month: trend.month,
        total: Number(trend.total),
        count: trend.count
      })),
      paymentMethods: paymentMethods.map(method => ({
        method: method.paymentMethod,
        total: Number(method._sum.amount) || 0,
        count: method._count._all
      })),
      period
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}