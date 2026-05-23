        const pCanvas = document.getElementById('particle-canvas');
        const pCtx = pCanvas.getContext('2d');
        let particlesArray = [];
        let isAnimating = false;

        function hexToRgb(hex) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 182, 193';
        }

        function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
            let rot = Math.PI / 2 * 3; let x = cx; let y = cy; let step = Math.PI / spikes;
            ctx.beginPath(); ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius; y = cy + Math.sin(rot) * outerRadius; ctx.lineTo(x, y); rot += step;
                x = cx + Math.cos(rot) * innerRadius; y = cy + Math.sin(rot) * innerRadius; ctx.lineTo(x, y); rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius); ctx.closePath(); ctx.fill();
        }

        function initParticles() {
            pCanvas.width = window.innerWidth;
            pCanvas.height = window.innerHeight;
            particlesArray = [];
            const count = parseInt(localStorage.getItem('p_count')) || 80;
            const baseSpeed = parseFloat(localStorage.getItem('p_speed')) || 1;
            const shape = localStorage.getItem('p_shape') || 'circle';
            const colorRgb = hexToRgb(localStorage.getItem('p_color') || '#ffb6c1');
            for (let i = 0; i < count; i++) {
                let size = Math.random() * 3 + 1;
                let x = Math.random() * pCanvas.width;
                let y = Math.random() * pCanvas.height;
                let speedY, speedX;
                if (shape === 'snow') {
                    speedY = Math.random() * baseSpeed + (baseSpeed / 2); 
                    speedX = Math.random() * 2 - 1; 
                } else {
                    speedY = Math.random() * -baseSpeed - (baseSpeed / 2); 
                    speedX = Math.random() * baseSpeed - (baseSpeed / 2);
                }
                particlesArray.push({ x, y, size, speedY, speedX, opacity: Math.random(), color: colorRgb, shape: shape });
            }
            if (!isAnimating) {
                isAnimating = true;
                animateParticles();
            }
        }

        function animateParticles() {
            if (document.getElementById('bg-mode') && document.getElementById('bg-mode').value !== 'particles') {
                isAnimating = false;
                return; 
            }
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                let p = particlesArray[i];
                pCtx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
                if (p.shape === 'star') {
                    drawStar(pCtx, p.x, p.y, 5, p.size * 2, p.size); 
                } else {
                    pCtx.beginPath();
                    pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2); 
                    pCtx.fill();
                }
                p.y += p.speedY;
                p.x += p.speedX;
                if (p.shape === 'snow') {
                    if (p.y > pCanvas.height) p.y = 0; 
                } else {
                    if (p.y < 0) p.y = pCanvas.height; 
                }
                if (p.x < 0 || p.x > pCanvas.width) p.speedX *= -1; 
            }
            requestAnimationFrame(animateParticles);
        }
        window.addEventListener('resize', () => {
            if (document.getElementById('bg-mode') && document.getElementById('bg-mode').value === 'particles') initParticles();
        });
        window.addEventListener('resize', () => {
            if (document.getElementById('bg-mode').value === 'particles') initParticles();
        });

