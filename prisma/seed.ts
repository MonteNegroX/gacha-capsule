import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialTasks = [
  {
    slug: 'follow',
    title: 'Follow @capsulepull on X',
    description: 'Pack drops & allocation updates',
    points: 100,
    icon: 'follow',
    url: 'https://x.com/capsulepull',
  },
  {
    slug: 'like',
    title: 'Like @capsulepull Pinned Post',
    description: 'Support the official announcement',
    points: 50,
    icon: 'like',
    url: 'https://x.com/capsulepull',
  },
  {
    slug: 'repost',
    title: 'Repost @capsulepull Tweet',
    description: 'Share with fellow TCG collectors',
    points: 100,
    icon: 'repost',
    url: 'https://x.com/capsulepull',
  },
  {
    slug: 'invite',
    title: 'Invite Friends',
    description: '+200 PTS when a friend completes a quest',
    points: 200,
    icon: 'invite',
    url: '#',
  },
]

const initialLeaderboardUsers = [
  {
    privyId: 'seed-user-1',
    username: 'CardKing',
    avatar: '/images/avatar-8.png',
    totalPoints: 3560,
    refCode: 'ref-cardking',
  },
  {
    privyId: 'seed-user-2',
    username: 'PokeHunter',
    avatar: '/images/avatar-6.png',
    totalPoints: 2340,
    refCode: 'ref-pokehunter',
  },
  {
    privyId: 'seed-user-3',
    username: 'AshCollector',
    avatar: '/images/avatar-3.png',
    totalPoints: 2100,
    refCode: 'ref-ashcollector',
  },
  {
    privyId: 'seed-user-4',
    username: 'GottaCollect',
    avatar: '/images/avatar-5.png',
    totalPoints: 1980,
    refCode: 'ref-gottacollect',
  },
  {
    privyId: 'seed-user-5',
    username: 'RareChaser',
    avatar: '/images/avatar-7.png',
    totalPoints: 1760,
    refCode: 'ref-rarechaser',
  },
  {
    privyId: 'seed-user-6',
    username: 'PikaFan',
    avatar: '/images/avatar-2.png',
    totalPoints: 1620,
    refCode: 'ref-pikafan',
  },
]

async function main() {
  console.log('Seeding initial tasks...')
  for (const task of initialTasks) {
    await prisma.task.upsert({
      where: { slug: task.slug },
      update: task,
      create: task,
    })
  }

  console.log('Seeding initial leaderboard users...')
  for (const user of initialLeaderboardUsers) {
    await prisma.user.upsert({
      where: { privyId: user.privyId },
      update: {
        username: user.username,
        avatar: user.avatar,
        totalPoints: user.totalPoints,
      },
      create: user,
    })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

