# Helix Chatbot Plugin Sample

This repository contains a minimal PHP site that demonstrates a reusable chatbot plugin. The widget anchors to the bottom-left corner of any page, collects visitor questions, and forwards them to an n8n workflow via a webhook.

## Getting Started

1. Install dependencies:
   ```bash
   composer install
   ```
2. Configure the webhook target in `config/chatbot.php` or by exporting the `CHATBOT_WEBHOOK_URL` environment variable.
3. Serve the sample site with PHP's built-in server:
   ```bash
   php -S localhost:8000 -t public/
   ```
4. Visit `http://localhost:8000` and use the chat bubble to submit a message. Each submission will be relayed to your configured n8n workflow.

## Tests

Run the automated test suite with:

```bash
./vendor/bin/phpunit
```

The tests cover HTML widget rendering and payload formatting to help ensure that future modifications keep the webhook integration stable.