// ===== MOUSE TRAIL EFFECTS =====

        const mtCanvas = document.getElementById('mouse-trail-canvas');
        const mtCtx = mtCanvas.getContext('2d');
        
        let trailParticles = [];
        let clickParticles = [];
        let tStyle = 'none';
        let cStyle = 'none';
        let tColor = '255, 182, 193'; 
        let mtDynamic = false;
        let effectHue = 0; 

        function resizeMtCanvas() {
            mtCanvas.width = window.innerWidth;
            mtCanvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeMtCanvas);
        resizeMtCanvas();

        function applyMouseTrailSettings() {
            tStyle = document.getElementById('mt-style').value;
            cStyle = document.getElementById('mc-style').value;
            const hexColor = document.getElementById('mt-color').value;
            tColor = hexToRgb(hexColor); 
            mtDynamic = document.getElementById('mt-dynamic').checked;
            
            localStorage.setItem('mt_style', tStyle);
            localStorage.setItem('mc_style', cStyle);
            localStorage.setItem('mt_color', hexColor);
            localStorage.setItem('mt_dynamic', mtDynamic);
            
            if (tStyle === 'none') trailParticles = [];
            if (cStyle === 'none') clickParticles = [];
        }

        document.addEventListener('mousemove', (e) => {
            if (tStyle === 'none') return;
            if ((tStyle === 'stars' || tStyle === 'hearts' || tStyle === 'geometric') && Math.random() > 0.4) return;

            let shape = 'circle';
            if (tStyle === 'geometric') {
                const shapes = ['triangle', 'square', 'circle', 'cross'];
                shape = shapes[Math.floor(Math.random() * shapes.length)];
            }

            trailParticles.push({
                x: e.clientX, y: e.clientY,
                size: tStyle === 'hearts' ? Math.random() * 6 + 6 : (tStyle === 'geometric' ? Math.random() * 5 + 3 : Math.random() * 4 + 2),
                speedX: Math.random() * 2 - 1,
                speedY: tStyle === 'hearts' ? Math.random() * -2 - 1 : Math.random() * 2 - 0.5,
                life: 1.0, 
                decay: tStyle === 'neon' ? 0.08 : (Math.random() * 0.015 + 0.01),
                rot: Math.random() * Math.PI * 2,
                rotSpeed: Math.random() * 0.1 - 0.05,
                swingOffset: Math.random() * Math.PI * 2,
                shape: shape
            });
        });

        document.addEventListener('mousedown', (e) => {
            if (cStyle === 'none') return;

            if (cStyle === 'ripple') {
                clickParticles.push({ x: e.clientX, y: e.clientY, life: 1.0, type: 'ripple', maxRadius: 40 });
            } 
            else if (cStyle === 'burst') {
                for(let i=0; i<8; i++) {
                    let angle = (Math.PI * 2 / 8) * i;
                    clickParticles.push({
                        x: e.clientX, y: e.clientY,
                        vx: Math.cos(angle) * 2.2, vy: Math.sin(angle) * 2.2,
                        life: 1.0, type: 'burst'
                    });
                }
            } 
            else if (cStyle === 'geometric') {
                const geoShapes = ['triangle', 'square', 'circle'];
                for(let i=0; i<6; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 2 + 0.5;
                    clickParticles.push({
                        x: e.clientX, y: e.clientY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 1.0, type: 'geo', 
                        shape: geoShapes[Math.floor(Math.random() * geoShapes.length)],
                        size: Math.random() * 8 + 4,
                        rot: Math.random() * Math.PI,
                        rotSpeed: (Math.random() - 0.5) * 0.2
                    });
                }
            }
        });

        function animateMouseTrail() {
            requestAnimationFrame(animateMouseTrail);
            if (tStyle === 'none' && cStyle === 'none' && trailParticles.length === 0 && clickParticles.length === 0) return;

            mtCtx.clearRect(0, 0, mtCanvas.width, mtCanvas.height);
            
            effectHue = (effectHue + 1) % 360; 

            if (tStyle === 'neon' && trailParticles.length > 1) {
                mtCtx.beginPath();
                mtCtx.moveTo(trailParticles[0].x, trailParticles[0].y);
                for (let i = 1; i < trailParticles.length; i++) mtCtx.lineTo(trailParticles[i].x, trailParticles[i].y);
                mtCtx.lineWidth = 4; mtCtx.lineCap = 'round'; mtCtx.lineJoin = 'round';
                mtCtx.shadowBlur = 15;
                mtCtx.shadowColor = mtDynamic ? `hsl(${effectHue}, 100%, 65%)` : `rgb(${tColor})`;
                mtCtx.strokeStyle = mtDynamic ? `hsla(${effectHue}, 100%, 65%, 0.8)` : `rgba(${tColor}, 0.8)`;
                mtCtx.stroke();
                mtCtx.shadowBlur = 0; 
            }

            for (let i = 0; i < trailParticles.length; i++) {
                let p = trailParticles[i];
                p.life -= p.decay;

                if (p.life <= 0) { trailParticles.splice(i, 1); i--; continue; }

                let fillStyleStr = mtDynamic ? `hsla(${effectHue}, 100%, 65%, ${p.life})` : `rgba(${tColor}, ${p.life})`;
                mtCtx.fillStyle = fillStyleStr;

                if (tStyle === 'stars') {
                    p.x += p.speedX; p.y += p.speedY; p.rot += p.rotSpeed;
                    mtCtx.save(); mtCtx.translate(p.x, p.y); mtCtx.rotate(p.rot);
                    drawStar(mtCtx, 0, 0, 5, p.size * 2, p.size); 
                    mtCtx.restore();
                } 
                else if (tStyle === 'hearts') {
                    p.x += Math.sin(p.life * 10 + p.swingOffset) * 1.5; p.y += p.speedY;
                    mtCtx.save(); mtCtx.translate(p.x, p.y); mtCtx.scale(p.size / 10, p.size / 10);
                    mtCtx.beginPath(); mtCtx.moveTo(0, 3);
                    mtCtx.bezierCurveTo(0, -3, -10, -5, -10, -10); mtCtx.bezierCurveTo(-10, -15, 0, -15, 0, -10);
                    mtCtx.bezierCurveTo(0, -15, 10, -15, 10, -10); mtCtx.bezierCurveTo(10, -5, 0, -3, 0, 3);
                    mtCtx.fill(); mtCtx.restore();
                } 
                else if (tStyle === 'geometric') {
                    p.x += p.speedX; p.y += p.speedY; p.rot += p.rotSpeed;
                    mtCtx.save(); mtCtx.translate(p.x, p.y); mtCtx.rotate(p.rot);
                    if(p.shape === 'square') mtCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                    else if(p.shape === 'triangle') {
                        mtCtx.beginPath(); mtCtx.moveTo(0, -p.size); mtCtx.lineTo(p.size*0.866, p.size*0.5); mtCtx.lineTo(-p.size*0.866, p.size*0.5); mtCtx.fill();
                    }
                    else if(p.shape === 'circle') {
                        mtCtx.beginPath(); mtCtx.arc(0,0, p.size/1.5, 0, Math.PI*2); mtCtx.fill();
                    }
                    else if(p.shape === 'cross') {
                        mtCtx.fillRect(-p.size, -p.size/4, p.size*2, p.size/2);
                        mtCtx.fillRect(-p.size/4, -p.size, p.size/2, p.size*2);
                    }
                    mtCtx.restore();
                }
                else if (tStyle === 'neon') {
                    if (i === trailParticles.length - 1) {
                         mtCtx.fillStyle = `rgba(255, 255, 255, 0.9)`;
                         mtCtx.beginPath(); mtCtx.arc(p.x, p.y, 3, 0, Math.PI * 2); mtCtx.fill();
                    }
                }
            }

            for (let i = 0; i < clickParticles.length; i++) {
                let cp = clickParticles[i];
                cp.life -= 0.015; 
                if(cp.life <= 0) { clickParticles.splice(i, 1); i--; continue; }
                
                let clickColor = mtDynamic ? `hsla(${effectHue}, 100%, 65%, ${cp.life})` : `rgba(${tColor}, ${cp.life})`;
                
                if (cp.type === 'ripple') {
                    mtCtx.strokeStyle = clickColor;
                    mtCtx.lineWidth = 2;
                    mtCtx.beginPath();
                    mtCtx.arc(cp.x, cp.y, (1 - cp.life) * cp.maxRadius, 0, Math.PI * 2);
                    mtCtx.stroke();
                } 
                else if (cp.type === 'burst') {
                    cp.x += cp.vx; cp.y += cp.vy;
                    mtCtx.fillStyle = clickColor;
                    mtCtx.beginPath();
                    mtCtx.arc(cp.x, cp.y, 4 * cp.life, 0, Math.PI*2);
                    mtCtx.fill();
                } 
                else if (cp.type === 'geo') {
                    cp.x += cp.vx; cp.y += cp.vy; cp.rot += cp.rotSpeed;
                    mtCtx.fillStyle = clickColor;
                    mtCtx.save();
                    mtCtx.translate(cp.x, cp.y);
                    mtCtx.rotate(cp.rot);
                    if(cp.shape === 'square') mtCtx.fillRect(-cp.size/2, -cp.size/2, cp.size, cp.size);
                    else if(cp.shape === 'triangle') {
                        mtCtx.beginPath(); mtCtx.moveTo(0, -cp.size); mtCtx.lineTo(cp.size*0.866, cp.size*0.5); mtCtx.lineTo(-cp.size*0.866, cp.size*0.5); mtCtx.fill();
                    }
                    else if(cp.shape === 'circle') {
                        mtCtx.beginPath(); mtCtx.arc(0,0, cp.size/1.5, 0, Math.PI*2); mtCtx.fill();
                    }
                    mtCtx.restore();
                }
            }
        }

