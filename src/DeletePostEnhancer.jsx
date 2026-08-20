import { useEffect } from 'react';
import { api } from './api';

/**
 * Adds the delete action to the existing "Bài đăng của tôi" cards.
 * The main App remains the source of truth for the post list; this component
 * only attaches the owner action to the already-rendered cards.
 */
export default function DeletePostEnhancer() {
  useEffect(() => {
    let cancelled = false;
    let ownedPosts = [];

    async function loadPosts() {
      try {
        const [postsResult, meResult] = await Promise.all([api.listPosts(), api.me()]);
        if (cancelled) return;
        ownedPosts = (postsResult.posts || []).filter((post) => post.ownerId === meResult.user?.id);
        injectButtons();
      } catch {
        // The main application already handles data-loading errors.
      }
    }

    function injectButtons() {
      if (cancelled) return;

      const heading = [...document.querySelectorAll('h2')]
        .find((el) => el.textContent?.trim() === 'Bài đăng của tôi');
      if (!heading) return;

      const section = heading.parentElement;
      const cards = [...section.querySelectorAll('.space-y-4 > div')];
      const usedPostIds = new Set();

      cards.forEach((card) => {
        if (card.querySelector('[data-delete-post-button]')) return;

        const title = card.querySelector('h3')?.textContent?.trim();
        if (!title) return;

        // The cards in this section are already filtered by App to the current
        // user's posts. Match by title while keeping duplicate titles distinct.
        const post = ownedPosts.find((candidate) =>
          !usedPostIds.has(candidate.id) && candidate.title === title
        );
        if (!post) return;
        usedPostIds.add(post.id);

        const header = card.querySelector('h3')?.parentElement;
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

    const observer = new MutationObserver(injectButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    loadPosts();
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
