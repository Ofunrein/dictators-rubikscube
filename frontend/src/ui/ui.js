import { initSettings } from './settings.js';
import { createSidePanel } from './panel.js';

export function initUI(context) {
    const root = document.createElement('div');

    Object.assign(root.style, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        pointerEvents: 'none', // Allow clicks to pass through by default
        zIndex: 1000
    });

    document.body.appendChild(root);

    const leftPanel = createSidePanel('left');
    root.appendChild(leftPanel);

    const rightPanel = createSidePanel('right');
    root.appendChild(rightPanel);

    initSettings(rightPanel, context);
}