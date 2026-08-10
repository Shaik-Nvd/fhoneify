'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useHydratedAuth } from '@/lib/useHydratedAuth';

export default function AdminCMSPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useHydratedAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== 'admin') { router.push('/'); return; }
    fetchPosts();
  }, [hydrated, isAuthenticated, user, router]);

  const fetchPosts = () => {
    api.get('/api/cms/posts')
       .then(res => setPosts(res.data.data))
       .catch(console.error)
       .finally(() => setLoading(false));
  };

  const handleEdit = (post: any) => {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setTags(post.tags.join(', '));
    setSeoTitle(post.seoTitle || '');
    setSeoDesc(post.seoDescription || '');
    setPublished(post.published);
    setShowEditor(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setContent('');
    setTags('');
    setSeoTitle('');
    setSeoDesc('');
    setPublished(false);
    setShowEditor(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title, slug, content, published,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        seoTitle, seoDescription: seoDesc,
      };
      if (editingId) {
        await api.put(`/api/cms/posts/${editingId}`, payload);
      } else {
        await api.post('/api/cms/posts', payload);
      }
      resetForm();
      fetchPosts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || !isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="page-animate" style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <Link href="/admin" style={{ color: 'var(--muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>← Back to Dashboard</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--foreground)' }}>Blog CMS</h1>
        </div>
        {!showEditor && (
          <button onClick={() => setShowEditor(true)} className="btn-primary">
            + New Post
          </button>
        )}
      </div>

      {showEditor ? (
        <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--foreground)' }}>{editingId ? 'Edit Post' : 'Create New Post'}</h2>
            <button type="button" onClick={resetForm} className="btn-outline" style={{ padding: '6px 12px' }}>Cancel</button>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>URL Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required style={{ width: '100%' }} placeholder="e.g. why-refurbished" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Markdown Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={12} style={{ width: '100%', fontFamily: 'monospace' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>SEO Title (Optional)</label>
              <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>SEO Meta Description</label>
              <input type="text" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} style={{ width: '100%' }} maxLength={160} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Tags (comma separated)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} style={{ width: '100%' }} placeholder="Guide, Tips" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.5rem', color: 'var(--foreground)' }}>
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} />
              Publish immediately
            </label>
          </div>

          <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '16px', marginTop: '1rem' }}>
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </form>
      ) : loading ? (
        <div className="skeleton" style={{ height: '300px' }} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Title</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Slug</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', color: 'var(--foreground)', fontSize: '0.9rem' }}>{post.title}</td>
                  <td style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'monospace' }}>/{post.slug}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${post.published ? 'badge-success' : 'badge-muted'}`}>
                      {post.published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(post)} className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Edit</button>
                    <Link href={`/blog/${post.slug}`} target="_blank" className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
