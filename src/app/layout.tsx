import './globals.css'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <header className="border-b bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container flex items-center gap-4 h-16">
            <Link href="/" className="font-bold text-primary text-lg">KantinSekolah</Link>
            <nav className="ml-auto flex gap-4 text-sm">
              <Link href="/parent" className="hover:underline">Orang Tua</Link>
              <Link href="/student" className="hover:underline">Siswa</Link>
              <Link href="/merchant" className="hover:underline">Kantin</Link>
              <Link href="/login" className="hover:underline">Login</Link>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
