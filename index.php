<?php
declare(strict_types=1);
// The existing HTML stays the single source for public layout and styling.
$html = file_get_contents(__DIR__ . '/index.html');
if ($html === false) { http_response_code(500); exit('Portfolio page unavailable.'); }
if (is_file(__DIR__ . '/config/local.php')) {
    $html = str_replace('</body>', '  <script src="js/cms.js" defer></script>' . "\n</body>", $html);
    $html = str_replace('<body>', '<body class="cms-enabled">', $html);
}
header('Content-Type: text/html; charset=utf-8');
echo $html;
