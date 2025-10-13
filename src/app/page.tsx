import Link from 'next/link'

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8 items-center">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Pesan makanan tanpa antre</h1>
        <p className="text-muted-foreground">
          Scan QR di meja, pilih menu lintas kios, bayar QRIS atau tunai, pesanan diantar ke meja.
        </p>
        <div className="flex gap-3">
          <Link prefetch href="/order"
            className="px-4 py-2 rounded-2xl bg-black text-white hover:opacity-90">
            Mulai Pesan
          </Link>
          <a href="#cara" className="px-4 py-2 rounded-2xl border">Cara kerja</a>
        </div>
      </section>
      <section id="cara" className="space-y-2">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Scan QR → masuk ke halaman menu</li>
          <li>Pilih item, cek keranjang</li>
          <li>Checkout: isi data & pilih metode bayar</li>
          <li>Terima email struk & pantau status</li>
        </ol>
      </section>
    </main>
  )
}
