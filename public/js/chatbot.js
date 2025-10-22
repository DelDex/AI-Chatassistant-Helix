(function () {
    const widget = document.getElementById('chatbot-plugin');
    if (!widget) {
        return;
    }

    const endpoint = widget.dataset.endpoint || '/chatbot-endpoint.php';
    const siteName = widget.dataset.siteName || 'our team';
    const toggleButton = widget.querySelector('.chatbot-toggle');
    const closeButton = widget.querySelector('.chatbot-close');
    const windowEl = widget.querySelector('.chatbot-window');
    const messagesEl = widget.querySelector('.chatbot-messages');
    const form = widget.querySelector('.chatbot-form');
    const textarea = widget.querySelector('textarea');

    if (!toggleButton || !closeButton || !windowEl || !messagesEl || !form || !textarea) {
        return;
    }

    const statusEl = document.createElement('div');
    statusEl.className = 'chatbot-status';
    statusEl.setAttribute('role', 'status');
    form.appendChild(statusEl);

    let isSending = false;

    function setStatus(text) {
        statusEl.textContent = text;
    }

    function toggleWindow(open) {
        const shouldOpen = typeof open === 'boolean' ? open : !windowEl.classList.contains('is-open');
        windowEl.classList.toggle('is-open', shouldOpen);
        windowEl.setAttribute('aria-hidden', String(!shouldOpen));
        if (shouldOpen) {
            textarea.focus();
        } else {
            toggleButton.focus();
        }
    }

    function appendMessage(text, isUser = false) {
        const message = document.createElement('div');
        message.className = 'chatbot-message' + (isUser ? ' is-user' : '');
        message.textContent = text;
        messagesEl.appendChild(message);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    toggleButton.addEventListener('click', () => toggleWindow(true));
    closeButton.addEventListener('click', () => toggleWindow(false));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && windowEl.classList.contains('is-open')) {
            toggleWindow(false);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isSending) {
            return;
        }

        const message = textarea.value.trim();
        if (!message) {
            textarea.focus();
            return;
        }

        appendMessage(message, true);
        textarea.value = '';
        textarea.focus();

        isSending = true;
        setStatus('Sending your message to the workflow...');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('Unexpected response');
            }

            const data = await response.json();
            const reply = data.reply || data.message || `Thanks! The ${siteName} workflow received your request.`;
            appendMessage(reply, false);
            setStatus('Message delivered successfully.');
        } catch (error) {
            console.error('Chatbot error', error);
            appendMessage('Sorry, we could not reach the automation. Please try again later.', false);
            setStatus('Unable to reach the workflow.');
        } finally {
            isSending = false;
        }
    });
})();
