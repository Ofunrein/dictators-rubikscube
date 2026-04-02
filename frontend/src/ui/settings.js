import { initControls } from './controls/controls.js';

let activeControl = null;

export function initSettings(parent, context) {

    // Container
    const container = document.createElement('div');
    container.classList.add('settings-container');

    //Title
    const title = document.createElement('h2');
    title.textContent = 'Settings';

    // Control Method Wrapper
    const controlGroup = document.createElement('div');
    controlGroup.classList.add('settings-group');

    const label = document.createElement('label');
    label.textContent = 'Cube Control Method';

    const select = document.createElement('select');

    // ONLY valid control methods
    const modes = [
        { value: 'mkb', label: 'Mouse + Keyboard'},
        { value: 'key', label: 'Keyboard Only' }
    ];

    modes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode.value;
        option.textContent = mode.label;
        select.appendChild(option);
    });

    // Set default active control method and disable it in the dropdown
    const defaultMode = 'mkb';
    select.value = defaultMode;
    activeControl = defaultMode;

    initControls(defaultMode, context);

    select.onchange = (e) => {
        const selected = e.target.value;

        console.log(`[settings] Control method changed to: ${selected}`);

        activeControl = selected;
        initControls(selected, context);
    };

    controlGroup.appendChild(label);
    controlGroup.appendChild(select);

    container.appendChild(title);
    container.appendChild(controlGroup);

    parent.appendChild(container);
}