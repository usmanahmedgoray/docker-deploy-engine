// Dockpoly UI Script - Full Container & Image Management

document.addEventListener('DOMContentLoaded', () => {
    // Navigation Tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    const viewPanels = document.querySelectorAll('.view-panel');
    const containerGrid = document.getElementById('containerGrid');
    const imagesTableBody = document.getElementById('imagesTableBody');
    const metricsTableBody = document.getElementById('metricsTableBody');

    // Stats
    const statRunningCount = document.getElementById('statRunningCount');

    // Modals
    const deployModal = document.getElementById('deployModal');
    const openDeployModalBtn = document.getElementById('openDeployModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');

    // Container Delete Modal
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteTargetName = document.getElementById('deleteTargetName');
    const inputForceDelete = document.getElementById('inputForceDelete');

    // Image Delete Modal
    const deleteImageModal = document.getElementById('deleteImageModal');
    const closeDeleteImageModalBtn = document.getElementById('closeDeleteImageModalBtn');
    const cancelDeleteImageBtn = document.getElementById('cancelDeleteImageBtn');
    const confirmDeleteImageBtn = document.getElementById('confirmDeleteImageBtn');
    const deleteImageTargetTag = document.getElementById('deleteImageTargetTag');
    const inputForceDeleteImage = document.getElementById('inputForceDeleteImage');

    // Inspect Modal
    const inspectModal = document.getElementById('inspectModal');
    const closeInspectBtn = document.getElementById('closeInspectBtn');
    const inspectTitle = document.getElementById('inspectTitle');
    const inspectSummaryGrid = document.getElementById('inspectSummaryGrid');
    const inspectEnvBlock = document.getElementById('inspectEnvBlock');
    const inspectJsonBlock = document.getElementById('inspectJsonBlock');

    // Buttons & Form
    const refreshContainersBtn = document.getElementById('refreshContainersBtn');
    const refreshImagesBtn = document.getElementById('refreshImagesBtn');
    const deployForm = document.getElementById('deployForm');
    const addEnvBtn = document.getElementById('addEnvBtn');
    const envList = document.getElementById('envList');
    const toastContainer = document.getElementById('toastContainer');

    let pendingDeleteIdentifier = null;
    let pendingDeleteImageTarget = null;

    // Presets Data
    const PRESETS = {
        nginx: { image: 'nginx', tag: 'alpine', name: 'web-demo', port: '80', env: [] },
        postgres: {
            image: 'postgres', tag: 'alpine', name: 'my-postgres', port: '5432',
            env: [
                { key: 'POSTGRES_USER', value: 'myuser' },
                { key: 'POSTGRES_PASSWORD', value: 'secretpass' },
                { key: 'POSTGRES_DB', value: 'mydb' }
            ]
        },
        pgadmin: {
            image: 'dpage/pgadmin4', tag: 'latest', name: 'my-pgadmin', port: '80',
            env: [
                { key: 'PGADMIN_DEFAULT_EMAIL', value: 'admin@domain.com' },
                { key: 'PGADMIN_DEFAULT_PASSWORD', value: 'adminpass' }
            ]
        },
        redis: { image: 'redis', tag: 'alpine', name: 'my-cache', port: '6379', env: [] },
        node: { image: 'node', tag: 'alpine', name: 'node-app', port: '3000', env: [{ key: 'NODE_ENV', value: 'production' }] }
    };

    // 1. Tab Switching Handler
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            navTabs.forEach(t => t.classList.remove('active'));
            viewPanels.forEach(p => p.classList.add('hidden'));
            viewPanels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetViewId = tab.dataset.view;
            const targetView = document.getElementById(targetViewId);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            }

            if (targetViewId === 'viewContainers') fetchContainers();
            if (targetViewId === 'viewImages') fetchImages();
            if (targetViewId === 'viewMetrics') fetchMetrics();
        });
    });

    // 2. Initial Fetch
    fetchContainers();

    if (refreshContainersBtn) refreshContainersBtn.addEventListener('click', fetchContainers);
    if (refreshImagesBtn) refreshImagesBtn.addEventListener('click', fetchImages);

    // Modal Handlers
    openDeployModalBtn.addEventListener('click', () => deployModal.classList.add('active'));
    [closeModalBtn, cancelModalBtn].forEach(b => b.addEventListener('click', () => deployModal.classList.remove('active')));
    closeInspectBtn.addEventListener('click', () => inspectModal.classList.remove('active'));

    // Container Delete Modal Handlers
    [closeDeleteModalBtn, cancelDeleteBtn].forEach(b => b.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('active');
        pendingDeleteIdentifier = null;
    }));

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!pendingDeleteIdentifier) return;
        const force = inputForceDelete.checked;
        await executeDeleteContainer(pendingDeleteIdentifier, force);
        deleteConfirmModal.classList.remove('active');
        pendingDeleteIdentifier = null;
    });

    // Image Delete Modal Handlers
    [closeDeleteImageModalBtn, cancelDeleteImageBtn].forEach(b => b.addEventListener('click', () => {
        deleteImageModal.classList.remove('active');
        pendingDeleteImageTarget = null;
    }));

    confirmDeleteImageBtn.addEventListener('click', async () => {
        if (!pendingDeleteImageTarget) return;
        const force = inputForceDeleteImage.checked;
        await executeDeleteImage(pendingDeleteImageTarget, force);
        deleteImageModal.classList.remove('active');
        pendingDeleteImageTarget = null;
    });

    // Add Environment Variable Row
    addEnvBtn.addEventListener('click', () => addEnvRow());

    function addEnvRow(key = '', value = '') {
        const row = document.createElement('div');
        row.className = 'env-row';
        row.innerHTML = `
            <input type="text" placeholder="KEY (e.g. POSTGRES_USER)" value="${key}" class="env-key">
            <input type="text" placeholder="VALUE" value="${value}" class="env-val">
            <button type="button" class="btn btn-danger btn-icon remove-env">&times;</button>
        `;
        row.querySelector('.remove-env').addEventListener('click', () => row.remove());
        envList.appendChild(row);
    }

    // Presets Handler
    document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.preventDefault();
            const p = PRESETS[chip.dataset.preset];
            if (p) {
                document.getElementById('inputImage').value = p.image;
                document.getElementById('inputTag').value = p.tag;
                document.getElementById('inputName').value = p.name;
                document.getElementById('inputPort').value = p.port;
                envList.innerHTML = '';
                p.env.forEach(pair => addEnvRow(pair.key, pair.value));
                showToast(`Applied preset: ${chip.dataset.preset}`, 'info');
            }
        });
    });

    // Deploy Form Submit
    deployForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const image = document.getElementById('inputImage').value.trim();
        const tag = document.getElementById('inputTag').value.trim() || 'latest';
        const containerName = document.getElementById('inputName').value.trim() || undefined;
        const portVal = document.getElementById('inputPort').value.trim();
        const autoRemove = document.getElementById('inputAutoRemove').checked;

        const env = [];
        document.querySelectorAll('.env-row').forEach(row => {
            const k = row.querySelector('.env-key').value.trim();
            const v = row.querySelector('.env-val').value.trim();
            if (k) env.push(`${k}=${v}`);
        });

        const ports = portVal ? [{ containerPort: portVal }] : undefined;

        const submitBtn = document.getElementById('submitDeployBtn');
        const spinner = document.getElementById('deploySpinner');
        submitBtn.disabled = true;
        spinner.classList.add('spinner');

        try {
            const res = await fetch('/container', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image, tag, containerName, env: env.length ? env : undefined, ports, autoRemove })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || data.error || 'Deploy failed');

            showToast(`Launched container '${data.data.name}'!`, 'success');
            deployModal.classList.remove('active');
            deployForm.reset();
            envList.innerHTML = '';
            fetchContainers();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.remove('spinner');
        }
    });

    // Fetch & Render Containers
    async function fetchContainers() {
        containerGrid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching containers...</p></div>`;

        try {
            const res = await fetch('/container');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const containers = data.data || [];
            renderContainers(containers);
            renderMetricsTable(containers);
        } catch (err) {
            containerGrid.innerHTML = `<div class="empty-state"><p style="color:var(--rose)">Error: ${err.message}</p></div>`;
        }
    }

    function renderContainers(containers) {
        const running = containers.filter(c => c.state === 'running');
        statRunningCount.textContent = running.length;

        if (containers.length === 0) {
            containerGrid.innerHTML = `<div class="empty-state"><p>No containers active on internal network.</p></div>`;
            return;
        }

        const SVG_START = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        const SVG_STOP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
        const SVG_PAUSE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
        const SVG_INSPECT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
        const SVG_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

        containerGrid.innerHTML = containers.map(c => {
            const isRunning = c.state === 'running';
            const isPaused = c.state === 'paused';
            let badgeClass = 'stopped';
            let badgeText = 'Stopped';

            if (isRunning) { badgeClass = 'running'; badgeText = 'Running'; }
            if (isPaused) { badgeClass = 'paused'; badgeText = 'Paused'; }

            return `
                <div class="card">
                    <div class="card-header">
                        <div class="container-title-group">
                            <h3>${c.name}</h3>
                            <span class="image-tag">${c.image}</span>
                        </div>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>

                    <div class="card-details">
                        <div class="detail-row"><span>Internal IP:</span> <span>${c.internalIp || '172.18.0.x'}</span></div>
                        <div class="detail-row"><span>Status:</span> <span>${c.status}</span></div>
                    </div>

                    <a href="${c.url}" target="_blank" class="url-link-box">
                        <span>${c.url}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>

                    <div class="card-action-strip">
                        <div class="action-btn-group">
                            ${isRunning 
                                ? `<button class="btn btn-stop btn-sm power-btn" data-id="${c.name}" data-action="stop">${SVG_STOP} Stop</button>
                                   <button class="btn btn-pause btn-sm power-btn" data-id="${c.name}" data-action="pause">${SVG_PAUSE} Pause</button>`
                                : isPaused
                                ? `<button class="btn btn-start btn-sm power-btn" data-id="${c.name}" data-action="unpause">${SVG_START} Resume</button>
                                   <button class="btn btn-stop btn-sm power-btn" data-id="${c.name}" data-action="stop">${SVG_STOP} Stop</button>`
                                : `<button class="btn btn-start btn-sm power-btn" data-id="${c.name}" data-action="start">${SVG_START} Start</button>`
                            }
                            <button class="btn btn-inspect btn-sm inspect-btn" data-id="${c.name}">${SVG_INSPECT} Inspect</button>
                        </div>
                        <button class="btn btn-danger btn-sm open-delete-modal-btn" data-name="${c.name}">${SVG_DELETE} Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach Event Listeners
        document.querySelectorAll('.power-btn').forEach(btn => {
            btn.addEventListener('click', () => handlePowerAction(btn.dataset.id, btn.dataset.action));
        });

        document.querySelectorAll('.inspect-btn').forEach(btn => {
            btn.addEventListener('click', () => inspectContainer(btn.dataset.id));
        });

        document.querySelectorAll('.open-delete-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pendingDeleteIdentifier = btn.dataset.name;
                deleteTargetName.textContent = pendingDeleteIdentifier;
                deleteConfirmModal.classList.add('active');
            });
        });
    }

    // Power Action Handler
    async function handlePowerAction(identifier, action) {
        try {
            const res = await fetch(`/container/${identifier}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `Failed to ${action} container`);

            showToast(`Container '${identifier}' ${action}ed!`, 'success');
            fetchContainers();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Delete Container Execution
    async function executeDeleteContainer(identifier, force = true) {
        try {
            const res = await fetch(`/container/${identifier}?force=${force}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Deletion failed');

            showToast(`Deleted container '${identifier}'`, 'success');
            fetchContainers();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Inspect Container
    async function inspectContainer(id) {
        try {
            const res = await fetch(`/container/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const c = data.data;
            inspectTitle.textContent = `Container: ${c.name}`;

            inspectSummaryGrid.innerHTML = `
                <div class="detail-row"><span>ID:</span> <span>${c.id.substring(0, 12)}</span></div>
                <div class="detail-row"><span>Image:</span> <span>${c.image}</span></div>
                <div class="detail-row"><span>State:</span> <span>${c.status}</span></div>
                <div class="detail-row"><span>Internal IP:</span> <span>${c.internalIp}</span></div>
                <div class="detail-row"><span>Proxy URL:</span> <span>${c.url}</span></div>
                <div class="detail-row"><span>Exposed Ports:</span> <span>${c.exposedPorts?.join(', ') || 'None'}</span></div>
            `;

            inspectEnvBlock.textContent = (c.env || []).join('\n') || 'No environment variables configured.';
            inspectJsonBlock.textContent = JSON.stringify(c, null, 2);

            inspectModal.classList.add('active');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Inspect Tab Switcher
    document.querySelectorAll('.inspect-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.inspect-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.inspect-body .tab-content').forEach(tc => tc.classList.add('hidden'));

            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.classList.remove('hidden');
        });
    });

    // Fetch Images
    async function fetchImages() {
        imagesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading images...</td></tr>`;

        try {
            const res = await fetch('/image');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const images = data.data || [];
            if (images.length === 0) {
                imagesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No local images found.</td></tr>`;
                return;
            }

            const SVG_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

            imagesTableBody.innerHTML = images.map(img => {
                const tag = img.repoTags[0] || img.id;
                return `
                    <tr>
                        <td><strong>${img.repoTags.join(', ')}</strong></td>
                        <td><code>${img.id}</code></td>
                        <td>${img.sizeMb}</td>
                        <td>${new Date(img.created * 1000).toLocaleDateString()}</td>
                        <td style="text-align: right;">
                            <button class="btn btn-danger btn-sm open-delete-image-btn" data-target="${tag}">
                                ${SVG_DELETE} Delete Image
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Delete Image Buttons Handler
            document.querySelectorAll('.open-delete-image-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    pendingDeleteImageTarget = btn.dataset.target;
                    deleteImageTargetTag.textContent = pendingDeleteImageTarget;
                    deleteImageModal.classList.add('active');
                });
            });
        } catch (err) {
            imagesTableBody.innerHTML = `<tr><td colspan="5" style="color:var(--rose);text-align:center;">Error: ${err.message}</td></tr>`;
        }
    }

    // Delete Image Execution
    async function executeDeleteImage(identifier, force = true) {
        try {
            const res = await fetch(`/image/${encodeURIComponent(identifier)}?force=${force}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Image deletion failed');

            showToast(`Deleted image '${identifier}'`, 'success');
            fetchImages();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Render Metrics Table
    function renderMetricsTable(containers) {
        if (!metricsTableBody) return;
        metricsTableBody.innerHTML = containers.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td><code>${c.internalIp || 'N/A'}</code></td>
                <td><span class="badge ${c.state === 'running' ? 'running' : c.state === 'paused' ? 'paused' : 'stopped'}">${c.state}</span></td>
                <td><a href="${c.url}" target="_blank" style="color:var(--primary);">${c.url}</a></td>
            </tr>
        `).join('');
    }

    // Toast Notification Utility
    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
    }
});
