let timeLeft = 0, timerInterval = null, roundNum = 1, currentStep = 'IDLE';
let isOrderSwapped = false, isPinned = false, isClockHidden = true;
let isEmergencyStop = false, emergencyInterval = null, emergencyPrevStep = 'IDLE';
let musicFiles = [], currentTrackIdx = 0;
let savedMusicOrder = null;
let isMusicPlayingBeforePrep = false, musicToggleOn = false;
let maxRounds = 12;
let theme = 'taustavärit';

const musicPlayer = document.getElementById('bg-music');
const beepSound = document.getElementById('beep-sound');

musicPlayer.addEventListener('ended', () => nextSong());

function fitText() {
    const text = document.getElementById('mid-text-content');
    const isShooting = currentStep !== 'IDLE';
    let maxHFactor = 0.6;
    if (isShooting) maxHFactor = 0.75;
    else if (isClockHidden) maxHFactor = 0.9;
    const maxHeight = window.innerHeight * maxHFactor;
    const maxWidth = window.innerWidth * 0.9;
    text.style.fontSize = '100px';
    const optimalSize = 100 * Math.min(maxWidth / text.offsetWidth, maxHeight / text.offsetHeight);
    text.style.fontSize = Math.floor(optimalSize) + 'px';
}

window.addEventListener('resize', fitText);

function saveAllSettings() {
    localStorage.setItem('tm2_final_config', JSON.stringify({
        mode: document.getElementById('mode-select').value,
        theme,
        time: document.getElementById('time-select').value,
        maxRounds: document.getElementById('max-rounds-select').value,
        pin: isPinned,
        round: roundNum,
        vol: document.getElementById('volume-slider').value,
        beepVol: document.getElementById('beep-volume-slider').value,
        swapped: isOrderSwapped,
        clockHidden: isClockHidden,
        musicOrder: musicFiles.map(m => (typeof m === 'string' ? m : m.file)),
        musicToggleOn: musicToggleOn
    }));
}

function loadSettings() {
    const s = JSON.parse(localStorage.getItem('tm2_final_config') || '{}');
    if (s.mode) document.getElementById('mode-select').value = s.mode;
    theme = s.theme || 'taustavärit';
    document.getElementById('theme-select').value = theme;
    document.getElementById('time-select').value = s.time || '120';
    document.getElementById('max-rounds-select').value = s.maxRounds || '12';
    maxRounds = parseInt(s.maxRounds || '12');
    if (s.pin) { isPinned = true; document.getElementById('bottom-bar').classList.add('pinned'); document.getElementById('pin-btn').classList.add('active'); }
    if (s.clockHidden !== undefined) { isClockHidden = s.clockHidden; }
    if (s.musicOrder) savedMusicOrder = s.musicOrder;
    if (s.musicToggleOn !== undefined) musicToggleOn = s.musicToggleOn;
    roundNum = s.round || 1;
    isOrderSwapped = s.swapped || false;
    document.getElementById('round-indicator').innerText = roundNum;
    document.getElementById('volume-slider').value = s.vol || 0.5;
    document.getElementById('beep-volume-slider').value = s.beepVol || 0.5;
    updateVolume();
    updateBeepVolume();
    updateDisplay();
    resetToIdle();
    updateMusicButton();
    renderPlaylist();
}

function removeExtension(filename) {
    return filename.replace(/\.[^.]+$/, '');
}

function coerceMusicFileList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => {
        if (typeof item === 'string') {
            return { file: item, name: removeExtension(item) };
        }
        if (item && typeof item === 'object' && 'file' in item) {
            return { file: item.file, name: item.name || removeExtension(item.file) };
        }
        return null;
    }).filter(Boolean);
}

function applySavedMusicOrder(files, order) {
    if (!Array.isArray(order)) return files;
    const fileMap = new Map(files.map(entry => [entry.file, entry]));
    const ordered = [];
    order.forEach(item => {
        const key = typeof item === 'string' ? item : item.file;
        if (fileMap.has(key)) {
            ordered.push(fileMap.get(key));
            fileMap.delete(key);
        }
    });
    return ordered.concat([...fileMap.values()]);
}

