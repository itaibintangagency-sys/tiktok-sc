import { createClient } from '@/lib/supabase-server';
import ProfileClient from '@/components/ProfileClient';

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  return (
    <ProfileClient
      email={user.email}
      fullName={profile?.full_name || ''}
      role={profile?.role || 'admin'}
    />
  );
}
