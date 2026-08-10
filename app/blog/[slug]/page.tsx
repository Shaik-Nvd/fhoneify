import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

// Define the fetch inside the server component so it gets the data server-side
async function getPost(slug: string) {
  // Using absolute URL to call our own API during SSR, or just direct import from data.ts
  // For true SSR without network overhead, we can just import from data
  // But Next.js fetch with absolute URL is fine too. Let's use direct data import for simplicity in this monolith
  const { blog_posts } = await import('@/server/data');
  const post = blog_posts.find(p => p.slug === slug && p.published);
  return post;
}

type Props = {
  params: { slug: string }
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const post = await getPost(params.slug);
  
  if (!post) {
    return { title: 'Post Not Found | Fhoneify' };
  }
 
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      type: 'article',
      publishedTime: post.createdAt,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="page-animate" style={{ maxWidth: '48rem', margin: '0 auto', padding: '4rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(post.tags || []).map((tag: string) => (
            <span key={tag} className="badge badge-gold" style={{ fontSize: '0.75rem' }}>{tag}</span>
          ))}
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: 'var(--foreground)', marginBottom: '1rem', lineHeight: 1.2 }}>
          {post.title}
        </h1>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <span>By {post.author}</span>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2a2a2a' }} />
          <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
        </div>
      </div>

      <div style={{ height: '300px', backgroundColor: 'var(--surface)', borderRadius: '12px', marginBottom: '3rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '4rem', opacity: 0.1 }}>📸</span>
      </div>

      <div className="blog-content" style={{ 
        color: '#e0e0e0', 
        fontSize: '1.1rem', 
        lineHeight: 1.8,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          .blog-content h2, .blog-content h3 { color: #fff; margin-top: 2.5rem; margin-bottom: 1rem; font-weight: 600; }
          .blog-content h3 { font-size: 1.5rem; color: var(--gold); }
          .blog-content p { margin-bottom: 1.5rem; }
          .blog-content a { color: var(--gold); text-decoration: underline; }
          .blog-content ul { padding-left: 1.5rem; margin-bottom: 1.5rem; }
          .blog-content li { margin-bottom: 0.5rem; }
        `}} />
        <ReactMarkdown>{post.content || ''}</ReactMarkdown>
      </div>
    </article>
  );
}
