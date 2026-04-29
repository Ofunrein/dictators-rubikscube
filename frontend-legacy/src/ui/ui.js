import { initSettings } from './settings.js';
import { initFeatures } from './features.js';
import { initStopwatch } from './stopwatch.js';

/**
 * Initializes and structures UI layout in document body
 * 
 * Builds a full-viewport overlay cntaineing a left panel, main view,
 * and toggleable settings panel controlled by a hamburger button
 * 
 * @param {object} context 
 * @returns {{leftPanel: HTMLDivElement, mainView: HTMLDivElement, settings: HTMLDivElement}}
 */
export function initUI(context) {
    console.log('[ui] Initializing UI');
    const root = document.createElement('div');
    root.id = 'ui-root';
    root.style.position = 'absolute';
    root.style.top = '0';
    root.style.left = '0';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.zIndex = '10';

    // Left Panel (permanent controls/info)
    const leftPanel = document.createElement('div');
    leftPanel.id = 'left-panel';


    // Main View (3D canvas and dynamic overlays)
    const mainView = document.createElement('div');
    mainView.id = 'main-view';


    // Hamburger Button (Settings toggle)
    const hamburger = document.createElement('button');
    hamburger.id = 'hamburger-button';
    hamburger.textContent = '☰';

    // Settings (hidden by default, shown when hamburger is clicked)
    const settings = document.createElement('div');
    settings.id = 'settings-panel';
    settings.classList.add('hidden'); // Start hidden

    initSettings(settings, context);
    initFeatures(leftPanel, context);
    initStopwatch(leftPanel, context);

    // Toggle settings panel on click
    hamburger.onclick = () => {
        settings.classList.toggle('open');
    };

    root.appendChild(leftPanel);
    root.appendChild(mainView);
    root.appendChild(hamburger);
    root.appendChild(settings);

    document.body.appendChild(root);
    
    return { leftPanel, mainView, settings };
}