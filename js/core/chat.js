        const uiClickSound = new Audio('click.mp3'); 
        uiClickSound.volume = 0.9;

        function addChatMessage(text, sender) {
            const history = document.getElementById('phone-chat-history');
            
            if (sender === 'typing') {
                const typingMsg = document.createElement('div');
                typingMsg.className = 'msg-bubble msg-typing';
                typingMsg.id = 'msg-typing-indicator';
                typingMsg.innerText = text;
                history.appendChild(typingMsg);
                history.scrollTop = history.scrollHeight;
                return;
            }

            const typingIndicator = document.getElementById('msg-typing-indicator');
            if (typingIndicator) typingIndicator.remove();

            const msgDiv = document.createElement('div');
            msgDiv.className = `msg-bubble ${sender === 'user' ? 'msg-user' : 'msg-ai'}`;
            msgDiv.innerText = text;
            history.appendChild(msgDiv);
            
            history.scrollTop = history.scrollHeight;
        }

        async function sendMessage() {
            const inputElement = document.getElementById('user-input');
            const bubbleElement = document.getElementById('chat-bubble');
            const text = inputElement.value.trim();
            if (!text) return;
            const apiConfigs = {
                "deepseek": {
                    url: "https://api.deepseek.com/v1/chat/completions",
                    key: "", 
                    model: "deepseek-chat"
                },
                "gemini": {
                    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=",
                    key: "", 
                    model: "gemini-3.1-flash-lite-preview"
                },
                "openai": {
                    url: "https://api.openai.com/v1/chat/completions",
                    key: "", 
                    model: "gpt-5.4-2026-03-05"
                },
                "qwen": {
                    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", 
                    key: "", 
                    model: "qwen3.6-max-preview" 
                }
            };

            const activeAPI = localStorage.getItem('api_preset') || "deepseek"; 
            const API_URL = apiConfigs[activeAPI].url; 
            const API_KEY = apiConfigs[activeAPI].key; 
            const MODEL_NAME = apiConfigs[activeAPI].model; 
            const charId = localStorage.getItem('current_char') || 'anon';
            const CURRENT_PROMPT = localStorage.getItem(`prompt_${charId}`) || charactersConfig[charId].prompt;
            const motionDelay = parseInt(localStorage.getItem('motion_delay')) || 4500;
            inputElement.value = '';
            addChatMessage(text, 'user');
            addChatMessage("对方正在输入...", 'typing');
           chatMemory.push({ role: 'user', text: text });
            
            if (chatMemory.length > MAX_HISTORY) {
                chatMemory = chatMemory.slice(chatMemory.length - MAX_HISTORY);
            }

            try {
                let aiReply = "";
                const currentChar = localStorage.getItem('current_char') || 'anon';
                let selectedLang = localStorage.getItem(`voice_lang_${currentChar}`) || 'ja';
                let ENFORCER = "";
                const NO_RP_ACTION = "绝对严禁使用“（）”、“()”或“*”等符号进行任何中文的动作、神态或心理描写！动作只能且必须使用规定的纯英文标签（如 [smile]）！";

                if (selectedLang === 'ja') {
                    ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将日文翻译放在 <ja> 和 </ja> 标签内！】";
                } else if (selectedLang === 'en') {
                    ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将英文翻译放在 <en> 和 </en> 标签内！】";
                } else if (selectedLang === 'zh') {
                    ENFORCER = "\n\n【系统强制指令：请直接用纯正的中文回复我，严禁输出任何外语！】";
                } else if (selectedLang === 'ko') {
                    ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将韩文翻译放在 <ko> 和 </ko> 标签内！】";
                } else if (selectedLang === 'yue') {
                    ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将粤语口语翻译放在 <yue> 和 </yue> 标签内！】";
                } else if (selectedLang === 'es') {
                    ENFORCER = "\n\n【系统强制指令：必须在中文回复后，将西班牙语翻译放在 <es> 和 </es> 标签内！】";
                }
                
                
                if (activeAPI === "gemini") {
                    const geminiHistory = chatMemory.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }]
                    }));
                    
                    geminiHistory[geminiHistory.length - 1].parts[0].text += ENFORCER;

                    const response = await fetch(`${API_URL}${API_KEY}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: CURRENT_PROMPT }] },
                            contents: geminiHistory 
                        })
                    });
                    const data = await response.json();
                    
                    if (data.error) throw new Error(data.error.message);
                    if (data.candidates && data.candidates.length > 0) {
                        aiReply = data.candidates[0].content.parts[0].text;
                    }
                } else {
                    const openaiHistory = chatMemory.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    }));
                    
                    openaiHistory[openaiHistory.length - 1].content += ENFORCER;

                    const response = await fetch(API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
                        body: JSON.stringify({
                            model: MODEL_NAME,
                            messages: [
                                {"role": "system", "content": CURRENT_PROMPT}, 
                                ...openaiHistory 
                            ],
                            temperature: 0.7
                        })
                    });
                    const data = await response.json();
                    
                    if (data.error) throw new Error(data.error.message);
                    if (data.choices && data.choices[0].message) {
                        aiReply = data.choices[0].message.content;
                    }
                }
                
                if (aiReply) {
                    aiReply = aiReply.replace(/(?:\[|<)(\/?(?:ja|zh|en|ko|yue|es))(?:\]|>)/gi, '<$1>');
                    const validLangs = ['ja', 'zh', 'en', 'ko', 'yue', 'es', '/ja', '/zh', '/en', '/ko', '/yue', '/es'];
                    aiReply = aiReply.replace(/<([^>]+)>/g, (match, innerText) => {
                        if (validLangs.includes(innerText.toLowerCase().trim())) {
                            return match; 
                        }
                        return `[${innerText}]`; 
                    });
                    const emotionTags = extractEmotionTags(aiReply);
                    chatMemory.push({ role: 'ai', text: aiReply });

                    let voiceText = aiReply;
                    let voiceLang = selectedLang; 
                    let displayText = aiReply;
                    if (selectedLang === 'ja') {
                        const match = aiReply.match(/<ja>([\s\S]*?)<\/ja>/);
                        if (match) { voiceText = match[1]; displayText = aiReply.replace(/<ja>[\s\S]*?<\/ja>/g, '').trim(); }
                    } else if (selectedLang === 'en') {
                        const match = aiReply.match(/<en>([\s\S]*?)<\/en>/);
                        if (match) { voiceText = match[1]; displayText = aiReply.replace(/<en>[\s\S]*?<\/en>/g, '').trim(); }
                    } else if (selectedLang === 'ko') {
                        const match = aiReply.match(/<ko>([\s\S]*?)<\/ko>/);
                        if (match) { voiceText = match[1]; displayText = aiReply.replace(/<ko>[\s\S]*?<\/ko>/g, '').trim(); }
                    } else if (selectedLang === 'yue') {
                        const match = aiReply.match(/<yue>([\s\S]*?)<\/yue>/);
                        if (match) { voiceText = match[1]; displayText = aiReply.replace(/<yue>[\s\S]*?<\/yue>/g, '').trim(); }
                    } else if (selectedLang === 'es') {
                        const match = aiReply.match(/<es>([\s\S]*?)<\/es>/);
                        if (match) { voiceText = match[1]; displayText = aiReply.replace(/<es>[\s\S]*?<\/es>/g, '').trim(); }
                        voiceLang = 'en'; 
                    }

                    displayText = displayText.replace(/<\/[a-zA-Z]+>/g, ''); 
                    displayText = displayText.replace(/(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g, '');
                    let cleanVoiceText = voiceText.replace(/(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g, '');
                    
                    const removeRpRegex = /[（\(][^）\)]*[）\)]|\*.*?\*/g;
                    displayText = displayText.replace(removeRpRegex, '').trim();
                    cleanVoiceText = cleanVoiceText.replace(removeRpRegex, '').trim();

                    addChatMessage(displayText, 'ai');
                    playSoVitsAudio(cleanVoiceText, voiceLang, null, emotionTags);

                } else {
                    addChatMessage("没听懂...", 'ai');
                    chatMemory.pop(); 
                }
            } catch (error) {
                console.error("API 请求失败:", error);
                addChatMessage("网络好像断了！[cry]", 'ai');
                chatMemory.pop(); 
                if(live2dModel){
                    try { live2dModel.motion("cry"); live2dModel.expression("cry"); } catch(e){}
                    setTimeout(() => { try { live2dModel.expression("default"); } catch(e){} }, 3000);
                }
            }
        }

        document.getElementById('user-input').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') sendMessage();
        });

        let currentVoice = null;
        let isFakeSpeaking = false; 
        let wasFakeSpeaking = false; 
        let fakeSpeakTimer = null;

        async function playSoVitsAudio(text, lang = "ja", speakerId = null, emotionTags = []) {
            const charId = speakerId || localStorage.getItem('current_char') || 'anon';
        if (currentVoice) {
                currentVoice.pause();
                currentVoice.currentTime = 0;
                currentVoice = null;
                restoreLive2DNeutral(charId);
            }
            
            isFakeSpeaking = false; 
            clearTimeout(fakeSpeakTimer);

            let cleanText = text.replace(/[*~#`（）()【】\[\]"'”“‘’]/g, '');
            let safeDot = (lang === 'ko' || lang === 'en' || lang === 'es') ? '.' : '。';
            cleanText = cleanText.replace(/[\n\r]+/g, safeDot).trim();
            
            if (!cleanText) {
                restoreLive2DNeutral(charId);
                return;
            }
            const lastChar = cleanText.slice(-1);
            if (!['。', '！', '？', '!', '?', '…', '.'].includes(lastChar)) cleanText += safeDot; 

            if (typeof live2dModel !== 'undefined' && live2dModel) {
                if (!live2dModel.customLipSyncInjected) {
                    live2dModel.internalModel.on('beforeModelUpdate', function() {
                        let coreModel = this.coreModel;
                        if (coreModel && isFakeSpeaking) {
                            let mouthOpen = (Math.sin(Date.now() / 80) * 0.5 + 0.5) * (Math.random() * 0.5 + 0.5);
                            
                            try { coreModel.setParameterValueById('ParamMouthOpenY', mouthOpen); } catch(e){}
                            try { coreModel.setParamFloat('ParamMouthOpenY', mouthOpen); } catch(e){}
                            
                            try { coreModel.setParameterValueById('PARAM_MOUTH_OPEN_Y', mouthOpen); } catch(e){}
                            try { coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', mouthOpen); } catch(e){}
                            
                            wasFakeSpeaking = true; 
                        } else if (coreModel && wasFakeSpeaking) {
                            try { coreModel.setParameterValueById('ParamMouthOpenY', 0); } catch(e){}
                            try { coreModel.setParamFloat('ParamMouthOpenY', 0); } catch(e){}
                            
                            try { coreModel.setParameterValueById('PARAM_MOUTH_OPEN_Y', 0); } catch(e){}
                            try { coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', 0); } catch(e){}
                            
                            wasFakeSpeaking = false; 
                        }
                    });
                    live2dModel.customLipSyncInjected = true; 
                }
            }
            const charName = charactersConfig[charId] ? charactersConfig[charId].name : charId;
            let apiUrl = `http://127.0.0.1:9880/?text=${encodeURIComponent(cleanText)}&text_language=${lang}&character=${encodeURIComponent(charName)}`;
            
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error(`API 请求失败`);
                const audioBlob = await response.blob();
                const blobUrl = URL.createObjectURL(audioBlob);

                currentVoice = new Audio(blobUrl);
                currentVoice.volume = globalVolume;
                currentVoice.onplay = () => {
                    isFakeSpeaking = true;
                    startVoiceEmotionActions(emotionTags, charId, currentVoice);
                };
                isFakeSpeaking = true; 

                currentVoice.onended = () => {
                    isFakeSpeaking = false;
                    restoreLive2DNeutral(charId);
                    URL.revokeObjectURL(blobUrl);
                    currentVoice = null;
                };
                currentVoice.onerror = () => {
                    isFakeSpeaking = false;
                    restoreLive2DNeutral(charId);
                };
                currentVoice.play().catch(e => {
                    console.error("音频播放被拦截:", e);
                    isFakeSpeaking = false;
                    restoreLive2DNeutral(charId);
                });
            } catch (error) {
                console.error("呼叫语音 API 失败，触发纯文本降级模式", error);
                isFakeSpeaking = true;
                startVoiceEmotionActions(emotionTags, charId, null);
                fakeSpeakTimer = setTimeout(() => {
                    isFakeSpeaking = false;
                    restoreLive2DNeutral(charId);
                }, Math.min(cleanText.length * 250, 10000)); 
            }
        }
