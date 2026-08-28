export type LeaderboardUser = {
  rank: number
  username: string
  points: number
  avatar: string
  isCurrentUser?: boolean
}

export type Task = {
  id: string
  title: string
  description: string
  points: number
  status: 'available' | 'completed'
  cta: string
  icon: 'follow' | 'like' | 'repost' | 'invite'
}

export const currentUser = {
  username: 'GachaMaster',
  avatar: '/images/avatar-1.png',
  totalPoints: 1250,
  rank: 24,
  authenticated: false,
}

export const tasks: Task[] = [
  {
    id: 'follow',
    title: 'Follow us on X',
    description: 'Stay updated with the latest capsule drops',
    points: 100,
    status: 'available',
    cta: 'Do it',
    icon: 'follow',
  },
  {
    id: 'like',
    title: 'Like our latest post',
    description: 'Show some love on our pinned announcement',
    points: 50,
    status: 'completed',
    cta: 'Done',
    icon: 'like',
  },
  {
    id: 'repost',
    title: 'Repost our pinned post',
    description: 'Help spread the word to fellow collectors',
    points: 100,
    status: 'available',
    cta: 'Do it',
    icon: 'repost',
  },
  {
    id: 'invite',
    title: 'Invite a friend',
    description: 'Earn points every time a friend joins with your link',
    points: 200,
    status: 'available',
    cta: 'Copy link',
    icon: 'invite',
  },
]

export const topThree: LeaderboardUser[] = [
  { rank: 2, username: 'PokeHunter', points: 2340, avatar: '/images/avatar-6.png' },
  { rank: 1, username: 'CardKing', points: 3560, avatar: '/images/avatar-8.png' },
  { rank: 3, username: 'AshCollector', points: 2100, avatar: '/images/avatar-3.png' },
]

export const leaderboard: LeaderboardUser[] = [
  { rank: 4, username: 'GottaCollect', points: 1980, avatar: '/images/avatar-5.png' },
  { rank: 5, username: 'RareChaser', points: 1760, avatar: '/images/avatar-7.png' },
  { rank: 6, username: 'PikaFan', points: 1620, avatar: '/images/avatar-2.png' },
  { rank: 24, username: 'GachaMaster', points: 1250, avatar: '/images/avatar-1.png', isCurrentUser: true },
]
