        let currentLyrics = [];
        let currentLyricIndex = -1;
        let isMusicPlaying = false;
        let localCurrentSec = 0;
        let lastSyncTime = Date.now();

        function sendMediaControl(action) {
            ipcRenderer.send('media-control', action);
            if (typeof uiClickSound !== 'undefined') {
                uiClickSound.currentTime = 0; 
                uiClickSound.play().catch(()=>{}); 
            }
        }

        function parseLRC(lrcText) {
            const lines = lrcText.split('\n');
            const parsed = [];
            const regex = /\[(\d{2,3}):(\d{2})\.(\d{1,3})\](.*)/;
            for (let line of lines) {
                const match = line.match(regex);
                if (match) {
                    const min = parseInt(match[1]);
                    const sec = parseInt(match[2]);
                    const ms = parseInt(match[3].padEnd(3, '0')); 
                    const time = min * 60 + sec + ms / 1000;
                    const text = match[4].trim();
                    if (text) parsed.push({ time, text });
                }
            }
            return parsed;
        }

        let currentSongKey = "";

        ipcRenderer.on('music-changed', async (event, data) => {
            if (!data.title) return; 
            const songKey = data.title + "|" + data.artist;
            if (songKey === currentSongKey) return; 
            
            currentSongKey = songKey;

            const isEnable = document.getElementById('music-info-enable').checked;
            if (isEnable) {
                document.getElementById('music-widget').style.display = 'flex'; 
                document.getElementById('fullscreen-lyrics').style.display = 'block';
            }
            
            document.getElementById('music-title').innerText = data.title;
            const fullArtist = data.artist || "未知歌手";
            document.getElementById('music-artist').innerText = fullArtist;
            document.getElementById('music-lyric').innerText = "✨ 正在同步心跳...";
            
            document.getElementById('music-cover').src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            document.getElementById('music-cover').style.background = `linear-gradient(135deg, hsl(${Math.random()*360}, 80%, 75%), hsl(${Math.random()*360}, 80%, 85%))`;

            currentLyrics = [];
            currentLyricIndex = -1;
            localCurrentSec = 0;
            lastSyncTime = Date.now();
            isMusicPlaying = true; 
            
            let cleanTitle = data.title.replace(/\(.*\)|\[.*\]/g, '').trim();
            let firstArtist = fullArtist.split(/[,/&、]/)[0].trim();
            let coverFound = false;
            let foundLyric = null;

            const localCover = data.cover || data.thumbnail || data.image || data.albumArt;
            if (localCover) {
                const imgPrefix = (typeof localCover === 'string' && !localCover.startsWith('data:') && !localCover.startsWith('http')) ? 'data:image/png;base64,' : '';
                document.getElementById('music-cover').src = imgPrefix + localCover;
                coverFound = true;
            }

            const searchQueries = [
                { query: `${cleanTitle} ${fullArtist}`, isFullMatch: true },
                { query: `${cleanTitle} ${firstArtist}`, isFullMatch: true }
            ];

            for (let target of searchQueries) {
                if (foundLyric && coverFound) break;
                if (!target.query.trim()) continue;

                try {
                    const neteaseSearchUrl = `https://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=${encodeURIComponent(target.query)}&type=1&offset=0&total=true&limit=5`;
                    const neteaseSearchRes = await fetch(neteaseSearchUrl);

                    if (currentSongKey !== songKey) return;

                    const neteaseSearchData = await neteaseSearchRes.json();

                    if (neteaseSearchData.result && neteaseSearchData.result.songs && neteaseSearchData.result.songs.length > 0) {
                        const matchedSong = neteaseSearchData.result.songs.find(s => 
                            s.artists.some(a => fullArtist.toLowerCase().includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(firstArtist.toLowerCase()))
                        );
                        
                        let song = matchedSong;
                        if (!song) continue; 

                        if (!coverFound && song.album && song.album.picUrl) {
                            document.getElementById('music-cover').src = song.album.picUrl + "?param=300y300";
                            coverFound = true;
                        }
                        if (!foundLyric) {
                            const neteaseLyricUrl = `https://music.163.com/api/song/lyric?id=${song.id}&lv=1&kv=1&tv=-1`;
                            const neteaseLyricRes = await fetch(neteaseLyricUrl);

                            if (currentSongKey !== songKey) return;

                            const neteaseLyricData = await neteaseLyricRes.json();

                            if (neteaseLyricData.lrc && neteaseLyricData.lrc.lyric && neteaseLyricData.lrc.lyric.includes('[')) {
                                foundLyric = neteaseLyricData.lrc.lyric;
                            }
                        }
                    }
                } catch (e) {}

                if (!foundLyric) {
                    try {
                        const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(target.query)}`;
                        const res = await fetch(lrclibUrl);

                        if (currentSongKey !== songKey) return;

                        const results = await res.json();
                        const matchLyric = results && results.length > 0 ? results.find(r => r.syncedLyrics && (r.artistName.toLowerCase().includes(firstArtist.toLowerCase()) || firstArtist.toLowerCase().includes(r.artistName.toLowerCase()))) : null;
                        if (matchLyric) {
                            foundLyric = matchLyric.syncedLyrics;
                        }
                    } catch (e) {}
                }
            }

            if (!coverFound) {
                try {
                    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle + ' ' + firstArtist)}&media=music&limit=1`;
                    const itunesRes = await fetch(itunesUrl);
                    if (currentSongKey !== songKey) return;
                    const itunesData = await itunesRes.json();
                    
                    if (itunesData.results && itunesData.results.length > 0) {
                        const coverUrl = itunesData.results[0].artworkUrl100;
                        if (coverUrl) {
                            document.getElementById('music-cover').src = coverUrl.replace('100x100', '300x300');
                            coverFound = true;
                        }
                    }
                } catch(e) {}
            }

            if (currentSongKey !== songKey) return;
            if (foundLyric) {
                currentLyrics = parseLRC(foundLyric);
                document.getElementById('music-lyric').innerText = "🎵"; 
            } else {
                document.getElementById('music-lyric').innerText = "纯音乐请欣赏";
            }
        });

        ipcRenderer.on('music-state', (event, isPlaying) => {
            isMusicPlaying = isPlaying;
            lastSyncTime = Date.now(); 
            
            const cover = document.getElementById('music-cover');
            if (isPlaying) cover.classList.add('playing');
            else cover.classList.remove('playing');

            document.getElementById('icon-play').style.display = isPlaying ? 'none' : 'block';
            document.getElementById('icon-pause').style.display = isPlaying ? 'block' : 'none';
        });

        ipcRenderer.on('music-progress', (event, data) => {
            localCurrentSec = data.current;
            lastSyncTime = Date.now(); 
        });

        setInterval(() => {
            if (!isMusicPlaying || currentLyrics.length === 0) return;
            
            const now = Date.now();
            const estimatedSec = localCurrentSec + (now - lastSyncTime) / 1000;
            
            let newIndex = -1;
            for (let i = 0; i < currentLyrics.length; i++) {
                if (estimatedSec >= currentLyrics[i].time) {
                    newIndex = i;
                } else {
                    break;
                }
            }
            
            if (newIndex !== -1 && newIndex !== currentLyricIndex) {
                currentLyricIndex = newIndex;
                const lyricEl = document.getElementById('music-lyric');
                
                lyricEl.style.opacity = 0;
                lyricEl.style.transform = "scale(0.8) translateY(20px)"; 
                
                setTimeout(() => {
                    lyricEl.innerText = currentLyrics[newIndex].text;
                    lyricEl.style.opacity = 1;
                    lyricEl.style.transform = "scale(1) translateY(0)";
                    
                    if (document.getElementById('lyric-style').value === 'karaoke') {
                        lyricEl.style.animation = 'none';
                        void lyricEl.offsetWidth;
                        lyricEl.style.animation = 'ktvSweep 2.5s ease-out forwards';
                    }
                }, 250); 
            } else if (newIndex === -1 && currentLyricIndex !== -2) {
                currentLyricIndex = -2; 
                const lyricEl = document.getElementById('music-lyric');
                lyricEl.style.opacity = 0;
                setTimeout(() => {
                    lyricEl.innerText = "✧*｡٩(ˊᗜˋ*)و✧*｡"; 
                    lyricEl.style.opacity = 0.5; 
                }, 250);
            }
        }, 50);
        const musicWidget = document.getElementById('music-widget');
        let isMusicDragging = false, mStartX, mStartY, mInitLeft, mInitTop;

        if (localStorage.getItem('music_widget_x')) {
            musicWidget.style.left = localStorage.getItem('music_widget_x');
            musicWidget.style.top = localStorage.getItem('music_widget_y');
        }

        musicWidget.addEventListener('mousedown', (e) => {
            if (document.getElementById('lock-widget').checked) return; 
            isMusicDragging = true;
            mStartX = e.clientX; mStartY = e.clientY;
            mInitLeft = parseInt(window.getComputedStyle(musicWidget).left) || 0;
            mInitTop = parseInt(window.getComputedStyle(musicWidget).top) || 0;
            musicWidget.style.border = "1px solid #ff6b81"; 
            musicWidget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.2)";
        });
        document.addEventListener('mousemove', (e) => {
            if (!isMusicDragging) return;
            musicWidget.style.left = `${mInitLeft + (e.clientX - mStartX)}px`;
            musicWidget.style.top = `${mInitTop + (e.clientY - mStartY)}px`;
        });
        document.addEventListener('mouseup', () => {
            if (!isMusicDragging) return;
            isMusicDragging = false;
            musicWidget.style.border = "1px solid rgba(255, 255, 255, 0.4)";
            musicWidget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.1)";
            localStorage.setItem('music_widget_x', musicWidget.style.left);
            localStorage.setItem('music_widget_y', musicWidget.style.top);
        });

        function toggleMusicInfo() {
            const enable = document.getElementById('music-info-enable').checked;
            localStorage.setItem('music_info_enable', enable);
            const title = document.getElementById('music-title').innerText;
            if (title && title !== "等待播放中...") {
                musicWidget.style.display = enable ? 'flex' : 'none';
                document.getElementById('fullscreen-lyrics').style.display = enable ? 'block' : 'none';
            }
        }
        
        window.addEventListener('DOMContentLoaded', () => {
            const saved = localStorage.getItem('music_info_enable');
            if (saved !== null) {
                document.getElementById('music-info-enable').checked = (saved === 'true');
            }
        });

        function applyLyricStyle() {
            const size = document.getElementById('lyric-size').value;
            const style = document.getElementById('lyric-style').value;
            const lyricBox = document.getElementById('fullscreen-lyrics');
            const lyricText = document.getElementById('music-lyric');

            lyricBox.style.setProperty('--lrc-size', `${size}px`);
            localStorage.setItem('lyric_size', size);

            lyricText.className = ''; 
            lyricText.classList.add(`lrc-${style}`);
            localStorage.setItem('lyric_style', style);
            
            if (style === 'karaoke') {
                lyricText.style.animation = 'none';
                void lyricText.offsetWidth;
                lyricText.style.animation = 'ktvSweep 2s ease-out forwards';
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('lyric_size')) {
                document.getElementById('lyric-size').value = localStorage.getItem('lyric_size');
            }
            if (localStorage.getItem('lyric_style')) {
                document.getElementById('lyric-style').value = localStorage.getItem('lyric_style');
            }
            applyLyricStyle(); 
        });

        const lyricWidget = document.getElementById('fullscreen-lyrics');
        let isLyricDragging = false, lStartX, lStartY, lInitLeft, lInitTop;

        if (localStorage.getItem('lyric_x')) {
            lyricWidget.style.left = localStorage.getItem('lyric_x');
            lyricWidget.style.top = localStorage.getItem('lyric_y');
        }

        function toggleLyricLock() {
            const isLocked = document.getElementById('lock-lyric').checked;
            localStorage.setItem('lyric_locked', isLocked);
            if (isLocked) {
                lyricWidget.style.pointerEvents = 'none';
            } else {
                lyricWidget.style.pointerEvents = 'auto';
                lyricWidget.style.cursor = 'move';
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            const isLocked = localStorage.getItem('lyric_locked') !== 'false'; 
            const lockBtn = document.getElementById('lock-lyric');
            if(lockBtn) {
                lockBtn.checked = isLocked;
                toggleLyricLock();
            }
        });

        lyricWidget.addEventListener('mousedown', (e) => {
            if (document.getElementById('lock-lyric').checked) return; 
            isLyricDragging = true;
            lStartX = e.clientX; 
            lStartY = e.clientY;
            
            lInitLeft = parseInt(window.getComputedStyle(lyricWidget).left) || (window.innerWidth / 2);
            lInitTop = parseInt(window.getComputedStyle(lyricWidget).top) || (window.innerHeight / 2);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isLyricDragging) return;
            lyricWidget.style.left = `${lInitLeft + (e.clientX - lStartX)}px`;
            lyricWidget.style.top = `${lInitTop + (e.clientY - lStartY)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isLyricDragging) return;
            isLyricDragging = false;
            localStorage.setItem('lyric_x', lyricWidget.style.left);
            localStorage.setItem('lyric_y', lyricWidget.style.top);
        });
