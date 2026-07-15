import { createClient } from '@/lib/supabase-server';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .order('post_date', { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DashboardClient initialVideos={videos || []} userEmail={user?.email} />;
}
