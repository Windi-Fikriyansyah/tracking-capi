import crypto from "crypto";

export interface MetaCustomerData {
  phone?: string;
  name?: string;
  email?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
}

export interface SendMetaPixelEventParams {
  pixelId: string;
  accessToken: string;
  eventName: string;
  eventId?: string;
  eventTime?: number;
  customerData: MetaCustomerData;
  customData?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_type?: string;
    [key: string]: unknown;
  };
  testCode?: string;
  eventSourceUrl?: string;
  actionSource?: "chat" | "website" | "system_generated" | "other";
}

/**
 * Hash string to SHA-256 hex string according to Meta CAPI specification
 * Normalizes input: lowercase and trimmed
 */
export function hashSha256(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Normalizes Indonesian and international phone numbers into E.164 digits-only format
 * e.g. "+62 812-3456-7890" -> "6281234567890"
 * e.g. "081234567890" -> "6281234567890"
 */
export function normalizePhoneE164(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  // Remove all non-digit characters
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return undefined;

  // Convert local Indonesian prefix 08... to 628...
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (!digits.startsWith("62") && digits.length <= 11) {
    digits = "62" + digits;
  }

  return digits;
}

/**
 * Validates Meta Pixel ID and Access Token via Meta Graph API v19.0
 * Supports both System User tokens and Events Manager Conversions API tokens
 */
export async function testMetaPixelConnection(
  pixelId: string,
  accessToken: string
): Promise<{ success: boolean; name?: string; id?: string; error?: string }> {
  try {
    const cleanPixelId = pixelId.trim();
    const cleanToken = accessToken.trim();

    // 1. Attempt 1: Query Graph API for Pixel/Dataset details (only id & name)
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${cleanPixelId}?fields=name,id&access_token=${encodeURIComponent(
        cleanToken
      )}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.id) {
      return {
        success: true,
        name: data.name || `Meta Pixel (${cleanPixelId})`,
        id: data.id || cleanPixelId,
      };
    }

    // 2. Attempt 2: If GET is blocked by (#100) Missing Permission,
    // test the token directly on the Conversions API endpoint (POST /{pixelId}/events)
    // Conversions API tokens generated from Events Manager are scoped exclusively for POST /events
    const capiTestRes = await fetch(
      `https://graph.facebook.com/v19.0/${cleanPixelId}/events?access_token=${encodeURIComponent(
        cleanToken
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              event_name: "TestConnection",
              event_time: Math.floor(Date.now() / 1000),
              action_source: "chat",
              user_data: {
                ph: [
                  // Dummy SHA-256 for validation
                  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                ],
              },
            },
          ],
          test_event_code: "TEST_VERIFY_TOKEN",
        }),
        cache: "no-store",
      }
    );

    const capiData = await capiTestRes.json().catch(() => ({}));

    if (capiTestRes.ok && (capiData.events_received !== undefined || capiData.fbtrace_id)) {
      return {
        success: true,
        name: `Meta Dataset / Pixel (${cleanPixelId})`,
        id: cleanPixelId,
      };
    }

    // If both attempts failed, format a clear and helpful error message
    const rawError = capiData.error?.message || data.error?.message;
    let friendlyError = rawError || `Gagal memvalidasi Pixel ID (${capiTestRes.status}).`;

    if (friendlyError.includes("Missing Permission") || friendlyError.includes("#100")) {
      friendlyError =
        "Meta Error (#100 Missing Permission): Token ini belum memiliki izin akses ke Pixel/Dataset ini. Pastikan: 1) System User sudah ditambahkan aset Pixel tersebut di Pengaturan Bisnis Meta, ATAU 2) Buat Token langsung di Events Manager > Settings > Conversions API > 'Generate access token'.";
    }

    return { success: false, error: friendlyError };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kesalahan koneksi ke Meta Graph API";
    return { success: false, error: msg };
  }
}

/**
 * Sends a conversion event directly to Meta Conversions API (Graph API v19.0)
 * Works for any lead including Organic WhatsApp chat numbers using Advanced Matching
 */
export async function sendMetaPixelEvent(
  params: SendMetaPixelEventParams
): Promise<{
  success: boolean;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
  rawResponse?: unknown;
}> {
  try {
    const cleanPixelId = params.pixelId.trim();
    const cleanToken = params.accessToken.trim();

    // Prepare User Data with SHA-256 Hashing (Meta Advanced Matching)
    const userData: Record<string, unknown> = {};

    // 1. Phone number (ph)
    const normalizedPhone = normalizePhoneE164(params.customerData.phone);
    if (normalizedPhone) {
      const hashedPhone = hashSha256(normalizedPhone);
      if (hashedPhone) userData.ph = [hashedPhone];
    }

    // 2. Name (fn / ln)
    if (params.customerData.name) {
      const cleanName = params.customerData.name.trim();
      const nameParts = cleanName.split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      const hashedFirst = hashSha256(firstName);
      if (hashedFirst) userData.fn = [hashedFirst];

      if (lastName) {
        const hashedLast = hashSha256(lastName);
        if (hashedLast) userData.ln = [hashedLast];
      }
    }

    // 3. Email (em)
    if (params.customerData.email) {
      const hashedEmail = hashSha256(params.customerData.email);
      if (hashedEmail) userData.em = [hashedEmail];
    }

    // 4. Client IP & User Agent (unhashed)
    if (params.customerData.clientIpAddress) {
      userData.client_ip_address = params.customerData.clientIpAddress;
    }
    if (params.customerData.clientUserAgent) {
      userData.client_user_agent = params.customerData.clientUserAgent;
    }

    // Format single event object
    const eventTime = params.eventTime || Math.floor(Date.now() / 1000);
    const eventId =
      params.eventId || `meta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const eventPayload: Record<string, unknown> = {
      event_name: params.eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: params.actionSource || "chat",
      user_data: userData,
    };

    if (params.eventSourceUrl) {
      eventPayload.event_source_url = params.eventSourceUrl;
    }

    if (params.customData && Object.keys(params.customData).length > 0) {
      eventPayload.custom_data = params.customData;
    }

    // Wrap in Meta data array
    const requestBody: Record<string, unknown> = {
      data: [eventPayload],
    };

    // If Test Event Code provided, attach it for Meta Events Manager Test Events tab
    if (params.testCode && params.testCode.trim().length > 0) {
      requestBody.test_event_code = params.testCode.trim();
    }

    // Dispatch POST to Meta Graph API
    const metaUrl = `https://graph.facebook.com/v19.0/${cleanPixelId}/events?access_token=${encodeURIComponent(
      cleanToken
    )}`;

    const response = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.error) {
      const errMsg =
        result.error?.message ||
        `Meta CAPI Error (${response.status}): ${JSON.stringify(result)}`;
      return {
        success: false,
        error: errMsg,
        rawResponse: result,
      };
    }

    return {
      success: true,
      eventsReceived: result.events_received ?? 1,
      fbtraceId: result.fbtrace_id,
      rawResponse: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kesalahan pengiriman ke Meta Graph API";
    return {
      success: false,
      error: msg,
    };
  }
}
