'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'

const CartKey = 'kantinqr:cart'

const schema = z.object({
  name: z.string().min(1, 'Wajib diisi'),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid'),
  dine_option: z.enum(['dine_in','takeaway']),
  table_no: z.string().min(1, 'Wajib diisi'),
  payment_method: z.enum(['QRIS','CASH']),
})

type FormValues = z.infer<typeof schema>

export default function CheckoutPage() {
  const [cart, setCart] = useState<any[]>([])
  const router = useRouter()
  useEffect(() => {
    const raw = localStorage.getItem(CartKey)
    setCart(raw ? JSON.parse(raw) : [])
  }, [])

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { dine_option: 'dine_in', payment_method: 'QRIS' } })

  const onSubmit = async (values: FormValues) => {
    // Idempotency key to avoid double-submit
    const idem = crypto.getRandomValues(new Uint32Array(4)).join('-')
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-idempotency-key': idem },
      body: JSON.stringify({ ...values, cart })
    })
    if (!res.ok) {
      const e = await res.json().catch(()=>({error:'Unknown'}))
      alert(`Gagal checkout: ${e.error || res.statusText}`)
      return
    }
    const data = await res.json()
    localStorage.removeItem(CartKey)
    router.replace(`/status/${data.orderId}?t=${data.token}`)
  }

  const total = cart.reduce((s,c)=> s + c.price*c.qty, 0)

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      <form className="grid md:grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-3">
          <label className="block text-sm">Nama*</label>
          <input className="border rounded-xl px-3 py-2 w-full" {...register('name')} />
          {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}

          <label className="block text-sm">Telepon</label>
          <input className="border rounded-xl px-3 py-2 w-full" {...register('phone')} />

          <label className="block text-sm">Email*</label>
          <input className="border rounded-xl px-3 py-2 w-full" {...register('email')} />
          {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}

          <label className="block text-sm">Dine option*</label>
          <select className="border rounded-xl px-3 py-2 w-full" {...register('dine_option')}>
            <option value="dine_in">Dine-in</option>
            <option value="takeaway">Takeaway</option>
          </select>

          <label className="block text-sm">Nomor meja*</label>
          <input className="border rounded-xl px-3 py-2 w-full" {...register('table_no')} />
          {errors.table_no && <p className="text-red-600 text-sm">{errors.table_no.message}</p>}

          <label className="block text-sm">Metode bayar*</label>
          <select className="border rounded-xl px-3 py-2 w-full" {...register('payment_method')}>
            <option value="QRIS">QRIS</option>
            <option value="CASH">Tunai (validasi kasir)</option>
          </select>

          <button disabled={isSubmitting || !cart.length}
            className="mt-4 px-4 py-2 rounded-2xl bg-black text-white disabled:opacity-50">
            {isSubmitting ? 'Memproses...' : `Bayar Rp${total.toLocaleString('id-ID')}`}
          </button>
        </div>

        <aside className="border rounded-2xl p-4 h-fit">
          <h2 className="font-semibold mb-2">Ringkasan</h2>
          <ul className="space-y-2">
            {cart.map((c:any)=>(
              <li key={c.id} className="flex justify-between">
                <span>{c.name} × {c.qty}</span>
                <span>Rp{(c.price*c.qty).toLocaleString('id-ID')}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t pt-3 flex justify-between font-medium">
            <span>Total</span>
            <span>Rp{total.toLocaleString('id-ID')}</span>
          </div>
        </aside>
      </form>
    </main>
  )
}
