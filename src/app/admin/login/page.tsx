'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/src/lib/supabaseClient'

type CheckResp = { registered: boolean; role?: 'admin' | 'cashier' }

export default function StaffAuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [info, setInfo] = useState<CheckResp | null>(null)

  const checkRegistered = async (em: string) => {
    try {
      const res = await fetch('/api/staff/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em }),
      })
      if (!res.ok) return { registered: false } as CheckResp
      return (await res.json()) as CheckResp
    } catch {
      return { registered: false } as CheckResp
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1) cek apakah sudah terdaftar & role-nya
    const result = await checkRegistered(email.trim())
    setInfo(result)

    // 2) kirim magic link (login/daftar)
    const supa = createSupabaseBrowser()
    const { error } = await supa.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    })

    setLoading(false)
    if (error) alert(error.message)
    else setSent(true)
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow p-6 space-y-5 text-center">
        <h1 className="text-2xl font-semibold text-gray-800">Login / Daftar Staff</h1>
        <p className="text-sm text-gray-500">
          Masukkan email <b>kasir</b> atau <b>admin</b> untuk menerima link.
        </p>

        {sent ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">
              Link login telah dikirim ke <b>{email}</b>.
            </p>
            {info?.registered ? (
              <p className="text-xs text-blue-600">
                Akun ini sudah terdaftar sebagai <b>{info.role ?? 'staff'}</b>.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Akun baru — akan otomatis dibuat setelah login. Minta admin menetapkan role.
              </p>
            )}
            <button
              onClick={() => { setSent(false); setEmail(''); setInfo(null) }}
              className="text-sm text-blue-600 hover:underline"
            >
              Gunakan email lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="email-staff@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded-xl transition disabled:opacity-60"
            >
              {loading ? 'Memeriksa…' : 'Kirim Link Login / Daftar'}
            </button>
          </form>
        )}

        <div className="text-xs text-gray-400 mt-2 space-y-1">
          <p>Jika akun baru, admin perlu menetapkan role: <code>admin</code> atau <code>cashier</code>.</p>
        </div>
      </div>
    </main>
  )
}
