import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'all'; // all | campaign | creator
  const campaignId = searchParams.get('campaignId');
  const batchId = searchParams.get('batchId'); // opsional, mempersempit dalam 1 campaign
  const usernamesParam = searchParams.get('usernames'); // comma-separated, bisa 1 atau lebih

  let videos = [];
  let campaignName = null;
  let batchName = null;

  if (scope === 'creator' && usernamesParam) {
    const usernames = usernamesParam.split(',').map((u) => u.trim()).filter(Boolean);

    const { data, error } = await supabase
      .from('videos')
      .select('*, scrape_history(batch_name)')
      .in('username', usernames)
      .order('post_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    videos = data || [];
  } else if (scope === 'campaign' && campaignId) {
    if (batchId) {
      const { data, error } = await supabase
        .from('videos')
        .select('*, scrape_history(batch_name)')
        .eq('batch_id', batchId)
        .order('post_date', { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      videos = data || [];
      batchName = videos[0]?.scrape_history?.batch_name ?? null;
    } else {
      // Semua batch dalam campaign ini — RLS otomatis batasi ke batch milik
      // user (kalau role admin), atau semua (kalau super_admin)
      const { data: batches } = await supabase
        .from('scrape_history')
        .select('id')
        .eq('campaign_id', campaignId);

      const batchIds = (batches || []).map((b) => b.id);

      if (batchIds.length > 0) {
        const { data, error } = await supabase
          .from('videos')
          .select('*, scrape_history(batch_name)')
          .in('batch_id', batchIds)
          .order('post_date', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        videos = data || [];
      }
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('name')
      .eq('id', campaignId)
      .single();
    campaignName = campaign?.name ?? null;
  } else {
    // scope === 'all' — RLS otomatis batasi ke video milik user (kalau admin)
    const { data, error } = await supabase
      .from('videos')
      .select('*, scrape_history(batch_name)')
      .order('post_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    videos = data || [];
  }

  const flatVideos = videos.map((v) => ({
    ...v,
    batch_name: v.scrape_history?.batch_name ?? null,
  }));

  // Hitung ringkasan statistik untuk isi template prompt
  const totalVideo = flatVideos.length;
  const creators = new Set(flatVideos.map((v) => v.username).filter(Boolean));
  const totalViews = flatVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const avgEr =
    totalVideo === 0
      ? 0
      : flatVideos.reduce((sum, v) => sum + (Number(v.er) || 0), 0) / totalVideo;

  const dates = flatVideos.map((v) => v.post_date).filter(Boolean).sort();
  const tanggalMulai = dates[0] || null;
  const tanggalAkhir = dates[dates.length - 1] || null;

  return NextResponse.json({
    videos: flatVideos,
    meta: {
      scope,
      campaignName,
      batchName,
      creatorList: scope === 'creator' ? usernamesParam?.split(',').map((u) => u.trim()) : null,
      totalVideo,
      totalCreator: creators.size,
      totalViews,
      avgEr,
      tanggalMulai,
      tanggalAkhir,
    },
  });
}
