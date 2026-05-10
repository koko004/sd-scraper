<?php
/**
 * ScreenScraper Proxy - El Puente
 * 
 * Este script actúa como proxy para evitar CORS y problemas de SSL
 * al descargar imágenes desde screenScraper CDN.
 * 
 * Uso: proxy.php?url=URL_ENCODED
 */

// Configuración de CORS - permitir acceso desde cualquier origen
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validar que se recibió una URL
if (!isset($_GET['url']) || empty($_GET['url'])) {
    http_response_code(400);
    echo "Error: URL parameter required";
    exit;
}

// Decodificar la URL recibida
$url = urldecode($_GET['url']);

// Validar que es una URL válida
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo "Error: Invalid URL";
    exit;
}

// Inicializar cURL
$ch = curl_init();

// Configurar opciones de cURL
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);  // Seguir redirecciones
curl_setopt($ch, CURLOPT_MAXREDIRS, 10);          // Máximo 10 redirecciones
curl_setopt($ch, CURLOPT_TIMEOUT, 30);              // Timeout de 30 segundos
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);      // Timeout de conexión

// User-Agent real para evitar bloqueos
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Configurar SSL
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

// Ejecutar la petición
$response = curl_exec($ch);

// Verificar errores
if (curl_errno($ch)) {
    http_response_code(500);
    echo "Error cURL: " . curl_error($ch);
    curl_close($ch);
    exit;
}

// Obtener información de la respuesta
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentLength = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);

curl_close($ch);

// Verificar código de respuesta HTTP
if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo "Error HTTP: " . $httpCode;
    exit;
}

// Establecer headers de respuesta
// Usar el Content-Type original o detectar si es imagen
if (!empty($contentType)) {
    // Solo usar Content-Type si es válido
    if (strpos($contentType, 'image/') !== false || 
        strpos($contentType, 'video/') !== false ||
        strpos($contentType, 'application/') !== false) {
        header("Content-Type: " . $contentType);
    } else {
        // Detectar tipo de contenido si no es válido
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detectedType = $finfo->buffer($response);
        if (strpos($detectedType, 'image/') !== false) {
            header("Content-Type: " . $detectedType);
        } else {
            // Por defecto, asume que es una imagen
            header("Content-Type: image/png");
        }
    }
} else {
    // Por defecto, asume que es una imagen PNG
    header("Content-Type: image/png");
}

// Establecer headers de cache
header("Cache-Control: public, max-age=86400");
header("X-Content-Type-Options: nosniff");

// Enviar el contenido
echo $response;
?>