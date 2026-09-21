import { NextResponse } from "next/server";
import { findOrderByEmail } from "@/lib/services/order-service";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan kata sandi wajib diisi" },
        { status: 400 }
      );
    }

    const order = await findOrderByEmail(email);

    if (
      order &&
      order.status === "completed" &&
      order.loginPassword &&
      order.loginPassword === password.trim()
    ) {
      return NextResponse.json({
        success: true,
        user: {
          id: order.orderId,
          email: order.customer.email,
          name: order.customer.name,
          role: `Subscriber (${order.planName})`,
          planId: order.planId,
          planName: order.planName,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Kredensial tidak cocok atau akun belum aktif" },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal memverifikasi akun: " + (err.message || err) },
      { status: 500 }
    );
  }
}
