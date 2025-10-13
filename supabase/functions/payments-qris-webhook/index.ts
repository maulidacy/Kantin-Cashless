// Supabase Edge Function (Deno) — Midtrans HTTP(S) Notification/Webhook handler
// Verifikasi signature_key = sha512(order_id + status_code + gross_amount + server_key)
// Docs: Webhook & signature verification best practice
// https://docs.midtrans.com/docs/https-notification-webhooks
// https://docs.midtrans.com/reference/handle-notifications
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!

function sha512Hex(input: string): Promise<string> {
  const enc = new TextEncoder()
  return crypto.subtle.digest("SHA-512", enc.encode(input)).then(buf =>
    Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
  )
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

    const raw = await req.text()
    let payload: any
    try { payload = JSON.parse(raw) } catch { return new Response("Bad JSON", { status: 400 }) }

    // Midtrans fields sample: { order_id, transaction_status, status_code, gross_amount, signature_key, fraud_status, ... }
    const { order_id, transaction_status, status_code, gross_amount, signature_key, fraud_status } = payload || {}

    if (!order_id || !transaction_status || !status_code || !gross_amount || !signature_key) {
      return new Response("Missing fields", { status: 400 })
    }

    // Recompute signature
    const computed = await sha512Hex(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
    if (computed !== signature_key) {
      return new Response("Invalid signature", { status: 401 })
    }

    // Sukses QRIS: biasanya transaction_status = 'settlement' (atau 'capture' untuk kartu)
    const success = transaction_status === 'settlement' && (fraud_status ? String(fraud_status).toLowerCase() === 'accept' : true)

    // Atomik: panggil RPC untuk update orders & payments
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_qris_payment`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id,                 // kita pakai order_id Midtrans = UUID order kamu (lihat create-intent)
        qris_ref: payload.transaction_id || payload.acquirer || order_id,
        ok: success
      })
    })
    if (!rpc.ok) {
      const txt = await rpc.text()
      return new Response(`RPC failed: ${txt}`, { status: 500 })
    }

    // (Opsional) Trigger email struk setelah verified
    // await fetch(`${Deno.env.get('APP_BASE_URL')}/api/send-receipt`, {
    //   method: "POST",
    //   headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({ order_id })
    // })

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" }})
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", detail: String(e) }), { status: 500 })
  }
})
