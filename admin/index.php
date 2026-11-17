<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
try { $adminExists = (int)db()->query('SELECT COUNT(*) FROM admin_users')->fetchColumn() > 0; }
catch (Throwable $error) { http_response_code(503); exit('Database unavailable. Import database/database.sql and configure config/local.php.'); }
if (!$adminExists) { header('Location: ../install.php'); exit; }
$isLoggedIn = !empty($_SESSION['admin_id']);
$csrf = esc(csrf_token());
?><!doctype html><html lang="en" data-theme="dark"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="csrf-token" content="<?= $csrf ?>"><meta name="theme-color" content="#08111f"><title>Portfolio CMS · Mahmoud Elfaham</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="admin.css"><script src="admin.js" defer></script></head><body class="admin-body">
<?php if (!$isLoggedIn): ?>
<main class="login-shell"><a class="admin-brand" href="../index.php"><span>ME<span>.</span></span><small>PORTFOLIO CMS</small></a><form class="login-card" id="login-form"><p class="eyebrow">PRIVATE ADMIN AREA</p><h1>Welcome back.</h1><p class="login-intro">Sign in to manage your portfolio content.</p><label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="80"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required><button class="admin-button primary" type="submit">Sign in <span>↗</span></button><p class="form-message" aria-live="polite"></p><a class="back-link" href="../index.php">← View public portfolio</a></form><p class="login-foot">MAHMOUD ELFAHAM · PORTFOLIO MANAGEMENT</p></main>
<?php else: ?>
<div class="admin-app" id="admin-app"><aside class="sidebar" id="sidebar"><a class="admin-brand" href="../index.php"><span>ME<span>.</span></span><small>PORTFOLIO CMS</small></a><div class="sidebar-label">WORKSPACE</div><button class="sidebar-link active" data-view="overview"><i>⌂</i> Overview</button><div class="sidebar-label">CONTENT</div>
<?php foreach (['profile'=>'Profile & About','projects'=>'Projects','experiences'=>'Experience & Training','skills'=>'Skills','achievements'=>'Achievements & Awards','certifications'=>'Certifications','education'=>'Education','leadership'=>'Leadership & Activities','events'=>'Events','gallery'=>'Gallery','services'=>'Professional Services','media'=>'Media Library','social_links'=>'Social Links','settings'=>'Website Settings'] as $key=>$label): ?><button class="sidebar-link" data-view="<?= esc($key) ?>"><i><?= $key === 'profile' ? '◉' : '▧' ?></i> <?= esc($label) ?></button><?php endforeach; ?>
<div class="sidebar-bottom"><a href="../index.php" target="_blank" rel="noopener">View live portfolio ↗</a><button id="logout-button">Sign out <span>↗</span></button></div></aside>
<main class="admin-main"><header class="topbar"><button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle sidebar">☰</button><div><span class="topbar-kicker">MAHMOUD ELFAHAM / CMS</span><strong id="topbar-title">Overview</strong></div><div class="topbar-right"><span class="admin-status"><i></i> PRIVATE WORKSPACE</span><span class="admin-avatar"><?= esc(substr((string)($_SESSION['admin_name'] ?? 'A'),0,1)) ?></span></div></header><div class="workspace"><div class="toast" id="toast" role="status" aria-live="polite"></div><section id="view-root"></section></div></main></div>
<?php endif; ?></body></html>
