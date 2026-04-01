import { createSection } from './panel.js';
import { initControls } from './controls/controls.js';

let activeControl = null;

export function initSettings(parent, context) {

    const section = createSection('Settings');
    const wrapper = document.createElement('div');

    const label = document.createElement('div');
    label.textContent = 'Cube Control Method';
    label.style.marginBottom = '4px';

    const select = document.createElement('select');

    // ONLY valid control methods
    const modes = ['mkb', 'key'];

    modes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode;
        option.textContent = mode;
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

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    section.appendChild(wrapper);
    parent.appendChild(section);
}