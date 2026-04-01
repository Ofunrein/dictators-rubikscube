export function createSidePanel(side) {
    const panel = document.createElement('div');

    Object.assign(panel.style, {
        width: '200px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '10px',
        boxSizing: 'border-box',
        pointerEvents: 'none', // Children will override
    });

    Object.assign(panel.style, {
        background: 'rgba(10, 10, 15, 0.6)',
        backdropFilter: 'blur(5px)',
    });

    if (side === 'left') {
        panel.style.alignItems = 'flex-start';
    } else {
        panel.style.alignItems = 'flex-end';
    }

    return panel;
}

export function createSection(title) {
    const container = document.createElement('div');

    Object.assign(container.style, {
        width: '100%',
        background: 'rgba(20, 20, 30, 0.9)',
        color: '#fff',
        borderRadius: '8px',
        padding: '10px',
        pointerEvents: 'auto', // Enable interaction with section contents
    });

    const header = document.createElement('div');
    header.textContent = title;

    Object.assign(header.style, {
        fontWeight: 'bold',
        marginBottom: '8px',
    });

    container.appendChild(header);
    return container;
}