import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePseudonym } from '@/lib/pseudonyms'

export async function POST(req: Request) {
  try {
    const { privyId, username, avatar, referredByCode } = await req.json()

    if (!privyId) {
      return NextResponse.json({ error: 'privyId is required' }, { status: 400 })
    }

    // 1. Search for existing user by privyId in Supabase DB
    let user = await prisma.user.findUnique({
      where: { privyId },
      include: {
        tasks: {
          include: {
            task: true,
          },
        },
        referrals: true,
      },
    })

    // 2. If user does not exist, generate pseudonym and create new user in Supabase
    if (!user) {
      const generatedProfile = generatePseudonym()
      const generatedRefCode = `ref-${Math.random().toString(36).substring(2, 8)}`

      let referrerId: string | null = null
      if (referredByCode) {
        const referrer = await prisma.user.findUnique({
          where: { refCode: referredByCode },
        })
        if (referrer) {
          referrerId = referrer.id
        }
      }

      user = await prisma.user.create({
        data: {
          privyId,
          username: generatedProfile.username,
          avatar: generatedProfile.avatar,
          refCode: generatedRefCode,
          referredById: referrerId,
        },
        include: {
          tasks: {
            include: {
              task: true,
            },
          },
          referrals: true,
        },
      })
    }

    // 3. Compute real-time leaderboard rank
    const higherPointsCount = await prisma.user.count({
      where: {
        totalPoints: {
          gt: user.totalPoints,
        },
      },
    })

    const rank = higherPointsCount + 1

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        rank,
      },
    })
  } catch (error) {
    console.error('[API_USER_DB_ERROR] Prisma Supabase User Sync Error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
