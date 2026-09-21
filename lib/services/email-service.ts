import { Resend } from "resend";

export interface SendLoginAccessEmailParams {
  to: string;
  customerName: string;
  planName: string;
  orderId: string;
  loginPassword: string;
  loginUrl?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  isMock?: boolean;
  error?: string;
}

/**
 * Mengirim email berisi detail kredensial akses login setelah pembayaran berhasil.
 * Menggunakan Resend API.
 */
export async function sendLoginAccessEmail(
  params: SendLoginAccessEmailParams
): Promise<EmailSendResult> {
  const { to, customerName, planName, orderId, loginPassword } = params;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "TrackCapi <onboarding@resend.dev>";
  const appUrl =
    params.loginUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const directLoginUrl = `${appUrl.replace(/\/$/, "")}/login?email=${encodeURIComponent(
    to
  )}`;

  // If RESEND_API_KEY is not configured, simulate email sending and log output
  if (!apiKey) {
    console.warn(
      `[Resend Email Mock] RESEND_API_KEY belum diisi di .env.local.\n` +
      `Simulasi pengiriman email akses login ke: ${to}\n` +
      `Detail: Nama: ${customerName}, Paket: ${planName}, Order: ${orderId}, Password: ${loginPassword}`
    );
    return {
      success: true,
      isMock: true,
      messageId: `mock_email_${Date.now()}`,
    };
  }

  try {
    const resend = new Resend(apiKey);

    const subject = `🎉 Pembayaran Berhasil! Akses Login TrackCapi Anda (${planName})`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #060c1d;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #dbe1ff;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #060c1d;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #0a122a;
      border: 1px solid #1e2847;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 35px rgba(0,0,0,0.5);
    }
    .header {
      padding: 32px 32px 24px;
      text-align: center;
      background: linear-gradient(180deg, rgba(76, 215, 246, 0.08) 0%, rgba(10, 18, 42, 0) 100%);
      border-bottom: 1px solid #17213d;
    }
    .logo-badge {
      display: inline-block;
      padding: 8px 16px;
      background: #0d1632;
      border: 1px solid #23315a;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 16px;
    }
    .logo-cyan {
      color: #4cd7f6;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 8px;
      line-height: 1.25;
    }
    .subtitle {
      font-size: 14px;
      color: #869397;
      margin: 0;
      line-height: 1.5;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      color: #dbe1ff;
      margin-bottom: 16px;
    }
    .badge-success {
      display: inline-block;
      padding: 6px 12px;
      background: rgba(78, 222, 163, 0.12);
      border: 1px solid rgba(78, 222, 163, 0.3);
      color: #4edea3;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .card-credentials {
      background: #0d1632;
      border: 1px solid #4cd7f6;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      box-shadow: 0 0 24px rgba(76, 215, 246, 0.12);
    }
    .cred-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4cd7f6;
      margin: 0 0 16px;
    }
    .cred-row {
      margin-bottom: 12px;
    }
    .cred-label {
      font-size: 12px;
      color: #869397;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .cred-val {
      font-family: 'Courier New', Courier, monospace;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      background: #060e22;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #1e2847;
      word-break: break-all;
    }
    .btn-cta {
      display: block;
      width: 100%;
      text-align: center;
      background: linear-gradient(90deg, #4cd7f6 0%, #06b6d4 100%);
      color: #050d25 !important;
      font-weight: 700;
      font-size: 16px;
      padding: 14px 24px;
      border-radius: 10px;
      text-decoration: none;
      box-sizing: border-box;
      margin: 24px 0 12px;
      box-shadow: 0 4px 18px rgba(76, 215, 246, 0.35);
    }
    .steps-box {
      background: #090f23;
      border: 1px solid #1e2847;
      border-radius: 10px;
      padding: 20px;
      margin-top: 24px;
    }
    .steps-title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px;
    }
    .steps-list {
      margin: 0;
      padding-left: 20px;
      color: #869397;
      font-size: 13px;
      line-height: 1.6;
    }
    .steps-list li {
      margin-bottom: 6px;
    }
    .footer {
      padding: 24px 32px;
      border-top: 1px solid #17213d;
      text-align: center;
      font-size: 12px;
      color: #5a6480;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">
          Track<span class="logo-cyan">Capi</span>
        </div>
        <h1 class="title">Pembayaran Berhasil!</h1>
        <p class="subtitle">Langganan Anda telah aktif secara otomatis.</p>
      </div>

      <div class="content">
        <div class="badge-success">✓ Order #${orderId} Diverifikasi</div>

        <p class="greeting">Halo <strong>${customerName}</strong>,</p>
        <p style="font-size: 14px; color: #869397; line-height: 1.6;">
          Terima kasih telah mempercayakan pelacakan konversi CTWA bisnis Anda kepada <strong>TrackCapi</strong>.
          Pembayaran Anda untuk <strong>${planName}</strong> telah berhasil kami terima.
        </p>

        <!-- KREDENSIAL LOGIN -->
        <div class="card-credentials">
          <div class="cred-title">🔑 Kredensial Akses Akun Anda</div>

          <div class="cred-row">
            <div class="cred-label">Email Login:</div>
            <div class="cred-val">${to}</div>
          </div>

          <div class="cred-row" style="margin-bottom: 0;">
            <div class="cred-label">Kata Sandi (Password):</div>
            <div class="cred-val">${loginPassword}</div>
          </div>
        </div>

        <a href="${directLoginUrl}" class="btn-cta" target="_blank">
          Masuk ke Dashboard TrackCapi &rarr;
        </a>

        <!-- PANDUAN MULAI -->
        <div class="steps-box">
          <div class="steps-title">🚀 Langkah Selanjutnya:</div>
          <ol class="steps-list">
            <li>Klik tombol <strong>Masuk ke Dashboard</strong> di atas atau kunjungi <a href="${appUrl}/login" style="color: #4cd7f6; text-decoration: none;">${appUrl}/login</a>.</li>
            <li>Gunakan email dan kata sandi di atas untuk masuk.</li>
            <li>Hubungkan akun WhatsApp Business Anda di menu <em>Settings / Integrasi</em>.</li>
            <li>Event konversi iklan CTWA Anda akan langsung tercatat otomatis di Meta Ads Manager!</li>
          </ol>
        </div>

        <p style="font-size: 12px; color: #5a6480; margin-top: 20px; line-height: 1.5;">
          <em>Keamanan:</em> Demi keamanan akun Anda, silakan ubah kata sandi ini melalui menu pengaturan profil setelah Anda berhasil login pertama kali.
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 6px;">&copy; ${new Date().getFullYear()} TrackCapi. Hak cipta dilindungi undang-undang.</p>
        <p style="margin: 0;">Email ini dikirim otomatis sebagai konfirmasi transaksi resmi.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
Halo ${customerName},

Pembayaran Anda untuk ${planName} (Order: #${orderId}) telah berhasil diverifikasi!

Kredensial Akses Akun TrackCapi Anda:
----------------------------------------
Email Login : ${to}
Password    : ${loginPassword}
Link Login  : ${directLoginUrl}
----------------------------------------

Langkah selanjutnya:
1. Kunjungi ${appUrl}/login
2. Masukkan email dan password di atas
3. Hubungkan akun WhatsApp Business Anda di dashboard

Terima kasih,
Tim TrackCapi
`;

    const sendResponse = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (sendResponse.error) {
      console.error("[Resend Error]:", sendResponse.error);
      return {
        success: false,
        error: sendResponse.error.message || "Failed to send email via Resend",
      };
    }

    return {
      success: true,
      messageId: sendResponse.data?.id,
    };
  } catch (error: any) {
    console.error("[Resend Exception]:", error);
    return {
      success: false,
      error: error.message || "Unknown error sending email via Resend",
    };
  }
}
