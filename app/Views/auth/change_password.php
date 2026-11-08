<div class="w-full max-w-md max-w-full mx-auto my-6 sm:my-12 px-3 sm:px-0 min-w-0">
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-left space-y-6">
    
    <!-- Header Branding -->
    <div class="text-center space-y-3">
      <div class="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 class="text-lg font-bold text-slate-100 tracking-tight">Pembaruan Kata Sandi Wajib</h2>
      <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
        Untuk keamanan sistem HSE PT Minda Automotive Indonesia, akun baru atau reset wajib mengganti kata sandi sebelum mengakses portal.
      </p>
    </div>

    <!-- Password Change Form -->
    <form action="<?= url('/change-password') ?>" method="POST" class="space-y-4 font-sans">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken ?? '') ?>">

      <div>
        <label for="new_password" class="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          Kata Sandi Baru (Min. 8 Karakter) *
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          required
          minlength="8"
          placeholder="••••••••"
          class="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg px-3 py-2.5 text-xs text-slate-200 transition min-h-[44px]"
        />
      </div>

      <div>
        <label for="confirm_password" class="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          Konfirmasi Kata Sandi Baru *
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minlength="8"
          placeholder="••••••••"
          class="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg px-3 py-2.5 text-xs text-slate-200 transition min-h-[44px]"
        />
      </div>

      <?php if (!empty($errorMsg)): ?>
        <div class="p-3 bg-rose-950/40 border border-rose-500/20 rounded text-rose-400 text-xs font-mono leading-relaxed">
          <?= htmlspecialchars($errorMsg) ?>
        </div>
      <?php endif; ?>

      <button
        type="submit"
        class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
      >
        <span>Simpan Kata Sandi & Lanjut</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>

  </div>
</div>
