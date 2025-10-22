<?php

namespace App;

use App\Http\ClientInterface;
use App\Http\CurlHttpClient;
use App\Http\HttpResponse;
use InvalidArgumentException;

class ChatbotPlugin
{
    /**
     * @param array<string, mixed> $config
     */
    public function __construct(
        private array $config,
        private ?ClientInterface $httpClient = null
    ) {
        $this->httpClient = $httpClient ?? new CurlHttpClient();
    }

    public function getSiteName(): string
    {
        return (string) ($this->config['site_name'] ?? 'Site Chatbot');
    }

    public function getEndpoint(): string
    {
        return (string) ($this->config['endpoint'] ?? '/chatbot-endpoint.php');
    }

    public function getWebhookUrl(): string
    {
        return (string) ($this->config['webhook_url'] ?? '');
    }

    /**
     * Render the chatbot widget markup.
     */
    public function render(): string
    {
        $siteName = htmlspecialchars($this->getSiteName(), ENT_QUOTES, 'UTF-8');
        $endpoint = htmlspecialchars($this->getEndpoint(), ENT_QUOTES, 'UTF-8');

        return <<<HTML
<link rel="stylesheet" href="/css/chatbot.css">
<div id="chatbot-plugin" class="chatbot-widget" data-endpoint="{$endpoint}" data-site-name="{$siteName}">
    <button class="chatbot-toggle" type="button" aria-label="Open chat with {$siteName}">
        <span class="chatbot-toggle-icon" aria-hidden="true">💬</span>
    </button>
    <div class="chatbot-window" aria-hidden="true">
        <header class="chatbot-header">
            <h2 class="chatbot-title">{$siteName} Assistant</h2>
            <button type="button" class="chatbot-close" aria-label="Close chat">&times;</button>
        </header>
        <div class="chatbot-messages" role="log" aria-live="polite"></div>
        <form class="chatbot-form" novalidate>
            <label class="visually-hidden" for="chatbot-input">Type your message</label>
            <textarea id="chatbot-input" name="message" rows="2" placeholder="Ask me anything..." required></textarea>
            <button type="submit" class="chatbot-submit">Send</button>
        </form>
    </div>
</div>
<script src="/js/chatbot.js" defer></script>
HTML;
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function sendMessage(string $message, array $metadata = []): HttpResponse
    {
        $message = trim($message);

        if ($message === '') {
            throw new InvalidArgumentException('Message cannot be empty.');
        }

        $payload = $this->buildPayload($message, $metadata);

        return $this->httpClient->postJson($this->getWebhookUrl(), $payload);
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    public function buildPayload(string $message, array $metadata = []): array
    {
        return [
            'message' => $message,
            'metadata' => array_merge([
                'site' => $this->getSiteName(),
                'source' => 'webchat',
            ], $metadata),
            'timestamp' => (new \DateTimeImmutable('now'))
                ->format(DATE_ATOM),
        ];
    }
}
