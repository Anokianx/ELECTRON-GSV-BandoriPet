        let globalVolume = parseFloat(localStorage.getItem('anon_volume')) || 1.0;
        function updateVolume(val) {
            globalVolume = parseFloat(val);
            document.getElementById('volume-val').innerText = Math.round(globalVolume * 100) + '%';
            localStorage.setItem('anon_volume', globalVolume);
            if (currentVoice) {
                currentVoice.volume = globalVolume;
            }
        }

        let chatMemory = []; 
        const MAX_HISTORY = 20; 

        const { ipcRenderer } = require('electron');
        let trayStates = { btn: true, char: true, widgets: true, uiHidden: false };

        ipcRenderer.on('tray-action', (event, action) => {
            const controls = document.getElementById('floating-controls');
            const canvas = document.getElementById('canvas');
            const infoWidget = document.getElementById('info-widget');
            const visWidget = document.getElementById('vis-widget');
            const phone = document.getElementById('smartphone-ui');
            const ipad = document.getElementById('group-chat-menu');
            const titleBar = document.getElementById('title-bar');

            if (action === 'toggle-btn') {
                trayStates.btn = !trayStates.btn;
                controls.style.display = trayStates.btn ? 'flex' : 'none';
            }
            else if (action === 'toggle-char') {
                trayStates.char = !trayStates.char;
                canvas.style.visibility = trayStates.char ? 'visible' : 'hidden';
            }
            else if (action === 'toggle-widgets') {
                trayStates.widgets = !trayStates.widgets;
                const vis = trayStates.widgets ? 'visible' : 'hidden';
                if(infoWidget) infoWidget.style.visibility = vis;
                if(visWidget) visWidget.style.visibility = vis;
                if(phone) phone.style.visibility = vis;
                if(ipad) ipad.style.visibility = vis;
            }
            else if (action === 'toggle-ui-only') {
                trayStates.uiHidden = !trayStates.uiHidden;
                const flexDisp = trayStates.uiHidden ? 'none' : 'flex';
                const vis = trayStates.uiHidden ? 'hidden' : 'visible';

                if(controls) controls.style.display = flexDisp;
                if(titleBar) titleBar.style.display = flexDisp;
                if(infoWidget) infoWidget.style.visibility = vis;
                if(visWidget) visWidget.style.visibility = vis;
                if(phone) phone.style.visibility = vis;
                if(ipad) ipad.style.visibility = vis;
            }
        });
        
        const fs = require('fs');     
        const path = require('path'); 
        function minWindow() { ipcRenderer.send('window-min'); }
        function maxWindow() { ipcRenderer.send('window-max'); }
        function closeWindow() { ipcRenderer.send('window-close'); }

        const app = new PIXI.Application({
            view: document.getElementById('canvas'), autoStart: true, resizeTo: window, backgroundAlpha: 0
        });


        let live2dModel = null; 

                let currentLive2dMotionNames = new Set();
        let currentLive2dExpressionNames = new Set();
        let currentLive2dMotionList = [];
        let currentLive2dExpressionList = [];
        let voiceEmotionTimers = [];
        let lastLive2DClickAt = 0;
        let lastLive2DClickMotionName = '';
        let lastLive2DClickExpressionName = '';

        let initChar = localStorage.getItem('current_char');
        if (!charactersConfig[initChar]) {
            initChar = Object.keys(charactersConfig)[0]; 
        }
        let initOutfit = localStorage.getItem(`outfit_${initChar}`);
        if (!charactersConfig[initChar].outfits[initOutfit]) {
            initOutfit = Object.keys(charactersConfig[initChar].outfits)[0];
        }
        
        loadCustomModel(initChar, initOutfit);
        ipcRenderer.send('switch-character', initChar);

        function updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('clock-time').innerText = `${hours}:${minutes}:${seconds}`;
            if(document.getElementById('phone-time')) {
                document.getElementById('phone-time').innerText = `${hours}:${minutes}`;
            }
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const date = now.getDate();
            const days = ['日', '一', '二', '三', '四', '五', '六'];
            const day = days[now.getDay()];
            document.getElementById('clock-date').innerText = `${year}年${month}月${date}日 星期${day}`;
            const greeting = document.getElementById('greeting-text');
            const charId = localStorage.getItem('current_char') || 'anon';
            const charName = charactersConfig[charId] ? charactersConfig[charId].name : "大家";
            if (hours >= 5 && hours < 11) greeting.innerText = `早上好，今天也要和${charName}一起加油哦！`;
            else if (hours >= 11 && hours < 14) greeting.innerText = `午休时间，要和${charName}一起吃点什么吗？`;
            else if (hours >= 14 && hours < 19) greeting.innerText = `下午好，继续保持专注！`;
            else if (hours >= 19 && hours < 23) greeting.innerText = `晚上好，辛苦一天啦。`;
            else greeting.innerText = `夜深了，${charName}提醒你早点休息哦。`;
        }

        setInterval(updateClock, 1000); 
        updateClock(); 
        const widget = document.getElementById('info-widget');
        let isDragging = false, startX, startY, initialLeft, initialTop;
        widget.style.left = localStorage.getItem('widget_x') || '20px';
        widget.style.top = localStorage.getItem('widget_y') || '55px';
        widget.addEventListener('mousedown', (e) => {
            if (document.getElementById('lock-widget').checked) return; 
            isDragging = true;
            startX = e.clientX; 
            startY = e.clientY;
            initialLeft = parseInt(window.getComputedStyle(widget).left) || 0;
            initialTop = parseInt(window.getComputedStyle(widget).top) || 0;
            widget.style.border = "1px solid #ff6b81"; 
            widget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.2)";
        });
        document.addEventListener('mousemove', (e) => {
            
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            widget.style.left = `${initialLeft + dx}px`;
            widget.style.top = `${initialTop + dy}px`;
        });
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            widget.style.border = "1px solid rgba(255, 255, 255, 0.4)";
            widget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.1)";
            localStorage.setItem('widget_x', widget.style.left);
            localStorage.setItem('widget_y', widget.style.top);
        });

        function toggleWidgetLock() {
            const isLocked = document.getElementById('lock-widget').checked;
            localStorage.setItem('widget_locked', isLocked);
            if (isLocked) {
                widget.classList.add('locked');
            } else {
                widget.classList.remove('locked');
            }
        }
        function toggleInfoWidget() {
            const show = document.getElementById('show-info-widget').checked;
            localStorage.setItem('show_info_widget', show);
            document.getElementById('info-widget').style.display = show ? 'block' : 'none';
        }

        const showWidgetSaved = localStorage.getItem('show_info_widget') !== 'false'; 
        document.getElementById('show-info-widget').checked = showWidgetSaved;
        document.getElementById('info-widget').style.display = showWidgetSaved ? 'block' : 'none';

        async function fetchWeather() {
            const weatherEl = document.getElementById('weather-text');
            try {
                const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
                
                if (!ipRes.ok) throw new Error("IP请求失败");
                const ipData = await ipRes.json();
                
                const latitude = ipData.latitude; 
                const longitude = ipData.longitude;
                const city = ipData.city || ipData.country || "未知位置";
                
                if (!latitude || !longitude) { 
                    weatherEl.innerText = "IP经纬度解析失败";
                    return;
                }
                
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`);
                const weatherData = await weatherRes.json();
                
                const temp = weatherData.current.temperature_2m;
                const humidity = weatherData.current.relative_humidity_2m;
                const wind = weatherData.current.wind_speed_10m;
                const code = weatherData.current.weather_code;
                
                const svgStart = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px; flex-shrink: 0;">`;
                const svgEnd = `</svg>`;
                
                let desc = "未知";
                let svgIcon = "";

                if (code === 0) {
                    desc = "晴朗";
                    svgIcon = `${svgStart}<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>${svgEnd}`;
                }
                else if (code === 1 || code === 2 || code === 3) {
                    desc = code === 3 ? "阴天" : "多云";
                    svgIcon = `${svgStart}<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>${svgEnd}`;
                }
                else if (code === 45 || code === 48) {
                    desc = "有雾";
                    svgIcon = `${svgStart}<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path><line x1="8" y1="23" x2="16" y2="23"></line><line x1="6" y1="20" x2="18" y2="20"></line>${svgEnd}`;
                }
                else if (code >= 51 && code <= 67) {
                    desc = (code === 65 || code === 67) ? "大雨" : "降雨";
                    svgIcon = `${svgStart}<path d="M16 13v8"></path><path d="M8 13v8"></path><path d="M12 15v8"></path><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>${svgEnd}`;
                }
                else if (code >= 71 && code <= 86) {
                    desc = "降雪";
                    svgIcon = `${svgStart}<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="8" y1="20" x2="8.01" y2="20"></line><line x1="12" y1="18" x2="12.01" y2="18"></line><line x1="12" y1="22" x2="12.01" y2="22"></line><line x1="16" y1="16" x2="16.01" y2="16"></line><line x1="16" y1="20" x2="16.01" y2="20"></line>${svgEnd}`;
                }
                else if (code >= 95) {
                    desc = "雷暴";
                    svgIcon = `${svgStart}<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline>${svgEnd}`;
                }

                weatherEl.innerHTML = `<span style="display: flex; align-items: center; justify-content: center;">${city} <span style="margin: 0 6px; opacity: 0.5;">|</span> ${svgIcon} ${desc} <span style="margin: 0 6px; opacity: 0.5;">|</span> ${temp}°C <span style="margin: 0 6px; opacity: 0.5;">|</span> 湿度 ${humidity}% <span style="margin: 0 6px; opacity: 0.5;">|</span> 风速 ${wind}km/h</span>`;
                
            } catch (error) {
                console.error("天气获取失败:", error);
                weatherEl.innerText = "网络异常，请检查连接";
            }
        }

        fetchWeather();
        setInterval(fetchWeather, 3600000);

        function applyWidgetColors() {
            const tColor = document.getElementById('c-time').value;
            const dColor = document.getElementById('c-date').value;
            const gColor = document.getElementById('c-greeting').value;
            const wColor = document.getElementById('c-weather').value;

            document.getElementById('clock-time').style.color = tColor;
            document.getElementById('clock-date').style.color = dColor;
            document.getElementById('greeting-text').style.color = gColor;
            if(document.getElementById('weather-text')) {
                document.getElementById('weather-text').style.color = wColor;
            }
            localStorage.setItem('c_time', tColor);
            localStorage.setItem('c_date', dColor);
            localStorage.setItem('c_greeting', gColor);
            localStorage.setItem('c_weather', wColor);
        }

        function initWidgetColors() {
            const tColor = localStorage.getItem('c_time') || '#ff6b81';
            const dColor = localStorage.getItem('c_date') || '#555555';
            const gColor = localStorage.getItem('c_greeting') || '#777777';
            const wColor = localStorage.getItem('c_weather') || '#5aa1e3';
            document.getElementById('clock-time').style.color = tColor;
            document.getElementById('clock-date').style.color = dColor;
            document.getElementById('greeting-text').style.color = gColor;
            if(document.getElementById('weather-text')) {
                document.getElementById('weather-text').style.color = wColor;
            }
        }

        initWidgetColors(); 

        const configPath = path.join(__dirname, 'hw_config.json');
        function initGPUStatus() {
            let useGPU = true; 
            try {
                if (fs.existsSync(configPath)) {
                    useGPU = JSON.parse(fs.readFileSync(configPath)).useGPU !== false;
                }
            } catch(e){}
            document.getElementById('hw-accel').checked = useGPU;
        }

        initGPUStatus();
        function toggleGPU() {
            const useGPU = document.getElementById('hw-accel').checked;
            try {
                fs.writeFileSync(configPath, JSON.stringify({ useGPU: useGPU }));
                addChatMessage("GPU 设置已保存，彻底退出桌宠后重新启动生效哦~", 'ai');
            } catch(e){
                console.error("保存GPU设置失败", e);
            }
        }
        function initDisplaySettings() {
            document.getElementById('s-fps').value = localStorage.getItem('disp_fps') || '60';
            document.getElementById('s-autostart').checked = localStorage.getItem('disp_autostart') === 'true';
            applyFPS();
            toggleAutoStart(true); 
        }

        
        function applyFPS() {
            const fps = parseInt(document.getElementById('s-fps').value);
            localStorage.setItem('disp_fps', fps);
            if (fps === 0) {
                app.ticker.maxFPS = 0; 
            } else {
                app.ticker.maxFPS = fps;
            }
        }

        function toggleAutoStart(isInit = false) {
            const enable = document.getElementById('s-autostart').checked;
            localStorage.setItem('disp_autostart', enable);
            ipcRenderer.send('set-auto-start', enable);
            if (!isInit) {
                addChatMessage(enable ? "已开启开机自启！" : "已关闭开机自启！", 'ai');
            }
        }

        setTimeout(initDisplaySettings, 500);
        const appBg = document.getElementById('app-background');
        const bgInput = document.getElementById('bg-file-input');
        const bgDisplay = document.getElementById('bg-path-display');

        function applyCustomBg(path) {
            if (appBg) appBg.style.backgroundImage = `url('${path}')`;
            if (bgDisplay) {
                const filename = path.substring(path.lastIndexOf('/') + 1);
                bgDisplay.innerText = decodeURI(filename); 
            }
        }


        if (bgInput) {
            bgInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const bgPath = "file:///" + file.path.replace(/\\/g, '/');
                localStorage.setItem('custom_background', bgPath); 
                applyCustomBg(bgPath); 
            });
        }


        function clearBackground() {
            localStorage.removeItem('custom_background');
            if (appBg) appBg.style.backgroundImage = '';
            if (bgDisplay) bgDisplay.innerText = "无";
        }


        const savedCustomBg = localStorage.getItem('custom_background');
        if (savedCustomBg) {
            applyCustomBg(savedCustomBg);
        }

        const smartphoneUI = document.getElementById('smartphone-ui');
        const phoneHeader = document.getElementById('phone-header');
        let isPhoneDragging = false, pStartX, pStartY, pInitLeft, pInitTop;
        smartphoneUI.style.left = localStorage.getItem('phone_x') || '40px';
        smartphoneUI.style.top = localStorage.getItem('phone_y') || '50px';
        smartphoneUI.style.width = (localStorage.getItem('phone_w') || 320) + 'px';
        smartphoneUI.style.height = (localStorage.getItem('phone_h') || 500) + 'px';
        smartphoneUI.style.transform = `scale(${localStorage.getItem('phone_scale') || 1.0})`;

        function updatePhoneBackground(charId) {
            const charName = charactersConfig[charId] ? charactersConfig[charId].name : "MyGO!!!!!";
            document.getElementById('phone-title').innerText = charName;
            let bgFileName = 'character.jpg';
            try {
                if (typeof fs !== 'undefined' && typeof path !== 'undefined') {
                    if (fs.existsSync(path.join(__dirname, 'model', charId, 'character.png'))) {
                        bgFileName = 'character.png';
                    }
                }
            } catch(e) {}
            smartphoneUI.style.backgroundImage = `url('model/${charId}/${bgFileName}'), linear-gradient(135deg, #ffb6c1 0%, #87ceeb 100%)`;
        }

        updatePhoneBackground(localStorage.getItem('current_char') || 'anon');
        phoneHeader.addEventListener('mousedown', (e) => {
            if (document.getElementById('lock-widget').checked) return; 
            isPhoneDragging = true;
            pStartX = e.clientX; pStartY = e.clientY;
            pInitLeft = parseInt(window.getComputedStyle(smartphoneUI).left) || 0;
            pInitTop = parseInt(window.getComputedStyle(smartphoneUI).top) || 0;
            smartphoneUI.style.boxShadow = "0 25px 50px rgba(0, 0, 0, 0.3), inset 0 0 0 2px #555";
        });
        document.addEventListener('mousemove', (e) => {
            if (!isPhoneDragging) return;
            smartphoneUI.style.left = `${pInitLeft + (e.clientX - pStartX)}px`;
            smartphoneUI.style.top = `${pInitTop + (e.clientY - pStartY)}px`;
        });
        document.addEventListener('mouseup', () => {
            if (!isPhoneDragging) return;
            isPhoneDragging = false;
            smartphoneUI.style.boxShadow = "0 15px 35px rgba(0,0,0,0.2), inset 0 0 0 2px #555";
            localStorage.setItem('phone_x', smartphoneUI.style.left);
            localStorage.setItem('phone_y', smartphoneUI.style.top);
        });

        window.addEventListener('resize', () => {
            if (document.getElementById('bg-mode') && document.getElementById('bg-mode').value === 'particles') initParticles();
        });
        window.addEventListener('resize', () => {
            if (document.getElementById('bg-mode').value === 'particles') initParticles();
        });

        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                if (splash) {
                    splash.style.opacity = '0';
                    splash.style.pointerEvents = 'none';
                    setTimeout(() => {
                        splash.remove();
                        initUpdateNotice();
                    }, 1000);                
                }

                const uiIds = ['title-bar', 'canvas', 'vis-widget', 'info-widget', 'smartphone-ui', 'floating-controls', 'app-background', 'bg-text-layer'];
                uiIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        const oldTrans = window.getComputedStyle(el).transition;
                        el.style.transition = (oldTrans && oldTrans !== 'all 0s ease 0s') 
                            ? oldTrans + ', opacity 1.5s ease-in-out' 
                            : 'opacity 1.5s ease-in-out';
                        
                        el.style.opacity = '1'; 
                    }
                });
            }, 6500); 
        });

        let lastIgnoreState = false;

        window.addEventListener('DOMContentLoaded', () => {
            const ptSaved = localStorage.getItem('s_passthrough');
            if (ptSaved !== null) {
                document.getElementById('s-passthrough').checked = ptSaved === 'true';
            }
        });
        document.addEventListener('mousemove', (e) => {
            const enablePassthrough = document.getElementById('s-passthrough') && document.getElementById('s-passthrough').checked;
            if (!enablePassthrough) {
                if (lastIgnoreState !== false) {
                    lastIgnoreState = false;
                    ipcRenderer.send('set-ignore-mouse', false);
                }
                return; 
            }
    
            let shouldIgnore = true;

            if ((typeof isVisDragging !== 'undefined' && isVisDragging) || 
                (typeof isSetDragging !== 'undefined' && isSetDragging) || 
                (typeof isDragging !== 'undefined' && isDragging) || 
                (typeof isMusicDragging !== 'undefined' && isMusicDragging) || 
                (typeof isPhoneDragging !== 'undefined' && isPhoneDragging) || 
                (typeof isLyricDragging !== 'undefined' && isLyricDragging) ||
                (typeof isTxtDragging !== 'undefined' && isTxtDragging) ||
                (typeof isIpadDragging !== 'undefined' && isIpadDragging) ||
                (typeof draggingModel !== 'undefined' && draggingModel)) {
                shouldIgnore = false;
            }

           const transparentBgIds = ['canvas', 'app-background', 'bg-layer-gradient', 'bg-layer-pattern', 'bg-layer-lines', 'particle-canvas', 'bg-text-layer'];
            
            if (shouldIgnore && e.target && e.target.tagName !== 'HTML' && e.target.tagName !== 'BODY') {
                if (!e.target.id || !transparentBgIds.includes(e.target.id)) {
                    shouldIgnore = false; 
                }
            }

            if (shouldIgnore && live2dModel) {
                const bounds = live2dModel.getBounds();
                const padding = 20; 
                if (e.clientX >= (bounds.x - padding) && e.clientX <= (bounds.x + bounds.width + padding) &&
                    e.clientY >= (bounds.y - padding) && e.clientY <= (bounds.y + bounds.height + padding)) {
                    shouldIgnore = false; 
                }
            }

            if (lastIgnoreState !== shouldIgnore) {
                lastIgnoreState = shouldIgnore;
                ipcRenderer.send('set-ignore-mouse', shouldIgnore);
            }
        });

        function toggleTitleBar() {
            const hide = document.getElementById('hide-titlebar').checked;
            const titleBar = document.getElementById('title-bar');
            if (hide) {
                titleBar.style.display = 'none';
                addChatMessage("顶栏已隐藏，想移动主窗口请先取消隐藏哦~", 'ai');
            } else {
                titleBar.style.display = 'flex'; 
            }
            localStorage.setItem('hide_titlebar', hide);
        }

        window.addEventListener('DOMContentLoaded', () => {
            const hideSaved = localStorage.getItem('hide_titlebar') === 'true';
            document.getElementById('hide-titlebar').checked = hideSaved;
            if (hideSaved) {
                document.getElementById('title-bar').style.display = 'none';
            }
        });
        function toggleAlwaysOnTop(isInit = false) {
            const isTop = document.getElementById('s-always-top').checked;
            localStorage.setItem('s_always_top', isTop);
            ipcRenderer.send('set-always-on-top', isTop);
            if (!isInit) {
                addChatMessage(isTop ? "已开启置顶！" : "置顶已关闭！", 'ai');
            }
        }

        function toggleSmartphone() {
            const show = document.getElementById('show-smartphone').checked;
            localStorage.setItem('show_smartphone', show);
            document.getElementById('smartphone-ui').style.display = show ? 'flex' : 'none';
        }

        window.addEventListener('DOMContentLoaded', () => {
            const topSaved = localStorage.getItem('s_always_top') === 'true';
            document.getElementById('s-always-top').checked = topSaved;
            toggleAlwaysOnTop(true); 

            const phoneSaved = localStorage.getItem('show_smartphone') !== 'false'; 
            document.getElementById('show-smartphone').checked = phoneSaved;
            toggleSmartphone(); 
        });

        let lastSyncData = { relX: 0, relY: 0, width: 0, height: 0 }; 
        function syncUIPhysics() {
            const pet = window.live2dPet; 
            if (!pet || !pet.visible || pet.destroyed || !pet.internalModel) return; 
            pet.updateTransform();
            const internalBounds = pet.getBounds();
            if (internalBounds.width <= 1 || internalBounds.height <= 1) return;
            const config = {
                widthScale: 0.38, 
                heightScale: 1, 
                yOffsetRatio: 0.2 
            };
            const relX = Math.round(internalBounds.x + internalBounds.width / 2);
            const relY = Math.round(internalBounds.y + internalBounds.height / 2 + (internalBounds.height * config.yOffsetRatio));
            const width = Math.round(internalBounds.width * config.widthScale);
            const height = Math.round(internalBounds.height * config.heightScale);
            if (relX !== lastSyncData.relX || relY !== lastSyncData.relY || 
                width !== lastSyncData.width || height !== lastSyncData.height) {
                ipcRenderer.send('update-ui-bodies', [{ id: 'char_canvas', relX, relY, width, height }]);
                lastSyncData.relX = relX;
                lastSyncData.relY = relY;
                lastSyncData.width = width;
                lastSyncData.height = height;
            }
        }

        function loopSync() {
            syncUIPhysics();
            requestAnimationFrame(loopSync);
        }
        loopSync();

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

