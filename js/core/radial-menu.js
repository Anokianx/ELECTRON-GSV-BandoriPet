        const APP_VERSION = "2.1.3"; //这里是用来通知更新的地方，请勿乱改。——千早26.5.15

        function initUpdateNotice() {
            if (localStorage.getItem('last_version') !== APP_VERSION) {
                document.getElementById('notice-text').innerHTML = `
                    <b>居中轮盘菜单：</b> 快捷键一键唤出。<br>
                    <b>自定义：</b> 支持自定义唤出键，支持长按/单击模式切换，默认支持鼠标中键。<br>
                    <b>提示：</b> 如果你在其他窗口，自动降级为单击唤出模式。<br>
                `;
                document.getElementById('update-notice').style.display = 'flex';
            }
        }

        function confirmUpdate() {
            localStorage.setItem('last_version', APP_VERSION);
            document.getElementById('update-notice').style.display = 'none';
        }

        const radialOptions = [
            { 
                name: '物理道具', 
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16.5C21 16.88 20.79 17.21 20.47 17.38L12.57 21.82C12.41 21.94 12.21 22 12 22C11.79 22 11.59 21.94 11.43 21.82L3.53 17.38C3.21 17.21 3 16.88 3 16.5V7.5C3 7.12 3.21 6.79 3.53 6.62L11.43 2.18C11.59 2.06 11.79 2 12 2C12.21 2 12.41 2.06 12.57 2.18L20.47 6.62C20.79 6.79 21 7.12 21 7.5V16.5ZM12 4.15L5.6 7.5L12 10.85L18.4 7.5L12 4.15ZM4.5 8.79V15.87L11.25 19.67V12.59L4.5 8.79ZM19.5 15.87V8.79L12.75 12.59V19.67L19.5 15.87Z"/></svg>`, 
                targetId: 'btn-physics-toggle' 
            },
            { 
                name: '群聊', 
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21.543 10.457c0-4.348-4.275-7.886-9.543-7.886-5.264 0-9.543 3.538-9.543 7.886 0 3.901 3.447 7.168 8.106 7.788.315.068.745.209.855.479.098.244.065.629.032.877l-.138.83c-.042.245-.195.958.84.417 1.036-.436 5.586-3.287 7.621-5.629 1.405-1.541 2.078-3.327 2.078-4.762z"/></svg>`, 
                targetId: 'group-chat-btn' 
            },
            { 
                name: '角色切换', 
                icon: `<img src="avatar.png" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; pointer-events: none;">`, 
                targetId: 'char-switch-btn' 
            },
            { 
                name: '控制台', 
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`, 
                targetId: 'settings-btn' 
            }
        ];

        function buildRadialMenu() {
            const box = document.getElementById('radial-items-box');
            const r = 95; 
            radialOptions.forEach((opt, i) => {
                const angle = (i * (360 / radialOptions.length) - 90) * (Math.PI / 180);
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                
                const item = document.createElement('div');
                item.style.cssText = `position:absolute; top:50%; left:50%; width:54px; height:54px; margin:-27px; background:rgba(0,0,0,0.6); border-radius:50%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; cursor:pointer; transform:translate(${x}px, ${y}px); border:1px solid rgba(255,255,255,0.3); transition:0.2s;`;
                item.innerHTML = `
                    <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 3px;">${opt.icon}</div>
                    <span style="font-size:10px;">${opt.name}</span>
                `;                
                item.onclick = () => {
                    const realBtn = document.getElementById(opt.targetId);
                    if (realBtn) realBtn.click();
                    setRadialVisible(false); 
                };
                item.onmouseover = () => item.style.background = '#ff4757';
                item.onmouseout = () => item.style.background = 'rgba(0,0,0,0.6)';
                box.appendChild(item);
            });
        }

        function toggleFloatingControls() {
            const panel = document.getElementById('floating-controls');
            if (panel) {
                panel.style.display = (panel.style.display === 'none') ? '' : 'none';
            }
            setRadialVisible(false);
        }

        let radialVisible = false;
        let radialKey = localStorage.getItem('radial_key') || '`'; 
        let radialMode = localStorage.getItem('radial_mode') || 'click';
        ipcRenderer.send('register-radial-shortcut', radialKey);

        function setRadialVisible(show) {
            radialVisible = show;
            const menu = document.getElementById('radial-menu');
            menu.style.opacity = show ? '1' : '0';
            menu.style.pointerEvents = show ? 'auto' : 'none';
            menu.style.transform = `translate(-50%, -50%) scale(${show ? 1 : 0.7})`;
        }

        window.addEventListener('mousedown', (e) => {
            if (e.button === 1) { 
                e.preventDefault();
                if (radialMode === 'click') setRadialVisible(!radialVisible);
                else if (!radialVisible) setRadialVisible(true);
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 1 && radialMode === 'hold') setRadialVisible(false);
        });

        setTimeout(() => {
            const modeSelect = document.getElementById('radial-mode-select');
            const keyBtn = document.getElementById('set-radial-key');
            if(modeSelect && keyBtn) {
                modeSelect.value = radialMode;
                modeSelect.onchange = (e) => {
                    radialMode = e.target.value;
                    localStorage.setItem('radial_mode', radialMode);
                };
                
                keyBtn.innerText = `按键: [ ${radialKey.toUpperCase()} ]`;
                keyBtn.onclick = function() {
                    this.innerText = "请按下键盘任意键...";
                    const listen = (e) => {
                        e.preventDefault(); 
                        radialKey = e.key;
                        localStorage.setItem('radial_key', radialKey);
                        this.innerText = `按键: [ ${e.key.toUpperCase()} ]`;
                        ipcRenderer.send('register-radial-shortcut', radialKey);
                        window.removeEventListener('keydown', listen);
                    };
                    window.addEventListener('keydown', listen);
                };
            }
        }, 500);
        buildRadialMenu();

        window.lastGlobalTrigger = 0; 
        ipcRenderer.on('trigger-global-radial', () => {
            const now = Date.now();
            if (now - window.lastGlobalTrigger < 300) return;
            window.lastGlobalTrigger = now;

            setRadialVisible(!radialVisible);
        });

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.repeat) return; 
            if (e.key.toLowerCase() === radialKey.toLowerCase()) {
                if (radialMode === 'click') {
                    setRadialVisible(!radialVisible);
                } else {
                    if (!radialVisible) setRadialVisible(true);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (radialMode === 'hold' && e.key.toLowerCase() === radialKey.toLowerCase()) {
                setRadialVisible(false);
            }
        });

