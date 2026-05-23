        function initSettingsCollapsibleSections() {
            const panel = document.getElementById('settings-panel');
            if (!panel || panel.dataset.collapsibleReady === 'true') return;

            const sections = Array.from(panel.children).filter((section) => {
                if (section.id === 'settings-header' || section.classList.contains('btn-group')) return false;
                const styleText = (section.getAttribute('style') || '').toLowerCase();
                return section.tagName === 'DIV' && styleText.includes('background: rgba') && styleText.includes('border-radius');
            });

            sections.forEach((section, index) => {
                const header = Array.from(section.children)[0];
                if (!header || section.classList.contains('settings-section')) return;

                const key = section.id || `settings-block-${index}`;
                const title = document.createElement('div');
                const body = document.createElement('div');
                const toggle = document.createElement('button');

                section.classList.add('settings-section');
                title.className = 'settings-section-title';
                body.className = 'settings-section-body';
                toggle.type = 'button';
                toggle.className = 'settings-collapse-toggle';
                toggle.setAttribute('aria-label', '收起或展开设置块');

                while (section.firstChild) {
                    if (section.firstChild === header) {
                        section.removeChild(header);
                    } else {
                        body.appendChild(section.firstChild);
                    }
                }

                title.appendChild(header);
                title.appendChild(toggle);
                section.appendChild(title);
                section.appendChild(body);

                const storageKey = `settings_section_collapsed_${key}`;
                const setCollapsed = (collapsed) => {
                    section.classList.toggle('collapsed', collapsed);
                    body.setAttribute('aria-hidden', String(collapsed));
                    toggle.textContent = collapsed ? 'v' : '^';
                    toggle.title = collapsed ? '展开' : '收起';
                    toggle.setAttribute('aria-expanded', String(!collapsed));
                    localStorage.setItem(storageKey, collapsed);
                };

                setCollapsed(localStorage.getItem(storageKey) === 'true');
                title.addEventListener('click', (event) => {
                    if (event.target.closest('input, select, textarea')) return;
                    setCollapsed(!section.classList.contains('collapsed'));
                });
            });

            panel.dataset.collapsibleReady = 'true';
        }

        document.addEventListener('DOMContentLoaded', initSettingsCollapsibleSections);

        function applyBgMode() {
            const modeSelect = document.getElementById('bg-mode');
            const mode = modeSelect ? modeSelect.value : (localStorage.getItem('anon_bg_mode') || 'transparent');
            localStorage.setItem('anon_bg_mode', mode);

            const video = document.getElementById('dynamic-bg');
            const pCanvas = document.getElementById('particle-canvas');
            const uploadRow = document.getElementById('video-upload-row');
            const pSettings = document.getElementById('particle-settings');
            
            const bgColorEnable = document.getElementById('bg-color-enable').checked;
            const customColor = document.getElementById('bg-custom-color').value;
            
            localStorage.setItem('bg_color_enable', bgColorEnable);
            localStorage.setItem('bg_custom_color', customColor);

            if (bgColorEnable && mode !== 'transparent') {
                document.body.style.backgroundColor = customColor;
                app.renderer.backgroundAlpha = 0; 
            } else {
                document.body.style.backgroundColor = "transparent";
            }
            video.style.display = "none";
            pCanvas.style.display = "none";
            if (uploadRow) uploadRow.style.display = "none";
            if (pSettings) pSettings.style.display = "none";
            const advSettings = document.getElementById('advanced-bg-settings');
            if (advSettings) advSettings.style.display = "none";
            document.getElementById('app-background').style.animation = "none"; 
            if (window.particleAnimId) cancelAnimationFrame(window.particleAnimId);
            if (mode === 'particles') {
                pCanvas.style.display = "block";
                if (pSettings) pSettings.style.display = "flex";
                initParticles();
            } else if (mode === 'video') {
                video.style.display = "block";
                if (uploadRow) uploadRow.style.display = "flex";
                const savedVideo = localStorage.getItem('saved_video_path');
                if (savedVideo) video.src = savedVideo;
            } else if (mode === 'advanced') {
                if (advSettings) advSettings.style.display = "flex";
                updateAdvancedBG();
            } else {
                document.getElementById('app-background').style.background = "";
                document.getElementById('bg-text-layer').innerText = "";
            }
        }

        function applyParticleSettings() {
            localStorage.setItem('p_color', document.getElementById('p-color').value);
            localStorage.setItem('p_count', document.getElementById('p-count').value);
            localStorage.setItem('p_speed', document.getElementById('p-speed').value);
            localStorage.setItem('p_shape', document.getElementById('p-shape').value);
            initParticles(); 
        }
        document.addEventListener('DOMContentLoaded', () => {
            const uploader = document.getElementById('video-upload');
            if (uploader) {
                uploader.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const videoPath = "file:///" + file.path.replace(/\\/g, '/');
                        localStorage.setItem('saved_video_path', videoPath);
                        document.getElementById('dynamic-bg').src = videoPath;
                    }
                });
            }
        });


        function toggleSettings() {
            const panel = document.getElementById('settings-panel');
            if (panel.style.display === 'flex') {
                panel.style.animation = 'fadeOut 0.2s forwards';
                setTimeout(() => { panel.style.display = 'none'; panel.style.animation = ''; }, 200);
            } else {
                document.getElementById('c-time').value = localStorage.getItem('c_time') || '#ff6b81';
                document.getElementById('c-date').value = localStorage.getItem('c_date') || '#555555';
                document.getElementById('c-greeting').value = localStorage.getItem('c_greeting') || '#777777';
                document.getElementById('c-weather').value = localStorage.getItem('c_weather') || '#5aa1e3';
                document.getElementById('api-preset').value = localStorage.getItem('api_preset') || 'deepseek';
                document.getElementById('set-phone-w').value = localStorage.getItem('phone_w') || 320;
                document.getElementById('set-phone-h').value = localStorage.getItem('phone_h') || 500;
                document.getElementById('set-phone-scale').value = localStorage.getItem('phone_scale') || 1.0;
                panel.style.display = 'flex'; 
                panel.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
            }
        }

        function saveSettings() {
            const apiPreset = document.getElementById('api-preset').value;
            const phoneW = document.getElementById('set-phone-w').value;
            const phoneH = document.getElementById('set-phone-h').value;
            const phoneScale = document.getElementById('set-phone-scale').value;

            const smartphone = document.getElementById('smartphone-ui');
            smartphone.style.width = phoneW + 'px';
            smartphone.style.height = phoneH + 'px';
            smartphone.style.transform = `scale(${phoneScale})`;
            
            const charId = localStorage.getItem('current_char') || 'anon';
            updatePhoneBackground(charId);

            localStorage.setItem('phone_w', phoneW);
            localStorage.setItem('phone_h', phoneH);
            localStorage.setItem('phone_scale', phoneScale);
            localStorage.setItem('api_preset', apiPreset);

            toggleSettings(); 
            addChatMessage("控制台设置应用并保存好啦！", 'ai');
            
            if(live2dModel) {
                try { live2dModel.motion("wink"); live2dModel.expression("wink"); } catch(e){}
                setTimeout(() => {
                    try { live2dModel.expression("default"); } catch(e) { }
                }, 3000);
            }
        }

        function updateAdvancedBG() {
            const layerGrad = document.getElementById('bg-layer-gradient');
            const layerPat = document.getElementById('bg-layer-pattern');
            const layerLine = document.getElementById('bg-layer-lines');

            if (document.getElementById('bg-mode').value !== 'advanced') {
                if(layerGrad) layerGrad.style.opacity = 0;
                if(layerPat) layerPat.style.opacity = 0;
                if(layerLine) layerLine.style.opacity = 0;
                return;
            }

            const useGrad = document.getElementById('adv-gradient').checked;
            const spdGrad = 101 - document.getElementById('adv-grad-speed').value;
            
            const usePat = document.getElementById('adv-pattern').checked;
            const spdPat = 101 - document.getElementById('adv-pat-speed').value;
            
            const useLine = document.getElementById('adv-lines').checked;
            const spdLine = 101 - document.getElementById('adv-line-speed').value;

            localStorage.setItem('adv_grad', useGrad); localStorage.setItem('adv_grad_s', spdGrad);
            localStorage.setItem('adv_pat', usePat); localStorage.setItem('adv_pat_s', spdPat);
            localStorage.setItem('adv_line', useLine); localStorage.setItem('adv_line_s', spdLine);

            if (useGrad) {
                layerGrad.style.opacity = 1;
                layerGrad.style.animation = `iridescentBg ${spdGrad}s ease infinite`;
            } else layerGrad.style.opacity = 0;

            if (usePat) {
                layerPat.style.opacity = 1;
                layerPat.style.animation = `patternMove ${spdPat}s linear infinite`;
            } else layerPat.style.opacity = 0;

            if (useLine) {
                layerLine.style.opacity = 1;
                layerLine.style.animation = `linesRandom ${spdLine}s ease-in-out infinite`;
            } else layerLine.style.opacity = 0;

            const txtLayer = document.getElementById('bg-text-layer');
            txtLayer.innerText = document.getElementById('adv-text-content').value;
            txtLayer.style.fontFamily = `"${document.getElementById('adv-font-family').value}", sans-serif`;
            txtLayer.style.fontSize = `${document.getElementById('adv-font-size').value}px`;
            txtLayer.style.color = document.getElementById('adv-text-color').value;
            txtLayer.style.fontWeight = "bold";

            const txtStyle = document.getElementById('adv-text-style').value;
            const txtAnim = document.getElementById('adv-text-anim').value;
            txtLayer.className = ''; 
            if (txtStyle !== 'normal') txtLayer.classList.add(`text-style-${txtStyle}`);
            if (txtAnim !== 'none') txtLayer.classList.add(`text-anim-${txtAnim}`);
            const txtZ = document.getElementById('adv-text-zindex').value;
            localStorage.setItem('adv_z', txtZ);
            txtLayer.style.zIndex = txtZ;
        }

        function initAdvancedSettings() {
            document.getElementById('adv-gradient').checked = localStorage.getItem('adv_grad') === 'true';
            document.getElementById('adv-pattern').checked = localStorage.getItem('adv_pat') === 'true';
            document.getElementById('adv-lines').checked = localStorage.getItem('adv_line') === 'true';
            document.getElementById('adv-text-content').value = localStorage.getItem('adv_txt') || '';
            document.getElementById('adv-font-family').value = localStorage.getItem('adv_font') || 'Microsoft YaHei';
            document.getElementById('adv-font-size').value = localStorage.getItem('adv_size') || '120';
            document.getElementById('adv-text-color').value = localStorage.getItem('adv_color') || '#ffb6c1';
            document.getElementById('adv-text-style').value = localStorage.getItem('adv_style') || 'normal';
            document.getElementById('adv-text-anim').value = localStorage.getItem('adv_anim') || 'none';
            document.getElementById('adv-grad-speed').value = 101 - (localStorage.getItem('adv_grad_s') || 16);
            document.getElementById('adv-text-zindex').value = localStorage.getItem('adv_z') || '-8';
        }
        document.addEventListener('DOMContentLoaded', initAdvancedSettings);

        const settingsPanel = document.getElementById('settings-panel');
        const settingsHeader = document.getElementById('settings-header');
        let isSetDragging = false, setStartX, setStartY, setInitLeft, setInitTop;

        settingsHeader.addEventListener('mousedown', (e) => {
            isSetDragging = true;
            setStartX = e.clientX;
            setStartY = e.clientY;
            setInitLeft = parseInt(window.getComputedStyle(settingsPanel).left) || 0;
            setInitTop = parseInt(window.getComputedStyle(settingsPanel).top) || 0;
            settingsPanel.style.border = "2px solid #ff6b81";
        });

        document.addEventListener('mousemove', (e) => {
            if (!isSetDragging) return;
            settingsPanel.style.left = `${setInitLeft + (e.clientX - setStartX)}px`;
            settingsPanel.style.top = `${setInitTop + (e.clientY - setStartY)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isSetDragging) return;
            isSetDragging = false;
            settingsPanel.style.border = "2px solid #ffb6c1";
        });
        const txtLayer = document.getElementById('bg-text-layer');
        let isTxtDragging = false, txtStartX, txtStartY, txtInitLeft, txtInitTop;

        if (localStorage.getItem('adv_txt_x')) {
            txtLayer.style.left = localStorage.getItem('adv_txt_x');
            txtLayer.style.top = localStorage.getItem('adv_txt_y');
        }

        txtLayer.addEventListener('mousedown', (e) => {
            if (document.getElementById('lock-widget').checked) return; 
            isTxtDragging = true;
            txtStartX = e.clientX;
            txtStartY = e.clientY;
            txtInitLeft = parseInt(window.getComputedStyle(txtLayer).left) || 0;
            txtInitTop = parseInt(window.getComputedStyle(txtLayer).top) || 0;
            txtLayer.style.border = "1px dashed rgba(255, 182, 193, 0.8)";
        });

        document.addEventListener('mousemove', (e) => {
            if (!isTxtDragging) return;
            txtLayer.style.left = `${txtInitLeft + (e.clientX - txtStartX)}px`;
            txtLayer.style.top = `${txtInitTop + (e.clientY - txtStartY)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isTxtDragging) return;
            isTxtDragging = false;
            txtLayer.style.border = "none";
            localStorage.setItem('adv_txt_x', txtLayer.style.left);
            localStorage.setItem('adv_txt_y', txtLayer.style.top);
        });

        let isCppVisualizing = false;
        let visDataArray = new Array(64).fill(0); 
        let visAnimId;

        ipcRenderer.on('audio-fft', (event, fftData) => {
            visDataArray = fftData;
        });

        function getRgbFromHex(hex) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 182, 193';
        }

        function toggleCppAudio() {
            const enable = document.getElementById('cpp-audio-enable').checked;
            ipcRenderer.send('toggle-cpp-audio', enable);
            const vCanvas = document.getElementById('visualizer-canvas');
        function updateVisSettings() {}
        function triggerDisplayUpdate() {}
        const visWidget = document.getElementById('vis-widget');
            
            if (enable) {
                isCppVisualizing = true;
                vCanvas.style.display = 'block';
                visWidget.style.display = 'block'; 
                drawAdvancedVisualizer();
                addChatMessage("麦克风监听已启动！", 'ai');
            } else {
                isCppVisualizing = false;
                vCanvas.style.display = 'none';
                visWidget.style.display = 'none'; 
                if(visAnimId) cancelAnimationFrame(visAnimId);
                visDataArray.fill(0);
            }
        }
 
        let dynamicHue = 0; 
        let smoothedData = []; 
        function drawAdvancedVisualizer() {
            if (!isCppVisualizing) return;
            visAnimId = requestAnimationFrame(drawAdvancedVisualizer);

            const vCanvas = document.getElementById('visualizer-canvas');
            const vCtx = vCanvas.getContext('2d');
            
            vCanvas.width = vCanvas.offsetWidth;
            vCanvas.height = vCanvas.offsetHeight;
            vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);

            const style = document.getElementById('vis-style').value;
            const amp = parseInt(document.getElementById('vis-amp').value) / 100.0;
            const binCount = parseInt(document.getElementById('vis-count').value);
            const isDynamic = document.getElementById('vis-dynamic').checked;
            
            dynamicHue = (dynamicHue + 0.5) % 360;
            const rgb = getRgbFromHex(document.getElementById('vis-color').value);
            
            const colorBase = isDynamic ? `hsla(${dynamicHue}, 100%, 65%, 0.8)` : `rgba(${rgb}, 0.8)`;
            const colorTop  = isDynamic ? `hsla(${dynamicHue}, 100%, 80%, 0.9)` : `rgba(255, 255, 255, 0.9)`;
            const colorBot  = isDynamic ? `hsla(${dynamicHue}, 100%, 60%, 0.4)` : `rgba(${rgb}, 0.4)`;

            let rawFrequencies = [];
            const targetBars = parseInt(document.getElementById('vis-count').value) || 60;
            const halfBars = Math.ceil(targetBars / 2);
            
            const dataLength = visDataArray.length;
            const step = dataLength / halfBars; 

            for(let i = 0; i < halfBars; i++) {
                let dataIndex = Math.floor(i * step); 
                
                let boost = 1 + (i * 0.08); 
                let val = (visDataArray[dataIndex] || 0) * boost * amp;
                rawFrequencies.push(Math.min(val, 300)); 
            }
            
        let finalData = [...rawFrequencies].reverse().concat(rawFrequencies);
            
            if (targetBars % 2 !== 0) {
                finalData.pop();
            }
            
            const bufferLengthToDraw = finalData.length; 

            if (smoothedData.length !== bufferLengthToDraw) {
                smoothedData = new Array(bufferLengthToDraw).fill(0); 
            }
            
            const lerpFactor = 0.18; 
            for (let i = 0; i < bufferLengthToDraw; i++) {
                smoothedData[i] += (finalData[i] - smoothedData[i]) * lerpFactor;
            }

            vCtx.fillStyle = colorBase;
            vCtx.strokeStyle = colorBase;
            vCtx.lineWidth = 2;

            if (style === 'bar') {
                const barWidth = (vCanvas.width / bufferLengthToDraw) * 0.8;
                let x = (vCanvas.width - (barWidth + 2) * bufferLengthToDraw) / 2;
                for(let i = 0; i < bufferLengthToDraw; i++) { 
                    let barHeight = (smoothedData[i] / 255) * vCanvas.height;
                    
                    let grad = vCtx.createLinearGradient(0, vCanvas.height - barHeight, 0, vCanvas.height);
                    grad.addColorStop(0, colorTop);
                    grad.addColorStop(1, colorBot);
                    vCtx.fillStyle = grad;
                    
                    vCtx.fillRect(x, vCanvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 2;
                }
            } 
            else if (style === 'circle') {
                const centerX = vCanvas.width / 2;
                const centerY = vCanvas.height / 2;
                const radius = Math.min(centerX, centerY) * 0.3;
                
                vCtx.beginPath();
                vCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                vCtx.strokeStyle = colorBot;
                vCtx.stroke(); 

                for(let i = 0; i < bufferLengthToDraw; i++) { 
                    let barHeight = (smoothedData[i] / 255) * (Math.min(centerX, centerY) * 0.6);
                    let rads = (Math.PI * 2 / bufferLengthToDraw) * i - Math.PI / 2; 
                    
                    let x = centerX + Math.cos(rads) * radius;
                    let y = centerY + Math.sin(rads) * radius;
                    let xEnd = centerX + Math.cos(rads) * (radius + barHeight);
                    let yEnd = centerY + Math.sin(rads) * (radius + barHeight);
                    
                    let grad = vCtx.createLinearGradient(x, y, xEnd, yEnd);
                    grad.addColorStop(0, colorBot);
                    grad.addColorStop(1, colorTop);
                    vCtx.strokeStyle = grad;
                    
                    vCtx.beginPath();
                    vCtx.moveTo(x, y);
                    vCtx.lineTo(xEnd, yEnd);
                    vCtx.stroke();
                }
            }
            else if (style === 'line') {
                const sliceWidth = vCanvas.width / (bufferLengthToDraw - 1);             
                let x = 0; 
                vCtx.beginPath();
                
                let lineGrad = vCtx.createLinearGradient(0, 0, vCanvas.width, 0);
                lineGrad.addColorStop(0, colorBot);  
                lineGrad.addColorStop(0.5, colorTop); 
                lineGrad.addColorStop(1, colorBot);   
                
                vCtx.lineWidth = 4; 
                vCtx.lineJoin = 'round'; 
                vCtx.shadowBlur = 10;    
                vCtx.shadowColor = colorTop;
                
                for(let i = 0; i < bufferLengthToDraw; i++) { 
                    let v = smoothedData[i] / 255.0;
                    let y = vCanvas.height * 0.8 - (v * vCanvas.height * 0.6); 
                    
                    if (i === 0) vCtx.moveTo(x, y);
                    else vCtx.lineTo(x, y);       
                    x += sliceWidth;
                }        
                vCtx.strokeStyle = lineGrad;
                vCtx.stroke();             
                vCtx.shadowBlur = 0; 
            }
        }

        const visWidget = document.getElementById('vis-widget');
        let isVisDragging = false, vStartX, vStartY, vInitLeft, vInitTop;

        function updateVisSize() {
            const w = parseInt(document.getElementById('vis-width').value);
            const h = parseInt(document.getElementById('vis-height').value);
            
            if (visWidget.style.transform !== 'none') {
                const rect = visWidget.getBoundingClientRect();
                visWidget.style.left = rect.left + 'px';
                visWidget.style.top = rect.top + 'px';
                visWidget.style.transform = 'none'; 
            }

            const oldW = parseInt(visWidget.style.width) || 100;
            const oldH = parseInt(visWidget.style.height) || 100;

            visWidget.style.width = w + 'px';
            visWidget.style.height = h + 'px';
            
            let currentLeft = parseFloat(visWidget.style.left) || 0;
            let currentTop = parseFloat(visWidget.style.top) || 0;
            
            visWidget.style.left = (currentLeft - (w - oldW) / 2) + 'px';
            visWidget.style.top = (currentTop - (h - oldH)) + 'px';
            
            localStorage.setItem('vis_x', visWidget.style.left);
            localStorage.setItem('vis_y', visWidget.style.top);
            localStorage.setItem('vis_w', w);
            localStorage.setItem('vis_h', h);
            
            const vCanvas = document.getElementById('visualizer-canvas');
            if (vCanvas) {
                vCanvas.width = w;
                vCanvas.height = h;
            }
        }

        if (localStorage.getItem('vis_w')) {
            document.getElementById('vis-width').value = localStorage.getItem('vis_w');
            document.getElementById('vis-height').value = localStorage.getItem('vis_h');
        }
        updateVisSize(); 
        if (localStorage.getItem('vis_x')) {
            visWidget.style.left = localStorage.getItem('vis_x');
            visWidget.style.top = localStorage.getItem('vis_y');
            visWidget.style.transform = 'none'; 
        }

        document.getElementById('lock-widget').addEventListener('change', (e) => {
            visWidget.style.border = 'none';
            visWidget.style.background = 'transparent';

            if (e.target.checked) {
                visWidget.style.pointerEvents = 'none';
                visWidget.style.cursor = 'default';
            } else {
                visWidget.style.pointerEvents = 'auto';
                visWidget.style.cursor = 'move'; 
            }
        });

        visWidget.addEventListener('mousedown', (e) => {
            if (document.getElementById('lock-widget').checked) return;
            
            isVisDragging = true;
            vStartX = e.clientX; 
            vStartY = e.clientY;
            
            const rect = visWidget.getBoundingClientRect();
            vInitLeft = rect.left;
            vInitTop = rect.top;
            
            visWidget.style.left = vInitLeft + 'px';
            visWidget.style.top = vInitTop + 'px';
            visWidget.style.bottom = 'auto'; 
            visWidget.style.right = 'auto';
            visWidget.style.transform = 'none'; 
            
            visWidget.style.border = "1px solid rgba(255, 107, 129, 0.4)";
        });

        document.addEventListener('mousemove', (e) => {
            if (!isVisDragging) return;
            visWidget.style.left = `${vInitLeft + (e.clientX - vStartX)}px`;
            visWidget.style.top = `${vInitTop + (e.clientY - vStartY)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isVisDragging) {
                isVisDragging = false;
                visWidget.style.border = "none";
                
                localStorage.setItem('vis_x', visWidget.style.left);
                localStorage.setItem('vis_y', visWidget.style.top);
            }
        });
        
        document.getElementById('lock-widget').dispatchEvent(new Event('change'));
        if (!document.getElementById('cpp-audio-enable').checked) {
            document.getElementById('vis-widget').style.display = 'none';
        }
