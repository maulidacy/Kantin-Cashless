import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/src/lib/supabaseClient'

// rate limit sederhana in-memory (demo)
const buckets = new Map<string, { count: number; ts: number }>()
const WINDOW_MS = 10_000; // 10s
const MAX_REQ = 15;

export async function POST(req: NextRequest) {
  // rate limit per-IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now - b.ts > WINDOW_MS) buckets.set(ip, { count: 1, ts: now })
  else if (b.count >= MAX_REQ) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  else b.count++

  const body = await req.json().catch(() => ({}))
  const schema = z.object({ email: z.string().email().max(120) })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })

  const supa = await getSupabaseAdmin() // server-only key
  const { data, error } = await supa
    .from('profiles')
    .select('email,role')
    .eq('email', parsed.data.email.toLowerCase())
    .maybeSingle()

  if (error || !data) return NextResponse.json({ registered: false })
  const role = (data.role === 'admin' || data.role === 'cashier') ? data.role : undefined
  return NextResponse.json({ registered: true, role })
}
