<?php
declare(strict_types=1);
require_once __DIR__ . '/config/bootstrap.php';
$pdo = db();
$exists = (int)$pdo->query('SELECT COUNT(*) FROM admin_users')->fetchColumn() > 0;
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$exists) {
    require_csrf();
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');
    $confirm = (string)($_POST['confirm_password'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_.-]{3,80}$/', $username)) $error = 'Use 3–80 letters, numbers, dots, underscores, or hyphens for the username.';
    elseif (strlen($password) < 12 || strlen($password) > 200) $error = 'Choose a password between 12 and 200 characters.';
    elseif (!hash_equals($password, $confirm)) $error = 'The passwords do not match.';
    else {
        $statement = $pdo->prepare('INSERT INTO admin_users (username,password_hash) VALUES (?,?)');
        $statement->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
        header('Location: admin/'); exit;
    }
}
?><!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="<?= esc(csrf_token()) ?>"><title>Install Portfolio CMS</title><link rel="stylesheet" href="admin/admin.css"></head><body class="admin-body"><main class="login-shell"><a class="admin-brand" href="index.php"><span>ME<span>.</span></span><small>FIRST-TIME SETUP</small></a><form class="login-card" method="post"><p class="eyebrow">SECURE INSTALLATION</p><h1>Create your admin account.</h1><?php if ($exists): ?><p>An admin account already exists. Installer is disabled.</p><a class="admin-button primary" href="admin/">Go to sign in</a><?php else: ?><p class="login-intro">Choose your private login credentials. No default account is created.</p><label for="username">Admin username</label><input id="username" name="username" autocomplete="username" required minlength="3" maxlength="80"><label for="password">Password <small>(at least 12 characters)</small></label><input id="password" name="password" type="password" autocomplete="new-password" required minlength="12"><label for="confirm_password">Confirm password</label><input id="confirm_password" name="confirm_password" type="password" autocomplete="new-password" required minlength="12"><input type="hidden" name="csrf" value="<?= esc(csrf_token()) ?>"><button class="admin-button primary" type="submit">Create administrator <span>↗</span></button><?php if ($error): ?><p class="form-message error"><?= esc($error) ?></p><?php endif; ?><?php endif; ?><a class="back-link" href="index.php">← View public portfolio</a></form></main></body></html>
