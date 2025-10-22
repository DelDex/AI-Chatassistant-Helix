<?php

namespace App\Http;

use RuntimeException;

class CurlHttpClient implements ClientInterface
{
    /**
     * @param array<string, mixed> $payload
     */
    public function postJson(string $url, array $payload): HttpResponse
    {
        $ch = curl_init($url);

        if ($ch === false) {
            throw new RuntimeException('Unable to initialize cURL');
        }

        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_POSTFIELDS => $body,
        ]);

        $responseBody = curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE) ?: 0;

        if ($responseBody === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException(sprintf('cURL error: %s', $error));
        }

        curl_close($ch);

        return new HttpResponse($statusCode, (string) $responseBody);
    }
}
