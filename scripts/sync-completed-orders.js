const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function syncAll() {
  const allOrders = JSON.parse(fs.readFileSync('.data/orders.json', 'utf8'));
  console.log('Loading orders from .data/orders.json...');

  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list Supabase users:', listError);
    return;
  }

  const existingUsers = usersData.users || [];
  console.log('Current users in Supabase Auth:', existingUsers.map(u => u.email));

  for (const order of Object.values(allOrders)) {
    if (order.status === 'completed' && order.customer && order.customer.email && order.loginPassword) {
      const email = order.customer.email.toLowerCase().trim();
      const existing = existingUsers.find(u => u.email?.toLowerCase() === email);

      if (!existing) {
        console.log(`Creating user in Supabase Auth: ${email}...`);
        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password: order.loginPassword,
          email_confirm: true,
          user_metadata: {
            name: order.customer.name,
            role: 'customer',
            plan_id: order.planId,
            plan_name: order.planName,
            expires_at: order.expiresAt,
            created_via: 'order_sync',
          }
        });
        if (error) {
          console.error(`Error creating ${email}:`, error.message);
        } else {
          console.log(`✓ Successfully created ${email} (ID: ${data.user.id})`);
        }
      } else {
        console.log(`Syncing existing user in Supabase Auth: ${email}...`);
        const { error } = await adminClient.auth.admin.updateUserById(existing.id, {
          password: order.loginPassword,
          email_confirm: true,
          user_metadata: {
            ...existing.user_metadata,
            name: order.customer.name || existing.user_metadata?.name,
            plan_id: order.planId,
            plan_name: order.planName,
            expires_at: order.expiresAt,
          }
        });
        if (error) {
          console.error(`Error updating ${email}:`, error.message);
        } else {
          console.log(`✓ Successfully updated ${email}`);
        }
      }
    }
  }

  // Final check
  const { data: finalUsers } = await adminClient.auth.admin.listUsers();
  console.log('\nFinal Supabase Auth User List:');
  finalUsers.users.forEach(u => {
    console.log(`- ${u.email} (Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}) Metadata:`, u.user_metadata);
  });
}

syncAll();
