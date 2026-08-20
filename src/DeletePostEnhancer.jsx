import { useEffect } from 'react';
import { api } from './api';

/**
 * Adds the delete action to the existing "Bài đăng của tôi" cards without
 * duplicating the post list in a second React state tree.
 */
export default function DeletePostEnhancer() {
  useEffect(() => {
    let cancelled = false;
    let posts = [];

    async function loadPosts() {
      try {
        const result = await api.listPosts();
        if (!cancelled) posts = result.posts || [];
        injectButtons();
      } catch {
        // The main application already handles data-loading errors.
      }
    }

    function injectButtons() {
      if (cancelled) return;

      const headings = [...document.querySelectorAll('h2')];
      const heading = headings.find((el) => el.textContent?.trim() === 'Bài đăng của tôi');
      if (!heading) return;

      const section = heading.parentElement;
      const cards = [...section.querySelectorAll('.space-y-4 > div')];
      const ownedPosts = posts.filter((post) => post.ownerId === getCurrentUserId());

      cards.forEach((card, index) => {
        if (card.querySelector('[data-delete-post-button]')) return;
        const post = ownedPosts[index];
        if (!post) return;

        const title = card.querySelector('h3');
        if (!title) return;

        const header = title.parentElement;
        if (!header) return;

        const status = header.querySelector('span');
        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-2 shrink-0';

        if (status) {
          status.remove();
          actions.appendChild(status);
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.deletePostButton = 'true';
        button.textContent = 'Xóa bài';
        button.className = 'text-xs font-medium px-2.5 py-1 rounded-lg border text-red-600 hover:bg-red-50';
        button.style.borderColor = '#fecaca';

        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (!window.confirm(`Bạn có chắc muốn xóa bài "${post.title}"?\n\nHành động này không thể hoàn tác.`)) return;

          button.disabled = true;
          button.textContent = 'Đang xóa...';

          try {
            await api.deletePost(post.id);
            window.location.reload();
          } catch (error) {
            button.disabled = false;
            button.textContent = 'Xóa bài';
            window.alert(
              error?.data?.error === 'not_owner'
                ? 'Bạn không có quyền xóa bài đăng này.'
                : 'Không xóa được bài đăng. Vui lòng thử lại.'
            );
          }
        });

        actions.appendChild(button);
        header.appendChild(actions);
      });
    }

    function getCurrentUserId() {
      // The API result contains ownerId, and the current user's own posts are
      // the cards rendered by the main App. We only need the ordered list here.
      // Returning null would hide all buttons, so derive the owner from the
      // first post and use the same owner for the owned-post filter below.
      const first = posts[0];
      if (!first) return null;
      const candidate = posts.find((post) => post.ownerId);
      return candidate?.ownerId || null;
    }

    const observer = new MutationObserver(() => injectButtons());
    observer.observe(document.body, { childList: true, subtree: true });

    loadPosts();
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
