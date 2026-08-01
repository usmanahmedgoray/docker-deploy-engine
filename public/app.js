// Dockpoly UI Engine Script - Comprehensive Container, Image, Network & Volume Dashboard

document.addEventListener('DOMContentLoaded', () => {
    // Navigation Tabs & Views
    const navTabs = document.querySelectorAll('.nav-tab');
    const viewPanels = document.querySelectorAll('.view-panel');

    // View Tables & Grids
    const containerGrid = document.getElementById('containerGrid');
    const imagesTableBody = document.getElementById('imagesTableBody');
    const networksTableBody = document.getElementById('networksTableBody');
    const volumesTableBody = document.getElementById('volumesTableBody');
    const metricsTableBody = document.getElementById('metricsTableBody');

    // Stats
    const statRunningCount = document.getElementById('statRunningCount');

    // Deploy Modal
    const deployModal = document.getElementById('deployModal');
    const openDeployModalBtn = document.getElementById('openDeployModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');

    // Mobile Sidebar Drawer Elements
    const toggleMobileSidebarBtn = document.getElementById('toggleMobileSidebarBtn');
    const closeMobileSidebarBtn = document.getElementById('closeMobileSidebarBtn');
    const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');
    const mobileHeaderDeployBtn = document.getElementById('mobileHeaderDeployBtn');
    const sidebarDeployBtn = document.getElementById('sidebarDeployBtn');

    // Delete Container Modal
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteTargetName = document.getElementById('deleteTargetName');
    const inputForceDelete = document.getElementById('inputForceDelete');

    // Delete Image Modal
    const deleteImageModal = document.getElementById('deleteImageModal');
    const closeDeleteImageModalBtn = document.getElementById('closeDeleteImageModalBtn');
    const cancelDeleteImageBtn = document.getElementById('cancelDeleteImageBtn');
    const confirmDeleteImageBtn = document.getElementById('confirmDeleteImageBtn');
    const deleteImageTargetTag = document.getElementById('deleteImageTargetTag');
    const inputForceDeleteImage = document.getElementById('inputForceDeleteImage');

    // Delete Network Modal
    const deleteNetworkModal = document.getElementById('deleteNetworkModal');
    const closeDeleteNetworkModalBtn = document.getElementById('closeDeleteNetworkModalBtn');
    const cancelDeleteNetworkBtn = document.getElementById('cancelDeleteNetworkBtn');
    const confirmDeleteNetworkBtn = document.getElementById('confirmDeleteNetworkBtn');
    const deleteNetworkTargetName = document.getElementById('deleteNetworkTargetName');

    // Delete Volume Modal
    const deleteVolumeModal = document.getElementById('deleteVolumeModal');
    const closeDeleteVolumeModalBtn = document.getElementById('closeDeleteVolumeModalBtn');
    const cancelDeleteVolumeBtn = document.getElementById('cancelDeleteVolumeBtn');
    const confirmDeleteVolumeBtn = document.getElementById('confirmDeleteVolumeBtn');
    const deleteVolumeTargetName = document.getElementById('deleteVolumeTargetName');
    const inputForceDeleteVolume = document.getElementById('inputForceDeleteVolume');

    // Container Inspect Modal
    const inspectModal = document.getElementById('inspectModal');
    const closeInspectBtn = document.getElementById('closeInspectBtn');
    const inspectTitle = document.getElementById('inspectTitle');
    const inspectSummaryGrid = document.getElementById('inspectSummaryGrid');
    const inspectEnvBlock = document.getElementById('inspectEnvBlock');
    const inspectJsonBlock = document.getElementById('inspectJsonBlock');

    // Image Detailed Inspect Modal (A-Z)
    const inspectImageModal = document.getElementById('inspectImageModal');
    const closeInspectImageBtn = document.getElementById('closeInspectImageBtn');
    const inspectImageTitle = document.getElementById('inspectImageTitle');
    const inspectImageSummaryGrid = document.getElementById('inspectImageSummaryGrid');
    const inspectImageEnvBlock = document.getElementById('inspectImageEnvBlock');
    const inspectImageJsonBlock = document.getElementById('inspectImageJsonBlock');

    // Docker Hub Auto-Complete
    const inputImage = document.getElementById('inputImage');
    const hubSearchDropdown = document.getElementById('hubSearchDropdown');

    // Buttons
    const refreshContainersBtn = document.getElementById('refreshContainersBtn');
    const refreshImagesBtn = document.getElementById('refreshImagesBtn');
    const refreshNetworksBtn = document.getElementById('refreshNetworksBtn');
    const refreshVolumesBtn = document.getElementById('refreshVolumesBtn');
    const deployForm = document.getElementById('deployForm');
    const addEnvBtn = document.getElementById('addEnvBtn');
    const envList = document.getElementById('envList');
    const toastContainer = document.getElementById('toastContainer');

    let pendingDeleteIdentifier = null;
    let pendingDeleteImageTarget = null;
    let pendingDeleteNetworkTarget = null;
    let pendingDeleteVolumeTarget = null;
    let hubSearchDebounceTimer = null;

    // Presets Configuration
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
        node: { image: 'node', tag: 'alpine', name: 'node-app', port: '3000', env: [{ key: 'NODE_ENV', value: 'production' }] },
        mongo: {
            image: 'mongo', tag: 'latest', name: 'my-mongo', port: '27017',
            env: [
                { key: 'MONGO_INITDB_ROOT_USERNAME', value: 'mongouser' },
                { key: 'MONGO_INITDB_ROOT_PASSWORD', value: 'mongopass' }
            ]
        }
    };

    // Shared Copy Icon SVG
    const SVG_COPY_ICON = `<svg class="copy-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

    // Shared Reusable Copy-to-Clipboard Utility Function
    window.copyToClipboard = function(text, element = null) {
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Copied to clipboard`, 'success');
            if (element) {
                const originalHTML = element.innerHTML;
                element.classList.add('copied');
                element.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
                setTimeout(() => {
                    element.classList.remove('copied');
                    element.innerHTML = originalHTML;
                }, 1500);
            }
        }).catch(err => {
            console.error('Clipboard copy failed:', err);
        });
    };

    // Global Single-Click Copy Event Delegation
    document.addEventListener('click', (e) => {
        const copyTarget = e.target.closest('[data-copy]');
        if (copyTarget) {
            e.preventDefault();
            e.stopPropagation();
            const textToCopy = copyTarget.dataset.copy;
            window.copyToClipboard(textToCopy, copyTarget);
        }
    });

    // Mobile Sidebar Drawer Controls
    if (toggleMobileSidebarBtn) {
        toggleMobileSidebarBtn.addEventListener('click', () => {
            mobileSidebarBackdrop.classList.add('active');
        });
    }

    if (closeMobileSidebarBtn) {
        closeMobileSidebarBtn.addEventListener('click', () => {
            mobileSidebarBackdrop.classList.remove('active');
        });
    }

    if (mobileSidebarBackdrop) {
        mobileSidebarBackdrop.addEventListener('click', (e) => {
            if (e.target === mobileSidebarBackdrop) {
                mobileSidebarBackdrop.classList.remove('active');
            }
        });
    }

    [openDeployModalBtn, mobileHeaderDeployBtn, sidebarDeployBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (mobileSidebarBackdrop) mobileSidebarBackdrop.classList.remove('active');
                deployModal.classList.add('active');
            });
        }
    });

    // Unified Navigation Tab Switcher (Desktop & Mobile Drawer)
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetViewId = tab.dataset.view;

            // Synchronize active state across both desktop tabs and mobile sidebar tabs
            navTabs.forEach(t => {
                if (t.dataset.view === targetViewId) {
                    t.classList.add('active');
                } else {
                    t.classList.remove('active');
                }
            });

            viewPanels.forEach(p => p.classList.add('hidden'));
            viewPanels.forEach(p => p.classList.remove('active'));

            const targetView = document.getElementById(targetViewId);
            if (targetView) {
                targetView.classList.remove('hidden');
                targetView.classList.add('active');
            }

            // Close mobile sidebar on tab selection
            if (mobileSidebarBackdrop) mobileSidebarBackdrop.classList.remove('active');

            if (targetViewId === 'viewContainers') fetchContainers();
            if (targetViewId === 'viewImages') fetchImages();
            if (targetViewId === 'viewNetworks') fetchNetworks();
            if (targetViewId === 'viewVolumes') fetchVolumes();
            if (targetViewId === 'viewMetrics') fetchMetrics();
        });
    });

    // 2. Initial Data Fetch
    fetchContainers();

    if (refreshContainersBtn) refreshContainersBtn.addEventListener('click', fetchContainers);
    if (refreshImagesBtn) refreshImagesBtn.addEventListener('click', fetchImages);
    if (refreshNetworksBtn) refreshNetworksBtn.addEventListener('click', fetchNetworks);
    if (refreshVolumesBtn) refreshVolumesBtn.addEventListener('click', fetchVolumes);

    // Modal Control Handlers
    [closeModalBtn, cancelModalBtn].forEach(b => b.addEventListener('click', () => deployModal.classList.remove('active')));
    closeInspectBtn.addEventListener('click', () => inspectModal.classList.remove('active'));
    closeInspectImageBtn.addEventListener('click', () => inspectImageModal.classList.remove('active'));

    // Container Delete Modal
    [closeDeleteModalBtn, cancelDeleteBtn].forEach(b => b.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('active');
        pendingDeleteIdentifier = null;
    }));

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!pendingDeleteIdentifier) return;
        const force = inputForceDelete.checked;
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = `<span class="spinner-sm"></span> 🗑️ Removing Container...`;
        
        await executeDeleteContainer(pendingDeleteIdentifier, force);
        
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.innerHTML = `Delete Container`;
        deleteConfirmModal.classList.remove('active');
        pendingDeleteIdentifier = null;
    });

    // Image Delete Modal
    [closeDeleteImageModalBtn, cancelDeleteImageBtn].forEach(b => b.addEventListener('click', () => {
        deleteImageModal.classList.remove('active');
        pendingDeleteImageTarget = null;
    }));

    confirmDeleteImageBtn.addEventListener('click', async () => {
        if (!pendingDeleteImageTarget) return;
        const force = inputForceDeleteImage.checked;
        confirmDeleteImageBtn.disabled = true;
        confirmDeleteImageBtn.innerHTML = `<span class="spinner-sm"></span> 🗑️ Purging Image...`;

        await executeDeleteImage(pendingDeleteImageTarget, force);

        confirmDeleteImageBtn.disabled = false;
        confirmDeleteImageBtn.innerHTML = `Delete Image`;
        deleteImageModal.classList.remove('active');
        pendingDeleteImageTarget = null;
    });

    // Network Delete Modal
    [closeDeleteNetworkModalBtn, cancelDeleteNetworkBtn].forEach(b => b.addEventListener('click', () => {
        deleteNetworkModal.classList.remove('active');
        pendingDeleteNetworkTarget = null;
    }));

    confirmDeleteNetworkBtn.addEventListener('click', async () => {
        if (!pendingDeleteNetworkTarget) return;
        confirmDeleteNetworkBtn.disabled = true;
        confirmDeleteNetworkBtn.innerHTML = `<span class="spinner-sm"></span> 🌐 Pruning Network...`;

        await executeDeleteNetwork(pendingDeleteNetworkTarget);

        confirmDeleteNetworkBtn.disabled = false;
        confirmDeleteNetworkBtn.innerHTML = `Delete Network`;
        deleteNetworkModal.classList.remove('active');
        pendingDeleteNetworkTarget = null;
    });

    // Volume Delete Modal
    [closeDeleteVolumeModalBtn, cancelDeleteVolumeBtn].forEach(b => b.addEventListener('click', () => {
        deleteVolumeModal.classList.remove('active');
        pendingDeleteVolumeTarget = null;
    }));

    confirmDeleteVolumeBtn.addEventListener('click', async () => {
        if (!pendingDeleteVolumeTarget) return;
        const force = inputForceDeleteVolume.checked;
        confirmDeleteVolumeBtn.disabled = true;
        confirmDeleteVolumeBtn.innerHTML = `<span class="spinner-sm"></span> 💾 Purging Volume...`;

        await executeDeleteVolume(pendingDeleteVolumeTarget, force);

        confirmDeleteVolumeBtn.disabled = false;
        confirmDeleteVolumeBtn.innerHTML = `Delete Volume`;
        deleteVolumeModal.classList.remove('active');
        pendingDeleteVolumeTarget = null;
    });

    // 3. Interactive Quick Presets Handler
    document.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const key = card.dataset.preset;
            const p = PRESETS[key];

            if (p) {
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                document.getElementById('inputImage').value = p.image;
                document.getElementById('inputTag').value = p.tag;
                document.getElementById('inputName').value = p.name;
                document.getElementById('inputPort').value = p.port;

                if (hubSearchDropdown) hubSearchDropdown.classList.add('hidden');

                envList.innerHTML = '';
                p.env.forEach(pair => addEnvRow(pair.key, pair.value));

                showToast(`Applied ${p.name || key} preset (Port ${p.port})`, 'info');
            }
        });
    });

    // 4. Docker Hub Auto-Complete Real-Time Search
    if (inputImage) {
        inputImage.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(hubSearchDebounceTimer);

            if (query.length < 2) {
                hubSearchDropdown.classList.add('hidden');
                hubSearchDropdown.innerHTML = '';
                return;
            }

            hubSearchDebounceTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`/image/search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    const results = data.data || [];

                    if (results.length === 0) {
                        hubSearchDropdown.classList.add('hidden');
                        return;
                    }

                    hubSearchDropdown.innerHTML = results.map(r => `
                        <div class="autocomplete-item" data-name="${r.name}">
                            <div>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span class="autocomplete-item-name">${r.name}</span>
                                    ${r.isOfficial ? `<span class="badge-official">OFFICIAL</span>` : ''}
                                </div>
                                <div class="autocomplete-item-desc">${r.description || 'Docker container image'}</div>
                            </div>
                            <div class="autocomplete-meta">
                                <span>⭐ ${r.stars}</span>
                            </div>
                        </div>
                    `).join('');

                    hubSearchDropdown.classList.remove('hidden');

                    document.querySelectorAll('.autocomplete-item').forEach(item => {
                        item.addEventListener('click', () => {
                            inputImage.value = item.dataset.name;
                            hubSearchDropdown.classList.add('hidden');
                        });
                    });
                } catch (err) {
                    console.error("Docker Hub search error:", err);
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!inputImage.contains(e.target) && !hubSearchDropdown.contains(e.target)) {
                hubSearchDropdown.classList.add('hidden');
            }
        });
    }

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
        const btnText = document.getElementById('deployBtnText');
        const spinner = document.getElementById('deploySpinner');
        
        submitBtn.disabled = true;
        btnText.textContent = "🚀 Deploying & Pulling...";
        spinner.classList.remove('hidden');
        spinner.classList.add('spinner-sm');

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
            document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
            fetchContainers();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = "Launch Container";
            spinner.classList.add('hidden');
            spinner.classList.remove('spinner-sm');
        }
    });

    // Fetch Containers with Skeleton Loading
    async function fetchContainers() {
        containerGrid.innerHTML = `
            <div class="skeleton-card"><div class="skeleton-box" style="height:24px;width:60%;"></div><div class="skeleton-box" style="height:14px;width:80%;"></div><div class="skeleton-box" style="height:36px;"></div></div>
            <div class="skeleton-card"><div class="skeleton-box" style="height:24px;width:60%;"></div><div class="skeleton-box" style="height:14px;width:80%;"></div><div class="skeleton-box" style="height:36px;"></div></div>
        `;

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
                            <h3 class="copy-badge" data-copy="${c.name}" title="Click to copy container name"><span class="copy-badge-text">${c.name}</span> ${SVG_COPY_ICON}</h3>
                            <div><span class="copy-badge" data-copy="${c.image}" title="Click to copy image"><span class="copy-badge-text">${c.image}</span> ${SVG_COPY_ICON}</span></div>
                        </div>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>

                    <div class="card-details">
                        <div class="detail-row">
                            <span>Internal IP:</span>
                            <span class="copy-badge" data-copy="${c.internalIp || '172.18.0.x'}" title="Click to copy IP"><span class="copy-badge-text">${c.internalIp || '172.18.0.x'}</span> ${SVG_COPY_ICON}</span>
                        </div>
                        <div class="detail-row"><span>Status:</span> <span>${c.status}</span></div>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:18px;">
                        <a href="${c.url}" target="_blank" class="url-link-box" style="flex:1; margin-bottom:0; overflow:hidden;">
                            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.url}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                        <button type="button" class="btn btn-secondary btn-sm copy-badge" data-copy="${c.url}" title="Copy URL" style="padding:9px 10px;flex-shrink:0;">${SVG_COPY_ICON}</button>
                    </div>

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

        document.querySelectorAll('.power-btn').forEach(btn => {
            btn.addEventListener('click', () => handlePowerAction(btn, btn.dataset.id, btn.dataset.action));
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
    async function handlePowerAction(btn, identifier, action) {
        const originalContent = btn.innerHTML;
        btn.disabled = true;

        const actionTextMap = {
            start: "▶️ Starting...",
            stop: "⏹️ Stopping...",
            pause: "⏸️ Pausing...",
            unpause: "▶️ Resuming..."
        };

        btn.innerHTML = `<span class="spinner-sm"></span> ${actionTextMap[action] || action + 'ing...'}`;

        try {
            const res = await fetch(`/container/${identifier}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `Failed to ${action} container`);

            showToast(`Container '${identifier}' ${action}ed!`, 'success');
            await fetchContainers();
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
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
                <div class="detail-row"><span>ID:</span> <span class="copy-badge" data-copy="${c.id}"><span class="copy-badge-text">${c.id.substring(0, 12)}</span> ${SVG_COPY_ICON}</span></div>
                <div class="detail-row"><span>Image:</span> <span class="copy-badge" data-copy="${c.image}"><span class="copy-badge-text">${c.image}</span> ${SVG_COPY_ICON}</span></div>
                <div class="detail-row"><span>State:</span> <span>${c.status}</span></div>
                <div class="detail-row"><span>Internal IP:</span> <span class="copy-badge" data-copy="${c.internalIp}"><span class="copy-badge-text">${c.internalIp}</span> ${SVG_COPY_ICON}</span></div>
                <div class="detail-row"><span>Proxy URL:</span> <span class="copy-badge" data-copy="${c.url}"><span class="copy-badge-text">${c.url}</span> ${SVG_COPY_ICON}</span></div>
                <div class="detail-row"><span>Exposed Ports:</span> <span>${c.exposedPorts?.join(', ') || 'None'}</span></div>
            `;

            inspectEnvBlock.textContent = (c.env || []).join('\n') || 'No environment variables configured.';
            inspectJsonBlock.textContent = JSON.stringify(c, null, 2);

            inspectModal.classList.add('active');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Fetch Images & Render Table
    async function fetchImages() {
        imagesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading local Docker images...</td></tr>`;

        try {
            const res = await fetch('/image');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const images = data.data || [];
            if (images.length === 0) {
                imagesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No local images found.</td></tr>`;
                return;
            }

            const SVG_INSPECT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
            const SVG_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

            imagesTableBody.innerHTML = images.map(img => {
                const tag = img.repoTags[0] || img.id;
                return `
                    <tr>
                        <td><span class="copy-badge" data-copy="${tag}" title="${tag}"><strong class="copy-badge-text">${img.repoTags.join(', ')}</strong> ${SVG_COPY_ICON}</span></td>
                        <td><span class="copy-badge" data-copy="${img.id}" title="${img.id}"><code class="copy-badge-text">${img.id}</code> ${SVG_COPY_ICON}</span></td>
                        <td>${img.sizeMb}</td>
                        <td>${new Date(img.created * 1000).toLocaleDateString()}</td>
                        <td style="text-align: right; display:flex; justify-content:flex-end; gap:6px;">
                            <button class="btn btn-inspect btn-sm inspect-image-btn" data-target="${tag}">
                                ${SVG_INSPECT} Inspect A-Z
                            </button>
                            <button class="btn btn-danger btn-sm open-delete-image-btn" data-target="${tag}">
                                ${SVG_DELETE} Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            document.querySelectorAll('.inspect-image-btn').forEach(btn => {
                btn.addEventListener('click', () => inspectImageDetails(btn.dataset.target));
            });

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

    // A-Z Detailed Image Inspect
    async function inspectImageDetails(identifier) {
        try {
            const res = await fetch(`/image/inspect/${encodeURIComponent(identifier)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const img = data.data;
            inspectImageTitle.textContent = `Image Specification: ${img.repoTags[0] || img.id}`;

            inspectImageSummaryGrid.innerHTML = `
                <div class="detail-row"><span>Short ID:</span> <span class="copy-badge" data-copy="${img.id}"><span class="copy-badge-text">${img.id}</span> ${SVG_COPY_ICON}</span></div>
                <div class="detail-row"><span>Full SHA256:</span> <span class="copy-badge" data-copy="${img.fullId}"><span class="copy-badge-text">${img.fullId.substring(0,24)}...</span> ${SVG_COPY_ICON}</span></div>
                <div class="detail-row"><span>Repository Tags:</span> <span class="copy-badge" data-copy="${img.repoTags.join(', ')}"><span class="copy-badge-text">${img.repoTags.join(', ') || 'None'}</span> ${SVG_COPY_ICON}</span></div>
                <div class="detail-row"><span>Virtual Size:</span> <span>${img.sizeMb}</span></div>
                <div class="detail-row"><span>OS / Architecture:</span> <span>${img.os} / ${img.architecture}</span></div>
                <div class="detail-row"><span>Created:</span> <span>${new Date(img.created).toLocaleString()}</span></div>
                <div class="detail-row"><span>Layer Count:</span> <span>${img.layersCount} layers</span></div>
                <div class="detail-row"><span>Author / Maintainer:</span> <span>${img.author || 'N/A'}</span></div>
                <div class="detail-row"><span>Entrypoint / Cmd:</span> <span class="copy-badge" data-copy="${[...img.entrypoint, ...img.cmd].join(' ')}"><span class="copy-badge-text">${[...img.entrypoint, ...img.cmd].join(' ') || 'Default'}</span> ${SVG_COPY_ICON}</span></div>
            `;

            inspectImageEnvBlock.textContent = `EXPOSED PORTS:\n${img.exposedPorts.join('\n') || 'None'}\n\nVOLUMES:\n${img.volumes.join('\n') || 'None'}\n\nENVIRONMENT:\n${img.env.join('\n') || 'None'}`;
            inspectImageJsonBlock.textContent = JSON.stringify(img.raw, null, 2);

            inspectImageModal.classList.add('active');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Fetch Networks & Render Table
    async function fetchNetworks() {
        networksTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading Docker networks...</td></tr>`;
        try {
            const res = await fetch('/network');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const networks = data.data || [];
            if (networks.length === 0) {
                networksTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No networks found.</td></tr>`;
                return;
            }

            const SVG_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

            networksTableBody.innerHTML = networks.map(n => `
                <tr>
                    <td><span class="copy-badge" data-copy="${n.name}" title="${n.name}"><strong class="copy-badge-text">${n.name}</strong> ${SVG_COPY_ICON}</span> ${n.name === 'deploy-engine' ? `<span class="badge running">ENGINE</span>` : ''}</td>
                    <td><span class="copy-badge" data-copy="${n.id}" title="${n.id}"><code class="copy-badge-text">${n.id}</code> ${SVG_COPY_ICON}</span></td>
                    <td><span class="image-tag">${n.driver}</span></td>
                    <td><span class="copy-badge" data-copy="${n.subnet}" title="${n.subnet}"><span class="copy-badge-text">${n.subnet}</span> ${SVG_COPY_ICON}</span> / <span class="copy-badge" data-copy="${n.gateway}" title="${n.gateway}"><span class="copy-badge-text">${n.gateway}</span> ${SVG_COPY_ICON}</span></td>
                    <td>${n.scope}</td>
                    <td><strong>${n.containersCount} container(s)</strong></td>
                    <td style="text-align: right;">
                        ${['bridge', 'host', 'none', 'deploy-engine'].includes(n.name)
                            ? `<span style="font-size:11px;color:var(--text-dim);">System Protected</span>`
                            : `<button class="btn btn-danger btn-sm open-delete-network-btn" data-target="${n.id}" data-name="${n.name}">
                                ${SVG_DELETE} Delete
                               </button>`
                        }
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.open-delete-network-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    pendingDeleteNetworkTarget = btn.dataset.target;
                    deleteNetworkTargetName.textContent = btn.dataset.name;
                    deleteNetworkModal.classList.add('active');
                });
            });
        } catch (err) {
            networksTableBody.innerHTML = `<tr><td colspan="7" style="color:var(--rose);text-align:center;">Error: ${err.message}</td></tr>`;
        }
    }

    // Fetch Volumes & Render Table
    async function fetchVolumes() {
        volumesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading Docker volumes...</td></tr>`;
        try {
            const res = await fetch('/volume');
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const volumes = data.data || [];
            if (volumes.length === 0) {
                volumesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No volumes found.</td></tr>`;
                return;
            }

            const SVG_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

            volumesTableBody.innerHTML = volumes.map(v => `
                <tr>
                    <td><span class="copy-badge" data-copy="${v.name}" title="${v.name}"><strong class="copy-badge-text" style="max-width:220px;">${v.name}</strong> ${SVG_COPY_ICON}</span></td>
                    <td><span class="image-tag">${v.driver}</span></td>
                    <td><span class="copy-badge" data-copy="${v.mountpoint}" title="${v.mountpoint}"><code class="copy-badge-text" style="font-size:11px;max-width:380px;">${v.mountpoint}</code> ${SVG_COPY_ICON}</span></td>
                    <td>${v.scope}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-danger btn-sm open-delete-volume-btn" data-target="${v.name}">
                            ${SVG_DELETE} Delete
                        </button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.open-delete-volume-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    pendingDeleteVolumeTarget = btn.dataset.target;
                    deleteVolumeTargetName.textContent = pendingDeleteVolumeTarget;
                    deleteVolumeModal.classList.add('active');
                });
            });
        } catch (err) {
            volumesTableBody.innerHTML = `<tr><td colspan="5" style="color:var(--rose);text-align:center;">Error: ${err.message}</td></tr>`;
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

    // Delete Network Execution
    async function executeDeleteNetwork(identifier) {
        try {
            const res = await fetch(`/network/${encodeURIComponent(identifier)}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Network deletion failed');

            showToast(`Pruned network '${identifier}'`, 'success');
            fetchNetworks();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Delete Volume Execution
    async function executeDeleteVolume(identifier, force = true) {
        try {
            const res = await fetch(`/volume/${encodeURIComponent(identifier)}?force=${force}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Volume deletion failed');

            showToast(`Deleted storage volume '${identifier}'`, 'success');
            fetchVolumes();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Render Metrics Table
    function renderMetricsTable(containers) {
        if (!metricsTableBody) return;
        metricsTableBody.innerHTML = containers.map(c => `
            <tr>
                <td><span class="copy-badge" data-copy="${c.name}"><strong class="copy-badge-text">${c.name}</strong> ${SVG_COPY_ICON}</span></td>
                <td><span class="copy-badge" data-copy="${c.internalIp || 'N/A'}"><code class="copy-badge-text">${c.internalIp || 'N/A'}</code> ${SVG_COPY_ICON}</span></td>
                <td><span class="badge ${c.state === 'running' ? 'running' : c.state === 'paused' ? 'paused' : 'stopped'}">${c.state}</span></td>
                <td><span class="copy-badge" data-copy="${c.url}"><a href="${c.url}" target="_blank" style="color:var(--primary);">${c.url}</a> ${SVG_COPY_ICON}</span></td>
            </tr>
        `).join('');
    }

    // Tab Switcher inside Inspect Modals
    document.querySelectorAll('.inspect-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.inspect-body');
            parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));

            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.classList.remove('hidden');
        });
    });

    // Toast Notification Utility
    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
    }
});
