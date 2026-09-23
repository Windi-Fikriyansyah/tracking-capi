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
    console.log("[order-session debug] lookup email:", email, "order found:", order ? { id: order.orderId, status: order.status, pwdMatch: order.loginPassword === password.trim(), expected: order.loginPassword, received: password.trim() } : "null");

    if (
      order &&
      order.status === "completed" &&
      order.loginPassword &&
      order.loginPassword === password.trim()
    ) {
      // Auto-sync ke Supabase Auth jika belum terdaftar
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      let supabaseUserId = order.orderId;

      if (supabaseUrl && serviceRoleKey) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          const { data: usersData } = await adminClient.auth.admin.listUsers();
          const existing = usersData?.users?.find(
            (u) => u.email?.toLowerCase() === order.customer.email.toLowerCase()
          );

          if (!existing) {
            const { data: created, error: createErr } =
              await adminClient.auth.admin.createUser({
                email: order.customer.email.toLowerCase(),
                password: order.loginPassword,
                email_confirm: true,
                user_metadata: {
                  name: order.customer.name,
                  role: "customer",
                  plan_id: order.planId,
                  plan_name: order.planName,
                  expires_at: order.expiresAt,
                  synced_via: "order_session",
                },
              });
            if (created?.user) {
              supabaseUserId = created.user.id;
              console.log("[Order Session] Auto-created user in Supabase Auth:", created.user.id);
            } else if (createErr) {
              console.warn("[Order Session] Supabase createUser warning:", createErr.message);
            }
          } else {
            supabaseUserId = existing.id;
            // Update metadata masa aktif paket & konfirmasi email tanpa mengubah password yang sudah ada
            await adminClient.auth.admin.updateUserById(existing.id, {
              email_confirm: true,
              user_metadata: {
                ...existing.user_metadata,
                name: order.customer.name,
                plan_id: order.planId,
                plan_name: order.planName,
                expires_at: order.expiresAt,
              },
            });
            console.log("[Order Session] Synchronized profile for user in Supabase Auth (existing password preserved):", existing.id);
          }
        } catch (syncErr: any) {
          console.warn("[Order Session] Supabase sync exception:", syncErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          id: supabaseUserId,
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
