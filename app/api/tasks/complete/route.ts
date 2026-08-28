import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { privyId, taskId, taskSlug, taskPoints } = await req.json()

    if (!privyId || (!taskId && !taskSlug)) {
      return NextResponse.json({ error: 'privyId and taskId/taskSlug are required' }, { status: 400 })
    }

    // 1. Get user from DB
    const user = await prisma.user.findUnique({
      where: { privyId },
      include: {
        tasks: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // 2. Find or create task record in DB
    const slug = taskSlug || taskId || 'default-task'
    const pointsToEarn = taskPoints || 100

    let dbTask = await prisma.task.findUnique({
      where: { slug },
    })

    if (!dbTask) {
      dbTask = await prisma.task.create({
        data: {
          slug,
          title: `Task ${slug}`,
          description: 'Waitlist Quest',
          points: pointsToEarn,
          icon: 'follow',
        },
      })
    }

    // 3. Check if user already completed this task
    const existingUserTask = await prisma.userTask.findUnique({
      where: {
        userId_taskId: {
          userId: user.id,
          taskId: dbTask.id,
        },
      },
    })

    if (existingUserTask) {
      return NextResponse.json({
        message: 'Task already completed',
        user,
      })
    }

    // 4. Record task completion
    const isFirstTask = user.tasks.length === 0

    await prisma.userTask.create({
      data: {
        userId: user.id,
        taskId: dbTask.id,
        status: 'COMPLETED',
      },
    })

    // 5. Update user totalPoints
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        totalPoints: {
          increment: dbTask.points,
        },
      },
      include: {
        tasks: {
          include: {
            task: true,
          },
        },
      },
    })

    // 6. Check Referral Rule: Referrer gets +200 PTS when referred user completes their 1st task
    if (isFirstTask && user.referredById) {
      console.log(`[REFERRAL_REWARD] Granting +200 PTS to referrer ${user.referredById}`)
      await prisma.user.update({
        where: { id: user.referredById },
        data: {
          totalPoints: {
            increment: 200,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      pointsEarned: dbTask.points,
    })
  } catch (error) {
    console.error('[TASK_COMPLETE_DB_ERROR] Error completing task:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

