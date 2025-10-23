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
    const statusEl = widget.querySelector('.chatbot-status');
    const dragHandles = widget.querySelectorAll('[data-drag-handle], .chatbot-toggle');
    const TEXT_NODE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
    const MIN_MARGIN = 16;
    const POSITION_STORAGE_KEY = 'chatbot-plugin-position';

    if (!toggleButton || !closeButton || !windowEl || !messagesEl || !form || !textarea || !statusEl) {
        return;
    }

    let isSending = false;
    let typingMessage = null;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function formatTime(date) {
        try {
            return new Intl.DateTimeFormat(undefined, {
                hour: 'numeric',
                minute: '2-digit'
            }).format(date);
        } catch (error) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
    }

    function readSavedPosition() {
        try {
            if (typeof window === 'undefined' || !('localStorage' in window)) {
                return null;
            }

            const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }

            const horizontal = parsed.horizontal;
            const vertical = parsed.vertical;
            const offsetX = Number(parsed.offsetX);
            const offsetY = Number(parsed.offsetY);

            if (!['left', 'right'].includes(horizontal) || !['top', 'bottom'].includes(vertical)) {
                return null;
            }

            return {
                horizontal,
                vertical,
                offsetX: Number.isFinite(offsetX) ? offsetX : 32,
                offsetY: Number.isFinite(offsetY) ? offsetY : 32
            };
        } catch (error) {
            return null;
        }
    }

    function savePosition(position) {
        try {
            if (typeof window === 'undefined' || !('localStorage' in window)) {
                return;
            }

            window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function applyPosition(position) {
        const resolved = position || { horizontal: 'left', vertical: 'bottom', offsetX: 32, offsetY: 32 };

        ['top', 'right', 'bottom', 'left'].forEach((edge) => {
            widget.style[edge] = '';
        });

        const offsetX = Math.max(MIN_MARGIN, Math.round(resolved.offsetX));
        const offsetY = Math.max(MIN_MARGIN, Math.round(resolved.offsetY));

        widget.style.setProperty(resolved.horizontal, `${offsetX}px`);
        widget.style.setProperty(resolved.vertical, `${offsetY}px`);
    }

    applyPosition(readSavedPosition());

    function setStatus(text) {
        statusEl.textContent = text;
    }

    function toggleWindow(open) {
        const shouldOpen = typeof open === 'boolean' ? open : !widget.classList.contains('is-open');
        widget.classList.toggle('is-open', shouldOpen);
        windowEl.setAttribute('aria-hidden', String(!shouldOpen));
        toggleButton.setAttribute('aria-expanded', String(shouldOpen));

        if (shouldOpen) {
            textarea.focus();
        } else {
            toggleButton.focus();
        }
    }

    function createMetaButton(icon, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chatbot-meta-btn';
        button.title = label;
        button.setAttribute('aria-label', label);

        const iconSpan = document.createElement('span');
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.textContent = icon;
        button.appendChild(iconSpan);

        return button;
    }

    function markCopySuccess(button, label) {
        button.classList.add('is-success');
        button.setAttribute('aria-label', 'Reply copied');
        button.title = 'Reply copied';
        setStatus('Reply copied to your clipboard.');

        window.setTimeout(() => {
            button.classList.remove('is-success');
            button.setAttribute('aria-label', label);
            button.title = label;
            setStatus('');
        }, 2000);
    }

    function copyTextToClipboard(text, button, label) {
        if (!text) {
            return;
        }

        const value = text.replace(/\s+/g, ' ').trim();

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(value).then(() => {
                markCopySuccess(button, label);
            }).catch(() => {
                fallbackCopy(value, button, label);
            });
            return;
        }

        fallbackCopy(value, button, label);
    }

    function fallbackCopy(value, button, label) {
        const temp = document.createElement('textarea');
        temp.value = value;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();

        try {
            document.execCommand('copy');
            markCopySuccess(button, label);
        } catch (error) {
            setStatus('Copy is unavailable in this browser.');
        }

        document.body.removeChild(temp);
    }

    function setupReactionButtons(buttons) {
        buttons.forEach((button) => {
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', () => {
                const isActive = button.classList.toggle('is-active');
                button.setAttribute('aria-pressed', String(isActive));

                buttons.forEach((other) => {
                    if (other !== button) {
                        other.classList.remove('is-active');
                        other.setAttribute('aria-pressed', 'false');
                    }
                });

                if (isActive) {
                    const sentiment = button.dataset.reaction === 'positive' ? 'positive' : 'negative';
                    setStatus(`Thanks for the ${sentiment} feedback.`);
                } else {
                    setStatus('');
                }
            });
        });
    }

    function appendMessage(content, isUser = false, extraClass = '', showMeta = true) {
        const message = document.createElement('div');
        message.className = 'chatbot-message';

        if (isUser) {
            message.classList.add('is-user');
        }

        if (extraClass) {
            message.classList.add(extraClass);
        }

        const bubble = document.createElement('div');
        bubble.className = 'chatbot-bubble';

        if (typeof content === 'string') {
            bubble.textContent = content;
        } else if (typeof Node !== 'undefined' && content instanceof Node) {
            bubble.appendChild(content);
        } else if (content !== null && content !== undefined) {
            bubble.textContent = String(content);
        }

        message.appendChild(bubble);

        if (showMeta) {
            const meta = document.createElement('div');
            meta.className = 'chatbot-meta';

            const timeEl = document.createElement('span');
            timeEl.className = 'chatbot-meta-time';
            timeEl.textContent = formatTime(new Date());
            meta.appendChild(timeEl);

            if (!isUser) {
                const actions = document.createElement('span');
                actions.className = 'chatbot-meta-actions';

                const copyLabel = 'Copy reply';
                const copyButton = createMetaButton('📋', copyLabel);
                copyButton.addEventListener('click', () => {
                    copyTextToClipboard(bubble.textContent || '', copyButton, copyLabel);
                });

                const likeButton = createMetaButton('👍', 'Mark reply as helpful');
                likeButton.dataset.reaction = 'positive';
                const dislikeButton = createMetaButton('👎', 'Mark reply as not helpful');
                dislikeButton.dataset.reaction = 'negative';

                setupReactionButtons([likeButton, dislikeButton]);

                actions.appendChild(copyButton);
                actions.appendChild(likeButton);
                actions.appendChild(dislikeButton);
                meta.appendChild(actions);
            }

            message.appendChild(meta);
        }

        messagesEl.appendChild(message);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        return message;
    }

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

        typingMessage = appendMessage(createTypingIndicatorContent(), false, 'chatbot-typing', false);
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
            ['payload'],
            ['data'],
            ['result']
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

    function sanitizeStructuredData(value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (Array.isArray(value)) {
            const sanitizedItems = value
                .map((item) => sanitizeStructuredData(item))
                .filter((item) => item !== null && !(Array.isArray(item) && item.length === 0));

            return sanitizedItems.length ? sanitizedItems : null;
        }

        if (typeof value === 'object') {
            const excludedKeys = ['output', 'outputs'];
            const entries = Object.entries(value)
                .filter(([key]) => !excludedKeys.includes(key.toLowerCase()))
                .map(([key, child]) => [key, sanitizeStructuredData(child)])
                .filter(([, child]) => child !== null && !(Array.isArray(child) && child.length === 0));

            if (!entries.length) {
                return null;
            }

            return entries.reduce((result, [key, child]) => {
                result[key] = child;
                return result;
            }, {});
        }

        return value;
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
        const normalizedCandidates = [
            'reply',
            'message',
            'messagetext',
            'statustext',
            'status',
            'response',
            'result',
            'detail',
            'details',
            'description'
        ];

        const excludedKeys = ['output', 'outputs'];

        const normalizeKey = (key) => key.toLowerCase().replace(/[\s_-]+/g, '');

        const isLikelyCandidate = (key) => {
            if (!key) {
                return false;
            }

            if (normalizedCandidates.includes(key)) {
                return true;
            }

            return key.includes('message') || key.includes('reply') || key.includes('response');
        };

        const isExcluded = (key) => excludedKeys.includes(key);

        const search = (value, key = null, allowBare = false) => {
            if (typeof value === 'string') {
                const trimmed = value.trim();

                if (!trimmed) {
                    return '';
                }

                if (key === null) {
                    return allowBare ? trimmed : '';
                }

                const normalized = normalizeKey(key);

                if (isLikelyCandidate(normalized) || allowBare) {
                    return trimmed;
                }

                return '';
            }

            if (value === null || value === undefined) {
                return '';
            }

            if (Array.isArray(value)) {
                for (let index = 0; index < value.length; index += 1) {
                    const found = search(value[index], null, allowBare);

                    if (found) {
                        return found;
                    }
                }

                return '';
            }

            if (typeof value !== 'object') {
                return '';
            }

            const entries = Object.entries(value);

            for (let index = 0; index < entries.length; index += 1) {
                const [childKey, childValue] = entries[index];
                const normalized = normalizeKey(childKey);

                if (isExcluded(normalized)) {
                    continue;
                }

                const found = search(childValue, childKey, isLikelyCandidate(normalized));

                if (found) {
                    return found;
                }
            }

            return '';
        };

        return search(data, null, true) || '';
    }

    function createReplyContent(data, fallbackMessage) {
        const summary = pickSummary(data);
        const structuredData = sanitizeStructuredData(findStructuredData(data));

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

    toggleButton.addEventListener('click', () => toggleWindow());
    closeButton.addEventListener('click', () => toggleWindow(false));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && widget.classList.contains('is-open')) {
            toggleWindow(false);
        }
    });

    let dragState = null;

    function handlePointerMove(event) {
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;

        if (!dragState.hasMoved) {
            if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
                return;
            }

            dragState.hasMoved = true;
            widget.classList.add('is-dragging');
            widget.style.transition = 'none';
            widget.style.top = `${dragState.startTop}px`;
            widget.style.left = `${dragState.startLeft}px`;
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
        }

        const proposedLeft = event.clientX - dragState.offsetX;
        const proposedTop = event.clientY - dragState.offsetY;

        const horizontalMax = Math.max(MIN_MARGIN, window.innerWidth - dragState.width - MIN_MARGIN);
        const verticalMax = Math.max(MIN_MARGIN, window.innerHeight - dragState.height - MIN_MARGIN);

        const minLeft = Math.min(MIN_MARGIN, horizontalMax);
        const minTop = Math.min(MIN_MARGIN, verticalMax);

        const left = clamp(proposedLeft, minLeft, horizontalMax);
        const top = clamp(proposedTop, minTop, verticalMax);

        widget.style.left = `${left}px`;
        widget.style.top = `${top}px`;
    }

    function finishDrag(event) {
        if (!dragState || event.pointerId !== dragState.pointerId) {
            return;
        }

        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);

        if (!dragState.hasMoved) {
            dragState = null;
            widget.style.transition = '';
            return;
        }

        const rect = widget.getBoundingClientRect();

        const distances = {
            left: rect.left,
            right: window.innerWidth - (rect.left + rect.width),
            top: rect.top,
            bottom: window.innerHeight - (rect.top + rect.height)
        };

        const horizontalEdge = distances.left <= distances.right ? 'left' : 'right';
        const verticalEdge = distances.top <= distances.bottom ? 'top' : 'bottom';

        const position = {
            horizontal: horizontalEdge,
            vertical: verticalEdge,
            offsetX: Math.max(MIN_MARGIN, Math.round(distances[horizontalEdge])),
            offsetY: Math.max(MIN_MARGIN, Math.round(distances[verticalEdge]))
        };

        widget.classList.remove('is-dragging');
        widget.style.transition = '';

        applyPosition(position);
        savePosition(position);

        dragState = null;
    }

    dragHandles.forEach((handle) => {
        handle.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            const rect = widget.getBoundingClientRect();

            dragState = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startLeft: rect.left,
                startTop: rect.top,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                width: rect.width,
                height: rect.height,
                hasMoved: false
            };

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', finishDrag);
            window.addEventListener('pointercancel', finishDrag);
        });
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
            const fallback = `The ${siteName} workflow has received your request.`;
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
