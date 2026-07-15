'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function CommentsPanel({ video, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!video) return;

    let active = true;
    setLoading(true);

    supabase
      .from('video_comments')
      .select('*')
      .eq('video_link', video.input_url)
      .order('likes', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setComments(data || []);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [video]);

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white border-l border-line overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-line px-5 py-4 flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-accent uppercase tracking-widest mb-1">
              @{video.username}
            </p>
            <p className="text-sm text-ink/80 line-clamp-2">{video.caption}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink text-lg leading-none px-1"
            aria-label="Tutup panel komentar"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4">
          {loading && <p className="text-sm text-muted">Memuat komentar…</p>}

          {!loading && comments.length === 0 && (
            <p className="text-sm text-muted">Belum ada komentar tersimpan untuk video ini.</p>
          )}

          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="border-b border-line pb-4 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ink">
                    @{c.commenter_username}
                  </span>
                  <span className="text-xs text-muted tabular">
                    ♥ {(c.likes || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-sm text-ink/80">{c.comment_text}</p>
                {c.comment_time && (
                  <p className="text-xs text-muted mt-1">
                    {new Date(c.comment_time).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
