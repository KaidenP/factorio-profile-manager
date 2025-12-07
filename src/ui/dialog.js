/**
 * Creates and displays a modal dialog with custom message and buttons.
 *
 * @param {HTMLElement | string} message - content to display in the body
 * @param {Array<{text: string, primary?: boolean, onClick?: () => void}>} buttons - action buttons
 * @param {boolean} allowClose - whether to allow the user to close the dialog by clicking outside of it
 */
export function dialog(message, buttons = [{ text: 'OK', primary: true}], allowClose = false) {
    // Create the overlay
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex'; // Override CSS display:none
    modal.style.zIndex = '10000'; // Ensure it's on top of everything

    // Create the content container
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '500px'; // Reasonable default for alerts

    // Create the message body
    const body = document.createElement('div');
    body.className = 'dialog-message';
    body.style.marginBottom = '20px';

    if (message instanceof HTMLElement) {
        body.appendChild(message);
    } else {
        body.innerHTML = message; // Support HTML strings
    }

    // Create the footer/actions
    const footer = document.createElement('div');
    footer.className = 'modal-actions';

    // Helper to close the modal
    const close = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    };

    // Generate buttons
    buttons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.className = 'footer-btn';
        if (btnConfig.primary) {
            btn.classList.add('primary');
        }
        btn.textContent = btnConfig.text;

        btn.addEventListener('click', () => {
            if (typeof btnConfig.onClick === 'function') {
                btnConfig.onClick();
            }
            close();
        });

        footer.appendChild(btn);
    });

    // Assemble the modal
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);

    // Add click-outside-to-close behavior
    modal.addEventListener('click', (e) => {
        if (allowClose && e.target === modal) {
            close();
        }
    });

    // Mount to DOM
    document.body.appendChild(modal);
}