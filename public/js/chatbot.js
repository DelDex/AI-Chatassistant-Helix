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
    const TEXT_NODE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;

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

    function appendMessage(content, isUser = false, extraClass = '') {
        const message = document.createElement('div');
        message.className = 'chatbot-message' + (isUser ? ' is-user' : '') + (extraClass ? ` ${extraClass}` : '');

        if (typeof content === 'string') {
            message.textContent = content;
        } else if (typeof Node !== 'undefined' && content instanceof Node) {
            message.appendChild(content);
        } else if (content !== null && content !== undefined) {
            message.textContent = String(content);
        }

        messagesEl.appendChild(message);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        return message;
    }

    let typingMessage = null;

    function createTypingIndicatorContent() {
        const wrapper = document.createElement('div');
        wrapper.className = 'chatbot-typing-indicator';

        const label = document.createElement('span');
        label.className = 'visually-hidden';
        label.textContent = 'Assistant is typing';
        wrapper.appendChild(label);

        const dots = document.createElement('span');
        dots.className = 'chatbot-typing-dots';
        wrapper.appendChild(dots);

        for (let index = 0; index < 3; index += 1) {
            const dot = document.createElement('span');
            dot.className = 'chatbot-typing-dot';
            dot.style.animationDelay = `${index * 0.15}s`;
            dots.appendChild(dot);
        }

        return wrapper;
    }

    function showTypingIndicator() {
        if (typingMessage) {
            return typingMessage;
        }

        typingMessage = appendMessage(createTypingIndicatorContent(), false, 'chatbot-typing');
        return typingMessage;
    }

    function hideTypingIndicator() {
        if (typingMessage && typingMessage.parentNode === messagesEl) {
            messagesEl.removeChild(typingMessage);
        }

        typingMessage = null;
    }

    function humanizeKey(key) {
        return key
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, (match) => match.toUpperCase());
    }

    function getNested(value, path) {
        let current = value;

        for (let index = 0; index < path.length; index += 1) {
            if (!current || typeof current !== 'object' || !(path[index] in current)) {
                return undefined;
            }

            current = current[path[index]];
        }

        return current;
    }

    function asStructuredCandidate(value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (Array.isArray(value)) {
            return value.length > 0 ? value : null;
        }

        if (typeof value === 'object') {
            return Object.keys(value).length > 0 ? value : null;
        }

        return null;
    }

    function findStructuredData(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }

        const candidatePaths = [
            ['payload', 'data'],
            ['payload', 'result'],
            ['payload', 'output'],
            ['payload'],
            ['data'],
            ['result'],
            ['output'],
        ];

        for (let index = 0; index < candidatePaths.length; index += 1) {
            const candidate = getNested(data, candidatePaths[index]);
            const structured = asStructuredCandidate(candidate);

            if (structured) {
                return structured;
            }
        }

        return null;
    }

    function renderStructuredData(value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return document.createTextNode(String(value));
        }

        if (Array.isArray(value)) {
            if (!value.length) {
                return null;
            }

            const list = document.createElement('ul');
            list.className = 'chatbot-list';

            value.forEach((item) => {
                const child = renderStructuredData(item);

                if (!child) {
                    return;
                }

                const listItem = document.createElement('li');

                if (child.nodeType === TEXT_NODE) {
                    listItem.textContent = child.textContent || '';
                } else {
                    listItem.appendChild(child);
                }

                list.appendChild(listItem);
            });

            return list.childElementCount ? list : null;
        }

        if (typeof value === 'object') {
            const keys = Object.keys(value);

            if (!keys.length) {
                return null;
            }

            const dl = document.createElement('dl');
            dl.className = 'chatbot-key-values';

            keys.forEach((key) => {
                const child = renderStructuredData(value[key]);

                if (!child) {
                    return;
                }

                const dt = document.createElement('dt');
                dt.textContent = humanizeKey(key);

                const dd = document.createElement('dd');

                if (child.nodeType === TEXT_NODE) {
                    dd.textContent = child.textContent || '';
                } else {
                    dd.appendChild(child);
                }

                dl.appendChild(dt);
                dl.appendChild(dd);
            });

            return dl.childElementCount ? dl : null;
        }

        return null;
    }

    function pickSummary(data) {
        if (!data || typeof data !== 'object') {
            return '';
        }

        const candidates = ['reply', 'message', 'statusText', 'status'];

        for (let index = 0; index < candidates.length; index += 1) {
            const value = data[candidates[index]];

            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }

        return '';
    }

    function createReplyContent(data, fallbackMessage) {
        const summary = pickSummary(data);
        const structuredData = findStructuredData(data);

        const structuredNode = renderStructuredData(structuredData);

        if (!structuredNode) {
            return summary || fallbackMessage;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'chatbot-reply';

        if (summary) {
            const summaryEl = document.createElement('p');
            summaryEl.className = 'chatbot-reply-summary';
            summaryEl.textContent = summary;
            wrapper.appendChild(summaryEl);
        }

        wrapper.appendChild(structuredNode);

        return wrapper;
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
        setStatus('Waiting for the workflow to respond...');
        showTypingIndicator();

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
            const fallback = `Thanks! The ${siteName} workflow received your request.`;
            hideTypingIndicator();
            const replyContent = createReplyContent(data, fallback);
            appendMessage(replyContent, false);
            setStatus('Message delivered successfully.');
        } catch (error) {
            console.error('Chatbot error', error);
            hideTypingIndicator();
            appendMessage('Sorry, we could not reach the automation. Please try again later.', false);
            setStatus('Unable to reach the workflow.');
        } finally {
            isSending = false;
            hideTypingIndicator();
        }
    });
})();
