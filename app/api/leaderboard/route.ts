import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const topUsers = await prisma.user.findMany({
      take: 50,
      orderBy: {
        totalPoints: 'desc',
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        totalPoints: true,
        createdAt: true,
      },
    })

    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      points: user.totalPoints,
      avatar: user.avatar || '/images/avatar-1.png',
    }))

    return NextResponse.json({
      success: true,
      leaderboard,
    })
  } catch (error) {
    console.error('[LEADERBOARD_DB_ERROR] Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

