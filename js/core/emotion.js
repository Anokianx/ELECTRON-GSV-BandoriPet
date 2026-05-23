        const LIVE2D_EMOTION_MAP = {
            normal: { expressions: ['default', 'normal', 'idle01', 'idle'], motions: ['idle01', 'idle02', 'idle', 'nf01', 'f01'] },
            happy: { expressions: ['smile01', 'smile02', 'smile03', 'happy', 'kandou', 'special01', 'special02', 'default', 'surprised'], motions: ['smile01', 'smile02', 'smile03', 'gattsu01', 'jaan01', 'kime01', 'happy01', 'happy02', 'smile', 'gattsu', 'kandou'] },
            angry: { expressions: ['serious02', 'serious01', 'worry', 'angry', 'default'], motions: ['angry01', 'angry02', 'angry03', 'pui01', 'serious01', 'angry'] },
            sad: { expressions: ['sad', 'worry', 'worry2', 'default'], motions: ['sad01', 'cry01', 'cry02', 'sad', 'cry'] },
            thinking: { expressions: ['thinking01', 'worry', 'worry2', 'serious01', 'eeto01', 'default'], motions: ['thinking01', 'thinking02', 'thinking03', 'nf01', 'nf02', 'nf03', 'nnf01', 'eeto01', 'odoodo01', 'thinking', 'nf', 'nnf'] },
            serious: { expressions: ['serious01', 'serious02', 'worry', 'default'], motions: ['serious01', 'kime01', 'serious'] },
            surprised: { expressions: ['surprised', 'worry2', 'default'], motions: ['surprised01', 'surprised'] },
            shame: { expressions: ['shame01', 'worry2', 'worry', 'awate01', 'panic', 'default'], motions: ['shame01', 'awate01', 'awate02', 'odoodo01', 'shame'] },
            bye: { expressions: ['default'], motions: ['bye01', 'bye'] },
            sing: { expressions: ['default'], motions: ['sing01', 'sing', 'smile01', 'kime01'] },
            touch: { expressions: ['surprised', 'shame01', 'worry2', 'smile01', 'default'], motions: ['surprised01', 'shame01', 'smile01', 'kime01', 'nf01'] }
        };

        const LIVE2D_TAG_ALIASES = {
            default: 'normal', idle: 'normal', normal: 'normal', f: 'normal',
            happy: 'happy', smile: 'happy', wink: 'happy', kandou: 'happy', kime: 'happy',
            angry: 'angry', pui: 'angry',
            sad: 'sad', cry: 'sad',
            thinking: 'thinking', nf: 'thinking', nnf: 'thinking', odoodo: 'thinking', eeto: 'thinking',
            serious: 'serious', surprised: 'surprised',
            shame: 'shame', scared: 'shame', worry: 'shame',
            bye: 'bye', sing: 'sing', touch: 'touch', tap: 'touch'
        };

        function normalizeEmotionTag(rawTag) {
            let tag = String(rawTag || '').toLowerCase().trim();
            tag = tag.replace(/\.exp(?:\.json)?$/i, '').replace(/\.mtn$/i, '');
            const tagPrefix = tag.split('_')[0];
            if (typeof charactersConfig !== 'undefined' && charactersConfig[tagPrefix]) {
                tag = tag.slice(tagPrefix.length + 1);
            }
            tag = tag.replace(/\d+$/g, '');
            if (LIVE2D_TAG_ALIASES[tag]) return LIVE2D_TAG_ALIASES[tag];
            if (tag.includes('angry') || tag.includes('pui')) return 'angry';
            if (tag.includes('sad') || tag.includes('cry')) return 'sad';
            if (tag.includes('smile') || tag.includes('happy') || tag.includes('wink') || tag.includes('kime')) return 'happy';
            if (tag.includes('think') || tag.includes('worry') || tag.includes('odoodo') || tag === 'nf' || tag === 'nnf') return 'thinking';
            if (tag.includes('serious')) return 'serious';
            if (tag.includes('surpris')) return 'surprised';
            if (tag.includes('shame') || tag.includes('scared') || tag.includes('awate')) return 'shame';
            if (tag.includes('bye')) return 'bye';
            if (tag.includes('sing')) return 'sing';
            if (tag.includes('default') || tag.includes('normal') || tag.includes('idle')) return 'normal';
            return available[0] || '';
        }

        function extractEmotionTags(replyText) {
            const tags = [];
            const seen = new Set();
            const tagRegex = /(?:\[|【)([a-zA-Z0-9_\.]+)(?:\]|】)/g;
            let match;
            while ((match = tagRegex.exec(String(replyText || ''))) !== null) {
                const normalized = normalizeEmotionTag(match[1]);
                if (normalized && LIVE2D_EMOTION_MAP[normalized] && !seen.has(normalized)) {
                    tags.push(normalized);
                    seen.add(normalized);
                }
                if (tags.length >= 3) break;
            }
            if (tags.length > 0) return tags;

            const text = String(replyText || '').replace(tagRegex, '');
            let inferred = 'normal';
            if (/生气|愤怒|不允许|请认真|荒唐|angry/i.test(text)) inferred = 'angry';
            else if (/难过|遗憾|抱歉|哭|失落|sad|sorry/i.test(text)) inferred = 'sad';
            else if (/恭喜|太好了|很好|不错|开心|高兴|happy|great/i.test(text)) inferred = 'happy';
            else if (/让我想想|需要确认|也就是说|从逻辑上|可能|perhaps|thinking/i.test(text)) inferred = 'thinking';
            else if (/意外|惊讶|竟然|surprised/i.test(text)) inferred = 'surprised';
            return [inferred];
        }

        function expandExpressionCandidates(names, charId) {
            const candidates = [];
            names.forEach((name) => {
                if (!name) return;
                if (name.includes('_')) candidates.push(name);
                else candidates.push(charId + '_' + name, name);
            });
            return candidates;
        }

        function normalizeResourceName(name) {
            let value = String(name || '').toLowerCase()
                .replace(/\.(?:exp\.json|mtn)$/g, '')
                .replace(/\d+$/g, '');
            const prefix = value.split('_')[0];
            if (typeof charactersConfig !== 'undefined' && charactersConfig[prefix]) {
                value = value.slice(prefix.length + 1);
            }
            return value;
        }

        function pickAvailableName(candidates, availableNames) {
            if (!availableNames || availableNames.size === 0) return candidates[0] || '';
            const direct = candidates.find((name) => availableNames.has(name));
            if (direct) return direct;
            const available = Array.from(availableNames);
            for (const candidate of candidates) {
                const normalizedCandidate = normalizeResourceName(candidate);
                const fuzzy = available.find((name) => {
                    const normalizedName = normalizeResourceName(name);
                    return normalizedName === normalizedCandidate
                        || normalizedName.includes(normalizedCandidate)
                        || normalizedCandidate.includes(normalizedName);
                });
                if (fuzzy) return fuzzy;
            }
            return '';
        }

        function clearVoiceEmotionTimers() {
            voiceEmotionTimers.forEach((timer) => clearTimeout(timer));
            voiceEmotionTimers = [];
        }

        function applyLive2DEmotion(tag, charId = localStorage.getItem('current_char') || 'anon') {
            if (!live2dModel) return;
            const normalized = normalizeEmotionTag(tag) || 'normal';
            const emotion = LIVE2D_EMOTION_MAP[normalized] || LIVE2D_EMOTION_MAP.normal;
            const expressionName = pickAvailableName(expandExpressionCandidates(emotion.expressions, charId), currentLive2dExpressionNames);
            const motionName = pickAvailableName(emotion.motions, currentLive2dMotionNames);
            if (expressionName) {
                try { live2dModel.expression(expressionName); } catch (error) { console.warn('[emotion] expression failed:', expressionName, error.message); }
            }
            if (motionName) {
                try { live2dModel.motion(motionName); } catch (error) { console.warn('[emotion] motion failed:', motionName, error.message); }
            }
        }

        function applyLive2DResourcePair(expressionName, motionName) {
            if (!live2dModel) return;
            if (expressionName) {
                try { live2dModel.expression(expressionName); } catch (error) { console.warn('[click-action] expression failed:', expressionName, error.message); }
            }
            if (motionName) {
                try { live2dModel.motion(motionName); } catch (error) { console.warn('[click-action] motion failed:', motionName, error.message); }
            }
        }

        function restoreLive2DNeutral(charId = localStorage.getItem('current_char') || 'anon') {
            clearVoiceEmotionTimers();
            applyLive2DEmotion('normal', charId);
        }

        function startVoiceEmotionActions(tags, charId, audio = null) {
            clearVoiceEmotionTimers();
            const sequence = (Array.isArray(tags) && tags.length > 0 ? tags : ['normal']).slice(0, 3);
            const durationMs = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : 0;
            const stepMs = durationMs > 0 ? Math.max(1500, Math.min(3500, durationMs / (sequence.length + 1))) : 2600;
            sequence.forEach((tag, index) => {
                const delay = index === 0 ? 0 : Math.round(stepMs * index);
                if (delay === 0) applyLive2DEmotion(tag, charId);
                else voiceEmotionTimers.push(setTimeout(() => applyLive2DEmotion(tag, charId), delay));
            });
        }

        function pickRandomLive2DName(names, previousName = '') {
            if (!Array.isArray(names) || names.length === 0) return '';
            if (names.length === 1) return names[0];
            const pool = names.filter((name) => name && name !== previousName);
            const source = pool.length > 0 ? pool : names;
            return source[Math.floor(Math.random() * source.length)] || '';
        }

        function playLive2DClickFeedback() {
            if (!live2dModel) return;
            if (typeof modelDragMoved !== 'undefined' && modelDragMoved) return;
            if (Date.now() - lastLive2DClickAt < 700) return;
            lastLive2DClickAt = Date.now();
            const charId = localStorage.getItem('current_char') || 'anon';
            const maxCount = Math.max(currentLive2dMotionList.length, currentLive2dExpressionList.length);
            if (maxCount > 0) {
                const motionName = pickRandomLive2DName(currentLive2dMotionList, lastLive2DClickMotionName);
                const expressionName = pickRandomLive2DName(currentLive2dExpressionList, lastLive2DClickExpressionName);
                if (motionName) lastLive2DClickMotionName = motionName;
                if (expressionName) lastLive2DClickExpressionName = expressionName;
                applyLive2DResourcePair(expressionName, motionName);
            } else {
                applyLive2DEmotion('touch', charId);
            }
            clearVoiceEmotionTimers();
            voiceEmotionTimers.push(setTimeout(() => restoreLive2DNeutral(charId), 2400));
        }

        function bindLive2DInteractionFeedback() {
            if (!live2dModel) return;
            try { live2dModel.off('pointertap', playLive2DClickFeedback); } catch(e) {}
            live2dModel.interactive = true;
            live2dModel.buttonMode = true;
            live2dModel.on('pointertap', playLive2DClickFeedback);
        }
        // ===== LIVE2D_EMOTION_INTERACTION_PATCH END =====
