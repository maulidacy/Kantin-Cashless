'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/src/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const supa = createSupabaseBrowser()
        const { error } = await supa.auth.exchangeCodeForSession(window.location.href)
        if (error) {
          console.error('Auth callback error:', error)
          setError('Token login tidak valid atau sudah kadaluarsa.')
          setTimeout(() => router.replace('/admin/login'), 3000)
          return
        }

        // Check user role after successful auth
        const { data: { user } } = await supa.auth.getUser()
        if (!user) {
          setError('User tidak ditemukan setelah login.')
          setTimeout(() => router.replace('/admin/login'), 3000)
          return
        }

        // Fetch profile to check role
        const { data: profile } = await supa
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // If profile doesn't exist, it will be auto-created by the admin layout
        // For now, assume it's a staff user and redirect to admin
        router.replace('/admin')
      } catch (err) {
        console.error('Unexpected error in auth callback:', err)
        setError('Terjadi kesalahan saat memverifikasi login.')
        setTimeout(() => router.replace('/admin/login'), 3000)
      }
    }
    run()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-sm text-gray-500">Mengarahkan ke halaman login...</p>
          </>
        ) : (
          <p className="text-gray-600">Memverifikasi login...</p>
        )}
      </div>
    </main>
  )
}