let isRadarActive = false; 

function connectEmotionRadar() {
    const radarSocket = new WebSocket('ws://localhost:8765');
    radarSocket.onopen = () => {
        console.log("情绪雷达对接成功");
    };
    radarSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (isRadarActive) {
            return; 
        }
        const voiceLines = [
            { text: "[surprise] 哇！打个游戏而已，别这么大火气嘛！", lang: "zh" },
            { text: "[sad] 又在口吐芬芳了……别气别气，深呼吸！", lang: "zh" },
            { text: "[angry] 键盘要被你敲坏啦！温柔一点！", lang: "zh" }
        ];
        const randomLine = voiceLines[Math.floor(Math.random() * voiceLines.length)];
        if (data.type === 'rage_audio' || data.type === 'rage_apm') {
            console.log("");
            isRadarActive = true; 
            const emotionTags = extractEmotionTags(randomLine.text);
            const cleanText = randomLine.text.replace(/(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g, '');
            addChatMessage(cleanText, 'ai');
            playSoVitsAudio(cleanText, randomLine.lang, null, emotionTags);
            setTimeout(() => {
                isRadarActive = false; 
                console.log("进行下一次监听");
            }, 10000); 
        }
    };
    radarSocket.onclose = () => {
        setTimeout(connectEmotionRadar, 10000);
    };
}
connectEmotionRadar();

// ===== UI CLICK SOUND =====
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (t.tagName === 'BUTTON' || 
                t.tagName === 'SELECT' || 
                t.tagName === 'INPUT' && t.type === 'checkbox' ||
                t.id === 'settings-btn' || 
                t.closest('.window-controls')) {
                
                uiClickSound.currentTime = 0; 
                uiClickSound.play().catch(()=>{}); 
            }
        });

