        function toggleCharMenu() {
            const menu = document.getElementById('char-menu');
            if (menu.style.display === 'flex' || menu.style.display === '') {
                menu.style.animation = 'fadeOutCenter 0.2s forwards';
                setTimeout(() => { 
                    menu.style.display = 'none'; 
                    menu.style.animation = ''; 
                    closeDetailPanel(); 
                }, 200);
            } else {
                renderGallery();
                menu.style.display = 'flex';
                menu.style.animation = 'popInCenter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
            }
        }

        function renderGallery() {
            const list = document.getElementById('char-gallery-list');
            list.innerHTML = '';
            for (let id in charactersConfig) {
                const char = charactersConfig[id];
                const frame = document.createElement('div');
                frame.className = 'char-frame';
                frame.innerHTML = `
                    <div class="char-frame-inner">
                        <img class="char-bg" src="model/${id}/character.jpg" onerror="this.src='model/${id}/character.png'">
                        <img class="band-logo" src="assets/band_${id}.png" onerror="this.style.display='none'">
                        <img class="member-icon" src="assets/icon_${id}.png" onerror="this.style.display='none'">
                        <div class="char-info-overlay">
                            <div style="font-size: 14px; opacity: 0.8; letter-spacing: 1px;">Bandori Member</div>
                            <div style="font-size: 26px; font-weight: bold; letter-spacing: 2px;">${char.name}</div>
                        </div>
                    </div>
                `;
                frame.onclick = () => openDetailPanel(id);
                list.appendChild(frame);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const gallery = document.getElementById('char-gallery-list');
            if (gallery) {
                gallery.addEventListener('wheel', (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault(); 
                        gallery.scrollLeft += e.deltaY * 1.5; 
                    }
                }, { passive: false });
            }
        });

        function openDetailPanel(id) {
            selectedCharId = id;
            const panel = document.getElementById('char-detail-panel');
            document.getElementById('detail-char-name').innerText = charactersConfig[id].name;
            
            const outfitGrid = document.getElementById('outfit-grid');
            outfitGrid.innerHTML = '';
            const outfits = charactersConfig[id].outfits;
            let currentOutfit = localStorage.getItem(`outfit_${id}`);
            if (!currentOutfit) currentOutfit = Object.keys(outfits)[0];

            for (let oid in outfits) {
                const item = document.createElement('div');
                item.className = `outfit-item ${currentOutfit === oid ? 'active' : ''}`;
                item.innerText = outfits[oid];
                item.onclick = () => {
                    localStorage.setItem(`outfit_${id}`, oid);
                    renderGallery(); 
                    openDetailPanel(id); 
                };
                outfitGrid.appendChild(item);
            }

            document.getElementById('menu-set-scale').value = localStorage.getItem('anon_scale') || 0.2;
            document.getElementById('menu-set-x').value = localStorage.getItem('anon_x') || 0;
            document.getElementById('menu-set-y').value = localStorage.getItem('anon_y') || 0;
            document.getElementById('menu-set-delay').value = localStorage.getItem('motion_delay') || 4500;
            document.getElementById('set-prompt').value = localStorage.getItem(`prompt_${id}`) || charactersConfig[id].prompt;
            document.getElementById('menu-set-drag').checked = (localStorage.getItem('model_drag_enabled') === 'true');
            document.getElementById('menu-set-look').checked = (localStorage.getItem('mouse_follow_enabled') !== 'false');
            const savedLang = localStorage.getItem(`voice_lang_${id}`) || 'ja';
            if (document.getElementById('voice-lang-switch')) {
                document.getElementById('voice-lang-switch').value = savedLang;
            }
            const savedVol = localStorage.getItem('anon_volume') || 1.0;
            document.getElementById('menu-set-volume').value = savedVol;
            document.getElementById('volume-val').innerText = Math.round(savedVol * 100) + '%';
            globalVolume = parseFloat(savedVol);
            panel.classList.add('active');
        }

        function closeDetailPanel() {
            document.getElementById('char-detail-panel').classList.remove('active');
        }

        function saveMenuSettings() {
            const scale = document.getElementById('menu-set-scale').value;
            const x = document.getElementById('menu-set-x').value;
            const y = document.getElementById('menu-set-y').value;
            const delay = document.getElementById('menu-set-delay').value;
            const promptStr = document.getElementById('set-prompt').value;
            const voiceLang = document.getElementById('voice-lang-switch').value; 
            const oldCharId = localStorage.getItem('current_char');

            localStorage.setItem('current_char', selectedCharId);
            localStorage.setItem('anon_scale', scale);
            localStorage.setItem('anon_x', x);
            localStorage.setItem('anon_y', y);
            localStorage.setItem('motion_delay', delay);
            localStorage.setItem(`prompt_${selectedCharId}`, promptStr);
            localStorage.setItem(`voice_lang_${selectedCharId}`, voiceLang);
            let savedOutfit = localStorage.getItem(`outfit_${selectedCharId}`);
            if (!savedOutfit) {
                savedOutfit = Object.keys(charactersConfig[selectedCharId].outfits)[0];
                localStorage.setItem(`outfit_${selectedCharId}`, savedOutfit);
            }
            loadCustomModel(selectedCharId, localStorage.getItem(`outfit_${selectedCharId}`));
            updatePhoneBackground(selectedCharId);
            
            if (oldCharId !== selectedCharId) {
                chatMemory = []; 
                document.getElementById('phone-chat-history').innerHTML = ''; 
                addChatMessage(`${charactersConfig[selectedCharId].name}`, 'ai');
                ipcRenderer.send('switch-character', selectedCharId);
            } else {
                addChatMessage(`已成功保存【${charactersConfig[selectedCharId].name}】的设定与位置参数！`, 'ai');
            }
            closeDetailPanel();
        }

        document.addEventListener('DOMContentLoaded', () => {
            const gallery = document.getElementById('char-gallery-list');
            if (gallery) {
                gallery.addEventListener('wheel', (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault(); 
                        gallery.scrollLeft += e.deltaY * 1.5; 
                    }
                }, { passive: false });
            }
        });
