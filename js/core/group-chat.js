        let ipadChatData = []; 
        let currentIpadChatId = null;

        setInterval(() => {
            const now = new Date();
            const el = document.getElementById('ipad-top-time');
            if(el) el.innerText = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        }, 1000);

        function initIpadChats() { renderIpadChatList(); renderIpadChatHistory(); }
        function getChatDisplayName(chat) { return chat.isGroup ? chat.name : (chat.alias || chat.name); }

        function renderIpadChatList() {
            const listContainer = document.getElementById('ipad-chat-list-container');
            listContainer.innerHTML = '';
            if(ipadChatData.length === 0) {
                listContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: #999; font-size: 13px;">暂无聊天记录<br>点击上方 ⊕ 自动检索角色</div>`;
                return;
            }
            ipadChatData.forEach(chat => {
                const isActive = chat.id === currentIpadChatId ? 'active' : '';
                const lastMsg = chat.msg.length > 0 ? chat.msg[chat.msg.length-1].text : '';
                listContainer.innerHTML += `
                    <div class="chat-list-item ${isActive}" onclick="switchIpadChat('${chat.id}')">
                        <img src="${chat.icon}" class="chat-list-avatar" onerror="this.src='avatar.png'">
                        <div class="chat-list-info">
                            <div class="chat-list-name">${getChatDisplayName(chat)}</div>
                            <div class="chat-list-preview">${lastMsg}</div>
                        </div>
                    </div>`;
            });
        }

        function switchIpadChat(id) {
            currentIpadChatId = id;
            document.getElementById('chat-settings-btn').style.display = 'block'; 
            renderIpadChatList(); renderIpadChatHistory();
        }

        function renderIpadChatHistory() {
            const historyEl = document.getElementById('ipad-chat-history');
            const titleEl = document.getElementById('current-chat-title');
            const inputArea = document.querySelector('.ipad-input-area');
            const inputEl = document.getElementById('ipad-user-input');
            const settingsBtn = document.getElementById('chat-settings-btn');
            
            if (!currentIpadChatId) {
                titleEl.innerText = "请在左侧选择或添加联系人";
                settingsBtn.style.display = 'none'; historyEl.innerHTML = ''; return;
            }

            const chat = ipadChatData.find(c => c.id === currentIpadChatId);
            titleEl.innerText = getChatDisplayName(chat);
            historyEl.innerHTML = '<div class="sys-msg-bubble">今天</div>';
            
            if (chat.isKicked) {
                inputArea.style.opacity = '0.5'; inputArea.style.pointerEvents = 'none';
                inputEl.placeholder = "你已被移出该群聊"; settingsBtn.style.display = 'none';
            } else {
                inputArea.style.opacity = '1'; inputArea.style.pointerEvents = 'auto';
                inputEl.placeholder = "Aa"; settingsBtn.style.display = 'block';
            }
            
            chat.msg.forEach(m => {
                if (m.sender === 'sys') historyEl.innerHTML += `<div class="sys-msg-bubble">${m.text}</div>`;
                else if (m.sender === 'user') historyEl.innerHTML += `<div class="group-msg-row group-msg-right"><div class="group-msg-content"><div class="g-bubble">${m.text}</div></div></div>`;
                else {
                    const nicknameHtml = chat.isGroup ? `<span class="group-nickname">${m.name}</span>` : '';
                    historyEl.innerHTML += `<div class="group-msg-row group-msg-left"><img src="${m.icon}" class="group-avatar" onerror="this.src='avatar.png'"><div class="group-msg-content">${nicknameHtml}<div class="g-bubble">${m.text}</div></div></div>`;
                }
            });
            historyEl.scrollTop = historyEl.scrollHeight;
        }

        function showAddChatModal() {
            const list = document.getElementById('ipad-contact-list');
            list.innerHTML = `<div class="chat-list-item" onclick="createBandGroupChat()" style="border-bottom: 1px solid #eee;"><div class="chat-list-avatar" style="background:#00C300; display:flex; justify-content:center; align-items:center; color:#fff; font-weight:bold;">群</div><div class="chat-list-info"><div class="chat-list-name" style="color:#00C300;">新建群聊</div></div></div>`;
            for (let id in charactersConfig) {
                list.innerHTML += `<div class="chat-list-item" onclick="addNewIpadChat('${id}')"><img src="assets/icon_${id}.png" class="chat-list-avatar" onerror="this.src='avatar.png'"><div class="chat-list-info"><div class="chat-list-name">${charactersConfig[id].name}</div></div></div>`;
            }
            document.getElementById('ipad-add-modal').style.display = 'flex';
        }

        function addNewIpadChat(charId) {
            document.getElementById('ipad-add-modal').style.display = 'none';
            if (ipadChatData.find(c => c.id === charId)) { switchIpadChat(charId); return; }
            ipadChatData.unshift({ id: charId, name: charactersConfig[charId].name, alias: "", isGroup: false, icon: `assets/icon_${charId}.png`, msg: [{ sender: 'sys', text: '你们已成为 LINE 好友，现在可以开始聊天了。' }] });
            switchIpadChat(charId);
        }

        async function callChatAPI(chat, typingHint = "发送中...") {
            const historyEl = document.getElementById('ipad-chat-history');
            const fetchTypingId = 'fetch-' + Date.now();
            if (currentIpadChatId === chat.id) {
                historyEl.innerHTML += `<div id="${fetchTypingId}" class="sys-msg-bubble">${typingHint}</div>`;
                historyEl.scrollTop = historyEl.scrollHeight;
            }

            const chatHistory = chat.msg.slice(-15).map(m => {
                if (m.sender === 'user') return { role: 'user', content: m.text };
                if (m.sender === 'sys') return { role: 'user', content: `[系统消息]: ${m.text}` };
                if (m.sender === 'ai') return { role: 'assistant', content: chat.isGroup ? `${m.name}: ${m.text}` : m.text };
                return null;
            }).filter(m => m !== null);

            function getCharPrompt(id) { return localStorage.getItem('prompt_' + id) || (charactersConfig[id] ? charactersConfig[id].prompt : ""); }

            let systemPrompt = "";

            if (chat.isGroup) {
                let activePersonas = "";
                chat.members.forEach(id => { 
                    if(charactersConfig[id]) {
                        activePersonas += `\n【${charactersConfig[id].name}】的设定：\n${getCharPrompt(id)}\n`; 
                    }
                });
                systemPrompt = `你正在模拟名为“${chat.name}”的LINE群聊。向你发送消息的是玩家。群成员包括你扮演的以下角色：\n${activePersonas}\n【格式与互动规则】：\n1. 格式严格为“角色姓名: 回复内容”。禁止多余旁白和外语翻译。\n2. 【随机发言】：每次只挑选随机数量的最可能接话的人发言或者无人在意。\n3. 【逆向踢人】：如果玩家惹人厌，可以在回复中加 [KICK_USER] 。\n4. 如果大家都无视玩家，直接输出：[无回复]`;
            } else {
                const aliasText = chat.alias ? `\n玩家给你在LINE上备注的昵称是：“${chat.alias}”。` : "";
                systemPrompt = `你现在的身份是【${chat.name}】。${aliasText}\n你的性格设定如下：\n` + getCharPrompt(chat.id) + `\n【真实聊天模拟】：你正在和玩家私聊。如果不想理他直接输出：[无回复]`;
            }

            const activeAPI = localStorage.getItem('api_preset') || "deepseek"; 
            const apiConfigs = {
                "deepseek": { url: "", model: "" },
                "gemini": { url: "", key: "", model: "gemini-3.1-flash-lite-preview" },
                "openai": { url: "", key: "", model: "gpt-5.4-2026-03-05" },
                "qwen": { url: "", key: "", model: "qwen3.6-max-preview" }
            };
            const API = apiConfigs[activeAPI];

            try {
                let aiReply = "";
                if (activeAPI === "gemini") {
                    const geminiHistory = chatHistory.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));
                    const response = await fetch(`${API.url}${API.key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: geminiHistory }) });
                    const data = await response.json(); if (data.error) throw new Error(data.error.message);
                    aiReply = data.candidates[0].content.parts[0].text;
                } else {
                    const response = await fetch(API.url, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API.key}` }, body: JSON.stringify({ model: API.model, messages: [ {"role": "system", "content": systemPrompt}, ...chatHistory ], temperature: 0.7 }) });
                    const data = await response.json(); if (data.error) throw new Error(data.error.message);
                    aiReply = data.choices[0].message.content;
                }

                const fEl = document.getElementById(fetchTypingId);

                if (fEl) fEl.remove();
                if (aiReply.includes("[无回复]") || aiReply.trim() === "") return; 
                aiReply = aiReply.replace(/(?:\[|<)(\/?(?:ja|zh|en|ko|yue|es))(?:\]|>)/gi, '<$1>');
                const validLangsGroup = ['ja', 'zh', 'en', 'ko', 'yue', 'es', '/ja', '/zh', '/en', '/ko', '/yue', '/es'];
                aiReply = aiReply.replace(/<([^>]+)>/g, (match, innerText) => {
                    if (validLangsGroup.includes(innerText.toLowerCase().trim())) {
                        return match; 
                    }
                    return `[${innerText}]`; 
                });
                const lines = chat.isGroup ? aiReply.split('\n') : [`${chat.name}: ${aiReply}`];

                let parsedMsgs = [];
                
                for (let line of lines) {
                    if (!line.trim() || line.includes("[无回复]")) continue;
                    
                    let isKickLine = false;
                    if (line.includes("[KICK_USER]")) { isKickLine = true; line = line.replace("[KICK_USER]", "").trim(); }
                    
                    let sepIdx = line.indexOf(':'); if (sepIdx === -1) sepIdx = line.indexOf('：'); 
                    
                    if (sepIdx !== -1) {
                        const speakerName = line.substring(0, sepIdx).trim();
                        let rawReply = line.substring(sepIdx + 1).trim(); 
                        
                        let matchedIcon = chat.isGroup ? 'avatar.png' : chat.icon, matchedId = chat.isGroup ? 'anon' : chat.id;
                        if (chat.isGroup) {
                            for (let id in charactersConfig) {
                                if (charactersConfig[id].name.includes(speakerName) || speakerName.includes(charactersConfig[id].name)) {
                                    matchedIcon = `assets/icon_${id}.png`; matchedId = id; break;
                                }
                            }
                        }

                        let displayText = rawReply.replace(/<[a-zA-Z]+>[\s\S]*?<\/[a-zA-Z]+>/g, '').trim();

                        const actionRegex = /(?:\[|【)[a-zA-Z0-9_\.]+(?:\]|】)/g;
                        const rpRegex = /[（\(][^）\)]*[）\)]|\*.*?\*/g;
                        displayText = displayText.replace(actionRegex, '').replace(rpRegex, '').trim();

                        if (displayText || isKickLine) {
                            parsedMsgs.push({ speakerName, replyText: displayText, icon: matchedIcon, isKickLine, charId: matchedId });
                        }
                    }
                }

                for (let i = 0; i < parsedMsgs.length; i++) {
                    let msgData = parsedMsgs[i];

                    if (msgData.replyText) {
                        chat.msg.push({ 
                            sender: 'ai', name: msgData.speakerName, 
                            text: msgData.replyText, icon: msgData.icon 
                        });
                        if (typeof uiClickSound !== 'undefined') { uiClickSound.currentTime = 0; uiClickSound.play().catch(()=>{}); }
                    }

                    if (msgData.isKickLine) {
                        if (localStorage.getItem('anti_kick_enable') === 'true') {
                            chat.msg.push({ sender: 'sys', text: `[系统警告] ${msgData.speakerName} 试图将你移出群聊，但被拦截了！` });
                        } else {
                            chat.isKicked = true; chat.msg.push({ sender: 'sys', text: `${msgData.speakerName} 将你移出了群聊。` });
                        }
                    }
                    if (msgData.isKickLine && localStorage.getItem('anti_kick_enable') !== 'true') break; 
                }
                if (currentIpadChatId === chat.id) { renderIpadChatHistory(); renderIpadChatList(); }

            } catch (error) {
                console.error("API 请求失败:", error);
                const fEl = document.getElementById(fetchTypingId); if (fEl) fEl.remove();
                chat.msg.push({ sender: 'sys', text: '【系统提示】网络连接断开了...' });
                if (currentIpadChatId === chat.id) renderIpadChatHistory();
            }
        }

        async function sendGroupMessage() {
            const inputEl = document.getElementById('ipad-user-input');
            const text = inputEl.value.trim();
            if (!text || !currentIpadChatId) return;
            const chat = ipadChatData.find(c => c.id === currentIpadChatId);
            if (chat.isKicked) return; 
            chat.msg.push({ sender: 'user', text: text }); inputEl.value = '';
            renderIpadChatHistory(); renderIpadChatList(); 
            await callChatAPI(chat, "发送中...");
        }

        let pendingGroupName = "";
        function createBandGroupChat() {
            document.getElementById('ipad-add-modal').style.display = 'none';
            showIpadPrompt("请输入群聊名称：", "新乐队群组", (name) => {
                if(!name || !name.trim()) return; 
                pendingGroupName = name.trim(); showMemberSelection(); 
            });
        }

        function showMemberSelection() {
            const list = document.getElementById('ipad-member-list');
            list.innerHTML = '';
            for (let id in charactersConfig) {
                list.innerHTML += `<label style="display: flex; align-items: center; padding: 10px 0; cursor: pointer; border-bottom: 1px solid #f5f5f5;"><input type="checkbox" value="${id}" class="group-member-checkbox" style="margin-right: 15px; width: 20px; height: 20px; accent-color: #00C300;"><img src="assets/icon_${id}.png" style="width: 36px; height: 36px; border-radius: 50%; margin-right: 12px; object-fit: cover; background: #eee;" onerror="this.src='avatar.png'"><span style="font-size: 15px; color: #333; font-weight: bold;">${charactersConfig[id].name}</span></label>`;
            }
            document.getElementById('ipad-member-modal').style.display = 'flex';
        }

        function confirmGroupMembers() {
            const checkboxes = document.querySelectorAll('.group-member-checkbox');
            const selectedMembers = []; let memberNames = [];
            checkboxes.forEach(cb => { if (cb.checked) { selectedMembers.push(cb.value); memberNames.push(charactersConfig[cb.value].name); } });
            if (selectedMembers.length === 0) { showIpadPrompt("建群失败", "至少需要邀请一名成员！", () => {}); return; }
            document.getElementById('ipad-member-modal').style.display = 'none';
            const newId = 'group_' + Date.now();
            const newChat = { id: newId, name: pendingGroupName, isGroup: true, icon: 'avatar.png', members: selectedMembers, isKicked: false, msg: [{ sender: 'sys', text: `你邀请了 ${memberNames.join('、')} 加入群聊。` }] };
            ipadChatData.unshift(newChat); switchIpadChat(newId);
            callChatAPI(newChat, "大家正在看系统提示...");
        }

        let promptCallback = null;
        function showIpadPrompt(message, defaultValue, callback) {
            document.getElementById('ipad-prompt-text').innerText = message;
            const inputEl = document.getElementById('ipad-prompt-input');
            inputEl.value = defaultValue || ''; document.getElementById('ipad-prompt-modal').style.display = 'flex';
            inputEl.focus(); promptCallback = callback;
        }
        function closeIpadPrompt(isConfirm) {
            document.getElementById('ipad-prompt-modal').style.display = 'none';
            if (promptCallback) { promptCallback(isConfirm ? document.getElementById('ipad-prompt-input').value : null); promptCallback = null; }
        }

        function editCurrentChatInfo() {
            if (!currentIpadChatId) return;
            const chat = ipadChatData.find(c => c.id === currentIpadChatId);
            if (chat.isGroup) {
                document.getElementById('manage-group-name-input').value = chat.name;
                renderGroupManageLists(chat); document.getElementById('ipad-group-manage-modal').style.display = 'flex';
            } else {
                showIpadPrompt(`为 ${chat.name} 设置备注名：\n(留空则恢复原名)`, chat.alias || "", (newAlias) => {
                    if (newAlias !== null) { chat.alias = newAlias.trim(); chat.msg.push({ sender: 'sys', text: chat.alias ? `你将备注名修改为了“${chat.alias}”` : `你清除了备注名` }); renderIpadChatList(); renderIpadChatHistory(); }
                });
            }
        }

        function renderGroupManageLists(chat) {
            const currentList = document.getElementById('manage-current-members');
            const inviteList = document.getElementById('manage-invite-members');
            currentList.innerHTML = ''; inviteList.innerHTML = '';
            for (let id in charactersConfig) {
                const char = charactersConfig[id]; const isMember = chat.members.includes(id);
                const html = `<div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #f5f5f5;"><div style="display: flex; align-items: center;"><img src="assets/icon_${id}.png" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; object-fit: cover; background: #eee;" onerror="this.src='avatar.png'"><span style="font-size: 14px; color: #333; font-weight: bold;">${char.name}</span></div>${isMember ? `<button onclick="kickGroupMember('${chat.id}', '${id}')" style="background: #ff4757; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: bold;">踢出</button>` : `<button onclick="inviteGroupMember('${chat.id}', '${id}')" style="background: #00C300; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: bold;">邀请</button>`}</div>`;
                if (isMember) currentList.innerHTML += html; else inviteList.innerHTML += html;
            }
            if (inviteList.innerHTML === '') inviteList.innerHTML = '<div style="padding: 15px; text-align: center; color: #ccc; font-size: 12px;">所有好友都在群里啦</div>';
        }

        function saveManageGroupName() {
            const chat = ipadChatData.find(c => c.id === currentIpadChatId);
            const newName = document.getElementById('manage-group-name-input').value.trim();
            if (newName && newName !== chat.name) {
                chat.name = newName; chat.msg.push({ sender: 'sys', text: `你将群名修改为了“${chat.name}”` });
                renderIpadChatList(); renderIpadChatHistory(); document.getElementById('ipad-group-manage-modal').style.display = 'none'; 
            }
        }

        function kickGroupMember(chatId, memberId) {
            const chat = ipadChatData.find(c => c.id === chatId); chat.members = chat.members.filter(id => id !== memberId);
            chat.msg.push({ sender: 'sys', text: `你将 ${charactersConfig[memberId].name} 移出了群聊。` });
            renderGroupManageLists(chat); renderIpadChatHistory(); callChatAPI(chat, "大家正在看系统消息...");
        }

        function inviteGroupMember(chatId, memberId) {
            const chat = ipadChatData.find(c => c.id === chatId); chat.members.push(memberId);
            chat.msg.push({ sender: 'sys', text: `你邀请了 ${charactersConfig[memberId].name} 加入群聊。` });
            renderGroupManageLists(chat); renderIpadChatHistory(); callChatAPI(chat, "大家正在看系统消息...");
        }

        function toggleGroupChatMenu() {
            const menu = document.getElementById('group-chat-menu');
            if (menu.style.display === 'flex') menu.style.display = 'none'; 
            else { if (ipadChatData.length === 0) initIpadChats(); menu.style.display = 'flex'; }
        }

        window.addEventListener('DOMContentLoaded', () => {
            document.documentElement.style.setProperty('--ipad-scale', localStorage.getItem('ipad_scale') || 1.0);
            const ipadMenu = document.getElementById('group-chat-menu');
            if (ipadMenu) {
                ipadMenu.style.width = (localStorage.getItem('ipad_w') || 950) + 'px';
                ipadMenu.style.height = (localStorage.getItem('ipad_h') || 650) + 'px';
                ipadMenu.style.transform = `scale(${localStorage.getItem('ipad_scale') || 1.0})`;
                ipadMenu.style.display = 'none'; 
            }
            const antiKickCheckbox = document.getElementById('anti-kick-enable');
            if (antiKickCheckbox) antiKickCheckbox.checked = localStorage.getItem('anti_kick_enable') === 'true';
            const ipadInput = document.getElementById('ipad-user-input');
            if (ipadInput) {
                ipadInput.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); }
                });
            }
        });
