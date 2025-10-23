<?php

declare(strict_types=1);

namespace App\Tests;

use App\ChatbotPlugin;
use App\Http\ClientInterface;
use App\Http\HttpResponse;
use PHPUnit\Framework\TestCase;

class ChatbotPluginTest extends TestCase
{
    public function testRenderOutputsWidgetMarkup(): void
    {
        $plugin = new ChatbotPlugin([
            'site_name' => 'Demo Site',
            'endpoint' => '/chatbot-endpoint.php'
        ], $this->createMock(ClientInterface::class));

        $markup = $plugin->render();

        $this->assertStringContainsString('chatbot-widget', $markup);
        $this->assertStringContainsString('data-endpoint="/chatbot-endpoint.php"', $markup);
        $this->assertStringContainsString('Demo Site', $markup);
        $this->assertStringContainsString('chatbot.js', $markup);
        $this->assertStringNotContainsString('Mute notifications', $markup);
    }

    public function testSendMessageBuildsPayloadAndUsesWebhook(): void
    {
        $spy = new class implements ClientInterface {
            public string $url = '';
            /** @var array<string, mixed> */
            public array $payload = [];

            public function postJson(string $url, array $payload): HttpResponse
            {
                $this->url = $url;
                $this->payload = $payload;

                return new HttpResponse(200, json_encode([
                    'reply' => 'Received!',
                ], JSON_THROW_ON_ERROR));
            }
        };

        $plugin = new ChatbotPlugin([
            'site_name' => 'Demo Site',
            'webhook_url' => 'https://example.com/webhook'
        ], $spy);

        $response = $plugin->sendMessage('Hello workflow', ['conversation' => 'abc']);

        $this->assertSame('https://example.com/webhook', $spy->url);
        $this->assertSame('Hello workflow', $spy->payload['message']);
        $this->assertSame('Demo Site', $spy->payload['metadata']['site']);
        $this->assertSame('webchat', $spy->payload['metadata']['source']);
        $this->assertSame('abc', $spy->payload['metadata']['conversation']);
        $this->assertNotEmpty($spy->payload['timestamp']);
        $this->assertTrue($response->isSuccessful());
        $this->assertSame('Received!', $response->json()['reply']);
    }
}
