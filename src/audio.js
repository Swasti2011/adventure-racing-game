// Web Audio API Synthesizer and Step Sequencer for Retro Chiptunes
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.isMuted = false;
    
    // Engine sound nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
    
    // Sequencer variables
    this.seqTimer = null;
    this.nextNoteTime = 0.0;
    this.stepIndex = 0;
    this.tempo = 135; // BPM
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // sec
    
    this.activeWorldTheme = 'mushroom';
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Initialize master output nodes
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);
      
      // Initialize engine sounds
      this.setupEngineSound();
      
      // Start the sequencer loop
      this.nextNoteTime = this.ctx.currentTime;
      this.scheduler();
    } catch (e) {
      console.warn("Web Audio API not supported in this browser:", e);
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    return this.musicEnabled;
  }

  // Synthesize Engine Sounds
  setupEngineSound() {
    if (!this.ctx) return;
    
    // Create oscillator components
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineFilter = this.ctx.createBiquadFilter();
    
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    
    // Low rumble frequency
    this.engineOsc1.frequency.setValueAtTime(35, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(17.5, this.ctx.currentTime);
    
    // Low pass filter to make it sound warm and rumbly
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(4, this.ctx.currentTime);
    
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Off by default
    
    // Connections
    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterVolume);
    
    this.engineOsc1.start(0);
    this.engineOsc2.start(0);
  }

  setEngineActive(isActive) {
    if (!this.ctx || !this.engineGain) return;
    const targetVolume = isActive ? 0.35 : 0.0;
    this.engineGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.1);
  }

  updateEnginePitch(speedRatio) {
    if (!this.ctx || !this.engineOsc1) return;
    // Map speed ratio (0 to 1) to engine pitch frequency
    const baseFreq1 = 35 + speedRatio * 140; // 35Hz to 175Hz
    const baseFreq2 = 17.5 + speedRatio * 70; // 17.5Hz to 87.5Hz
    
    this.engineOsc1.frequency.setTargetAtTime(baseFreq1, this.ctx.currentTime, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq2, this.ctx.currentTime, 0.05);
    
    // Dynamically open filter on high revs
    const filterFreq = 120 + speedRatio * 280; // 120Hz to 400Hz
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
  }

  // --- SOUND EFFECTS SYNTHESIZERS ---

  // Coin Clink: Rapid two-note arpeggio (B5 -> E6)
  playCoin() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.masterVolume);
    
    osc.frequency.setValueAtTime(988, t); // B5
    osc.frequency.setValueAtTime(1319, t + 0.07); // E6
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    
    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Boost Sound: Sweep noise/pitch up
  playBoost() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const duration = 1.2;
    
    // Create high-pass noise burst
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(4500, t + duration * 0.8);
    filter.Q.setValueAtTime(3, t);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);
    
    noiseSource.start(t);
    
    // Add a rising synthesizer tone alongside the noise
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + duration * 0.5);
    
    oscGain.gain.setValueAtTime(0.12, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.8);
    
    osc.connect(oscGain);
    oscGain.connect(this.masterVolume);
    osc.start(t);
    osc.stop(t + duration);
  }

  // Slip sound (stepping on banana peel): Sweep pitch down rapidly
  playSlip() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const duration = 0.5;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(110, t + duration);
    
    // Add vibrato/wobble for spinning sensation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(15, t); // 15Hz vibrato
    lfoGain.gain.setValueAtTime(30, t);
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    
    lfo.start(t);
    osc.start(t);
    lfo.stop(t + duration);
    osc.stop(t + duration);
  }

  // Skid sound: Noise buffer scaled by intensity
  playSkid(intensity) {
    if (!this.ctx || intensity < 0.1) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    
    // Synthesize squealing tires
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650 + Math.random() * 80, t);
    
    // Filtered noise for friction
    noise.type = 'bandpass';
    noise.frequency.setValueAtTime(1800, t);
    noise.Q.setValueAtTime(1.0, t);
    
    gain.gain.setValueAtTime(0.07 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Powerup collection ding
  playPowerupGet() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(261.63, t); // C4
    osc.frequency.setValueAtTime(329.63, t + 0.08); // E4
    osc.frequency.setValueAtTime(392.00, t + 0.16); // G4
    osc.frequency.setValueAtTime(523.25, t + 0.24); // C5
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.setValueAtTime(0.2, t + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  // Use Powerup trigger
  playPowerupUse() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.linearRampToValueAtTime(220, t + 0.25);
    
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // --- RETRO CHIPTUNE STEP SEQUENCER ---
  
  setTheme(themeName) {
    this.activeWorldTheme = themeName;
  }

  scheduler() {
    // Safety guard for tab suspension or backgrounding
    if (this.nextNoteTime < this.ctx.currentTime) {
      this.nextNoteTime = this.ctx.currentTime;
    }
    // Keep scheduling notes in advance
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNextStep(this.stepIndex, this.nextNoteTime);
      this.advanceStep();
    }
    this.seqTimer = setTimeout(() => this.scheduler(), this.lookahead);
  }

  advanceStep() {
    const secondsPerBeat = 60.0 / this.tempo;
    const stepDuration = 0.25 * secondsPerBeat; // 16th notes
    this.nextNoteTime += stepDuration;
    this.stepIndex = (this.stepIndex + 1) % 16; // 16-step patterns
  }

  scheduleNextStep(step, time) {
    if (!this.musicEnabled) return;

    // Define themes compositions
    const themes = {
      mushroom: {
        bpm: 135,
        bass:   [36, 43, 36, 43, 38, 45, 38, 45, 41, 48, 41, 48, 43, 50, 43, 47], // C, G, D, A, F, C, G...
        lead:   [60, null, 64, 67, 72, null, 67, 64, 65, null, 69, 72, 67, null, 71, 74],
        drums:  [1,  0,   2,  0,   1,  0,   2,  0,   1,  0,   2,  0,   1,  1,   2,  0] // 1=Kick, 2=Snare
      },
      lava: {
        bpm: 145,
        bass:   [33, 33, 40, 33, 36, 36, 43, 36, 38, 38, 45, 38, 31, 31, 38, 31], // A-m, C, D, G
        lead:   [57, 60, 64, 69, 67, 64, 60, 57, 62, 65, 69, 65, 62, 59, 62, 67],
        drums:  [1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2]
      },
      desert: {
        bpm: 128,
        bass:   [40, 40, 40, 40, 41, 41, 41, 41, 40, 40, 43, 43, 41, 41, 40, 40], // E Phrygian / Arabian scales
        lead:   [64, 65, 68, 69, 71, 72, 71, 69, 68, 65, 64, null, 65, 68, 64, null],
        drums:  [1,  0,   2,  1,   1,  0,   2,  0,   1,  0,   2,  1,   1,  1,   2,  0]
      },
      candy: {
        bpm: 130,
        bass:   [48, 48, 52, 52, 55, 55, 52, 52, 53, 53, 57, 57, 50, 50, 55, 55], // Sweet C major progression
        lead:   [72, 76, 79, 84, 83, 79, 76, 79, 77, 81, 84, 81, 74, 77, 79, 83],
        drums:  [1,  0,   2,  1,   0,  1,   2,  0,   1,  0,   2,  1,   0,  1,   2,  2]
      },
      jungle: {
        bpm: 125,
        bass:   [38, null, 38, 45, null, 38, 45, null, 36, null, 36, 43, null, 36, 43, null], // Syncopated groove
        lead:   [50, 53, 57, null, 55, 52, 48, null, 47, 50, 53, null, 52, 48, 45, null],
        drums:  [1,  1,   2,  0,   1,  1,   2,  1,   1,  1,   2,  0,   1,  1,   2,  2]
      },
      ice: {
        bpm: 110,
        bass:   [43, null, null, 43, 47, null, null, 47, 48, null, null, 48, 50, null, null, 50], // Slower, ethereal
        lead:   [79, 83, 86, 91, 88, 84, 83, null, 84, 88, 91, 95, 93, 89, 86, null], // Very high bells
        drums:  [1,  0,   0,  2,   0,  0,   1,  0,   0,  2,   0,  0,   1,  0,   2,  0]
      },
      cyber: {
        bpm: 140,
        bass:   [45, 45, 45, 45, 43, 43, 43, 43, 41, 41, 41, 41, 43, 43, 43, 43], // Fast synthwave bass progression
        lead:   [69, 72, 76, 79, 77, 74, 72, 69, 71, 74, 77, 81, 79, 76, 74, null],
        drums:  [1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2]
      },
      ghost: {
        bpm: 120,
        bass:   [38, 38, 41, 41, 44, 44, 41, 41, 36, 36, 39, 39, 42, 42, 39, 39], // Haunted minor third progression
        lead:   [62, null, 65, 68, 70, null, 68, 65, 60, null, 63, 66, 68, null, 66, 63],
        drums:  [1,  0,   2,  0,   1,  1,   2,  0,   1,  0,   2,  0,   1,  1,   2,  2]
      },
      rainbow: {
        bpm: 150,
        bass:   [36, 36, 48, 36, 40, 40, 52, 40, 43, 43, 55, 43, 45, 45, 57, 45], // Fast octave bass lines
        lead:   [60, 72, 64, 76, 67, 79, 72, 84, 71, 83, 67, 79, 69, 81, 72, 84], // Fast retro space arpeggios
        drums:  [1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2,   1,  2]
      }
    };

    const theme = themes[this.activeWorldTheme] || themes.mushroom;
    this.tempo = theme.bpm;

    // 1. Play Bass Note (Triangle oscillator, warm and round)
    const bassMidi = theme.bass[step];
    if (bassMidi !== null) {
      this.playSynthNote(this.midiToFreq(bassMidi), 'triangle', 0.12, 0.22, time);
    }

    // 2. Play Lead Note (Square oscillator, sharp and classic retro chiptune)
    const leadMidi = theme.lead[step];
    if (leadMidi !== null && step % 2 === 0) { // Keep lead syncopated
      // Add vibrato/slide occasionally
      this.playSynthNote(this.midiToFreq(leadMidi), 'square', 0.05, 0.14, time);
    }

    // 3. Play Drum Note
    const drumType = theme.drums[step];
    if (drumType === 1) {
      this.playKickDrum(time);
    } else if (drumType === 2) {
      this.playSnareDrum(time);
    }
  }

  // Convert MIDI note number to frequency
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  playSynthNote(freq, type, volume, duration, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  playKickDrum(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  playSnareDrum(time) {
    // White noise for snare snap
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.Q.setValueAtTime(1.5, time);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);
    noise.start(time);
    
    // Add a quick mid-freq triangle pop for impact
    const pop = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(180, time);
    popGain.gain.setValueAtTime(0.12, time);
    popGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    pop.connect(popGain);
    popGain.connect(this.masterVolume);
    pop.start(time);
    pop.stop(time + 0.06);
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
