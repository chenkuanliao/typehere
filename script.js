document.addEventListener('DOMContentLoaded', () => {
    const typingCanvas = document.getElementById('typingCanvas');
    const panelTabs = document.getElementById('panelTabs');
    const addPanel = document.getElementById('addPanel');
    const hotkeyHelp = document.getElementById('hotkeyHelp');
    const hotkeyHelpToggle = document.getElementById('hotkeyHelpToggle');

    const storageKey = 'typeherePanels';
    const activePanelKey = 'typehereActivePanel';
    const legacyStorageKey = 'storedText';

    let panels = loadPanels();
    let activePanelId = loadActivePanelId();

    typingCanvas.addEventListener('input', () => {
        const panel = getActivePanel();

        if (!panel) {
            return;
        }

        panel.text = typingCanvas.value;
        savePanels();
    });

    addPanel.addEventListener('click', () => {
        createPanel();
    });

    hotkeyHelpToggle.addEventListener('click', () => {
        toggleHotkeyHelp();
    });

    hotkeyHelp.addEventListener('click', (event) => {
        if (event.target === hotkeyHelp) {
            closeHotkeyHelp();
        }
    });

    panelTabs.addEventListener('click', (event) => {
        const tab = event.target.closest('.panelTab');
        const renameButton = event.target.closest('.renamePanel');
        const removeButton = event.target.closest('.removePanel');

        if (!tab) {
            return;
        }

        const panelId = tab.dataset.panelId;

        if (renameButton) {
            renamePanel(panelId);
            return;
        }

        if (removeButton) {
            removePanel(panelId);
            return;
        }

        setActivePanel(panelId);
    });

    panelTabs.addEventListener('dblclick', (event) => {
        const tab = event.target.closest('.panelTab');

        if (tab) {
            renamePanel(tab.dataset.panelId);
        }
    });

    document.addEventListener('keydown', (event) => {
        const hasPanelModifier = event.shiftKey && event.altKey && !event.ctrlKey && !event.metaKey;

        if (hasPanelModifier && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            createPanel();
            return;
        }

        if (hasPanelModifier && event.key.toLowerCase() === 'r') {
            event.preventDefault();
            renamePanel(activePanelId);
            return;
        }

        if (hasPanelModifier && (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'h')) {
            event.preventDefault();
            activateRelativePanel(-1);
            return;
        }

        if (hasPanelModifier && (event.key === 'ArrowRight' || event.key.toLowerCase() === 'l')) {
            event.preventDefault();
            activateRelativePanel(1);
            return;
        }

        if (hasPanelModifier && (event.key === 'Backspace' || event.key === 'Delete')) {
            event.preventDefault();
            removePanel(activePanelId);
            return;
        }

        if (hasPanelModifier && event.key === '?') {
            event.preventDefault();
            toggleHotkeyHelp();
            return;
        }

        if (event.key === 'Escape' && !hotkeyHelp.hidden) {
            event.preventDefault();
            closeHotkeyHelp();
            return;
        }

        if (event.altKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(event.key)) {
            const panel = panels[Number(event.key) - 1];

            if (panel) {
                event.preventDefault();
                setActivePanel(panel.id);
            }
        }
    });

    render();

    function loadPanels() {
        const savedPanels = getSavedPanels();

        if (savedPanels.length > 0) {
            return savedPanels;
        }

        const legacyText = localStorage.getItem(legacyStorageKey) || '';
        const firstPanel = {
            id: createPanelId(),
            title: 'Panel 1',
            text: legacyText
        };

        localStorage.setItem(storageKey, JSON.stringify([firstPanel]));
        return [firstPanel];
    }

    function getSavedPanels() {
        try {
            const parsedPanels = JSON.parse(localStorage.getItem(storageKey) || '[]');

            if (!Array.isArray(parsedPanels)) {
                return [];
            }

            return parsedPanels
                .filter((panel) => panel && typeof panel.id === 'string')
                .map((panel, index) => ({
                    id: panel.id,
                    title: getPanelTitle(panel.title, index + 1),
                    text: typeof panel.text === 'string' ? panel.text : ''
                }));
        } catch (error) {
            return [];
        }
    }

    function loadActivePanelId() {
        const savedActiveId = localStorage.getItem(activePanelKey);

        if (panels.some((panel) => panel.id === savedActiveId)) {
            return savedActiveId;
        }

        return panels[0].id;
    }

    function savePanels() {
        localStorage.setItem(storageKey, JSON.stringify(panels));
        localStorage.setItem(activePanelKey, activePanelId);
    }

    function render() {
        const activePanel = getActivePanel();

        panelTabs.innerHTML = panels.map((panel, index) => {
            const isActive = panel.id === activePanelId;
            const position = index + 1;

            return `
                <button class="panelTab${isActive ? ' active' : ''}" type="button" role="tab" aria-selected="${isActive}" data-panel-id="${escapeAttribute(panel.id)}" title="${escapeAttribute(panel.title)}">
                    <span class="panelIndex">${position}</span>
                    <span class="panelTitle">${escapeHtml(panel.title)}</span>
                    <span class="renamePanel" title="Rename panel (Shift+Alt+R)" aria-label="Rename panel" aria-hidden="true">
                        <svg class="panelIcon" viewBox="0 0 16 16" focusable="false">
                            <path d="M3 11.8 3.5 14l2.2-.5 6.7-6.7-2.7-2.7L3 10.8v1z"></path>
                            <path d="m10.6 3.2.8-.8c.4-.4 1-.4 1.4 0l.8.8c.4.4.4 1 0 1.4l-.8.8-2.2-2.2z"></path>
                        </svg>
                    </span>
                    <span class="removePanel" title="Delete panel (Shift+Alt+Backspace)" aria-label="Delete panel">x</span>
                </button>
            `;
        }).join('');

        typingCanvas.value = activePanel ? activePanel.text : '';
        typingCanvas.setAttribute('aria-label', activePanel ? activePanel.title : 'Typing canvas');
        typingCanvas.focus();
    }

    function createPanel() {
        const panelNumber = panels.length + 1;
        const panel = {
            id: createPanelId(),
            title: `Panel ${panelNumber}`,
            text: ''
        };

        panels.push(panel);
        activePanelId = panel.id;
        savePanels();
        render();
    }

    function renamePanel(panelId) {
        const panel = panels.find((currentPanel) => currentPanel.id === panelId);

        if (!panel) {
            return;
        }

        const newTitle = window.prompt('Rename panel', panel.title);
        const trimmedTitle = newTitle ? newTitle.trim() : '';

        if (!trimmedTitle) {
            return;
        }

        panel.title = trimmedTitle;
        savePanels();
        render();
    }

    function removePanel(panelId) {
        if (panels.length === 1) {
            if (panels[0].text && !window.confirm(`Clear "${panels[0].title}"?`)) {
                return;
            }

            panels[0].text = '';
            savePanels();
            render();
            return;
        }

        const panelIndex = panels.findIndex((panel) => panel.id === panelId);

        if (panelIndex === -1) {
            return;
        }

        if (panels[panelIndex].text && !window.confirm(`Delete "${panels[panelIndex].title}"?`)) {
            return;
        }

        panels.splice(panelIndex, 1);

        if (activePanelId === panelId) {
            const nextPanel = panels[Math.min(panelIndex, panels.length - 1)];
            activePanelId = nextPanel.id;
        }

        savePanels();
        render();
    }

    function setActivePanel(panelId) {
        if (!panels.some((panel) => panel.id === panelId)) {
            return;
        }

        activePanelId = panelId;
        savePanels();
        render();
    }

    function activateRelativePanel(offset) {
        const activeIndex = panels.findIndex((panel) => panel.id === activePanelId);
        const nextIndex = (activeIndex + offset + panels.length) % panels.length;

        setActivePanel(panels[nextIndex].id);
    }

    function toggleHotkeyHelp() {
        if (hotkeyHelp.hidden) {
            openHotkeyHelp();
            return;
        }

        closeHotkeyHelp();
    }

    function openHotkeyHelp() {
        hotkeyHelp.hidden = false;
        hotkeyHelpToggle.setAttribute('aria-expanded', 'true');
    }

    function closeHotkeyHelp() {
        hotkeyHelp.hidden = true;
        hotkeyHelpToggle.setAttribute('aria-expanded', 'false');
        typingCanvas.focus();
    }

    function getActivePanel() {
        return panels.find((panel) => panel.id === activePanelId);
    }

    function createPanelId() {
        return `panel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function getPanelTitle(title, fallbackNumber) {
        return typeof title === 'string' && title.trim() ? title.trim() : `Panel ${fallbackNumber}`;
    }

    function escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }
});
