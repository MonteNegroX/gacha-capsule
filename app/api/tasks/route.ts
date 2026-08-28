import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const privyId = searchParams.get('privyId')

    const allTasks = await prisma.task.findMany({
      orderBy: { points: 'asc' },
    })

    let completedTaskIds = new Set<string>()

    if (privyId) {
      const user = await prisma.user.findUnique({
        where: { privyId },
        include: { tasks: true },
      })

      if (user) {
        user.tasks.forEach((t) => completedTaskIds.add(t.taskId))
      }
    }

    const tasks = allTasks.map((task) => ({
      id: task.slug,
      dbId: task.id,
      title: task.title,
      description: task.description,
      points: task.points,
      icon: task.icon,
      status: completedTaskIds.has(task.id) ? 'completed' : 'available',
      cta: completedTaskIds.has(task.id) ? 'Done' : task.icon === 'invite' ? 'Copy link' : 'Do it',
    }))

    return NextResponse.json({
      success: true,
      tasks,
    })
  } catch (error) {
    console.error('[API_TASKS_ERROR]', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

