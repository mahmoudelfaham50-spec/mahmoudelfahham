<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require_admin();
    try {
        $pdo = db();
        $moduleQuery = (string)($_GET['module'] ?? '');
        if ($moduleQuery === 'profile') {
            $row = $pdo->query('SELECT data,updated_at FROM profile WHERE id=1')->fetch();
            json_response(['profile' => $row ? json_decode($row['data'], true) : []]);
        }
        if ($moduleQuery === 'settings') {
            $settings = [];
            foreach ($pdo->query('SELECT setting_key,setting_value FROM website_settings') as $setting) $settings[$setting['setting_key']] = $setting['setting_value'];
            json_response(['settings' => $settings]);
        }
        if ($moduleQuery === 'media') {
            $items = $pdo->query('SELECT m.*, (SELECT COUNT(*) FROM media_assignments a WHERE a.media_id=m.id) AS usage_count FROM media m ORDER BY m.created_at DESC')->fetchAll();
            foreach ($items as &$item) { $item['url'] = '../uploads/' . rawurlencode($item['stored_name']); $item['thumbnail_url'] = $item['thumbnail_name'] ? '../uploads/' . rawurlencode($item['thumbnail_name']) : $item['url']; }
            json_response(['items' => $items]);
        }
        if ($moduleQuery !== '') {
            if (!in_array($moduleQuery, allowed_modules(), true)) json_response(['error' => 'Unknown content module.'], 400);
            $statement = $pdo->prepare('SELECT r.*,m.stored_name AS cover_path,m.alt_text AS cover_alt FROM content_records r LEFT JOIN media m ON m.id=r.cover_media_id WHERE r.module=? ORDER BY r.sort_order,r.id');
            $statement->execute([$moduleQuery]);
            $items = $statement->fetchAll();
            foreach ($items as &$item) {
                $item['meta'] = $item['meta_json'] ? json_decode($item['meta_json'], true) : [];
                if ($moduleQuery === 'projects') {
                    $images = $pdo->prepare('SELECT media_id FROM project_images WHERE project_id=? ORDER BY sort_order,media_id');
                    $images->execute([$item['id']]);
                    $item['meta']['additional_media_ids'] = array_map('intval', $images->fetchAll(PDO::FETCH_COLUMN));
                }
                unset($item['meta_json']);
                $item['cover_url'] = $item['cover_path'] ? '../uploads/' . rawurlencode($item['cover_path']) : null;
                unset($item['cover_path']);
            }
            json_response(['items' => $items]);
        }
        $counts = [];
        foreach (allowed_modules() as $module) {
            $statement = $pdo->prepare('SELECT COUNT(*) FROM content_records WHERE module = ?');
            $statement->execute([$module]);
            $counts[$module] = (int)$statement->fetchColumn();
        }
        $counts['certificates'] = $counts['certifications'];
        $counts['media'] = (int)$pdo->query('SELECT COUNT(*) FROM media')->fetchColumn();
        $counts['gallery'] = (int)$pdo->query("SELECT COUNT(*) FROM content_records WHERE module='gallery' AND cover_media_id IS NOT NULL")->fetchColumn();
        $counts['skills'] = 0;
        foreach ($pdo->query("SELECT meta_json FROM content_records WHERE module='skills' AND status='published'")->fetchAll(PDO::FETCH_COLUMN) as $skillMeta) {
            $decoded = json_decode((string)$skillMeta, true);
            $counts['skills'] += is_array($decoded['items'] ?? null) ? count($decoded['items']) : 0;
        }
        $counts['published_projects'] = (int)$pdo->query("SELECT COUNT(*) FROM content_records WHERE module='projects' AND status='published'")->fetchColumn();
        json_response(['counts' => $counts, 'admin' => $_SESSION['admin_name'] ?? 'Admin']);
    } catch (Throwable $error) {
        error_log('Portfolio dashboard: ' . $error->getMessage());
        json_response(['error' => 'Dashboard data is unavailable.'], 503);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Method not allowed.'], 405);
require_admin();
require_csrf();
$body = request_json();
$action = $body['action'] ?? '';

function normalize_record(array $input): array
{
    $title = trim((string)($input['title'] ?? ''));
    $titleLength = function_exists('mb_strlen') ? mb_strlen($title, 'UTF-8') : strlen($title);
    if ($title === '' || $titleLength > 255) json_response(['error' => 'A title of up to 255 characters is required.'], 422);
    $slug = trim((string)($input['slug'] ?? ''));
    if ($slug === '') $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $title), '-'));
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) || strlen($slug) > 190) json_response(['error' => 'Use a short URL-safe slug.'], 422);
    $status = ($input['status'] ?? 'draft') === 'published' ? 'published' : 'draft';
    $meta = $input['meta'] ?? [];
    if (is_string($meta)) {
        $meta = json_decode($meta, true);
        if (!is_array($meta)) json_response(['error' => 'Extra fields must contain valid JSON.'], 422);
    }
    if (!is_array($meta)) json_response(['error' => 'Extra fields must be an object.'], 422);
    foreach (['url','project_url','credential_url'] as $urlKey) {
        if (!empty($meta[$urlKey])) {
            $url = filter_var((string)$meta[$urlKey], FILTER_VALIDATE_URL);
            $scheme = $url ? strtolower((string)parse_url($url, PHP_URL_SCHEME)) : '';
            if (!$url || !in_array($scheme, ['http','https'], true)) json_response(['error' => 'Links must be complete HTTP or HTTPS URLs.'], 422);
        }
    }
    $mediaId = $input['cover_media_id'] ?? null;
    $mediaId = ($mediaId === '' || $mediaId === null) ? null : filter_var($mediaId, FILTER_VALIDATE_INT);
    if ($mediaId === false) json_response(['error' => 'Invalid media selection.'], 422);
    return [
        $slug, $title,
        (function_exists('mb_substr') ? mb_substr(trim((string)($input['category'] ?? '')), 0, 190, 'UTF-8') : substr(trim((string)($input['category'] ?? '')), 0, 190)),
        trim((string)($input['summary'] ?? '')),
        trim((string)($input['body'] ?? '')),
        json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        $mediaId,
        $status,
        (int)($input['sort_order'] ?? 0),
        !empty($input['featured']) ? 1 : 0,
    ];
}

