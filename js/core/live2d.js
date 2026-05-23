        async function loadCustomModel(charId, outfitId) {
            applyBgMode(); 
            if (live2dModel) {
                app.stage.removeChild(live2dModel);
                live2dModel.destroy();
                live2dModel = null;
            }
            document.getElementById('app-title').innerText = ` Bandori Desktop Pet`;
            try {
                const basePath = `model/${charId}/${outfitId}/`;
                const modelUrl = `${basePath}model.json`;
                const response = await fetch(modelUrl);
                const modelJson = await response.json();
                modelJson.url = modelUrl; 
                const mtnFolder = charactersConfig[charId].mtnFolder;
                const relativeMtnPath = `../../_mtn_emp/${mtnFolder}/`; 
                const absoluteMtnPath = path.join(__dirname, 'model', '_mtn_emp', mtnFolder);
                let autoMotions = {};
                let autoExpressions = [];
                if (fs.existsSync(absoluteMtnPath)) {
                    const files = fs.readdirSync(absoluteMtnPath);
                    files.forEach(file => {
                        if (file.endsWith('.mtn')) {
                            const actionName = file.replace(/[0-9]*\.mtn$/, '');
                            if (!autoMotions[actionName]) {
                                autoMotions[actionName] = [];
                            }
                            autoMotions[actionName].push({"file": relativeMtnPath + file});
                            
                        } else if (file.endsWith('.exp.json')) {
                            const expName = file.replace(/[0-9]*\.exp\.json$/, '');
                            autoExpressions.push({"name": expName, "file": relativeMtnPath + file});
                        }
                    });
                } else {
                    console.warn(`找不到动作文件夹: ${absoluteMtnPath}`);
                }
                modelJson.motions = { ...(modelJson.motions || {}), ...autoMotions };
                const expressionByName = new Map();
                [...(modelJson.expressions || []), ...autoExpressions].forEach((expression) => {
                    if (expression && expression.name) expressionByName.set(expression.name, expression);
                });
                modelJson.expressions = Array.from(expressionByName.values());
                currentLive2dMotionNames = new Set(Object.keys(modelJson.motions || {}));
                currentLive2dExpressionNames = new Set((modelJson.expressions || []).map(exp => exp.name).filter(Boolean));
                currentLive2dMotionList = Array.from(currentLive2dMotionNames).sort();
                currentLive2dExpressionList = Array.from(currentLive2dExpressionNames).sort();
                lastLive2DClickMotionName = '';
                lastLive2DClickExpressionName = '';
                const isLookEnabled = (localStorage.getItem('mouse_follow_enabled') !== 'false');
                live2dModel = await PIXI.live2d.Live2DModel.from(modelJson, { 
                    basePath: basePath, 
                    autoInteract: isLookEnabled 
                });
                app.stage.addChild(live2dModel);
                window.live2dPet = live2dModel;
                live2dModel.scale.set(parseFloat(localStorage.getItem('anon_scale')) || 0.2); 
                live2dModel.x = parseFloat(localStorage.getItem('anon_x')) || 0;          
                live2dModel.y = parseFloat(localStorage.getItem('anon_y')) || 0;       
                bindLive2DInteractionFeedback();
                const isDragEnabled = (localStorage.getItem('model_drag_enabled') === 'true');
                const dragToggle = document.getElementById('menu-set-drag');
                if (dragToggle) dragToggle.checked = isDragEnabled;
                if (isDragEnabled) {
                    toggleModelDrag(true);
                }
            } catch (error) {
                console.error("加载模型失败，请检查文件夹名称是否正确对应：", error);
                addChatMessage("加载失败了！请检查 model 文件夹名称是否正确哦！", 'ai');
            }
            setTimeout(() => {
                if (window.live2dPet) {
                    window.live2dPet.updateTransform();
                    syncUIPhysics(); 
                }
            }, 150); 
        }

        let dragData = null;
        let draggingModel = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        let modelDragMoved = false;
        let modelDragStartX = 0;
        let modelDragStartY = 0;
        function toggleModelDrag(enabled) {
            localStorage.setItem('model_drag_enabled', enabled);
            
            if (!live2dModel) return;
            if (enabled) {
                live2dModel.interactive = true;
                live2dModel.buttonMode = true; 
                live2dModel.on('pointerdown', onDragStart)
                           .on('pointerup', onDragEnd)
                           .on('pointerupoutside', onDragEnd)
                           .on('pointermove', onDragMove);
            } else {
                live2dModel.interactive = false;
                live2dModel.buttonMode = false;
                live2dModel.off('pointerdown', onDragStart)
                           .off('pointerup', onDragEnd)
                           .off('pointerupoutside', onDragEnd)
                           .off('pointermove', onDragMove);
                bindLive2DInteractionFeedback();
            }
        }

        function toggleMouseFollow(enabled) {
            localStorage.setItem('mouse_follow_enabled', enabled);
            if (!live2dModel) return;
            
            live2dModel.autoInteract = enabled;
            
            if (!enabled) {
                if (live2dModel.internalModel && live2dModel.internalModel.coreModel) {
                    ["ParamAngleX", "ParamAngleY", "ParamAngleZ", "ParamEyeBallX", "ParamEyeBallY"].forEach(id => {
                        try { live2dModel.internalModel.coreModel.setParameterValueById(id, 0); } catch(e){}
                    });
                }
            }
        }
        
        function onDragStart(event) {
            dragData = event.data;
            draggingModel = true;
            const newPosition = dragData.getLocalPosition(this.parent);
            modelDragMoved = false;
            modelDragStartX = newPosition.x;
            modelDragStartY = newPosition.y;
            dragOffsetX = this.x - newPosition.x;
            dragOffsetY = this.y - newPosition.y;
        }

        function onDragEnd() {
            draggingModel = false;
            dragData = null;
            setTimeout(() => { modelDragMoved = false; }, 120);
            
            const newX = Math.round(this.x);
            const newY = Math.round(this.y);
            
            const xInput = document.getElementById('menu-set-x');
            const yInput = document.getElementById('menu-set-y');
            if (xInput && yInput) {
                xInput.value = newX;
                yInput.value = newY;
            }
            localStorage.setItem('anon_x', newX);
            localStorage.setItem('anon_y', newY);
        }

        function onDragMove() {
            if (draggingModel) {
                const newPosition = dragData.getLocalPosition(this.parent);
                if (Math.abs(newPosition.x - modelDragStartX) > 6 || Math.abs(newPosition.y - modelDragStartY) > 6) {
                    modelDragMoved = true;
                }
                this.x = newPosition.x + dragOffsetX;
                this.y = newPosition.y + dragOffsetY;
            }
        }
