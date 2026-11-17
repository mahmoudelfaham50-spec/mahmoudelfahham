<?php
declare(strict_types=1);
define('PORTFOLIO_NO_SESSION', true);
require_once __DIR__ . '/../config/bootstrap.php';

try {
    $pdo = db();
    $profileRow = $pdo->query('SELECT data FROM profile WHERE id = 1')->fetch();
    $profile = $profileRow ? json_decode($profileRow['data'], true) : [];
    $modules = allowed_modules();
    $result = ['profile' => $profile ?: [], 'settings' => [], 'content' => []];

    $settings = $pdo->query('SELECT setting_key, setting_value FROM website_settings')->fetchAll();
    foreach ($settings as $setting) $result['settings'][$setting['setting_key']] = $setting['setting_value'];

    $query = $pdo->prepare('SELECT r.*, m.stored_name AS cover_path, m.thumbnail_name AS cover_thumb_path, m.alt_text AS cover_alt
        FROM content_records r LEFT JOIN media m ON m.id = r.cover_media_id
        WHERE r.status = \'published\' ORDER BY r.module, r.sort_order, r.id');
    $query->execute();
    foreach ($query->fetchAll() as $row) {
        if (!in_array($row['module'], $modules, true)) continue;
        $row['meta'] = $row['meta_json'] ? json_decode($row['meta_json'], true) : [];
        unset($row['meta_json']);
        if ($row['cover_path']) $row['cover_url'] = 'uploads/' . rawurlencode($row['cover_path']);
        else $row['cover_url'] = null;
        if ($row['cover_thumb_path']) $row['cover_thumb_url'] = 'uploads/' . rawurlencode($row['cover_thumb_path']);
        else $row['cover_thumb_url'] = $row['cover_url'];
        unset($row['cover_path']);
        unset($row['cover_thumb_path']);
        $result['content'][$row['module']][] = $row;
    }
    if (!empty($result['content']['projects'])) {
        $images = $pdo->query('SELECT pi.project_id,pi.sort_order,m.stored_name,m.alt_text FROM project_images pi JOIN media m ON m.id=pi.media_id ORDER BY pi.project_id,pi.sort_order')->fetchAll();
        $byProject = [];
        foreach ($images as $image) $byProject[$image['project_id']][] = ['url'=>'uploads/'.rawurlencode($image['stored_name']),'alt'=>$image['alt_text'],'sort_order'=>(int)$image['sort_order']];
        foreach ($result['content']['projects'] as &$project) $project['images'] = $byProject[$project['id']] ?? [];
        unset($project);
    }
    $portraitId = (int)($profile['portrait_media_id'] ?? 0);
    if ($portraitId > 0) {
        $portrait = $pdo->prepare('SELECT stored_name,alt_text FROM media WHERE id=?');
        $portrait->execute([$portraitId]);
        if ($file = $portrait->fetch()) { $result['profile']['portrait_url'] = 'uploads/'.rawurlencode($file['stored_name']); $result['profile']['portrait_alt'] = $file['alt_text']; }
    }
    json_response($result);
} catch (Throwable $error) {
    error_log('Portfolio public API: ' . $error->getMessage());
    json_response(['error' => 'Portfolio content is temporarily unavailable.'], 503);
}
