import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

webpush.setVapidDetails(
  'mailto:contact@trenchy.bet',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Simple admin auth check
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { wallet_address, title, body, url } = req.body;

  try {
    // 1. Fetch subscription from DB
    const { data: subData, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single();

    if (subError || !subData) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = JSON.parse(subData.subscription);

    // 2. Send notification
    const payload = JSON.stringify({ title, body, url });
    await webpush.sendNotification(subscription, payload);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Push error:', error);
    return res.status(500).json({ error: error.message });
  }
}