function updateDisplay() {
    const mode = document.getElementById('mode-select').value;
    const topText = document.getElementById('shooter-info');
    const midText = document.getElementById('mid-text-content');

    document.body.classList.remove('shooting-mode', 'clock-hidden', 'shooting-active', 'emergency-stop', 'theme-number', 'theme-background');
    document.body.classList.remove('mode-red', 'mode-yellow', 'mode-green');
    if (currentStep === 'STOP') {
        document.body.classList.add('mode-red', 'emergency-stop');
    } else if (currentStep === 'P1_PREP' || currentStep === 'P2_PREP') {
        document.body.classList.add('shooting-mode', 'shooting-active', 'mode-red');
    } else if (currentStep === 'P1_SHOOT' || currentStep === 'P2_SHOOT') {
        document.body.classList.add('shooting-mode', 'shooting-active');
        if (timeLeft <= 30) {
            document.body.classList.add('mode-yellow');
        } else {
            document.body.classList.add('mode-green');
        }
    } else if (isClockHidden) {
        document.body.classList.add('mode-red', 'clock-hidden');
    } else {
        document.body.classList.add('mode-red');
    }

    if (theme === 'numerovärit') {
        document.body.classList.add('theme-number');
    } else {
        document.body.classList.add('theme-background');
    }

    if (currentStep === 'STOP') {
        topText.innerText = '';
        midText.innerText = 'STOP';
        midText.style.fontSize = '65vh';
        midText.style.lineHeight = '0.85';
    } else {
        midText.style.fontSize = '';
        midText.style.lineHeight = '';
        if (currentStep === 'IDLE') {
            topText.innerText = "";
            midText.innerText = (mode === 'AB_CD') ? (isOrderSwapped ? "CDAB" : "ABCD") : (mode === 'ABC' ? "ABC" : (mode === 'AB' ? "AB" : (isOrderSwapped ? "B A" : "A B")));
        } else {
            midText.innerText = timeLeft.toString();
            topText.innerText = (mode === 'AB_CD') ? (currentStep.includes('P1') ? (isOrderSwapped ? "CD" : "AB") : (isOrderSwapped ? "AB" : "CD")) : (mode === 'ABC' ? "ABC" : (mode === 'AB' ? "AB" : (currentStep.includes('P1') ? (isOrderSwapped ? "B" : "A") : (isOrderSwapped ? "A" : "B"))));
        }
        setTimeout(fitText, 0);
    }

    // Update button states
    const toggleOrderBtn = document.querySelector('button[onclick="toggleOrder()"]');
    toggleOrderBtn.disabled = !(mode === 'A_B' || mode === 'AB_CD');
}

function updateClock() {
    const clockElement = document.getElementById('bottom-section');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockElement.innerText = `${hours}:${minutes}:${seconds}`;
}

function setTheme(value) {
    theme = value;
    document.getElementById('theme-select').value = value;
    saveAllSettings();
    updateDisplay();
}

function shufflePlaylist() {
    for (let i = musicFiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [musicFiles[i], musicFiles[j]] = [musicFiles[j], musicFiles[i]];
    }
    setTimeout(() => renderPlaylist(), 0);
    saveAllSettings();
}

async function handleNext() {
    const mode = document.getElementById('mode-select').value;
    if (currentStep === 'IDLE') startPrep(1);
    else if (currentStep === 'P1_PREP') startShooting(1);
    else if (currentStep === 'P1_SHOOT') (mode === 'AB' || mode === 'ABC') ? finishRound() : startPrep(2);
    else if (currentStep === 'P2_PREP') startShooting(2);
    else if (currentStep === 'P2_SHOOT') finishRound();
}

async function startPrep(p) {
    clearInterval(timerInterval);
    isMusicPlayingBeforePrep = musicToggleOn && !musicPlayer.paused;
    if (!musicPlayer.paused) musicPlayer.pause();
    currentStep = p === 1 ? 'P1_PREP' : 'P2_PREP';
    timeLeft = 10; updateDisplay(); playBeeps(2);
    timerInterval = setInterval(() => { timeLeft--; if (timeLeft <= 0) startShooting(p); updateDisplay(); }, 1000);
}

async function startShooting(p) {
    clearInterval(timerInterval);
    currentStep = p === 1 ? 'P1_SHOOT' : 'P2_SHOOT';
    timeLeft = parseInt(document.getElementById('time-select').value);
    updateDisplay();
    playBeeps(1);
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            const mode = document.getElementById('mode-select').value;
            if (p === 1 && mode !== 'AB' && mode !== 'ABC') startPrep(2);
            else finishRound();
        }
        updateDisplay();
    }, 1000);
}

function finishRound() {
    clearInterval(timerInterval);
    currentStep = 'IDLE';
    playBeeps(3);

    // Check if we've reached max rounds
    if (roundNum >= maxRounds) {
        roundNum = 1;
    } else {
        roundNum++;
    }
    document.getElementById('round-indicator').innerText = roundNum;

    const mode = document.getElementById('mode-select').value;
    if (mode === 'AB_CD' || mode === 'A_B') isOrderSwapped = !isOrderSwapped;
    updateDisplay();
    saveAllSettings();

    setTimeout(() => {
        if (musicToggleOn && musicFiles.length > 0) {
            nextSong();
        }
    }, 4000);
}

