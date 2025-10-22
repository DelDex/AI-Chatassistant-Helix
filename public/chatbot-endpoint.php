<?php

declare(strict_types=1);

header('Content-Type: application/json');

require __DIR__ . '/../vendor/autoload.php';

use App\ChatbotPlugin;
use Throwable;

$config = require __DIR__ . '/../config/chatbot.php';
$chatbot = new ChatbotPlugin($config);

$rawInput = file_get_contents('php://input') ?: '';
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    $data = $_POST;
}

$message = isset($data['message']) ? trim((string) $data['message']) : '';

if ($message === '') {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'Please include a chat message.'
    ]);
    return;
}

try {
    $response = $chatbot->sendMessage($message, ['transport' => 'web']);
    $responseBody = $response->json();

    $reply = isset($responseBody['reply'])
        ? (string) $responseBody['reply']
        : ((string) ($responseBody['message'] ?? 'Thanks! Your request is on its way.'));

    echo json_encode([
        'status' => $response->isSuccessful() ? 'ok' : 'error',
        'message' => $reply,
        'webhookStatus' => $response->getStatusCode(),
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'We were unable to forward your request to the automation workflow.',
    ]);
}
