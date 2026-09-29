import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const { email, userId, newPassword } = await request.json();

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Kata sandi baru minimal harus 6 karakter." },
        { status: 400 }
      );
    }

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, message: "Email atau User ID akun wajib disertakan." },
        { status: 400 }
      );
    }

    let updatedInOrders = false;
    let updatedInAuth = false;

    // 1. Update in orders table (where customer login_password is stored)
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from("orders").update({
          login_password: newPassword,
          updated_at: new Date().toISOString(),
        });

        if (email) {
          query = query.ilike("customer_email", email.trim());
        } else if (userId) {
          query = query.eq("order_id", userId.trim());
        }

        const { data, error } = await query.select();
        if (!error && data && data.length > 0) {
          updatedInOrders = true;
          console.log(
            "[Change Password] Successfully updated password in orders table for:",
            email || userId
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.warn("[Change Password] Warning updating orders table:", msg);
      }
    }

    // 2. Update in Supabase Auth via Admin Client (service_role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Find user in Supabase Auth
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const targetEmail = email ? email.trim().toLowerCase() : null;
        const existingUser = usersData?.users?.find((u) => {
          if (targetEmail && u.email?.toLowerCase() === targetEmail) return true;
          if (userId && u.id === userId) return true;
          return false;
        });

        if (existingUser) {
          const { error: updateErr } = await adminClient.auth.admin.updateUserById(
            existingUser.id,
            { password: newPassword }
          );
          if (!updateErr) {
            updatedInAuth = true;
            console.log(
              "[Change Password] Successfully updated password in Supabase Auth for:",
              existingUser.email
            );
          } else {
            console.warn(
              "[Change Password] Error updating user in Supabase Auth:",
              updateErr.message
            );
          }
        } else if (targetEmail) {
          // Create user in Auth if not yet created
          const { error: createErr } = await adminClient.auth.admin.createUser({
            email: targetEmail,
            password: newPassword,
            email_confirm: true,
          });
          if (!createErr) {
            updatedInAuth = true;
            console.log(
              "[Change Password] Created user in Supabase Auth with new password:",
              targetEmail
            );
          }
        }
      } catch (adminErr: unknown) {
        const msg = adminErr instanceof Error ? adminErr.message : "Unknown admin error";
        console.warn("[Change Password] Admin client exception:", msg);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Kata sandi Anda berhasil diperbarui di database!",
      updatedInOrders,
      updatedInAuth,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Terjadi kesalahan internal server.";
    console.error("[Change Password Error]:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
