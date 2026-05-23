import fs from 'fs'
import path from 'path'
import type { Watchlist } from '@/types'

export function readWatchlist(): Watchlist {
  const file = path.join(process.cwd(), 'public', 'data', 'watchlist.json')
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Watchlist
}
