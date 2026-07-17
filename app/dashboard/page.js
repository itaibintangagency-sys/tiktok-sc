import { createClient } from '@/lib/supabase-server';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage({ searchParams }) {
  const supabase = createClient();
  const batchId = searchParams?.batch || null;

  let query = supabase
    .from('videos')
    .select('*, scrape_history(batch_name)')
    .order('post_date', { ascending: false });

  if (batchId) {
    query = query.eq('batch_id', batchId);
  }

  const { data: rawVideos } = await query;

  const videos = (rawVideos || []).map((v) => ({
    ...v,
    batch_name: v.scrape_history?.batch_name ?? null,
  }));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const campaignName = batchId ? videos[0]?.batch_name ?? 'Campaign' : null;

  return (
    <DashboardClient
      initialVideos={videos}
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role || 'admin'}
      campaignName={campaignName}
      isFiltered={!!batchId}
    />
  );
}
