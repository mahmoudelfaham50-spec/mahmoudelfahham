<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Method not allowed.'], 405);
$body = request_json();
$action = $body['action'] ?? '';

try {
    $pdo = db();
    if ($action === 'login') {
        require_csrf();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');
        if ($username === '' || $password === '' || strlen($username) > 80 || strlen($password) > 1024) {
            json_response(['error' => 'Enter your username and password.'], 422);
        }
        global $config;
        $key = (string)($config['app_key'] ?? '');
        $usernameHash = hash_hmac('sha256', strtolower($username), $key);
        $ipHash = hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? ''), $key);
        $check = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE username_hash=? AND ip_hash=? AND successful=0 AND attempted_at > (UTC_TIMESTAMP() - INTERVAL 15 MINUTE)');
        $check->execute([$usernameHash, $ipHash]);
        if ((int)$check->fetchColumn() >= 5) json_response(['error' => 'Too many attempts. Please wait 15 minutes before trying again.'], 429);

        $find = $pdo->prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ? AND is_active = 1 LIMIT 1');
        $find->execute([$username]);
        $admin = $find->fetch();
        $valid = $admin && password_verify($password, $admin['password_hash']);
        $attempt = $pdo->prepare('INSERT INTO login_attempts (username_hash, ip_hash, attempted_at, successful) VALUES (?,?,UTC_TIMESTAMP(),?)');
        $attempt->execute([$usernameHash, $ipHash, $valid ? 1 : 0]);
        $pdo->exec('DELETE FROM login_attempts WHERE attempted_at < (UTC_TIMESTAMP() - INTERVAL 2 DAY)');
        if (!$valid) json_response(['error' => 'The username or password is incorrect.'], 401);
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int)$admin['id'];
        $_SESSION['admin_name'] = $admin['username'];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $pdo->prepare('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$admin['id']]);
        json_response(['ok' => true, 'csrf' => csrf_token()]);
    }
    if ($action === 'logout') {
        require_admin();
        require_csrf();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Strict']);
        }
        session_destroy();
        json_response(['ok' => true]);
    }
    json_response(['error' => 'Unknown action.'], 400);
} catch (Throwable $error) {
    error_log('Portfolio auth API: ' . $error->getMessage());
    json_response(['error' => 'Authentication service unavailable.'], 503);
}