try {
    $pdo = db();
    if ($action === 'profile-save') {
        $data = $body['data'] ?? null;
        if (!is_array($data)) json_response(['error' => 'Profile data is required.'], 422);
        $allowed = ['name','title','headline','location','university','institution','major','degree','graduation_year','overall_grade','project_grade','current_position','current_organization','languages','hero_intro','about_lead','about_body','career_objective','portrait_media_id'];
        $profile = [];
        foreach ($allowed as $field) {
            $value = $data[$field] ?? '';
            $profile[$field] = is_scalar($value) ? trim((string)$value) : '';
        }
        $portraitId = $profile['portrait_media_id'] === '' ? 0 : filter_var($profile['portrait_media_id'], FILTER_VALIDATE_INT);
        if ($portraitId === false) json_response(['error' => 'Select a valid portrait from the media library.'], 422);
        if ($portraitId > 0) {
            $portraitCheck = $pdo->prepare('SELECT 1 FROM media WHERE id=?');
            $portraitCheck->execute([$portraitId]);
            if (!$portraitCheck->fetchColumn()) json_response(['error' => 'The selected portrait no longer exists.'], 422);
        }
        $pdo->prepare('INSERT INTO profile (id,data) VALUES (1,?) ON DUPLICATE KEY UPDATE data=VALUES(data)')->execute([json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        $pdo->prepare("DELETE FROM media_assignments WHERE module='profile' AND record_id=1 AND field_name='portrait'")->execute();
        if ((int)$profile['portrait_media_id'] > 0) $pdo->prepare("INSERT IGNORE INTO media_assignments (media_id,module,record_id,field_name) VALUES (?, 'profile', 1, 'portrait')")->execute([(int)$profile['portrait_media_id']]);
        json_response(['ok' => true]);
    }
    if ($action === 'settings-save') {
        $settings = $body['data'] ?? [];
        if (!is_array($settings)) json_response(['error' => 'Settings data is required.'], 422);
        $stmt = $pdo->prepare('INSERT INTO website_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)');
        foreach ($settings as $key => $value) {
            if (!preg_match('/^[a-z][a-z0-9_]{1,99}$/', (string)$key) || !is_scalar($value)) continue;
            $stmt->execute([$key, trim((string)$value)]);
        }
        json_response(['ok' => true]);
    }
    $module = (string)($body['module'] ?? '');
    if (!in_array($module, allowed_modules(), true)) json_response(['error' => 'Unknown content module.'], 400);

    if ($action === 'save') {
        $values = normalize_record($body['record'] ?? []);
        $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id) {
            $values[] = $id;
            $values[] = $module;
            $statement = $pdo->prepare('UPDATE content_records SET slug=?,title=?,category=?,summary=?,body=?,meta_json=?,cover_media_id=?,status=?,sort_order=?,featured=? WHERE id=? AND module=?');
            $statement->execute($values);
            if (!$statement->rowCount() && !record_exists($pdo, $id, $module)) json_response(['error' => 'Record not found.'], 404);
        } else {
            array_unshift($values, $module);
            $statement = $pdo->prepare('INSERT INTO content_records (module,slug,title,category,summary,body,meta_json,cover_media_id,status,sort_order,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
            $statement->execute($values);
            $id = (int)$pdo->lastInsertId();
        }
        $mediaId = (int)($body['record']['cover_media_id'] ?? 0);
        $pdo->prepare("DELETE FROM media_assignments WHERE module=? AND record_id=? AND field_name='cover'")->execute([$module, $id]);
        if ($mediaId > 0) $pdo->prepare("INSERT IGNORE INTO media_assignments (media_id,module,record_id,field_name) VALUES (?,?,?,'cover')")->execute([$mediaId, $module, $id]);
        if ($module === 'projects') {
            $additional = $body['record']['meta']['additional_media_ids'] ?? [];
            if (is_string($additional)) $additional = preg_split('/\s*,\s*/', trim($additional), -1, PREG_SPLIT_NO_EMPTY);
            if (!is_array($additional)) $additional = [];
            $ids = array_values(array_unique(array_filter(array_map('intval', $additional), static fn($value) => $value > 0)));
            $pdo->prepare('DELETE FROM project_images WHERE project_id=?')->execute([$id]);
            $pdo->prepare("DELETE FROM media_assignments WHERE module='projects' AND record_id=? AND field_name='additional'")->execute([$id]);
            foreach ($ids as $position => $additionalId) {
                $exists = $pdo->prepare('SELECT 1 FROM media WHERE id=?'); $exists->execute([$additionalId]);
                if (!$exists->fetchColumn()) continue;
                $pdo->prepare('INSERT INTO project_images (project_id,media_id,sort_order) VALUES (?,?,?)')->execute([$id,$additionalId,$position]);
                $pdo->prepare("INSERT IGNORE INTO media_assignments (media_id,module,record_id,field_name) VALUES (?,'projects',?,'additional')")->execute([$additionalId,$id]);
            }
        }
        json_response(['ok' => true, 'id' => $id]);
    }
    if ($action === 'delete') {
        $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) json_response(['error' => 'Invalid record.'], 422);
        $statement = $pdo->prepare('DELETE FROM content_records WHERE id=? AND module=?');
        $statement->execute([$id, $module]);
        if (!$statement->rowCount()) json_response(['error' => 'Record not found.'], 404);
        $pdo->prepare('DELETE FROM media_assignments WHERE module=? AND record_id=?')->execute([$module, $id]);
        json_response(['ok' => true]);
    }
    json_response(['error' => 'Unknown action.'], 400);
} catch (PDOException $error) {
    if ($error->getCode() === '23000') json_response(['error' => 'That slug is already in use in this section.'], 409);
    error_log('Portfolio admin API: ' . $error->getMessage());
    json_response(['error' => 'Could not save the record.'], 500);
} catch (Throwable $error) {
    error_log('Portfolio admin API: ' . $error->getMessage());
    json_response(['error' => 'The request could not be completed.'], 500);
}

function record_exists(PDO $pdo, int $id, string $module): bool
{
    $statement = $pdo->prepare('SELECT 1 FROM content_records WHERE id=? AND module=?');
    $statement->execute([$id, $module]);
    return (bool)$statement->fetchColumn();
}
