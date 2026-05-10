<?php
/**
 * ScreenScraper Proxy - Optimizado para InfinityFree
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_GET['url']) || empty($_GET['url'])) {
    http_response_code(400);
    echo "Error: URL parameter required";
    exit;
}

$url = urldecode($_GET['url']);

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo "Error: Invalid URL";
    exit;
}

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_ENCODING, '');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);

curl_close($ch);

if ($error) {
    http_response_code(502);
    echo "Proxy Error: " . $error;
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo "HTTP Error: " . $httpCode;
    exit;
}

if (!empty($contentType)) {
    if (strpos($contentType, 'image/') !== false || 
        strpos($contentType, 'video/') !== false ||
        strpos($contentType, 'application/') !== false ||
        strpos($contentType, 'text/') !== false) {
        header("Content-Type: " . $contentType);
    }
}

header("Cache-Control: public, max-age=3600");
header("X-Content-Type-Options: nosniff");

echo $response;
?>