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

/**
 * Attempt to locate a human-readable reply string within the webhook response.
 *
 * @param mixed $value
 */
function findReplyMessage(mixed $value, ?string $key = null, bool $allowBareString = false): string
{
    if (is_string($value)) {
        $trimmed = trim($value);

        if ($trimmed === '' || looksLikeAutomationBlob($trimmed)) {
            return '';
        }

        if ($key === null) {
            return $allowBareString ? $trimmed : '';
        }

        $normalizedKey = normalizeReplyKey($key);

        if (isLikelyReplyKey($normalizedKey) || $allowBareString) {
            return $trimmed;
        }

        return '';
    }

    if (!is_array($value)) {
        return '';
    }

    foreach ($value as $childKey => $childValue) {
        $childKeyString = is_string($childKey) ? $childKey : null;
        $normalizedKey = $childKeyString !== null ? normalizeReplyKey($childKeyString) : '';
        $childAllowBareString = $childKeyString !== null && isLikelyReplyKey($normalizedKey);

        if ($childKeyString !== null && isExcludedKey($childKeyString)) {
            $childAllowBareString = false;
        }

        $found = findReplyMessage($childValue, $childKeyString, $childAllowBareString || $allowBareString);

        if ($found !== '') {
            return $found;
        }
    }

    return '';
}

function normalizeReplyKey(string $key): string
{
    return strtolower((string) preg_replace('/[\s_-]+/', '', $key));
}

function isLikelyReplyKey(string $normalizedKey): bool
{
    if ($normalizedKey === '') {
        return false;
    }

    $directMatches = [
        'reply',
        'message',
        'messagetext',
        'statustext',
        'status',
        'response',
        'result',
        'detail',
        'details',
        'description',
    ];

    if (in_array($normalizedKey, $directMatches, true)) {
        return true;
    }

    return str_contains($normalizedKey, 'message')
        || str_contains($normalizedKey, 'reply')
        || str_contains($normalizedKey, 'response');
}

function isExcludedKey(string $key): bool
{
    $normalizedKey = normalizeReplyKey($key);

    return in_array($normalizedKey, ['output', 'outputs'], true);
}

function looksLikeAutomationBlob(string $text): bool
{
    $length = function_exists('mb_strlen') ? mb_strlen($text) : strlen($text);

    if ($length === 0) {
        return false;
    }

    if ($length > 4000) {
        return true;
    }

    $firstChar = function_exists('mb_substr') ? mb_substr($text, 0, 1) : substr($text, 0, 1);
    $lastChar = function_exists('mb_substr') ? mb_substr($text, -1) : substr($text, -1);

    if (($firstChar === '{' && $lastChar === '}') || ($firstChar === '[' && $lastChar === ']')) {
        return true;
    }

    if ($length > 600 && preg_match('/\s/', $text) === 0) {
        return true;
    }

    return false;
}

try {
    $response = $chatbot->sendMessage($message, ['transport' => 'web']);
    $responseBody = $response->json();

    $reply = findReplyMessage($responseBody, null, true);

    if ($reply === '') {
        $reply = 'The workflow has received your request.';
    }

    echo json_encode([
        'status' => $response->isSuccessful() ? 'ok' : 'error',
        'reply' => $reply,
        'message' => $reply,
        'webhookStatus' => $response->getStatusCode(),
        'payload' => $responseBody,
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'We were unable to forward your request to the automation workflow.',
    ]);
}
