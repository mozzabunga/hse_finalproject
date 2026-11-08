/**
 * PT MINDA AUTOMOTIVE INDONESIA - HSE PORTAL
 * Vanilla JavaScript UI Enhancements (Parity with React Interactions)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Live WIB Clock (Asia/Jakarta, UTC+7)
  const clockEl = document.getElementById('live-wib-clock');
  if (clockEl) {
    const updateClock = () => {
      const now = new Date();
      // Format to WIB
      const options = {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const timeStr = new Intl.DateTimeFormat('id-ID', options).format(now);
      clockEl.textContent = `${timeStr} WIB`;
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // 2. Mobile Drawer Navigation Toggle
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const mobileDrawer = document.getElementById('mobile-drawer');
  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileDrawer.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!mobileDrawer.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileDrawer.classList.add('hidden');
      }
    });
  }

  // 3. Notification Dropdown Toggle & Polling
  const notifBtn = document.getElementById('btn-notification');
  const notifDropdown = document.getElementById('notif-dropdown');
  const notifBadge = document.getElementById('notif-badge');
  const notifList = document.getElementById('notif-list');
  const markAllReadBtn = document.getElementById('btn-mark-all-read');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notifDropdown.classList.add('hidden');
      }
    });

    // Mark all as read
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/notifications/mark-all-read', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          if (notifBadge) notifBadge.classList.add('hidden');
          if (notifList) {
            notifList.innerHTML = '<div class="p-4 text-center text-slate-500">Tidak ada pemberitahuan baru</div>';
          }
        } catch (e) {
          console.error('Error marking notifications read:', e);
        }
      });
    }
  }

  // 4. Subtle Smooth Scroll to Report Timeline Tracker if Present
  const timelineTracker = document.getElementById('report-timeline-tracker');
  if (timelineTracker) {
    timelineTracker.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
