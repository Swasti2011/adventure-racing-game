import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { audioEngine } from './audio.js';
import { TrackManager, WORLDS } from './track.js';
import { PlayerKart, AiKart, RemotePlayerKart } from './car.js';

class GameManager {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.activeScreen = 'loading-screen';
    
    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    
    // Scene lighting
    this.dirLight = null;
    this.ambientLight = null;
    
    // Controllers
    this.trackManager = null;
    this.player = null;
    this.aiRacers = [];
    this.orbitControls = null;
    
    // Game State
    this.activeWorldId = 'mushroom';
    this.raceActive = false;
    this.paused = false;
    this.countdown = 3;
    this.countdownTimer = null;
    this.unlockedWorlds = ['mushroom'];
    
    // Save State
    this.coins = 0;
    this.currentKartColor = '#e63946';
    this.ownedUpgrades = {
      car: ['standard'],
      paint: ['#e63946'],
      tires: ['basic'],
      engine: ['basic'],
      spoiler: ['none'],
      underglow: []
    };
    this.equippedUpgrades = {
      car: 'standard',
      tires: 'basic',
      engine: 'basic',
      spoiler: 'none',
      underglow: 'none'
    };

    // Frame rates
    this.lastTime = 0;

    // Multiplayer fields
    this.socket = null;
    this.isMultiplayer = false;
    this.playerIndex = null; // 1 or 2
    this.opponent = null; // RemotePlayerKart
    this.roomCode = '';
    this.syncTimer = 0;
    this.opponentFinished = false;
    this.opponentLaps = 0;
    this.opponentRank = 1;
  }

  init() {
    // 1. Scene Setup
    this.scene = new THREE.Scene();
    
    // 2. Camera Setup (Aspect ratio fits screen)
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 10, 20);
    
    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // 4. Lights Setup
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);
    
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.dirLight.position.set(40, 80, 40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 400;
    const d = 150;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);
    
    // 5. OrbitControls for Garage
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go under ground
    this.orbitControls.minDistance = 4;
    this.orbitControls.maxDistance = 25;
    this.orbitControls.enabled = false; // off during driving
    
    // 6. Instantiate Managers & Karts
    this.trackManager = new TrackManager(this.scene);
    this.player = new PlayerKart(this.scene, this.trackManager);
    
    // Setup Audio helper window bindings for car.js
    window.playCoinSound = () => audioEngine.playCoin();
    window.playBoostSound = () => audioEngine.playBoost();
    window.playSlipSound = () => audioEngine.playSlip();
    window.playSkidSound = (intensity) => audioEngine.playSkid(intensity);
    window.playUsePowerupSound = () => audioEngine.playPowerupUse();
    
    // Collision Callbacks
    this.trackManager.onCoinCollected = () => {
      this.player.coinsCount++;
      audioEngine.playCoin();
      document.getElementById('hud-coins').innerText = this.player.coinsCount;
    };
    
    this.trackManager.onBoostActivated = () => {
      this.player.applyNitroBoost(1.5, 0.4);
    };
    
    this.trackManager.onItemBoxCollected = () => {
      this.player.triggerPowerUpReward();
      audioEngine.playPowerupGet();
      this.updateItemSlotUI();
    };
    
    this.trackManager.onHazardHit = (type) => {
      this.player.hitHazard(type);
    };

    // 7. Bind UI events & Keyboard controls
    this.bindEvents();
    this.bindTouchControls();
    this.loadState();
    
    // 8. Generate Default Mushroom Valley for Menu background
    this.trackManager.generate('mushroom');
    this.player.init(this.currentKartColor, this.equippedUpgrades);
    
    // Place camera pointing at the starting kart
    this.positionCameraForMenu();
    
    // Transition out of loading screen
    this.switchScreen('main-menu');
    
    // Start Animation Render Loop
    this.renderer.setAnimationLoop((time) => this.animate(time));
  }

  // --- PERSISTENCE STATE MANAGER ---

  loadState() {
    try {
      const savedCoins = localStorage.getItem('kart_coins');
      if (savedCoins !== null) this.coins = parseInt(savedCoins, 10);
      
      const savedColor = localStorage.getItem('kart_color');
      if (savedColor !== null) this.currentKartColor = savedColor;
      
      const savedWorlds = localStorage.getItem('kart_worlds');
      if (savedWorlds !== null) this.unlockedWorlds = JSON.parse(savedWorlds);
      
      const savedOwned = localStorage.getItem('kart_owned_upgrades');
      if (savedOwned !== null) this.ownedUpgrades = JSON.parse(savedOwned);
      
      const savedEquipped = localStorage.getItem('kart_equipped_upgrades');
      if (savedEquipped !== null) this.equippedUpgrades = JSON.parse(savedEquipped);
    } catch (e) {
      console.warn("localStorage loading failed, using defaults:", e);
    }
    
    // Update garage displays
    document.getElementById('garage-coins').innerText = this.coins;
  }

  saveState() {
    try {
      localStorage.setItem('kart_coins', this.coins);
      localStorage.setItem('kart_color', this.currentKartColor);
      localStorage.setItem('kart_worlds', JSON.stringify(this.unlockedWorlds));
      localStorage.setItem('kart_owned_upgrades', JSON.stringify(this.ownedUpgrades));
      localStorage.setItem('kart_equipped_upgrades', JSON.stringify(this.equippedUpgrades));
    } catch (e) {
      console.warn("localStorage saving failed:", e);
    }
  }

  // --- UI SCREEN CONTROLLER ---

  switchScreen(screenId) {
    // Hide active
    document.getElementById(this.activeScreen).classList.remove('active');
    
    // Show new
    document.getElementById(screenId).classList.add('active');
    this.activeScreen = screenId;
    
    // Screen adjustments
    if (screenId === 'garage-screen') {
      this.orbitControls.enabled = true;
      this.positionCameraForGarage();
      this.updateGarageShopUI();
    } else {
      this.orbitControls.enabled = false;
    }
    
    if (screenId === 'main-menu') {
      this.positionCameraForMenu();
    }

    if (screenId === 'multiplayer-screen') {
      document.getElementById('mp-initial-panel').style.display = 'block';
      document.getElementById('mp-waiting-panel').style.display = 'none';
      document.getElementById('mp-lobby-error').style.display = 'none';
      document.getElementById('input-room-code').value = '';
    }
  }

  positionCameraForMenu() {
    if (!this.player.mesh) return;
    const kartPos = this.player.mesh.position;
    this.camera.position.set(kartPos.x + 8, kartPos.y + 4, kartPos.z + 12);
    this.camera.lookAt(kartPos.x, kartPos.y + 1, kartPos.z);
  }

  positionCameraForGarage() {
    if (!this.player.mesh) return;
    const kartPos = this.player.mesh.position;
    this.camera.position.set(kartPos.x - 7, kartPos.y + 3, kartPos.z + 8);
    this.orbitControls.target.set(kartPos.x, kartPos.y + 0.5, kartPos.z);
    this.orbitControls.update();
  }

  // --- EVENT BINDINGS (BUTTONS & CONTROLS) ---

  bindEvents() {
    // Handle Window Resizing
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Dynamic mobile vs web touch controls layout update on resize
      if (document.body.classList.contains('touch-device')) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024;
        if (isMobile) {
          document.body.classList.add('mobile-layout');
          document.body.classList.remove('web-layout');
        } else {
          document.body.classList.add('web-layout');
          document.body.classList.remove('mobile-layout');
        }
      }
    });

    // Keyboard controls routes
    window.addEventListener('keydown', (e) => {
      // Initialize audio on first keystroke/interaction
      audioEngine.init();
      
      if (this.activeScreen === 'race-hud') {
        this.player.handleKeyDown(e);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.activeScreen === 'race-hud') {
        this.player.handleKeyUp(e);
      }
    });

    // --- BUTTONS ACTIONS ---
    
    // Audio toggles
    document.getElementById('btn-toggle-audio').addEventListener('click', () => {
      audioEngine.init();
      const on = audioEngine.toggleMusic();
      document.getElementById('btn-toggle-audio').innerHTML = on ? '🔊 Music: ON' : '🔇 Music: OFF';
    });

    // Main Menu Buttons
    document.getElementById('btn-start-game').addEventListener('click', () => {
      audioEngine.init();
      this.isMultiplayer = false;
      this.startRaceCountdown();
    });

    document.getElementById('btn-open-multiplayer').addEventListener('click', () => {
      audioEngine.init();
      this.switchScreen('multiplayer-screen');
    });

    document.getElementById('btn-open-garage').addEventListener('click', () => {
      audioEngine.init();
      this.switchScreen('garage-screen');
    });

    document.getElementById('btn-open-worlds').addEventListener('click', () => {
      audioEngine.init();
      this.populateWorldsGrid();
      this.switchScreen('world-select-screen');
    });

    // Multiplayer Lobby button actions
    document.getElementById('btn-mp-create').addEventListener('click', () => {
      this.initMultiplayerSocket('create');
    });

    document.getElementById('btn-mp-join').addEventListener('click', () => {
      const code = document.getElementById('input-room-code').value.toUpperCase().trim();
      if (!code || code.length !== 4) {
        const errorEl = document.getElementById('mp-lobby-error');
        errorEl.textContent = 'Please enter a valid 4-character room code.';
        errorEl.style.display = 'block';
        return;
      }
      this.initMultiplayerSocket('join', code);
    });

    document.getElementById('btn-mp-back').addEventListener('click', () => {
      this.switchScreen('main-menu');
    });

    document.getElementById('btn-mp-cancel').addEventListener('click', () => {
      this.closeMultiplayerSocket();
      this.switchScreen('main-menu');
    });

    // World Select Screen Back button
    document.getElementById('btn-worlds-back').addEventListener('click', () => {
      this.switchScreen('main-menu');
    });

    // Garage Back button
    document.getElementById('btn-garage-back').addEventListener('click', () => {
      // Re-init player kart model to apply changes cleanly
      this.player.init(this.currentKartColor, this.equippedUpgrades);
      this.switchScreen('main-menu');
    });

    // Pause actions
    document.getElementById('btn-pause-game').addEventListener('click', () => {
      this.pauseRace();
    });

    document.getElementById('btn-resume-race').addEventListener('click', () => {
      this.resumeRace();
    });

    document.getElementById('btn-restart-race').addEventListener('click', () => {
      this.resumeRace();
      this.startRaceCountdown();
    });

    document.getElementById('btn-quit-race').addEventListener('click', () => {
      this.exitRaceToMenu();
    });

    // Victory Continue / Retry Buttons
    document.getElementById('btn-victory-continue').addEventListener('click', () => {
      this.switchScreen('main-menu');
    });

    document.getElementById('btn-victory-retry').addEventListener('click', () => {
      this.startRaceCountdown();
    });

    // Customization Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
      });
    });

    // Paint Color selection
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        swatches.forEach(s => s.classList.remove('active'));
        e.target.classList.add('active');
        
        this.currentKartColor = e.target.dataset.color;
        this.saveState();
        
        // Re-visualize immediately in garage scene
        this.player.init(this.currentKartColor, this.equippedUpgrades);
        this.positionCameraForGarage();
      });
    });
  }

  bindTouchControls() {
    // Detect mobile touch capability dynamically
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      document.body.classList.add('touch-device');
      
      // Determine if mobile layout or web layout should be loaded
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024;
      if (isMobile) {
        document.body.classList.add('mobile-layout');
        document.body.classList.remove('web-layout');
      } else {
        document.body.classList.add('web-layout');
        document.body.classList.remove('mobile-layout');
      }
    }
    
    const bindTouchKey = (btnId, keyName) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      
      const startHandler = (e) => {
        e.preventDefault();
        audioEngine.init();
        this.player.keys[keyName] = true;
      };
      
      const endHandler = (e) => {
        e.preventDefault();
        this.player.keys[keyName] = false;
      };
      
      btn.addEventListener('touchstart', startHandler, { passive: false });
      btn.addEventListener('touchend', endHandler, { passive: false });
      btn.addEventListener('touchcancel', endHandler, { passive: false });
      
      // Also bind mouse events for testing on desktop browser devtools emulation
      btn.addEventListener('mousedown', (e) => {
        audioEngine.init();
        this.player.keys[keyName] = true;
      });
      btn.addEventListener('mouseup', () => {
        this.player.keys[keyName] = false;
      });
      btn.addEventListener('mouseleave', () => {
        this.player.keys[keyName] = false;
      });
    };
    
    bindTouchKey('btn-touch-left', 'left');
    bindTouchKey('btn-touch-right', 'right');
    bindTouchKey('btn-touch-gas', 'forward');
    bindTouchKey('btn-touch-brake', 'backward');
    bindTouchKey('btn-touch-drift', 'drift');
    
    // Use active power-up button
    const useBtn = document.getElementById('btn-touch-use');
    if (useBtn) {
      const triggerUse = (e) => {
        e.preventDefault();
        audioEngine.init();
        this.player.useActivePowerUp();
      };
      useBtn.addEventListener('touchstart', triggerUse, { passive: false });
      useBtn.addEventListener('mousedown', () => {
        audioEngine.init();
        this.player.useActivePowerUp();
      });
    }
  }

  // --- MULTIPLAYER ROOM & WEBSOCKET ENGINE ---

  initMultiplayerSocket(action, roomCode = '') {
    const errorEl = document.getElementById('mp-lobby-error');
    errorEl.style.display = 'none';

    // WebSocket URL resolution logic
    let socketUrl = '';
    const isVercel = window.location.hostname.includes('vercel.app');
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      socketUrl = `ws://${window.location.host}`;
    } else if (window.location.hostname.includes('loca.lt') || window.location.hostname.includes('ngrok')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socketUrl = `${protocol}//${window.location.host}`;
    } else if (isVercel) {
      // Vercel serverless host fallback to local server port 8080
      socketUrl = 'ws://localhost:8080';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socketUrl = `${protocol}//${window.location.host}`;
    }
    
    try {
      this.socket = new WebSocket(socketUrl);
    } catch (e) {
      errorEl.textContent = isVercel
        ? 'Vercel is static-only. Open http://localhost:8080 or run "npx localtunnel --port 8080".'
        : 'Failed to connect to multiplayer server.';
      errorEl.style.display = 'block';
      return;
    }

    this.socket.onopen = () => {
      if (action === 'create') {
        this.socket.send(JSON.stringify({ type: 'CREATE_ROOM' }));
      } else if (action === 'join') {
        this.socket.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode }));
      }
    };

    this.socket.onclose = () => {
      this.cleanupMultiplayer();
      // Only show error if we are on the multiplayer screen
      if (this.activeScreen === 'multiplayer-screen') {
        errorEl.textContent = 'Disconnected from server.';
        errorEl.style.display = 'block';
      } else if (this.activeScreen === 'race-hud') {
        alert('Opponent disconnected or server closed room. Returning to main menu.');
        this.exitRaceToMenu();
      }
    };

    this.socket.onerror = (err) => {
      console.error('Socket error:', err);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'ROOM_CREATED': {
            this.roomCode = data.roomCode;
            this.playerIndex = data.playerIndex;
            this.isMultiplayer = true;

            document.getElementById('mp-initial-panel').style.display = 'none';
            document.getElementById('mp-waiting-panel').style.display = 'block';
            document.getElementById('lbl-room-code').textContent = data.roomCode;
            break;
          }

          case 'ROOM_JOINED': {
            this.roomCode = data.roomCode;
            this.playerIndex = data.playerIndex;
            this.isMultiplayer = true;
            
            document.getElementById('mp-initial-panel').style.display = 'none';
            document.getElementById('mp-waiting-panel').style.display = 'block';
            document.getElementById('lbl-room-code').textContent = data.roomCode;
            break;
          }

          case 'OPPONENT_JOINED': {
            // Both clients are connected! Start game.
            document.getElementById('mp-hud-status').classList.remove('hidden');
            document.getElementById('mp-hud-status-text').textContent = `ROOM: ${this.roomCode}`;
            
            // Instantly transition to HUD and start race!
            this.opponentFinished = false;
            this.opponentLaps = 0;
            
            // Spawn the opponent
            if (this.opponent) {
              this.opponent.clear();
            }
            this.opponent = new RemotePlayerKart(this.scene);
            
            // Player 1 is red, Player 2 is pink (or opposite of current local color)
            let oppColor = '#ff007f';
            if (this.playerIndex === 2) {
              oppColor = '#e63946';
            }
            this.opponent.init(oppColor);

            this.startRaceCountdown();
            break;
          }

          case 'SYNC_STATE': {
            if (this.opponent) {
              this.opponent.updateState(data);
            }
            break;
          }

          case 'SPAWN_HAZARD': {
            if (this.trackManager) {
              this.trackManager.dropHazard(data.hazardType, new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z));
            }
            break;
          }

          case 'COLLECT_ITEM': {
            if (this.trackManager) {
              this.trackManager.collectItemBoxByPosition(data.pos.x, data.pos.y, data.pos.z);
            }
            break;
          }

          case 'LAP_COMPLETE': {
            this.opponentLaps = data.lap;
            break;
          }

          case 'FINISH_RACE': {
            this.opponentFinished = true;
            this.opponentRank = data.rank;
            break;
          }

          case 'OPPONENT_LEFT': {
            alert('Your opponent has left the race. Returning to main menu.');
            this.exitRaceToMenu();
            break;
          }

          case 'ERROR': {
            errorEl.textContent = data.message;
            errorEl.style.display = 'block';
            this.closeMultiplayerSocket();
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error handling websocket message:', err);
      }
    };
  }

  closeMultiplayerSocket() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'QUIT_RACE' }));
      }
      this.socket.close();
      this.socket = null;
    }
    this.cleanupMultiplayer();
  }

  cleanupMultiplayer() {
    this.isMultiplayer = false;
    this.playerIndex = null;
    this.roomCode = '';
    this.opponentFinished = false;
    this.opponentLaps = 0;
    document.getElementById('mp-hud-status').classList.add('hidden');
    if (this.opponent) {
      this.opponent.clear();
      this.opponent = null;
    }
  }

  exitRaceToMenu() {
    this.resumeRace();
    this.raceActive = false;
    audioEngine.setEngineActive(false);
    this.closeMultiplayerSocket();
    
    this.trackManager.generate(this.activeWorldId);
    this.player.init(this.currentKartColor, this.equippedUpgrades);
    this.switchScreen('main-menu');
  }

  // --- GARAGE / UPGRADES SHOP UI RENDERING ---

  updateGarageShopUI() {
    document.getElementById('garage-coins').innerText = this.coins;
    
    // Highlight the active swatch
    document.querySelectorAll('.color-swatch').forEach(s => {
      if (s.dataset.color === this.currentKartColor) s.classList.add('active');
      else s.classList.remove('active');
    });

    // Query and update all item cards
    const upgradeItems = document.querySelectorAll('.upgrade-item');
    upgradeItems.forEach(item => {
      const type = item.dataset.type;
      const id = item.dataset.id;
      const cost = parseInt(item.dataset.cost, 10);
      const button = item.querySelector('.btn-action');
      
      const isOwned = this.ownedUpgrades[type] && this.ownedUpgrades[type].includes(id) || cost === 0;
      const isEquipped = this.equippedUpgrades[type] === id;
      
      // Remove old event listeners
      const clone = button.cloneNode(true);
      button.parentNode.replaceChild(clone, button);
      
      if (isEquipped) {
        clone.className = "btn btn-sm btn-action equipped";
        clone.innerText = "Equipped";
      } else if (isOwned) {
        clone.className = "btn btn-sm btn-action btn-secondary";
        clone.innerText = "Equip";
        clone.addEventListener('click', () => {
          this.equippedUpgrades[type] = id;
          this.saveState();
          this.player.init(this.currentKartColor, this.equippedUpgrades);
          this.updateGarageShopUI();
          this.positionCameraForGarage();
        });
      } else {
        // Can buy
        clone.className = "btn btn-sm btn-action btn-buy";
        clone.innerText = `Buy ${cost} 🪙`;
        
        if (this.coins >= cost) {
          clone.addEventListener('click', () => {
            this.coins -= cost;
            if (!this.ownedUpgrades[type]) this.ownedUpgrades[type] = [];
            this.ownedUpgrades[type].push(id);
            this.equippedUpgrades[type] = id;
            this.saveState();
            
            this.player.init(this.currentKartColor, this.equippedUpgrades);
            this.updateGarageShopUI();
            this.positionCameraForGarage();
          });
        } else {
          clone.style.opacity = 0.5;
          clone.style.cursor = 'not-allowed';
        }
      }
    });

    // Update garage performance meters (fair, equal base physics across all car body styles)
    const base = { speed: 50, accel: 50, handling: 50 };
    const engineSpeedBonus = this.equippedUpgrades.engine === 'turbo' ? 30 : (this.equippedUpgrades.engine === 'v6' ? 15 : 0);
    const engineAccelBonus = this.equippedUpgrades.engine === 'v6' ? 30 : (this.equippedUpgrades.engine === 'turbo' ? 15 : 0);
    const tiresHandlingBonus = this.equippedUpgrades.tires === 'sport' ? 30 : (this.equippedUpgrades.tires === 'neon' ? 15 : 0);

    const maxSpeedPercent = Math.min(base.speed + engineSpeedBonus, 100);
    const accelPercent = Math.min(base.accel + engineAccelBonus, 100);
    const handlingPercent = Math.min(base.handling + tiresHandlingBonus, 100);
    
    document.getElementById('stat-speed-fill').style.width = `${maxSpeedPercent}%`;
    document.getElementById('stat-accel-fill').style.width = `${accelPercent}%`;
    document.getElementById('stat-steer-fill').style.width = `${handlingPercent}%`;
  }

  // --- WORLD SELECTION CARDS RENDERER ---

  populateWorldsGrid() {
    const container = document.getElementById('worlds-container');
    container.innerHTML = '';
    
    WORLDS.forEach(world => {
      const isLocked = !this.unlockedWorlds.includes(world.id);
      
      const card = document.createElement('div');
      card.className = `world-card ${world.id === this.activeWorldId ? 'active-world' : ''} ${isLocked ? 'locked' : ''}`;
      
      // Beautiful card style color
      card.style.borderColor = world.themeColor;
      card.style.background = `linear-gradient(135deg, ${world.themeColor}33 0%, rgba(15,17,26,0.95) 70%)`;
      
      card.innerHTML = `
        <div class="world-info">
          <div class="world-name" style="color: ${world.themeColor};">${world.name}</div>
          <div class="world-desc">${world.description}</div>
        </div>
      `;
      
      if (!isLocked) {
        card.addEventListener('click', () => {
          this.activeWorldId = world.id;
          this.trackManager.generate(this.activeWorldId);
          this.player.init(this.currentKartColor, this.equippedUpgrades);
          this.populateWorldsGrid();
        });
      }
      container.appendChild(card);
    });
  }

  // --- RACE CYCLE & COUNTDOWN COORDINATORS ---

  startRaceCountdown() {
    this.switchScreen('race-hud');
    window.focus(); // Capture keyboard focus immediately after button click
    this.countdown = 3;
    
    const countEl = document.getElementById('countdown-overlay');
    countEl.classList.remove('hidden');
    countEl.innerText = this.countdown;
    
    this.raceActive = false;
    this.paused = false;
    
    // Regenerate track to guarantee randomization per race
    this.trackManager.generate(this.activeWorldId);
    
    // Position Audio theme
    const activeWorld = WORLDS.find(w => w.id === this.activeWorldId) || WORLDS[0];
    audioEngine.setTheme(activeWorld.baseTheme || activeWorld.id);
    
    // Reset player
    this.player.reset();
    this.player.coinsCount = 0;
    this.updateItemSlotUI();
    document.getElementById('hud-coins').innerText = 0;
    document.getElementById('hud-lap').innerText = '1 / 3';
    this.trackManager.updateLapSign(1);
    document.getElementById('hud-world').innerText = WORLDS.find(w => w.id === this.activeWorldId).name;
    
    if (this.isMultiplayer) {
      // Stagger local player 1 and 2 starting grid positions
      const startT = this.playerIndex === 1 ? 0.04 : 0.032;
      const startPt = this.trackManager.curve.getPointAt(startT);
      const tangent = this.trackManager.curve.getTangentAt(startT);
      const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const side = this.playerIndex === 1 ? -1 : 1;
      
      this.player.position.copy(startPt).addScaledVector(right, side * 2.0);
      this.player.position.y += 0.5;
      this.player.heading = Math.atan2(tangent.x, tangent.z);
      this.player.closestT = startT;
      
      if (this.player.mesh) {
        this.player.mesh.position.copy(this.player.position);
        this.player.mesh.rotation.set(0, this.player.heading, 0);
      }
      
      // Hook up local hazard drop broadcasts
      this.player.onHazardDropped = (hazardType, pos) => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'SPAWN_HAZARD',
            hazardType,
            pos: { x: pos.x, y: pos.y, z: pos.z }
          }));
        }
      };
    }

    // Build AI Racers (7 total) - only in Single Player Mode
    this.clearAiRacers();
    if (!this.isMultiplayer) {
      const colors = ['#06d6a0', '#ff007f', '#8338ec', '#00f2fe', '#ffbe0b', '#e63946', '#ffffff', '#ff9f1c'];
      const aiColors = colors.filter(c => c.toLowerCase() !== this.currentKartColor.toLowerCase()).slice(0, 7);
      
      for (let i = 0; i < 7; i++) {
        const ai = new AiKart(this.scene, this.trackManager, i + 1, aiColors[i] || '#cccccc');
        ai.init();
        this.aiRacers.push(ai);
      }
    } else {
      // Spawn opponent kart at start
      if (this.opponent) {
        const oppT = this.playerIndex === 1 ? 0.032 : 0.04;
        const oppPt = this.trackManager.curve.getPointAt(oppT);
        const oppTangent = this.trackManager.curve.getTangentAt(oppT);
        const oppRight = new THREE.Vector3(-oppTangent.z, 0, oppTangent.x).normalize();
        const oppSide = this.playerIndex === 1 ? 1 : -1;
        
        this.opponent.targetPosition.copy(oppPt).addScaledVector(oppRight, oppSide * 2.0);
        this.opponent.targetPosition.y += 0.5;
        this.opponent.targetHeading = Math.atan2(oppTangent.x, oppTangent.z);
        this.opponent.heading = this.opponent.targetHeading;
        this.opponent.position.copy(this.opponent.targetPosition);
        
        if (this.opponent.mesh) {
          this.opponent.mesh.position.copy(this.opponent.position);
          this.opponent.mesh.rotation.set(0, this.opponent.heading, 0);
        }
      }
    }
    
    // Countdown timer ticks
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      
      if (this.countdown > 0) {
        countEl.innerText = this.countdown;
      } else if (this.countdown === 0) {
        countEl.innerText = 'GO!';
        this.raceActive = true;
        
        // Start engine audio
        audioEngine.setEngineActive(true);
      } else {
        clearInterval(this.countdownTimer);
        countEl.classList.add('hidden');
      }
    }, 1000);
  }

  clearAiRacers() {
    this.aiRacers.forEach(ai => ai.clear());
    this.aiRacers = [];
  }

  pauseRace() {
    if (!this.raceActive) return;
    this.paused = true;
    this.switchScreen('pause-menu');
    audioEngine.setEngineActive(false);
  }

  resumeRace() {
    this.paused = false;
    this.switchScreen('race-hud');
    if (this.raceActive) audioEngine.setEngineActive(true);
  }

  // --- ITEM SLOT HUD UPDATER ---

  updateItemSlotUI() {
    const slot = document.getElementById('hud-item-slot');
    slot.innerHTML = '';
    
    if (!this.player.activePowerUp) {
      slot.className = "item-slot empty";
      return;
    }
    
    slot.className = "item-slot active-item";
    let icon = '⚡';
    
    switch (this.player.activePowerUp) {
      case 'boost':
        icon = '🚀';
        slot.style.color = '#06d6a0';
        break;
      case 'banana':
        icon = '🍌';
        slot.style.color = '#ffbe0b';
        break;
      case 'oil':
        icon = '🛢️';
        slot.style.color = '#555555';
        break;
      case 'magnet':
        icon = '🧲';
        slot.style.color = '#ff007f';
        break;
      case 'shield':
        icon = '🛡️';
        slot.style.color = '#00f2fe';
        break;
      case 'jump':
        icon = '🦘';
        slot.style.color = '#8338ec';
        break;
    }
    slot.innerHTML = `<span>${icon}</span>`;
  }

  // --- GAME OVER & REWARD SYSTEM ---

  triggerRaceFinished() {
    this.raceActive = false;
    audioEngine.setEngineActive(false);
    this.trackManager.updateLapSign(4); // "FINISH"
    
    // Determine player rank position
    let rank = 1;
    if (this.isMultiplayer) {
      if (this.opponentFinished) {
        rank = 2;
      } else {
        rank = 1;
        // Inform opponent that we finished first
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'FINISH_RACE', rank: 1 }));
        }
      }
    } else {
      const racers = [
        { id: 'player', lap: this.player.completedLaps, t: this.player.closestT },
        ...this.aiRacers.map(ai => ({ id: `ai_${ai.index}`, lap: ai.completedLaps, t: ai.t }))
      ];
      
      // Sort by laps then progress t
      racers.sort((a, b) => {
        if (b.lap !== a.lap) return b.lap - a.lap;
        return b.t - a.t;
      });
      
      rank = racers.findIndex(r => r.id === 'player') + 1;
    }
    
    const rankSuffix = ['st', 'nd', 'rd'][rank - 1] || 'th';
    const rankStr = `${rank}${rankSuffix}`;
    
    // Compute reward coins
    const coinsCollected = this.player.coinsCount;
    // Rank bonus: 1st=100, 2nd=60, 3rd=30, 4th=20, 5th=15, 6th=10, 7th=5, 8th=2
    const finishBonus = [100, 60, 30, 20, 15, 10, 5, 2][rank - 1] || 2;
    const totalEarned = coinsCollected + finishBonus;
    
    this.coins += totalEarned;
    this.saveState();
    
    // UI details
    document.getElementById('victory-title').innerText = rank === 1 ? 'VICTORY!' : 'RACE FINISHED';
    document.getElementById('victory-title').className = rank === 1 ? 'neon-text-gold' : 'neon-text-blue';
    document.getElementById('victory-subtitle').innerText = `You finished in ${rankStr} Place!`;
    document.getElementById('reward-coins-collected').innerText = `+${coinsCollected} 🪙`;
    document.getElementById('reward-finish-bonus').innerText = `+${finishBonus} 🪙`;
    document.getElementById('reward-total').innerText = `+${totalEarned} 🪙`;
    
    // Unlocking mechanics for next worlds
    const currentWorldIndex = WORLDS.findIndex(w => w.id === this.activeWorldId);
    const nextWorld = WORLDS[currentWorldIndex + 1];
    
    const unlockBox = document.getElementById('unlock-notification');
    if (rank === 1 && nextWorld && !this.unlockedWorlds.includes(nextWorld.id)) {
      this.unlockedWorlds.push(nextWorld.id);
      this.saveState();
      
      document.getElementById('unlock-text').innerText = `${nextWorld.name} unlocked!`;
      unlockBox.classList.remove('hidden');
    } else {
      unlockBox.classList.add('hidden');
    }
    
    this.switchScreen('game-over-screen');
  }

  // --- ANIMATION LOOP (GAME TICK) ---

  animate(time) {
    // Delta time calculation
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // clamp to prevent jumps on lag spikes
    
    // Update Orbit controls in Garage mode
    if (this.activeScreen === 'garage-screen' && this.orbitControls.enabled) {
      this.orbitControls.update();
      // Slowly rotate kart body for display
      if (this.player.mesh) {
        this.player.mesh.rotation.y += 0.3 * deltaTime;
      }
    }

    const isRaceHud = (this.activeScreen === 'race-hud');

    if (isRaceHud) {
      if (this.raceActive && !this.paused) {
        // 1. Update Player Physics
        this.player.update(deltaTime);
        
        // Update engine audio pitch based on player speed
        const speedRatio = Math.min(Math.abs(this.player.speed) / (this.player.baseMaxSpeed * this.player.maxSpeedModifier), 1.0);
        audioEngine.updateEnginePitch(speedRatio);

        // Magnet power-up logic (pulls coins)
        if (this.player.magnetActive && this.trackManager.coins.length > 0) {
          this.trackManager.coins.forEach(coin => {
            const dist = this.player.position.distanceTo(coin.position);
            if (dist < 28.0) {
              // Lerp coin closer to player
              coin.position.lerp(this.player.position, deltaTime * 8.0);
            }
          });
        }

        // Check collectibles and boost collisions
        this.trackManager.checkCollisions(this.player);
        this.updateItemSlotUI();

        // Broadcast local player state to multiplayer opponent
        if (this.isMultiplayer) {
          this.syncTimer += deltaTime;
          if (this.syncTimer >= 0.033) {
            this.syncTimer = 0;
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.socket.send(JSON.stringify({
                type: 'SYNC_STATE',
                position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
                heading: this.player.heading,
                speed: this.player.speed,
                isDrifting: this.player.isDrifting,
                driftDirection: this.player.driftDirection,
                spinTimer: this.player.spinTimer,
                closestT: this.player.closestT
              }));
            }
          }
        }
      }

      // Update opponent kart representation
      if (this.isMultiplayer && this.opponent) {
        this.opponent.update(deltaTime);
      }

      // 2. Update AI Karts (Runs during countdown too to align them)
      this.aiRacers.forEach(ai => {
        ai.update(deltaTime, this.raceActive && !this.paused);
        
        // AI checks collisions with hazard objects
        if (this.raceActive && !this.paused) {
          this.trackManager.hazards.forEach(hazard => {
            const dist = ai.position.distanceTo(hazard.position);
            const radius = hazard.userData.type === 'crate' ? 2.0 : 1.6;
            
            if (dist < 3.2 + radius && ai.spinTimer <= 0) {
              ai.hitHazard();
              if (hazard.userData.type === 'banana') {
                this.scene.remove(hazard);
                const idx = this.trackManager.hazards.indexOf(hazard);
                if (idx > -1) this.trackManager.hazards.splice(idx, 1);
              }
            }
          });
        }
      });

      // 3. Update Camera 3rd person follow damp (Updates during countdown too!)
      this.updateCameraFollow(this.raceActive && !this.paused ? deltaTime : 1.0);
      
      if (this.raceActive && !this.paused) {
        // 4. Update HUD stats
        document.getElementById('hud-speed').innerText = Math.round(Math.abs(this.player.speed) * 3);
        
        // Drift Meter bar
        const driftFill = document.getElementById('drift-bar-fill');
        const driftTxt = document.getElementById('drift-txt');
        if (this.player.isDrifting) {
          const driftPct = Math.min((this.player.driftCharge / 2.3) * 100, 100);
          driftFill.style.width = `${driftPct}%`;
          
          const lvl = this.player.getDriftBoostLevel();
          if (lvl > 0) {
            driftTxt.className = "drift-label active-drift";
            driftTxt.innerText = `BOOST LVL ${lvl}!`;
          } else {
            driftTxt.className = "drift-label";
            driftTxt.innerText = "DRIFTING";
          }
        } else {
          driftFill.style.width = '0%';
          driftTxt.className = "drift-label";
          driftTxt.innerText = "DRIFT";
        }

        // Lap tracking checks (3 laps)
        const lapProgress = this.player.closestT;
        const oldProgress = this.player.prevT || 0;
        this.player.prevT = lapProgress;
        
        // Lap trigger gate crossing start-line (t wraps from 0.95 -> 0.05)
        if (oldProgress > 0.85 && lapProgress < 0.15) {
          this.player.completedLaps++;
          this.trackManager.updateLapSign(this.player.completedLaps + 1);
          
          if (this.isMultiplayer && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
              type: 'LAP_COMPLETE',
              lap: this.player.completedLaps
            }));
          }

          if (this.player.completedLaps >= 3) {
            this.triggerRaceFinished();
          } else {
            document.getElementById('hud-lap').innerText = `${this.player.completedLaps + 1} / 3`;
          }
        }
        
        // Compute positions ranking
        let playerRank = 1;
        let totalRacers = 1;
        if (this.isMultiplayer) {
          totalRacers = 2;
          const oppT = (this.opponent && this.opponent.closestT !== undefined) ? this.opponent.closestT : 0;
          if (this.opponentLaps > this.player.completedLaps) {
            playerRank = 2;
          } else if (this.opponentLaps === this.player.completedLaps) {
            if (oppT > this.player.closestT) {
              playerRank = 2;
            }
          }
        } else {
          totalRacers = this.aiRacers.length + 1;
          const positions = [
            { id: 'player', lap: this.player.completedLaps, t: this.player.closestT },
            ...this.aiRacers.map(ai => ({ id: `ai_${ai.index}`, lap: ai.completedLaps, t: ai.t }))
          ];
          positions.sort((a, b) => {
            if (b.lap !== a.lap) return b.lap - a.lap;
            return b.t - a.t;
          });
          playerRank = positions.findIndex(r => r.id === 'player') + 1;
        }
        const suffix = ['st', 'nd', 'rd'][playerRank - 1] || 'th';
        document.getElementById('hud-pos').innerText = `${playerRank}${suffix} / ${totalRacers}`;
        
        // Check if AI racers finish race
        this.aiRacers.forEach(ai => {
          if (ai.completedLaps >= 3 && this.raceActive) {
            this.triggerRaceFinished();
          }
        });
      }
    }

    // Update track spins/boxes float animations
    this.trackManager.update(deltaTime);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  updateCameraFollow(deltaTime) {
    if (!this.player.mesh) return;
    
    // Calculate player's forward vector direction
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.heading);
    
    // Rear target camera offsets
    const targetCamOffset = new THREE.Vector3()
      .copy(forward)
      .multiplyScalar(-15.5) // Distance behind
      .add(new THREE.Vector3(0, 4.8, 0)); // Height above
      
    const targetCamPos = this.player.position.clone().add(targetCamOffset);
    
    // Damping lerp interpolation (clamp alpha between 0 and 1)
    const alpha = Math.min(deltaTime * 5.5, 1.0);
    this.camera.position.lerp(targetCamPos, alpha);
    
    // Look ahead of the kart
    const lookTarget = this.player.position.clone().addScaledVector(forward, 6.0);
    this.camera.lookAt(lookTarget);
  }
}

// Initialise the game orchestrator immediately or when DOM is ready
const initGame = () => {
  const game = new GameManager();
  game.init();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

