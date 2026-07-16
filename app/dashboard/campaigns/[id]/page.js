import { createClient } from '@/lib/supabase-server';
import DashboardClient from '@/components/DashboardClient';

export default async function CampaignDetailPage({ params }) {
  const supabase = createClient();
  const campaignId = params.id;

  // Nama campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .single();

  // Semua batch di dalam campaign ini
  const { data: batches } = await supabase
    .from('batch_summary')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('started_at', { ascending: false });

  // Semua video dari semua batch dalam campaign ini
  // (join lewat scrape_history untuk dapat batch_name per video)
  const batchIds = (batches || []).map((b) => b.batch_id);

  let videos = [];
  if (batchIds.length > 0) {
    const { data: rawVideos } = await supabase
      .from('videos')
      .select('*, scrape_history(batch_name)')
      .in('batch_id', batchIds)
      .order('post_date', { ascending: false });

    videos = (rawVideos || []).map((v) => ({
      ...v,
      batch_name: v.scrape_history?.batch_name ?? null,
    }));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <DashboardClient
      initialVideos={videos}
      userEmail={user?.email}
      campaignName={campaign?.name || 'Campaign'}
      campaignId={campaignId}
      isFiltered={true}
      batches={batches || []}
    />
  );
}
