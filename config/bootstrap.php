<?php
declare(strict_types=1);

$configPath = __DIR__ . '/local.php';
if (!is_file($configPath)) {
    http_response_code(503);
    exit('Portfolio CMS is not configured. Copy config/local.example.php to config/local.php and set database credentials.');
}
$config = require $configPath;
if (PHP_VERSION_ID < 80200) {
    http_response_code(503);
    exit('Portfolio CMS requires PHP 8.2 or newer.');
}
if (empty($config['app_key']) || strlen((string)$config['app_key']) < 32 || str_starts_with((string)$config['app_key'], 'replace-')) {
    http_response_code(503);
    exit('Set a unique application secret of at least 32 characters in config/local.php.');
}

date_default_timezone_set('UTC');
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
if (!defined('PORTFOLIO_NO_SESSION') && session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('portfolio_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function db(): PDO
{
    static $pdo = null;
    global $config;
    if ($pdo instanceof PDO) return $pdo;
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
    $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) json_response(['error' => 'Invalid JSON request.'], 400);
    return $data;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function require_csrf(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? '');
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) json_response(['error' => 'Session token expired. Refresh and try again.'], 419);
}

function require_admin(): void
{
    if (empty($_SESSION['admin_id'])) json_response(['error' => 'Authentication required.'], 401);
}

function esc(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function allowed_modules(): array
{
    return ['projects','experiences','skills','achievements','certifications','education','leadership','events','gallery','services','social_links'];
}