function updateMusicButton() {
    const btn = document.querySelector('button[onclick="togglePlayPause()"]');
    if (musicPlayer.paused) {
        btn.innerText = '▶️ Play';
    } else {
        btn.innerText = '⏹️ Stop';
    }
}

function toggleEmergencyStop() {
    if (isEmergencyStop) {
        deactivateEmergencyStop();
    } else {
        activateEmergencyStop();
    }
}

function activateEmergencyStop() {
    if (isEmergencyStop) return;
    isEmergencyStop = true;
    emergencyPrevStep = currentStep;
    clearInterval(timerInterval);
    currentStep = 'STOP';
    updateDisplay();
    beepSound.currentTime = 0;
    beepSound.play();
    emergencyInterval = setInterval(() => {
        beepSound.currentTime = 0;
        beepSound.play();
    }, 2000);
}

function deactivateEmergencyStop() {
    if (!isEmergencyStop) return;
    isEmergencyStop = false;
    clearInterval(emergencyInterval);
    emergencyInterval = null;
    currentStep = emergencyPrevStep || 'IDLE';
    if (currentStep === 'IDLE') {
        updateDisplay();
    } else {
        resumeCurrentPhase();
    }
}

function resumeCurrentPhase() {
    if (currentStep === 'P1_PREP' || currentStep === 'P2_PREP') {
        updateDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) startShooting(currentStep === 'P1_PREP' ? 1 : 2);
            updateDisplay();
        }, 1000);
    } else if (currentStep === 'P1_SHOOT' || currentStep === 'P2_SHOOT') {
        updateDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                const mode = document.getElementById('mode-select').value;
                if (currentStep === 'P1_SHOOT' && mode !== 'AB' && mode !== 'ABC') startPrep(2);
                else finishRound();
            }
            updateDisplay();
        }, 1000);
    } else {
        updateDisplay();
    }
}

function togglePlayPause() {
    if (currentStep !== 'IDLE') return;
    if (!musicPlayer.paused) {
        musicPlayer.pause();
        musicToggleOn = false;
    } else {
        musicToggleOn = true;
        nextSong();
    }
    saveAllSettings();
    setTimeout(() => renderPlaylist(), 0);
    updateMusicButton();
}

function playTrack(idx) {
    if (currentStep !== 'IDLE') return;
    currentTrackIdx = idx;
    musicPlayer.src = 'musiikki/' + encodeURIComponent(musicFiles[currentTrackIdx].file);
    musicToggleOn = true;
    musicPlayer.play();
    saveAllSettings();
    updateMusicButton();
    setTimeout(() => renderPlaylist(), 0);
}

function nextSong() {
    if (musicFiles.length === 0) return;
    currentTrackIdx = (currentTrackIdx + 1) % musicFiles.length;
    playTrack(currentTrackIdx);
}

async function fetchMusicList() {
    try {
        const r = await fetch('/api/music');
        musicFiles = coerceMusicFileList(await r.json());
        if (!savedMusicOrder) {
            musicFiles.sort((a, b) => a.file.localeCompare(b.file, undefined, { sensitivity: 'base' }));
        } else {
            musicFiles = applySavedMusicOrder(musicFiles, savedMusicOrder);
        }
        // Adjust currentTrackIdx if it's out of bounds
        if (currentTrackIdx >= musicFiles.length) {
            currentTrackIdx = 0;
        }
        setTimeout(() => renderPlaylist(), 0);
    } catch (e) {
        try {
            const r = await fetch('api/music.json');
            musicFiles = coerceMusicFileList(await r.json());
            if (!savedMusicOrder) {
                musicFiles.sort((a, b) => a.file.localeCompare(b.file, undefined, { sensitivity: 'base' }));
            } else {
                musicFiles = applySavedMusicOrder(musicFiles, savedMusicOrder);
            }
            // Adjust currentTrackIdx if it's out of bounds
            if (currentTrackIdx >= musicFiles.length) {
                currentTrackIdx = 0;
            }
            setTimeout(() => renderPlaylist(), 0);
        } catch (e2) { }
    }
}


function renderPlaylist() {
    const l = document.getElementById('playlist-list'); l.innerHTML = '';
    musicFiles.forEach((f, i) => {
        const d = document.createElement('div');
        d.innerText = (i + 1) + ". " + (f.name || f.file || f);
        d.style.padding = '8px'; d.style.cursor = 'pointer';
        d.style.color = (i === currentTrackIdx && !musicPlayer.paused) ? '#00ff00' : 'white';
        d.onclick = (e) => { e.stopImmediatePropagation(); if (currentStep === 'IDLE') playTrack(i); };
        l.appendChild(d);
    });
}

