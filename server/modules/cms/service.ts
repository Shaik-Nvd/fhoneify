import { blog_posts, counters, BlogPost } from '../../data';

export const CMSService = {
  getAllPosts(includeDrafts = false) {
    if (includeDrafts) return blog_posts;
    return blog_posts.filter(p => p.published);
  },

  getPostBySlug(slug: string) {
    const post = blog_posts.find(p => p.slug === slug);
    if (!post) throw new Error('Post not found');
    return post;
  },

  createPost(data: Partial<BlogPost>) {
    if (!data.title || !data.slug || !data.content) {
      throw new Error('Title, slug, and content are required');
    }

    const exists = blog_posts.find(p => p.slug === data.slug);
    if (exists) throw new Error('A post with this slug already exists');

    const newPost: BlogPost = {
      id: `bp-${counters.blog++}`,
      title: data.title,
      slug: data.slug,
      content: data.content,
      author: data.author || 'Admin',
      tags: data.tags || [],
      published: data.published ?? false,
      seoTitle: data.seoTitle || data.title,
      seoDescription: data.seoDescription || '',
      createdAt: new Date().toISOString()
    };

    blog_posts.push(newPost);
    return newPost;
  },

  updatePost(id: string, data: Partial<BlogPost>) {
    const postIndex = blog_posts.findIndex(p => p.id === id);
    if (postIndex === -1) throw new Error('Post not found');

    if (data.slug && data.slug !== blog_posts[postIndex].slug) {
      const exists = blog_posts.find(p => p.slug === data.slug);
      if (exists) throw new Error('A post with this slug already exists');
    }

    blog_posts[postIndex] = { ...blog_posts[postIndex], ...data };
    return blog_posts[postIndex];
  }
};
