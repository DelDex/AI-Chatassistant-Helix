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
    <button class="chatbot-toggle" type="button" aria-expanded="false" aria-label="Toggle chat with {$siteName}">
        <span class="chatbot-toggle-icon" aria-hidden="true">
            <span class="chatbot-toggle-avatar">🤖</span>
            <span class="chatbot-toggle-badge">Ask</span>
        </span>
        <span class="chatbot-toggle-status"><span class="chatbot-status-dot" aria-hidden="true"></span>Online</span>
    </button>
    <div class="chatbot-window" aria-hidden="true">
        <header class="chatbot-header" data-drag-handle>
            <div class="chatbot-header-brand">
                <span class="chatbot-avatar" aria-hidden="true">🤖</span>
                <div class="chatbot-header-text">
                    <span class="chatbot-title">{$siteName}</span>
                    <span class="chatbot-subtitle"><span class="chatbot-status-dot" aria-hidden="true"></span>Online &middot; Always ready to help</span>
                </div>
            </div>
            <div class="chatbot-header-actions">
                <button type="button" class="chatbot-close" aria-label="Close chat">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        </header>
        <div class="chatbot-window-body">
            <div class="chatbot-messages" role="log" aria-live="polite"></div>
        </div>
        <form class="chatbot-form" novalidate>
            <label class="visually-hidden" for="chatbot-input">Type your message</label>
            <div class="chatbot-input">
                <textarea id="chatbot-input" name="message" rows="2" placeholder="Type your message here..." required></textarea>
                <div class="chatbot-input-tools">
                    <button type="button" class="chatbot-attach" aria-label="Attach a file" disabled>
                        <span aria-hidden="true">📎</span>
                    </button>
                    <button type="submit" class="chatbot-submit" aria-label="Send message">
                        <span class="chatbot-submit-icon" aria-hidden="true">➤</span>
                    </button>
                </div>
            </div>
            <div class="chatbot-status" role="status" aria-live="polite"></div>
        </form>
        <div class="chatbot-footer-links" aria-hidden="true">
            <a href="#" tabindex="-1">What is {$siteName}?</a>
            <a href="#" tabindex="-1">Guides</a>
            <a href="#" tabindex="-1">FAQs</a>
        </div>
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
