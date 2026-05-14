// ═══════════════════════════════════════════════════════
// yAp — RecordingManager
// Handles MediaRecorder, waveform visualization, playback
// ═══════════════════════════════════════════════════════

class RecordingManager {
  constructor({ videoEl = null, canvasEl, timerEl, transcriptEl = null }) {
    this.videoEl    = videoEl;
    this.canvas     = canvasEl;
    this.timerEl    = timerEl;
    this.transcriptEl = transcriptEl;
    this.ctx        = canvasEl ? canvasEl.getContext('2d') : null;

    // MediaRecorder state
    this.mediaRecorder  = null;
    this.stream         = null;
    this.chunks         = [];
    this.blob           = null;
    this.mimeType       = null;

    // Audio analysis
    this.audioContext   = null;
    this.analyser       = null;
    this.animFrameId    = null;

    // Timing
    this.startTime      = null;
    this.timerInterval  = null;
    this.durationMs     = 0;

    // Playback
    this.audioEl        = null;
    this.objectUrl      = null;
    this.isPlaying      = false;

    // Live transcript
    this.recognition        = null;
    this.finalTranscript    = '';
    this.interimTranscript  = '';
    this._transcriptRaw = '';
    this._transcriptResizeObserver = null;
    this._transcriptLayoutRaf = 0;
    this._transcriptMeasureCanvas = null;

    // Waveform snapshot for frozen state
    this.frozenData     = null;
    /** @type {Uint8Array | null} */
    this._timeDomain    = null;

    // State
    this.phase          = 'idle'; // idle | recording | stopped | sending
    this.renderStartAt  = 0;
  }

  // ── Setup canvas DPI ──────────────────────────────────
  _setupCanvas() {
    if (!this.canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const cssW = this.canvas.offsetWidth;
    const cssH = this.canvas.offsetHeight;

    if (cssW === 0 || cssH === 0) return; // not yet visible

    this.canvas.width  = cssW * dpr;
    this.canvas.height = cssH * dpr;
    this.canvas.style.width  = cssW + 'px';
    this.canvas.style.height = cssH + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);

    this._logicalW = cssW;
    this._logicalH = cssH;
  }

