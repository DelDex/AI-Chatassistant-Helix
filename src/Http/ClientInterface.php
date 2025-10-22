<?php

namespace App\Http;

interface ClientInterface
{
    /**
     * @param array<string, mixed> $payload
     */
    public function postJson(string $url, array $payload): HttpResponse;
}
