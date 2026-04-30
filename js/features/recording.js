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

    // Waveform snapshot for frozen state
    this.frozenData     = null;

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

  // ── Start recording ───────────────────────────────────
  async start() {
    if (this.phase !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support microphone recording.');
    }
    if (typeof window.MediaRecorder === 'undefined') {
      throw new Error('This browser does not support in-app voice recording yet.');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access and try again.'
        : `Could not access microphone: ${err.message}`;
      throw new Error(msg);
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
    this.analyser.smoothingTimeConstant = 0.65;
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
    const master = energy.master;
    const bass = energy.bass;
    const mids = energy.mids;
    const treble = energy.treble;

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
    if (!SpeechRecognition) return;

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

      this.recognition.onerror = () => {};
      this.recognition.onend = () => {
        if (this.phase === 'recording') {
          try { this.recognition.start(); } catch {}
        }
      };

      this.recognition.start();
    } catch {
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

  _renderTranscript(text) {
    if (!this.transcriptEl) return;
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    const clipped = normalized.length > 64 ? '…' + normalized.slice(-64) : normalized;
    const output = clipped || APP_COPY.listening;
    this.transcriptEl.textContent = output;
    this.transcriptEl.classList.toggle('is-placeholder', output === APP_COPY.listening);
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
