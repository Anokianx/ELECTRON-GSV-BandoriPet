        let activePhysicsItems = []; 

        function togglePhysicsPanel() {
            const panel = document.getElementById('physics-panel');
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
                loadPhysicsGallery(); 
            } else {
                panel.style.display = 'none';
            }
        }

        async function loadPhysicsGallery() {
            const { ipcRenderer } = require('electron');
            const images = await ipcRenderer.invoke('get-physics-images');
            const gallery = document.getElementById('physics-gallery');
            gallery.innerHTML = '';
            
            images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = 'file:///' + encodeURI(img.path.replace(/\\/g, '/'));
                imgEl.style.cssText = 'width: 40px; height: 40px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid transparent; transition: 0.2s;';
                imgEl.title = '点击掉落';
                imgEl.onmouseover = () => imgEl.style.borderColor = '#ff6b81';
                imgEl.onmouseout = () => imgEl.style.borderColor = 'transparent';
                
                imgEl.onclick = () => spawnPhysicsItem(img.name, imgEl.src);
                gallery.appendChild(imgEl);
            });
        }

        async function spawnPhysicsItem(name, src) {
            const { ipcRenderer } = require('electron');
            const maxItems = parseInt(document.getElementById('slider-max').value);
            
            if (activePhysicsItems.length >= maxItems) {
                console.log("已达到最大道具数量限制");
                return;
            }

            const bounce = parseFloat(document.getElementById('slider-bounce').value);
            const itemId = 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const startSize = 80;

            const startX = window.screen.width / 2;
            const startY = -50; 

            await ipcRenderer.invoke('spawn-physics-item', {
                id: itemId, imgUrl: src, startX, startY, size: startSize, bounce
            });

            activePhysicsItems.push({ id: itemId, name: name, size: startSize, shape: 'octagon' });
            renderActivePhysicsList();
        }

        function renderActivePhysicsList() {
            const list = document.getElementById('active-physics-list');
            list.innerHTML = '';
            activePhysicsItems.forEach(item => {
                const shapeHtml = SHAPE_ICONS[item.shape || 'octagon']; 
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.05); padding: 5px 10px; border-radius: 8px;';
                row.innerHTML = `
                    <span style="font-size: 12px; font-weight: bold; width: 45px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</span>
                    <button onclick="changePhysicsShape('${item.id}')" style="display: flex; align-items: center; justify-content: center; font-size: 11px; background: rgba(255,107,129,0.15); color: #ff6b81; border: 1px solid rgba(255,182,193,0.5); padding: 2px 6px; border-radius: 6px; cursor: pointer; transition: 0.2s; min-width: 65px;" onmouseover="this.style.background='rgba(255,107,129,0.3)'" onmouseout="this.style.background='rgba(255,107,129,0.15)'" title="点击切换形状">
                    ${shapeHtml}
                    </button>
                    <input type="range" min="30" max="300" value="${item.size}" style="width: 55px;" onchange="resizePhysicsItem('${item.id}', this.value)" title="调整大小">
                    <button onclick="removePhysicsItem('${item.id}')" style="background: transparent; border: none; color: #ff4757; cursor: pointer; font-weight: bold;">✕</button>
                `;
                list.appendChild(row);
            });
        }

        function resizePhysicsItem(id, newSize) {
            const { ipcRenderer } = require('electron');
            const sizeNum = parseInt(newSize);
            const item = activePhysicsItems.find(i => i.id === id);
            if(item) item.size = sizeNum;
            ipcRenderer.send('resize-physics-item', id, sizeNum);
        }

        function removePhysicsItem(id) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('remove-physics-item', id);
            activePhysicsItems = activePhysicsItems.filter(i => i.id !== id);
            renderActivePhysicsList();
        }

        function clearAllPhysicsItems() {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('clear-all-physics');
            activePhysicsItems = [];
            renderActivePhysicsList();
        }

        document.addEventListener('DOMContentLoaded', () => {
            const { ipcRenderer } = require('electron');
            
            const dropzone = document.getElementById('physics-dropzone');
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.backgroundColor = 'rgba(0,0,0,0.05)'; });
            dropzone.addEventListener('dragleave', () => { dropzone.style.backgroundColor = 'transparent'; });
            dropzone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzone.style.backgroundColor = 'transparent';
                
                const files = e.dataTransfer.files;
                for (let file of files) {
                    if (/\.(png|jpe?g|gif|webp)$/i.test(file.name)) {
                        await ipcRenderer.invoke('save-physics-image', file.path, file.name);
                    }
                }
                loadPhysicsGallery(); 
            });
        });
        function syncParams() {
            const gravity = parseFloat(document.getElementById('slider-gravity').value);
            const bounce = parseFloat(document.getElementById('slider-bounce').value);
            const max = parseInt(document.getElementById('slider-max').value);
            const fps = parseInt(document.getElementById('slider-fps').value);
            const throwPower = parseFloat(document.getElementById('slider-throw').value);
            const frictionAir = parseFloat(document.getElementById('slider-frictionAir').value);
            
            document.getElementById('val-gravity').innerText = gravity;
            document.getElementById('val-bounce').innerText = bounce;
            document.getElementById('val-max').innerText = max;
            document.getElementById('val-fps').innerText = fps;
            document.getElementById('val-throw').innerText = throwPower;
            document.getElementById('val-frictionAir').innerText = frictionAir;
            
            localStorage.setItem('physics_gravity', gravity);
            localStorage.setItem('physics_bounce', bounce);
            localStorage.setItem('physics_max', max);
            localStorage.setItem('physics_fps', fps);
            localStorage.setItem('physics_throw', throwPower);
            localStorage.setItem('physics_frictionAir', frictionAir);

            ipcRenderer.send('update-physics-params', { gravity, fps, throwPower, frictionAir});
        }
        document.addEventListener('DOMContentLoaded', () => {
            const params = ['gravity', 'bounce', 'max', 'fps', 'throw', 'frictionAir'];
            params.forEach(param => {
                const savedValue = localStorage.getItem(`physics_${param}`);
                if (savedValue !== null) {
                    document.getElementById(`slider-${param}`).value = savedValue;
                }
                
                document.getElementById(`slider-${param}`).addEventListener('input', syncParams);
            });
            syncParams();
        });
            ['gravity', 'bounce', 'max', 'fps', 'throw', 'frictionAir'].forEach(param => {
            const saved = localStorage.getItem(`physics_${param}`);
            if (saved !== null && document.getElementById(`slider-${param}`)) {
                document.getElementById(`slider-${param}`).value = saved;
            }
        });

        ipcRenderer.on('toggle-immersive', (event, isImmersive) => {
            const physicsPanel = document.getElementById('physics-panel');
            const physicsBtn = document.getElementById('btn-physics-toggle');
            const floatingControls = document.getElementById('floating-controls');

            if (isImmersive) {
                if (physicsPanel) physicsPanel.style.display = 'none';
                if (physicsBtn) physicsBtn.style.display = 'none';
                if (floatingControls) floatingControls.style.display = 'none';
            } else {
                if (physicsBtn) physicsBtn.style.display = '';
                if (floatingControls) floatingControls.style.display = 'flex';
            }
        });

        const panel = document.getElementById('physics-panel');
            const header = document.getElementById('physics-panel-header');
            let isDraggingMenu = false;
            let menuOffsetX, menuOffsetY;

            header.addEventListener('mousedown', (e) => {
                isDraggingMenu = true;
                menuOffsetX = e.clientX - panel.offsetLeft;
                menuOffsetY = e.clientY - panel.offsetTop;
                panel.style.right = 'auto'; 
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDraggingMenu) return;
                panel.style.left = (e.clientX - menuOffsetX) + 'px';
                panel.style.top = (e.clientY - menuOffsetY) + 'px';
            });

            document.addEventListener('mouseup', () => {
                isDraggingMenu = false;
            });

        const SHAPE_ICONS = {
            'circle': `<svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 4px;"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>圆形`,
            'rectangle': `<svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 4px;"><rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/></svg>方形`,
            'octagon': `<svg width="12" height="12" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 4px;"><polygon points="5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5" fill="none" stroke="currentColor" stroke-width="2"/></svg>八边形`
        };
        ipcRenderer.on('physics-shape-updated', (event, id, newShape) => {
            const item = activePhysicsItems.find(i => i.id === id);
            if (item) {
                item.shape = newShape;
                renderActivePhysicsList(); 
            }
        });

        function changePhysicsShape(id) {
            ipcRenderer.send('physics-change-shape', id);
        }
