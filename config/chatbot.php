<?php

return [
    'site_name' => 'Helix Sample Site',
    'webhook_url' => getenv('CHATBOT_WEBHOOK_URL') ?: 'https://example.com/n8n/webhook/chatbot',
    'endpoint' => '/chatbot-endpoint.php',
];
