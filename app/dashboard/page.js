import { createClient } from '@/lib/supabase-server';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: rawVideos } = await supabase
    .from('videos')
    .select('*, scrape_history(batch_name)')
    .order('post_date', { ascending: false });

  // Ratakan hasil join supaya VideoTable bisa langsung baca v.batch_name
  const videos = (rawVideos || []).map((v) => ({
    ...v,
    batch_name: v.scrape_history?.batch_name ?? null,
  }));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DashboardClient initialVideos={videos} userEmail={user?.email} />;
}