  // ── Pick best supported MIME type ────────────────────
  _pickMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    return candidates.find(t => {
      try { return MediaRecorder.isTypeSupported(t); }
      catch { return false; }
    }) || '';
  }

  /**
   * Some environments (iOS Simulator, Safari, virtual cables, Bluetooth) reject common
   * constraint sets with NotFoundError / OverconstrainedError / AbortError. Try a wide ladder,
   * then per-device constraints (including inputs whose deviceId is still empty in some states).
   */
  async _acquireMicStream() {
    if (!window.isSecureContext) {
      throw new DOMException(
        'Microphone requires a secure page. Open yap over https:// or http://localhost (not a raw file or non-secure URL).',
        'SecurityError',
      );
    }

    const gUM = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (!gUM) {
      throw new Error('This browser does not support microphone recording.');
    }

    const attempts = [
      { audio: true },
      { video: false, audio: true },
      { audio: {} },
      { audio: { channelCount: 1 } },
      { audio: { channelCount: { ideal: 1 } } },
      {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
      },
      {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      },
    ];

    const recoverable = name =>
      name === 'NotFoundError'
      || name === 'OverconstrainedError'
      || name === 'AbortError';

    let lastErr = null;
    for (const constraints of attempts) {
      try {
        return await gUM(constraints);
      } catch (e) {
        lastErr = e;
        const name = e?.name || '';
        if (!recoverable(name)) {
          throw e;
        }
      }
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      for (const d of inputs) {
        if (d.deviceId) {
          try {
            return await gUM({ audio: { deviceId: { ideal: d.deviceId } } });
          } catch (e) {
            lastErr = e;
            const name = e?.name || '';
            if (!recoverable(name)) throw e;
          }
          try {
            return await gUM({ audio: { deviceId: { exact: d.deviceId } } });
          } catch (e) {
            lastErr = e;
            const name = e?.name || '';
            if (!recoverable(name)) throw e;
          }
        }
      }
      if (inputs.length > 0) {
        try {
          return await gUM({ audio: true });
        } catch (e) {
          lastErr = e;
        }
      }
    } catch (e) {
      lastErr = e;
      const name = e?.name || '';
      if (name && !recoverable(name)) throw e;
    }

    try {
      return await gUM({ audio: true });
    } catch (e) {
      lastErr = e;
    }

    throw lastErr || new Error('No microphone input is available.');
  }

  // ── Start recording ───────────────────────────────────
  async start(options = {}) {
    const { onStreamReady } = options;
    if (this.phase !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support microphone recording.');
    }
    if (typeof window.MediaRecorder === 'undefined') {
      throw new Error('This browser does not support in-app voice recording yet.');
    }

    try {
      this.stream = await this._acquireMicStream();
    } catch (err) {
      const errName = err?.name || '';
      let msg = `Could not access microphone: ${err.message || errName || 'Unknown error'}`;
      if (errName === 'NotAllowedError') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        msg = isIOS
          ? 'Microphone permission denied.\n\nTo use voice memos:\n1. Open Settings\n2. Go to Privacy > Microphone\n3. Enable microphone access for yAp\n4. Return to the app and try again'
          : 'Microphone permission denied.\n\nTo use voice memos:\n1. Check your browser\'s permission settings\n2. Allow microphone access for this site\n3. Refresh the page and try again';
      } else if (errName === 'SecurityError') {
        msg = err.message || msg;
      } else if (errName === 'NotFoundError' || errName === 'OverconstrainedError') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isMac = /Mac/.test(navigator.userAgent);
        const sysHint = isMac
          ? '\n\nOn Mac: System Settings → Privacy & Security → Microphone — enable access for your browser. In Sound → Input, pick a working microphone and speak to confirm the level meter moves.'
          : '';
        msg = isIOS
          ? 'No microphone was found.\n\n• On the iOS Simulator there is no mic — use a real iPhone.\n• On a device: disconnect Bluetooth headsets that have no mic, then try again.\n• Close other apps that might be using the microphone.'
          : `No microphone was found.\n\nTry a physical microphone or headset, disconnect virtual audio devices (e.g. BlackHole), set a real default input in your OS sound settings, and close other tabs or apps using the mic.${sysHint}`;
      }
      throw new Error(msg);
    }

    if (typeof onStreamReady === 'function') {
      try {
        onStreamReady();
      } catch (e) {
        this.stream?.getTracks?.().forEach(track => track.stop());
        this.stream = null;
        throw e;
      }
    }

    // Set up Audio API for waveform
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {}
    }
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    /* Lower = snappier level meter (still blended with time-domain RMS below). */
    this.analyser.smoothingTimeConstant = 0.28;
    source.connect(this.analyser);

    // Set up MediaRecorder
    this.mimeType = this._pickMimeType();
    const opts = this.mimeType ? { mimeType: this.mimeType } : {};
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, opts);
    } catch (error) {
      this.stream.getTracks().forEach(track => track.stop());
      throw new Error(`Voice recording could not start on this device: ${error.message}`);
    }
    this.chunks = [];
    this.mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(100); // collect every 100ms
    this._startSpeechRecognition();
    this._renderTranscript(APP_COPY.listening);
    this._startVideo();

    // Timer
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => this._tickTimer(), 100);

    // Waveform
    this.phase = 'recording';
    this.renderStartAt = performance.now();
    this._setupCanvas();
    this._animateWaveform();
  }

  // ── Stop recording ────────────────────────────────────
  stop() {
    if (this.phase !== 'recording') return Promise.resolve(null);

    return new Promise(resolve => {
      this.phase = 'stopped';

      clearInterval(this.timerInterval);
      cancelAnimationFrame(this.animFrameId);
      this.durationMs = Date.now() - this.startTime;
      this._stopSpeechRecognition();

      this.mediaRecorder.onstop = () => {
        const type = this.mimeType || 'audio/webm';
        this.blob = new Blob(this.chunks, { type });
        this.objectUrl = URL.createObjectURL(this.blob);
        this.audioEl = new Audio(this.objectUrl);
        this.audioEl.playsInline = true;
        this.audioEl.preload = 'auto';
        this.audioEl.onended = () => { this.isPlaying = false; };

        this._drawFrozen();
        resolve({ blob: this.blob, durationMs: this.durationMs });
      };

      try {
        if (typeof this.mediaRecorder.requestData === 'function') {
          this.mediaRecorder.requestData();
        }
      } catch {}

      this.mediaRecorder.stop();
      setTimeout(() => {
        this.stream?.getTracks().forEach(t => t.stop());
      }, 0);
    });
  }

  // ── Toggle playback ───────────────────────────────────
  togglePlay() {
    if (!this.audioEl) return;

    if (this.isPlaying) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      this.isPlaying = false;
    } else {
      const playPromise = this.audioEl.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            this.isPlaying = true;
          })
          .catch(() => {
            this.isPlaying = false;
          });
      } else {
        this.isPlaying = true;
      }
    }
    return this.isPlaying;
  }

  // ── Discard everything ────────────────────────────────
  discard() {
    if (this.objectUrl)    URL.revokeObjectURL(this.objectUrl);
    if (this.audioContext) this.audioContext.close();
    if (this.audioEl)      this.audioEl.pause();
    this._resetVideo();
    this._stopSpeechRecognition();
    cancelAnimationFrame(this.animFrameId);
    clearInterval(this.timerInterval);

    this.blob         = null;
    this.objectUrl    = null;
    this.audioEl      = null;
    this.isPlaying    = false;
    this.frozenData   = null;
    this.finalTranscript   = '';
    this.interimTranscript = '';
    this.phase        = 'idle';
    this.durationMs   = 0;
    if (window.__yapVoiceVisualizerBridge?.reset) {
      window.__yapVoiceVisualizerBridge.reset();
    }
    this._clearCanvas();
    this._disconnectTranscriptResizeObserver();
    this._renderTranscript(APP_COPY.listening);
  }

  // ── Timer display ─────────────────────────────────────
  _tickTimer() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    this.timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Live waveform animation ───────────────────────────
  _animateWaveform() {
    const analyser   = this.analyser;
    const bufLen     = analyser.frequencyBinCount;
    const data       = new Uint8Array(bufLen);

    const draw = () => {
      if (this.phase !== 'recording') return;

      analyser.getByteFrequencyData(data);
      this.frozenData = new Uint8Array(data); // keep last frame for freeze

      this._renderVideoReactive(data);
      this.animFrameId = requestAnimationFrame(draw);
    };

    this.animFrameId = requestAnimationFrame(draw);
  }

  _renderVideoReactive(data) {
    const energy = this._sampleEnergy(data);
    const fftMaster = energy.master;
    const bass = energy.bass;
    const mids = energy.mids;
    const treble = energy.treble;

    const tdLen = this.analyser.fftSize;
    if (!this._timeDomain || this._timeDomain.length !== tdLen) {
      this._timeDomain = new Uint8Array(tdLen);
    }
    this.analyser.getByteTimeDomainData(this._timeDomain);
    const rms = this._sampleTimeDomainRms(this._timeDomain);
    /* RMS tracks perceived loudness; FFT bands track timbre — blend for responsive, accurate motion. */
    const master = Math.min(1, fftMaster * 0.3 + rms * 0.7);

    if (window.__yapVoiceVisualizerBridge?.setAnalysis) {
      window.__yapVoiceVisualizerBridge.setAnalysis({
        amplitude: master,
        envelope: master,
        bass,
        mid: mids,
        high: treble,
        attack: Math.max(0, master - 0.18),
        decay: Math.max(0, 0.24 - master),
        speaking: Math.min(1, master * 1.35),
      });
    }

    if (this.videoEl) {
      const scale = 0.9 + master * 0.06 + bass * 0.03;
      const saturate = 1.08 + mids * 0.55;
      const brightness = 0.94 + master * 0.16;
      const blur = Math.max(0, 0.65 - treble * 0.4);
      const glow = 0.18 + master * 0.42;
      const driftX = (mids - 0.25) * 10;
      const driftY = (bass - 0.25) * 7;

      this.videoEl.style.setProperty('--video-scale', scale.toFixed(3));
      this.videoEl.style.setProperty('--video-brightness', brightness.toFixed(3));
      this.videoEl.style.setProperty('--video-saturate', saturate.toFixed(3));
      this.videoEl.style.setProperty('--video-blur', `${blur.toFixed(2)}px`);
      this.videoEl.style.setProperty('--video-glow', glow.toFixed(3));
      this.videoEl.style.setProperty('--video-drift-x', `${driftX.toFixed(2)}px`);
      this.videoEl.style.setProperty('--video-drift-y', `${driftY.toFixed(2)}px`);
      this.videoEl.playbackRate = Math.min(1.45, 0.88 + master * 0.68 + bass * 0.12);
    }

    if (this.ctx) this._clearCanvas();
  }

  /** Normalized 0–1 loudness from time-domain samples (byte, centered at 128). */
  _sampleTimeDomainRms(td) {
    if (!td || !td.length) return 0;
    let sum = 0;
    for (let i = 0; i < td.length; i += 1) {
      const v = (td[i] - 128) / 128;
      sum += v * v;
    }
    const raw = Math.sqrt(sum / td.length);
    return Math.min(1, raw * 4.1);
  }

  _sampleEnergy(data) {
    const ranges = {
      bass: [0, 14],
      mids: [15, 52],
      treble: [53, Math.min(data.length - 1, 110)],
    };
    const avg = ([start, end]) => {
      let sum = 0;
      let count = 0;
      for (let i = start; i <= end; i++) {
        sum += data[i] || 0;
        count++;
      }
      return count ? (sum / count) / 255 : 0;
    };
    const bass = avg(ranges.bass);
    const mids = avg(ranges.mids);
    const treble = avg(ranges.treble);
    return {
      bass,
      mids,
      treble,
      master: (bass * 0.42) + (mids * 0.38) + (treble * 0.20),
    };
  }

  _startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Web Speech API is not supported in many browsers (notably iOS Safari).
      // Keep the UI honest instead of silently doing nothing.
      this._renderTranscript('Live transcription unavailable on this device');
      return;
    }
    if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) {
      // SpeechRecognition generally requires a secure context (https).
      this._renderTranscript('Live transcription requires https');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = event => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) this.finalTranscript += transcript.trim() + ' ';
          else interim += transcript;
        }
        this.interimTranscript = interim.trim();
        const combined = `${this.finalTranscript} ${this.interimTranscript}`.trim();
        this._renderTranscript(combined || APP_COPY.listening);
      };

      this.recognition.onerror = event => {
        // Don’t spin/restart forever on hard failures (permission / network / not-allowed).
        const code = String(event?.error || '').toLowerCase();
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          this._renderTranscript('Live transcription permission blocked');
          this._stopSpeechRecognition();
          return;
        }
        // Keep the UI neutral for transient/service errors (don’t claim “offline”).
        if (code === 'network') {
          this._renderTranscript(APP_COPY.listening);
        }
        console.warn('[yAp] SpeechRecognition error:', event?.error || event);
      };
      this.recognition.onend = () => {
        if (this.phase === 'recording') {
          try { this.recognition.start(); } catch (err) {
            console.warn('[yAp] SpeechRecognition restart failed:', err);
          }
        }
      };

      try {
        this.recognition.start();
      } catch (err) {
        console.warn('[yAp] SpeechRecognition start failed:', err);
        this._renderTranscript('Live transcription failed to start');
        this._stopSpeechRecognition();
      }
    } catch (err) {
      console.warn('[yAp] SpeechRecognition init failed:', err);
      this._renderTranscript('Live transcription unavailable');
      this.recognition = null;
    }
  }

  // ── Draw frozen (grey) waveform after stop ────────────
  _drawFrozen() {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.style.setProperty('--video-scale', '0.92');
      this.videoEl.style.setProperty('--video-brightness', '0.96');
      this.videoEl.style.setProperty('--video-saturate', '1.0');
      this.videoEl.style.setProperty('--video-blur', '0.15px');
      this.videoEl.style.setProperty('--video-glow', '0.12');
      this.videoEl.style.setProperty('--video-drift-x', '0px');
      this.videoEl.style.setProperty('--video-drift-y', '0px');
      this.videoEl.playbackRate = 1;
    }
    this._clearCanvas();
  }

  _clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    const W = this._logicalW || this.canvas.offsetWidth;
    const H = this._logicalH || this.canvas.offsetHeight;
    this.ctx.clearRect(0, 0, W, H);
  }

  _stopSpeechRecognition() {
    if (!this.recognition) return;
    try {
      this.recognition.onend = null;
      this.recognition.stop();
    } catch {}
    this.recognition = null;
  }

  _disconnectTranscriptResizeObserver() {
    if (this._transcriptLayoutRaf) {
      cancelAnimationFrame(this._transcriptLayoutRaf);
      this._transcriptLayoutRaf = 0;
    }
    if (this._transcriptResizeObserver) {
      try {
        this._transcriptResizeObserver.disconnect();
      } catch {}
      this._transcriptResizeObserver = null;
    }
  }

  _ensureTranscriptResizeObserver() {
    if (!this.transcriptEl || this._transcriptResizeObserver || typeof ResizeObserver === 'undefined') return;
    this._transcriptResizeObserver = new ResizeObserver(() => {
      if (this._transcriptLayoutRaf) cancelAnimationFrame(this._transcriptLayoutRaf);
      this._transcriptLayoutRaf = requestAnimationFrame(() => {
        this._transcriptLayoutRaf = 0;
        this._applyTranscriptLayout();
      });
    });
    this._transcriptResizeObserver.observe(this.transcriptEl);
  }

  _transcriptMeasureCtx() {
    if (!this._transcriptMeasureCanvas) {
      this._transcriptMeasureCanvas = document.createElement('canvas');
    }
    return this._transcriptMeasureCanvas.getContext('2d');
  }

  _fitTranscriptTailWords(raw, maxWidthPx) {
    const el = this.transcriptEl;
    if (!el || maxWidthPx <= 1) return raw;
    const ctx = this._transcriptMeasureCtx();
    if (!ctx) return raw;
    try {
      ctx.font = getComputedStyle(el).font || '400 1rem system-ui';
    } catch {
      ctx.font = '400 1rem system-ui';
    }
    const measure = s => {
      try {
        return ctx.measureText(s).width;
      } catch {
        return maxWidthPx + 1;
      }
    };
    const words = raw.split(' ');
    if (words.length === 0) return '';
    const budget = Math.max(0, maxWidthPx - 1);
    let start = 0;
    while (start < words.length) {
      const slice = words.slice(start).join(' ');
      if (measure(slice) <= budget) {
        if (start > 0) {
          const withEllipsis = `… ${slice}`;
          if (measure(withEllipsis) <= budget) return withEllipsis;
        }
        return slice;
      }
      start += 1;
    }
    return '';
  }

  _applyTranscriptLayout() {
    if (!this.transcriptEl) return;
    if (this.transcriptEl.classList.contains('is-placeholder')) return;
    const raw = this._transcriptRaw;
    if (!raw) {
      this.transcriptEl.textContent = APP_COPY.listening;
      this.transcriptEl.classList.add('is-placeholder');
      return;
    }
    const w = this.transcriptEl.clientWidth;
    if (w <= 0) {
      this.transcriptEl.textContent = raw;
      return;
    }
    this.transcriptEl.textContent = this._fitTranscriptTailWords(raw, w);
  }

  _renderTranscript(text) {
    if (!this.transcriptEl) return;
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    const isListening = normalized === '' || normalized === APP_COPY.listening;

    if (isListening) {
      this._disconnectTranscriptResizeObserver();
      this._transcriptRaw = '';
      this.transcriptEl.textContent = APP_COPY.listening;
      this.transcriptEl.classList.add('is-placeholder');
      return;
    }

    this._transcriptRaw = normalized;
    this.transcriptEl.classList.remove('is-placeholder');
    this._ensureTranscriptResizeObserver();
    this._applyTranscriptLayout();
  }

  _startVideo() {
    if (!this.videoEl) return;
    this.videoEl.currentTime = 0;
    this.videoEl.muted = true;
    this.videoEl.defaultMuted = true;
    this.videoEl.style.setProperty('--video-scale', '0.9');
    this.videoEl.style.setProperty('--video-brightness', '0.98');
    this.videoEl.style.setProperty('--video-saturate', '1.1');
    this.videoEl.style.setProperty('--video-blur', '0px');
    this.videoEl.style.setProperty('--video-glow', '0.18');
    this.videoEl.style.setProperty('--video-drift-x', '0px');
    this.videoEl.style.setProperty('--video-drift-y', '0px');
    this.videoEl.playbackRate = 1;
    const playPromise = this.videoEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  _resetVideo() {
    if (!this.videoEl) return;
    this.videoEl.pause();
    this.videoEl.currentTime = 0;
    this.videoEl.playbackRate = 1;
    this.videoEl.style.setProperty('--video-scale', '1');
    this.videoEl.style.setProperty('--video-brightness', '1');
    this.videoEl.style.setProperty('--video-saturate', '1');
    this.videoEl.style.setProperty('--video-blur', '0px');
    this.videoEl.style.setProperty('--video-glow', '0');
    this.videoEl.style.setProperty('--video-drift-x', '0px');
    this.videoEl.style.setProperty('--video-drift-y', '0px');
  }

  // ── Format timer for display ──────────────────────────
  formatDuration(ms) {
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
