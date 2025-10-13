// Helper auth server-side: memastikan user login & ber-role staff.
// Dipakai di layout /admin/* dan API /api/admin/*.
import { createSupabaseServer } from '@/src/lib/supabaseClient'

export type Staff = { id: string; email: string; role: 'cashier'|'admin' }

export async function requireStaff(): Promise<Staff> {
  const supa = await createSupabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 })

  // Upsert profil minimal agar row profiles ada (RLS: "profiles self insert/update")
  await supa.from('profiles').upsert({
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff'
  }, { onConflict: 'id' })

  const { data: prof, error } = await supa.from('profiles')
    .select('id,email,role')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !prof) throw Object.assign(new Error('Profile missing'), { status: 403 })
  const role = prof.role || 'customer'
  if (!['cashier','admin'].includes(role)) throw Object.assign(new Error('Forbidden'), { status: 403 })

  return { id: prof.id, email: prof.email, role: role as Staff['role'] }
}