function updateVolume() { musicPlayer.volume = document.getElementById('volume-slider').value; saveAllSettings(); }
function updateBeepVolume() { beepSound.volume = document.getElementById('beep-volume-slider').value; saveAllSettings(); }
function updateMaxRounds() { maxRounds = parseInt(document.getElementById('max-rounds-select').value); saveAllSettings(); }
function toggleOrder() { isOrderSwapped = !isOrderSwapped; updateDisplay(); saveAllSettings(); }
function togglePin() { isPinned = !isPinned; document.getElementById('bottom-bar').classList.toggle('pinned', isPinned); document.getElementById('pin-btn').classList.toggle('active', isPinned); saveAllSettings(); }
function toggleSettings() { const p = document.getElementById('music-panel'); p.style.display = (p.style.display === 'flex') ? 'none' : 'flex'; }
function toggleCombinedSettings() { const p = document.getElementById('settings-panel'); p.style.display = (p.style.display === 'flex') ? 'none' : 'flex'; }

function toggleClockHidden() {
    isClockHidden = !isClockHidden;
    updateDisplay();
    saveAllSettings();
}

function resetToIdle() {
    clearInterval(timerInterval);
    currentStep = 'IDLE';
    if (musicToggleOn && musicFiles.length > 0) nextSong();
    updateDisplay();
}

function changeRound(v) { roundNum = Math.max(1, roundNum + v); document.getElementById('round-indicator').innerText = roundNum; saveAllSettings(); }
async function playBeeps(c) { await new Promise(r => setTimeout(r, 250)); for (let i = 0; i < c; i++) { beepSound.currentTime = 0; beepSound.play(); await new Promise(r => setTimeout(r, 1200)); } }

window.addEventListener('keydown', e => {
    const isEmergencyKey = e.key.toLowerCase() === 'h' || e.code === 'Space';
    if (isEmergencyStop && !isEmergencyKey) {
        e.preventDefault();
        return;
    }

    if (e.key === 'Enter') handleNext();
    if (e.key.toLowerCase() === 's' && currentStep === 'IDLE') togglePlayPause();
    if (e.key.toLowerCase() === 'u') openReplay();
    if (e.key.toLowerCase() === 'k' && currentStep === 'IDLE') {
        isClockHidden = !isClockHidden;
        updateDisplay();
        saveAllSettings();
    }
    if (e.key.toLowerCase() === 'a') togglePin();
    if (isEmergencyKey) {
        e.preventDefault();
        toggleEmergencyStop();
    }
});

loadSettings();
fetchMusicList();
updateClock();
setInterval(updateClock, 1000);

// Check for first time
if (!localStorage.getItem('firstTimeShown')) {
    document.getElementById('first-time-modal').style.display = 'flex';
}

function closeFirstTimeModal() {
    document.getElementById('first-time-modal').style.display = 'none';
    localStorage.setItem('firstTimeShown', 'true');
}

function showFirstTimeModal() {
    document.getElementById('first-time-modal').style.display = 'flex';
}

function openReplay() {
    const width = window.screen.width;
    const height = window.screen.height;
    window.open('uusinta.html', '_blank', `width=${width},height=${height},fullscreen=yes,location=no,menubar=no,toolbar=no`);
}

document.addEventListener('click', (event) => {
    const settingsPanel = document.getElementById('music-panel');
    const settingsBtn = document.querySelector('button[onclick="toggleSettings()"]');
    if (!event.target.closest('#playlist-list') && settingsPanel.style.display === 'flex' && !settingsPanel.contains(event.target) && event.target !== settingsBtn) {
        settingsPanel.style.display = 'none';
    }
    
    const combinedSettingsPanel = document.getElementById('settings-panel');
    const combinedSettingsBtn = document.querySelector('button[onclick="toggleCombinedSettings()"]');
    if (combinedSettingsPanel.style.display === 'flex' && !combinedSettingsPanel.contains(event.target) && event.target !== combinedSettingsBtn) {
        combinedSettingsPanel.style.display = 'none';
    }
});

window.addEventListener('message', (event) => {
    if (event.data.action === 'stopMusic') {
        if (!musicPlayer.paused) musicPlayer.pause();
        updateMusicButton();
        setTimeout(() => renderPlaylist(), 0);
    } else if (event.data.action === 'resumeMusic') {
        setTimeout(() => {
            if (musicToggleOn && musicFiles.length > 0) {
                nextSong();
            }
        }, 4000);
    }
});