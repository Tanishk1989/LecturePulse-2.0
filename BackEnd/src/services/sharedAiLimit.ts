import { randomUUID } from 'node:crypto'
import { prisma } from '../config/db'

export interface AiPermit { token?: string; retryAfter?: number }

export async function acquireAiPermit(uid: string): Promise<AiPermit> {
  return prisma.$transaction(async tx => {
    // Every acquisition locks the same global row first: counters and leases are atomic across instances.
    await tx.$executeRaw`INSERT INTO ai_limit_buckets(scope,minute,day) VALUES ('global',0,0) ON CONFLICT DO NOTHING`
    await tx.$queryRaw`SELECT scope FROM ai_limit_buckets WHERE scope='global' FOR UPDATE`
    const scope = `user:${uid}`
    await tx.$executeRaw`INSERT INTO ai_limit_buckets(scope,minute,day) VALUES (${scope},0,0) ON CONFLICT DO NOTHING`
    const clocks = await tx.$queryRaw<Array<{ minute: bigint; day: bigint; second: number }>>`
      SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp())/60)::bigint AS minute,
        FLOOR(EXTRACT(EPOCH FROM clock_timestamp())/86400)::bigint AS day,
        FLOOR(EXTRACT(EPOCH FROM clock_timestamp()))::double precision AS second`
    const clock = clocks[0]
    await tx.$executeRaw`DELETE FROM ai_limit_buckets WHERE scope<>'global' AND day>0 AND day<${clock.day}-7`
    await tx.$executeRaw`UPDATE ai_limit_buckets SET minute_count=CASE WHEN minute=${clock.minute} THEN minute_count ELSE 0 END,
      day_count=CASE WHEN day=${clock.day} THEN day_count ELSE 0 END,minute=${clock.minute},day=${clock.day} WHERE scope IN ('global',${scope})`
    await tx.$executeRaw`DELETE FROM ai_limit_leases WHERE expires_at<=clock_timestamp()`
    const buckets = await tx.$queryRaw<Array<{ scope: string; minute_count: number; day_count: number }>>`
      SELECT scope,minute_count,day_count FROM ai_limit_buckets WHERE scope IN ('global',${scope})`
    const user = buckets.find(row => row.scope === scope)!, global = buckets.find(row => row.scope === 'global')!
    if (user.day_count >= 300 || global.day_count >= 5000) return { retryAfter: 86400 - clock.second % 86400 }
    if (user.minute_count >= 12 || global.minute_count >= 120) return { retryAfter: 60 - clock.second % 60 }
    const active = await tx.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::integer AS count FROM ai_limit_leases WHERE user_id=${uid}`
    if (active[0].count >= 2) return { retryAfter: 5 }
    const token = randomUUID()
    await tx.$executeRaw`UPDATE ai_limit_buckets SET minute_count=minute_count+1,day_count=day_count+1 WHERE scope IN ('global',${scope})`
    await tx.$executeRaw`INSERT INTO ai_limit_leases(token,user_id,expires_at) VALUES (${token},${uid},clock_timestamp()+INTERVAL '180 seconds')`
    return { token }
  }, { timeout: 20_000 })
}

export async function renewAiPermit(token: string) {
  const updated = await prisma.$executeRaw`UPDATE ai_limit_leases SET expires_at=clock_timestamp()+INTERVAL '180 seconds' WHERE token=${token} AND expires_at>clock_timestamp()`
  if (!updated) throw new Error('AI lease expired.')
}
export async function releaseAiPermit(token: string) {
  await prisma.$executeRaw`DELETE FROM ai_limit_leases WHERE token=${token}`
}
