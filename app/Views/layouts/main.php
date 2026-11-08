<!DOCTYPE html>
<html lang="<?= e(\App\Core\I18n::lang()) ?>" class="dark h-full bg-slate-950">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <meta name="theme-color" content="#020617" />
  <meta name="description" content="PT Minda Automotive Indonesia - HSE Hazard & Near Miss Reporting Portal with SLA Monitoring" />
  
  <title><?= isset($pageTitle) ? e($pageTitle) . ' | ' : '' ?><?= e(__('company.name')) ?> - <?= e(__('portal.title')) ?></title>

  <!-- PWA & Favicon -->
  <link rel="icon" type="image/svg+xml" href="/app_icon.svg" />
  <link rel="icon" type="image/png" href="/app_icon.jpg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />

  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- Compiled Tailwind CSS v4 -->
  <link rel="stylesheet" href="/assets/css/app.css" />

  <style>
    :root {
      --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    body {
      font-family: var(--font-sans);
      background-color: #020617;
      color: #f8fafc;
      overflow-x: hidden;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">

  <!-- Header -->
  <?php require __DIR__ . '/header.php'; ?>

  <!-- Main Content Wrapper -->
  <main class="flex-1 w-full max-w-full">
    <?= $content ?? '' ?>
  </main>

  <!-- Footer -->
  <?php require __DIR__ . '/footer.php'; ?>

  <!-- Vanilla Client Script -->
  <script src="/assets/js/app.js"></script>
</body>
</html>
