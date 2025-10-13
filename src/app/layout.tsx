import './globals.css'
import { ReactQueryClientProvider } from './providers'
import Link from 'next/link'

export const metadata = {
  title: 'Kantin QR',
  description: 'Pemesanan cepat lintas kios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold">Kantin QR</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/order" className="hover:underline">Mulai Pesan</Link>
              <Link href="/admin" className="hover:underline">Admin</Link>
            </nav>
          </div>
        </header>
        <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
      </body>
    </html>
  )
}
