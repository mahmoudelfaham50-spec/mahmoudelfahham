<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/bootstrap.php';
require_admin();
$pdo = db();
$uploadDir = dirname(__DIR__) . '/uploads';
$mimeToExtension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

function media_usage(PDO $pdo, int $id): int
{
    $sql = "SELECT
        (SELECT COUNT(*) FROM media_assignments WHERE media_id=?) +
        (SELECT COUNT(*) FROM content_records WHERE cover_media_id=?) +
        (SELECT COUNT(*) FROM project_images WHERE media_id=?) +
        (SELECT COUNT(*) FROM profile WHERE JSON_UNQUOTE(JSON_EXTRACT(data,'$.portrait_media_id'))=?)";
    $statement = $pdo->prepare($sql);
    $statement->execute([$id, $id, $id, $id]);
    return (int)$statement->fetchColumn();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $items = $pdo->query('SELECT m.*, (SELECT COUNT(*) FROM media_assignments a WHERE a.media_id=m.id) AS usage_count FROM media m ORDER BY m.created_at DESC')->fetchAll();
    foreach ($items as &$item) { $item['url'] = '../uploads/' . rawurlencode($item['stored_name']); $item['thumbnail_url'] = $item['thumbnail_name'] ? '../uploads/' . rawurlencode($item['thumbnail_name']) : $item['url']; }
    json_response(['items' => $items]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['error' => 'Method not allowed.'], 405);
require_csrf();
$jsonBody = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') ? request_json() : [];
$action = $jsonBody['action'] ?? ($_POST['action'] ?? '');

try {
    if ($action === 'upload') {
        if (empty($_FILES['files'])) json_response(['error' => 'Choose one or more images first.'], 422);
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) json_response(['error' => 'The upload folder is unavailable.'], 500);
        $files = $_FILES['files'];
        $names = is_array($files['name']) ? $files['name'] : [$files['name']];
        $tmpNames = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
        $errors = is_array($files['error']) ? $files['error'] : [$files['error']];
        $sizes = is_array($files['size']) ? $files['size'] : [$files['size']];
        if (count($names) > 12) json_response(['error' => 'Upload at most 12 images at a time.'], 422);
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $created = [];
        foreach ($names as $i => $originalName) {
            if (($errors[$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) json_response(['error' => 'An upload failed. Please retry the selected files.'], 422);
            if ((int)$sizes[$i] < 1 || (int)$sizes[$i] > 8 * 1024 * 1024) json_response(['error' => 'Each image must be smaller than 8 MB.'], 422);
            $tmp = $tmpNames[$i];
            $mime = $finfo->file($tmp) ?: '';
            if (!isset($mimeToExtension[$mime])) json_response(['error' => 'Only JPEG, PNG, and WebP images are accepted.'], 415);
            $dimensions = @getimagesize($tmp);
            if (!$dimensions || $dimensions[0] < 1 || $dimensions[1] < 1 || $dimensions[0] > 10000 || $dimensions[1] > 10000 || ($dimensions[0] * $dimensions[1]) > 12000000) {
                json_response(['error' => 'The image dimensions are invalid or too large.'], 422);
            }
            $stored = bin2hex(random_bytes(18)) . '.' . $mimeToExtension[$mime];
            $target = $uploadDir . '/' . $stored;
            if (!move_uploaded_file($tmp, $target)) json_response(['error' => 'Could not store an uploaded image.'], 500);

            // When GD is available, resize large photos and re-encode them to strip metadata.
            if (extension_loaded('gd')) {
                $source = match ($mime) {
                    'image/jpeg' => @imagecreatefromjpeg($target),
                    'image/png' => @imagecreatefrompng($target),
                    'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($target) : false,
                };
                if ($source) {
                    $width = imagesx($source); $height = imagesy($source);
                    $scale = min(1, 2400 / max($width, $height));
                    $newWidth = max(1, (int)round($width * $scale)); $newHeight = max(1, (int)round($height * $scale));
                    $optimized = imagecreatetruecolor($newWidth, $newHeight);
                    if ($mime !== 'image/jpeg') { imagealphablending($optimized, false); imagesavealpha($optimized, true); }
                    imagecopyresampled($optimized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                    if ($mime === 'image/jpeg') imagejpeg($optimized, $target, 86);
                    elseif ($mime === 'image/png') imagepng($optimized, $target, 7);
                    elseif (function_exists('imagewebp')) imagewebp($optimized, $target, 85);
                    imagedestroy($optimized); imagedestroy($source);
                    $dimensions = [$newWidth, $newHeight];
                }
            }
            $thumbnail = null;
            if (extension_loaded('gd')) {
                $thumbSource = match ($mime) {
                    'image/jpeg' => @imagecreatefromjpeg($target),
                    'image/png' => @imagecreatefrompng($target),
                    'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($target) : false,
                };
                if ($thumbSource) {
                    $tw=imagesx($thumbSource);$th=imagesy($thumbSource);$scale=min(1,480/max($tw,$th));$nw=max(1,(int)round($tw*$scale));$nh=max(1,(int)round($th*$scale));
                    $thumbImage=imagecreatetruecolor($nw,$nh);
                    if($mime!=='image/jpeg'){imagealphablending($thumbImage,false);imagesavealpha($thumbImage,true);}
                    imagecopyresampled($thumbImage,$thumbSource,0,0,0,0,$nw,$nh,$tw,$th);
                    $thumbnail='thumb_'.$stored;$thumbPath=$uploadDir.'/'.$thumbnail;
                    if($mime==='image/jpeg')imagejpeg($thumbImage,$thumbPath,82);elseif($mime==='image/png')imagepng($thumbImage,$thumbPath,8);elseif(function_exists('imagewebp'))imagewebp($thumbImage,$thumbPath,80);else $thumbnail=null;
                    imagedestroy($thumbImage);imagedestroy($thumbSource);
                }
            }
            $statement = $pdo->prepare('INSERT INTO media (stored_name,thumbnail_name,original_name,mime_type,file_size,width,height,alt_text,description,category) VALUES (?,?,?,?,?,?,?,?,?,?)');
            $statement->execute([$stored, $thumbnail, basename((string)$originalName), $mime, (int)filesize($target), (int)$dimensions[0], (int)$dimensions[1], trim((string)($_POST['alt_text'] ?? '')), trim((string)($_POST['description'] ?? '')), preg_match('/^[a-z_]{1,40}$/', (string)($_POST['category'] ?? 'general')) ? $_POST['category'] : 'general']);
            $created[] = ['id' => (int)$pdo->lastInsertId(), 'url' => '../uploads/' . rawurlencode($stored), 'name' => basename((string)$originalName)];
        }
        json_response(['ok' => true, 'items' => $created], 201);
    }

    $body = $jsonBody;
    $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id) json_response(['error' => 'Invalid media record.'], 422);
    if ($action === 'update') {
        $category = (string)($body['category'] ?? 'general');
        if (!preg_match('/^[a-z_]{1,40}$/', $category)) json_response(['error' => 'Invalid image category.'], 422);
        $statement = $pdo->prepare('UPDATE media SET alt_text=?,description=?,category=? WHERE id=?');
        $alt = trim((string)($body['alt_text'] ?? ''));
        $alt = function_exists('mb_substr') ? mb_substr($alt, 0, 255, 'UTF-8') : substr($alt, 0, 255);
        $statement->execute([$alt, trim((string)($body['description'] ?? '')), $category, $id]);
        if (!$statement->rowCount() && !media_exists($pdo, $id)) json_response(['error' => 'Image not found.'], 404);
        json_response(['ok' => true]);
    }
    if ($action === 'delete') {
        if (media_usage($pdo, $id) > 0) json_response(['error' => 'This image is assigned to content. Remove those assignments before deleting it.'], 409);
        $statement = $pdo->prepare('SELECT stored_name,thumbnail_name FROM media WHERE id=?');
        $statement->execute([$id]);
        $file = $statement->fetch();
        if (!$file) json_response(['error' => 'Image not found.'], 404);
        $pdo->prepare('DELETE FROM media WHERE id=?')->execute([$id]);
        $path = $uploadDir . '/' . basename((string)$file['stored_name']);
        if (is_file($path)) unlink($path);
        if (!empty($file['thumbnail_name'])) {
            $thumbPath = $uploadDir . '/' . basename((string)$file['thumbnail_name']);
            if (is_file($thumbPath)) unlink($thumbPath);
        }
        json_response(['ok' => true]);
    }
    json_response(['error' => 'Unknown media action.'], 400);
} catch (Throwable $error) {
    error_log('Portfolio media API: ' . $error->getMessage());
    json_response(['error' => 'Media operation failed.'], 500);
}

function media_exists(PDO $pdo, int $id): bool
{
    $statement = $pdo->prepare('SELECT 1 FROM media WHERE id=?');
    $statement->execute([$id]);
    return (bool)$statement->fetchColumn();
}
