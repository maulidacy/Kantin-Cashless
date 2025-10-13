import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendReceiptEmail(params: {
  to: string; orderId: string; items: { name: string; qty: number; price: number }[];
  total: number; method: 'QRIS'|'CASH'; table_no: string;
}) {
  const html = `
  <div style="font-family:ui-sans-serif">
    <h2>Struk Kantin QR</h2>
    <p>Order: <b>${params.orderId}</b></p>
    <table width="100%" cellpadding="6" cellspacing="0" style="border:1px solid #eee">
      <thead><tr><th align="left">Item</th><th align="right">Subtotal</th></tr></thead>
      <tbody>
        ${params.items.map(i=>`<tr>
          <td>${i.name} × ${i.qty}</td>
          <td align="right">Rp${(i.price*i.qty).toLocaleString('id-ID')}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr><td><b>Total</b></td><td align="right"><b>Rp${params.total.toLocaleString('id-ID')}</b></td></tr></tfoot>
    </table>
    <p>Metode: ${params.method} • Meja: ${params.table_no}</p>
    <p>Terima kasih.</p>
  </div>`
  await resend.emails.send({
    from: 'Kantin QR <noreply@yourdomain.com>',
    to: params.to,
    subject: 'Struk Pembayaran',
    html
  })
}
