'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/cms/posts')
       .then(res => setPosts(res.data?.data || []))
       .catch(console.error)
       .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-animate" style={{ maxWidth: '64rem', margin: '0 auto', padding: '4rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <p className="eyebrow" style={{ marginBottom: '1rem' }}>FHONEIFY BLOG</p>
        <h1 style={{ fontSize: '3rem', fontWeight: 300, color: '#fff', marginBottom: '1rem' }}>Insights & Guides</h1>
        <p style={{ color: '#a0a0a0', maxWidth: '32rem', margin: '0 auto' }}>
          Discover tips on selling your phone, sustainability, and why refurbished devices are the future.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '300px' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
              <div style={{ height: '160px', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #2a2a2a' }}>
                <span style={{ fontSize: '3rem', opacity: 0.2 }}>📰</span>
              </div>
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {(post.tags || []).map((tag: string) => (
                    <span key={tag} className="badge badge-gold" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{tag}</span>
                  ))}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.4 }}>{post.title}</h2>
                <p style={{ color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {(post.content || '').replace(/#/g, '').substring(0, 150)}...
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.75rem', borderTop: '1px solid #2a2a2a', paddingTop: '1rem' }}>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>By {post.author}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
