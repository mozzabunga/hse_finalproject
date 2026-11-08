<div class="w-full max-w-md max-w-full mx-auto my-6 sm:my-12 px-3 sm:px-0 min-w-0" id="login-container">
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-left space-y-6">
    
    <!-- Header Branding -->
    <div class="text-center space-y-3">
      <div class="flex justify-center mb-1">
        <svg class="h-10 w-auto" viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24L20 8H28L20 24L28 40H20L12 24Z" fill="#10B981" />
          <path d="M22 24L30 8H38L30 24L38 40H30L22 24Z" fill="#059669" />
          <path d="M32 24L40 8H48L40 24L48 40H40L32 24Z" fill="#047857" />
          <text x="56" y="22" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.05em">SPARK MINDA</text>
          <text x="56" y="36" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="10" letter-spacing="0.15em">ASHOK MINDA GROUP</text>
        </svg>
      </div>
      <h2 class="text-lg font-bold text-slate-100 tracking-tight"><?= htmlspecialchars(__('login.title')) ?></h2>
      <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
        <?= htmlspecialchars(__('login.desc')) ?>
      </p>
    </div>

    <!-- Login Form -->
    <form action="<?= url('/login') ?>" method="POST" class="space-y-4 font-sans">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken ?? '') ?>">

      <div>
        <label for="username" class="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          <?= htmlspecialchars(__('login.username')) ?>
        </label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-slate-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <input
            id="username"
            name="username"
            type="text"
            required
            placeholder="username@mindaauto.co.id"
            value="<?= htmlspecialchars($rememberedUsername ?? '') ?>"
            class="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-200 transition min-h-[44px]"
          />
        </div>
      </div>

      <div>
        <label for="password" class="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          <?= htmlspecialchars(__('login.password')) ?>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          class="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg px-3 py-2.5 text-xs text-slate-200 transition min-h-[44px]"
        />
      </div>

      <!-- Remember Me Checkbox -->
      <div class="flex items-center">
        <input
          id="remember-me"
          name="remember_me"
          type="checkbox"
          value="1"
          <?= !empty($rememberedUsername) ? 'checked' : '' ?>
          class="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 focus:ring-2"
        />
        <label for="remember-me" class="ml-2 text-xs text-slate-400 select-none cursor-pointer hover:text-slate-300">
          <?= htmlspecialchars(__('login.remember')) ?>
        </label>
      </div>

      <?php if (!empty($errorMsg)): ?>
        <div class="p-3 bg-rose-950/40 border border-rose-500/20 rounded text-rose-400 text-xs font-mono whitespace-pre-line leading-relaxed">
          <?= htmlspecialchars($errorMsg) ?>
        </div>
      <?php endif; ?>

      <!-- System Access Notice -->
      <div class="bg-slate-950 p-4 border border-slate-800/80 rounded-xl space-y-3">
        <div class="border-b border-slate-800/60 pb-2.5">
          <span class="text-xs font-bold text-slate-100 block tracking-tight">PT MINDA AUTOMOTIVE INDONESIA</span>
          <span class="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">HSE Security Standard</span>
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed font-sans">
          <?= htmlspecialchars(__('login.notice')) ?>
        </p>
      </div>

      <button
        type="submit"
        class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
        id="btn-sign-in"
      >
        <span><?= htmlspecialchars(__('login.submit')) ?></span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>

    <!-- Back to Employee Portal Button -->
    <div class="border-t border-slate-800/60 pt-4 text-center">
      <a
        href="<?= url('/') ?>"
        class="text-slate-400 hover:text-slate-200 text-xs inline-flex items-center justify-center gap-1.5 transition"
        id="btn-back-to-portal"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span><?= htmlspecialchars(__('login.back')) ?></span>
      </a>
    </div>

  </div>
</div>
