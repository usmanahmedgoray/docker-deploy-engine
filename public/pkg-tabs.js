/**
 * NexaDock — Reusable Package Manager Tabs Utility
 * ─────────────────────────────────────────────────
 * Usage: Call PkgTabs.render(container, commands) anywhere in the app.
 *
 *   PkgTabs.render('#my-container', {
 *     npm:  'npm install',
 *     pnpm: 'pnpm install',
 *     yarn: 'yarn install',
 *     bun:  'bun install',
 *   });
 *
 * Or use the declarative HTML API:
 *   <div class="pkg-tabs"
 *        data-npm="npm install"
 *        data-pnpm="pnpm install"
 *        data-yarn="yarn install"
 *        data-bun="bun install">
 *   </div>
 *
 * ─── Singleton preference ─────────────────────────────
 * The last active tab is persisted to localStorage so the
 * user's choice is remembered across all pages.
 */

(function (global) {
    'use strict';

    const STORAGE_KEY = 'nexadock_pkg_manager';
    const MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];

    // ── Icons per manager ──────────────────────────────────────
    const ICONS = {
        npm:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0zm6.672 17.996h4.003V9.33H6.672v8.666zM14.675 6.004H6.003v15.994h8.672v-4H18.67V6.004h-3.995z"/></svg>',
        pnpm: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0v7.5h7.5V0zm8.25 0v7.5h7.5V0zm8.25 0v7.5H24V0zM8.25 8.25v7.5h7.5v-7.5zm8.25 0v7.5H24v-7.5zM0 16.5V24h7.5v-7.5zm8.25 0V24h7.5v-7.5zm8.25 0V24H24v-7.5z"/></svg>',
        yarn: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 6.628 5.374 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12zm.885 17.908c-.459.187-.871.281-1.248.281-.646 0-1.124-.305-1.124-.938V9.717l-1.32.469v6.942c0 1.172.879 1.875 2.256 1.875.469 0 .997-.105 1.577-.316l1.225-.445-.598-1.64-.768.306zm2.25-8.22c-.305 0-.621.058-.961.187l-2.554.95-.598-1.64 2.554-.95c.446-.176.892-.258 1.336-.258 1.23 0 2.002.784 2.002 2.04 0 .516-.14 1.066-.422 1.652l-1.219 2.544h2.074l.785-1.64c.129-.27.199-.539.199-.785 0-.352-.152-.68-.457-.891-.281-.199-.598-.293-.739-.293v-.916z"/></svg>',
        bun:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6c-5.302 0-9.6-4.298-9.6-9.6S6.698 2.4 12 2.4 21.6 6.698 21.6 12 17.302 21.6 12 21.6zm-1.2-14.4a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm4.8 1.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
    };

    // ── Inject shared CSS once ─────────────────────────────────
    function injectStyles() {
        if (document.getElementById('nexadock-pkg-tabs-css')) return;
        const style = document.createElement('style');
        style.id = 'nexadock-pkg-tabs-css';
        style.textContent = `
            .pkg-tabs-wrapper {
                background: #0b0e1c;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                overflow: hidden;
                margin: 16px 0;
                font-family: 'Fira Code', 'JetBrains Mono', monospace;
            }

            .pkg-tabs-header {
                display: flex;
                align-items: stretch;
                background: #080b15;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                gap: 0;
                padding: 0 4px;
            }

            .pkg-tab-btn {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                padding: 9px 16px;
                font-size: 12.5px;
                font-weight: 600;
                color: #6b7694;
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                cursor: pointer;
                transition: all 0.15s;
                font-family: 'Inter', system-ui, sans-serif;
                position: relative;
                top: 1px;
                white-space: nowrap;
            }

            .pkg-tab-btn:hover { color: #c4cde8; }

            .pkg-tab-btn.active {
                color: #6366f1;
                border-bottom-color: #6366f1;
            }

            .pkg-tabs-body {
                position: relative;
                padding: 0;
            }

            .pkg-tab-panel {
                display: none;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 14px 16px;
            }

            .pkg-tab-panel.active { display: flex; }

            .pkg-tab-code {
                color: #67e8f9;
                font-size: 13.5px;
                font-family: 'Fira Code', 'JetBrains Mono', monospace;
                overflow-x: auto;
                white-space: pre;
                flex: 1;
                line-height: 1.5;
            }

            .pkg-copy-btn {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: rgba(99,102,241,0.1);
                border: 1px solid rgba(99,102,241,0.2);
                color: #a5b4fc;
                padding: 5px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.18s;
                flex-shrink: 0;
                white-space: nowrap;
                font-family: 'Inter', system-ui, sans-serif;
            }

            .pkg-copy-btn:hover { background: #6366f1; color: #fff; border-color: #6366f1; }
            .pkg-copy-btn.copied { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #34d399; }

            .pkg-tabs-wrapper .pkg-lang-badge {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #4a5568;
                padding: 2px 6px;
                border-right: 1px solid rgba(255,255,255,0.07);
                margin-right: 10px;
                flex-shrink: 0;
                font-family: 'Inter', sans-serif;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Get saved preference ───────────────────────────────────
    function getSavedManager() {
        try { return localStorage.getItem(STORAGE_KEY) || 'bun'; }
        catch { return 'bun'; }
    }

    function saveManager(mgr) {
        try { localStorage.setItem(STORAGE_KEY, mgr); } catch {}
    }

    // ── Build one tabs widget HTML ─────────────────────────────
    function buildWidget(commands) {
        const saved = getSavedManager();
        const available = MANAGERS.filter(m => commands[m]);
        const active = available.includes(saved) ? saved : available[0];

        const tabs = available.map(m => `
            <button class="pkg-tab-btn ${m === active ? 'active' : ''}"
                    data-manager="${m}" type="button">
                ${ICONS[m] || ''}
                ${m}
            </button>
        `).join('');

        const panels = available.map(m => `
            <div class="pkg-tab-panel ${m === active ? 'active' : ''}"
                 data-panel="${m}">
                <span class="pkg-lang-badge">bash</span>
                <span class="pkg-tab-code">${escapeHtml(commands[m])}</span>
                <button class="pkg-copy-btn" type="button"
                        data-copy="${escapeHtml(commands[m])}">
                    📋 Copy
                </button>
            </div>
        `).join('');

        return `
            <div class="pkg-tabs-wrapper">
                <div class="pkg-tabs-header">${tabs}</div>
                <div class="pkg-tabs-body">${panels}</div>
            </div>
        `;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Wire up events on a widget ─────────────────────────────
    function bindEvents(wrapper) {
        wrapper.addEventListener('click', (e) => {
            // Tab switching
            const tabBtn = e.target.closest('.pkg-tab-btn');
            if (tabBtn) {
                const mgr = tabBtn.dataset.manager;
                // Update buttons
                wrapper.querySelectorAll('.pkg-tab-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                // Update panels
                wrapper.querySelectorAll('.pkg-tab-panel').forEach(p => p.classList.remove('active'));
                const panel = wrapper.querySelector(`.pkg-tab-panel[data-panel="${mgr}"]`);
                if (panel) panel.classList.add('active');
                saveManager(mgr);
                // Sync all other widgets on page
                syncAll(mgr);
                return;
            }

            // Copy button
            const copyBtn = e.target.closest('.pkg-copy-btn');
            if (copyBtn) {
                const text = copyBtn.dataset.copy;
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.textContent = '✓ Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = '📋 Copy';
                        copyBtn.classList.remove('copied');
                    }, 1800);
                }).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                });
            }
        });
    }

    // ── Sync all widgets to the same manager ──────────────────
    function syncAll(mgr) {
        document.querySelectorAll('.pkg-tabs-wrapper').forEach(wrapper => {
            const tabBtn = wrapper.querySelector(`.pkg-tab-btn[data-manager="${mgr}"]`);
            if (!tabBtn) return; // this widget doesn't have that manager
            wrapper.querySelectorAll('.pkg-tab-btn').forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
            wrapper.querySelectorAll('.pkg-tab-panel').forEach(p => p.classList.remove('active'));
            const panel = wrapper.querySelector(`.pkg-tab-panel[data-panel="${mgr}"]`);
            if (panel) panel.classList.add('active');
        });
    }

    // ── Public API ─────────────────────────────────────────────

    /**
     * Programmatic render into a selector or element.
     * @param {string|HTMLElement} target - CSS selector or DOM element
     * @param {Object} commands - { npm, pnpm, yarn, bun } (any subset)
     */
    function render(target, commands) {
        injectStyles();
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) { console.warn('[PkgTabs] Target not found:', target); return; }
        el.innerHTML = buildWidget(commands);
        bindEvents(el.querySelector('.pkg-tabs-wrapper'));
    }

    /**
     * Auto-initialise all [class="pkg-tabs"][data-npm|pnpm|yarn|bun] elements.
     * Call this once after DOM is ready.
     */
    function init() {
        injectStyles();
        document.querySelectorAll('.pkg-tabs[data-npm], .pkg-tabs[data-pnpm], .pkg-tabs[data-yarn], .pkg-tabs[data-bun]').forEach(el => {
            const commands = {};
            MANAGERS.forEach(m => { if (el.dataset[m]) commands[m] = el.dataset[m]; });
            el.innerHTML = buildWidget(commands);
            bindEvents(el.querySelector('.pkg-tabs-wrapper'));
        });
    }

    /**
     * Shorthand helper — single-command that maps to all four managers
     * with correct equivalent commands. Useful for common operations.
     *
     * @param {string|HTMLElement} target
     * @param {'install'|'run'|'add'|'dev'|'build'|'test'} op
     * @param {string} [arg] - e.g. 'express' for 'add' op, or 'dev' for 'run'
     */
    function quick(target, op, arg) {
        const cmds = {
            install: {
                npm: 'npm install',
                pnpm: 'pnpm install',
                yarn: 'yarn install',
                bun: 'bun install',
            },
            dev: {
                npm: 'npm run dev',
                pnpm: 'pnpm dev',
                yarn: 'yarn dev',
                bun: 'bun run dev',
            },
            build: {
                npm: 'npm run build',
                pnpm: 'pnpm build',
                yarn: 'yarn build',
                bun: 'bun run build',
            },
            test: {
                npm: 'npm test',
                pnpm: 'pnpm test',
                yarn: 'yarn test',
                bun: 'bun test',
            },
            start: {
                npm: 'npm start',
                pnpm: 'pnpm start',
                yarn: 'yarn start',
                bun: 'bun start',
            },
            add: arg ? {
                npm: `npm install ${arg}`,
                pnpm: `pnpm add ${arg}`,
                yarn: `yarn add ${arg}`,
                bun: `bun add ${arg}`,
            } : null,
            run: arg ? {
                npm: `npm run ${arg}`,
                pnpm: `pnpm ${arg}`,
                yarn: `yarn ${arg}`,
                bun: `bun run ${arg}`,
            } : null,
        };
        const commands = cmds[op];
        if (!commands) { console.warn('[PkgTabs] Unknown operation:', op); return; }
        render(target, commands);
    }

    // ── Expose globally ───────────────────────────────────────
    global.PkgTabs = { render, init, quick, syncAll };

}(window));
