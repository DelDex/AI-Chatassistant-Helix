<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\ChatbotPlugin;

$config = require __DIR__ . '/../config/chatbot.php';
$chatbot = new ChatbotPlugin($config);
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Helix Sample Chatbot Plugin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(160deg, #eef2ff 0%, #ffffff 100%);
            min-height: 100vh;
            color: #1f2937;
        }
        .hero {
            padding: 80px 24px 160px;
            max-width: 720px;
            margin: 0 auto;
            text-align: center;
        }
        .hero h1 {
            font-size: clamp(2rem, 6vw, 3.2rem);
            margin-bottom: 24px;
        }
        .hero p {
            font-size: 1.125rem;
            line-height: 1.7;
            margin-bottom: 32px;
        }
        .hero code {
            background: rgba(63, 81, 181, 0.1);
            color: #2c3a8d;
            padding: 4px 8px;
            border-radius: 6px;
        }
        .feature-list {
            display: grid;
            gap: 16px;
            margin: 48px auto 0;
            text-align: left;
        }
        .feature-list li {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(8px);
            padding: 18px 20px;
            border-radius: 14px;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
        }
    </style>
</head>
<body>
    <section class="hero">
        <h1>Embed an Automation-Ready Chatbot Anywhere</h1>
        <p>
            This sample page demonstrates how the Helix chatbot plugin can be dropped into any PHP website. Click the chat bubble in the bottom-left corner to ask a question. Each message is forwarded to an <strong>n8n</strong> workflow via a webhook.
        </p>
        <p>
            Configure your webhook URL by updating <code>config/chatbot.php</code> or setting the <code>CHATBOT_WEBHOOK_URL</code> environment variable.
        </p>
        <ul class="feature-list">
            <li>Accessible, mobile-friendly chat experience with an always-available floating action button.</li>
            <li>Client-side JavaScript sends user questions to a lightweight PHP endpoint.</li>
            <li>The endpoint relays chat messages to your n8n automations in JSON format.</li>
        </ul>
    </section>

    <?php echo $chatbot->render(); ?>
</body>
</html>
