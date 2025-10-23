<?php

return [
    'site_name' => 'Helix Sample Site',
    'webhook_url' => getenv('CHATBOT_WEBHOOK_URL') ?: 'http://localhost:5678/webhook/67bdbc38-1924-4e5b-9583-81b2341e3084',
    'endpoint' => '/chatbot-endpoint.php',
];
