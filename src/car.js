import * as THREE from 'three';

// Procedurally builds a 3D Low-Poly Kart Model
export function createKartMesh(colorPreset = '#e63946', upgrades = {}) {
  const group = new THREE.Group();
  
  // 1. Kart Chassis (Main Body)
  const bodyGeom = new THREE.BoxGeometry(2.0, 0.6, 3.8);
  const bodyMat = new THREE.MeshPhongMaterial({
    color: colorPreset,
    flatShading: true,
    shininess: 80
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  
  // Nose/Hood section
  const noseGeom = new THREE.BoxGeometry(1.6, 0.4, 1.2);
  const nose = new THREE.Mesh(noseGeom, bodyMat);
  nose.position.set(0, 0.4, 1.8);
  nose.castShadow = true;
  group.add(nose);

  // Seat
  const seatGeom = new THREE.BoxGeometry(1.4, 0.9, 0.9);
  const seatMat = new THREE.MeshPhongMaterial({ color: '#1a1a1a', flatShading: true });
  const seat = new THREE.Mesh(seatGeom, seatMat);
  seat.position.set(0, 0.9, -0.4);
  seat.castShadow = true;
  group.add(seat);
  
  // Engine Block (Back)
  const engGeom = new THREE.BoxGeometry(1.2, 1.0, 1.0);
  const engMat = new THREE.MeshPhongMaterial({ color: '#555555', metalness: 0.8, shininess: 80 });
  const engine = new THREE.Mesh(engGeom, engMat);
  engine.position.set(0, 0.8, -1.3);
  engine.castShadow = true;
  group.add(engine);
  
  // Exhaust Pipes
  const exhaustGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.2);
  exhaustGeom.rotateX(Math.PI / 2);
  const exhaust = new THREE.Mesh(exhaustGeom, engMat);
  exhaust.position.set(0.4, 0.5, -1.8);
  group.add(exhaust);

  // 2. Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 8);
  wheelGeom.rotateZ(Math.PI / 2); // rotate cylinder sideways
  
  // Wheel Material
  const isNeonWheels = upgrades.tires === 'neon';
  const tireColor = isNeonWheels ? '#00f2fe' : '#222222';
  const wheelMat = new THREE.MeshStandardMaterial({
    color: tireColor,
    roughness: isNeonWheels ? 0.1 : 0.8,
    emissive: isNeonWheels ? '#00f2fe' : '#000000',
    emissiveIntensity: isNeonWheels ? 1.5 : 0,
    flatShading: true
  });
  
  // Hubcap Material
  const capMat = new THREE.MeshPhongMaterial({ color: '#cccccc', shininess: 90 });
  const capGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.65, 6);
  capGeom.rotateZ(Math.PI / 2);

  const wheelOffsets = [
    { x: -1.2, y: 0.4, z: 1.3 },  // Front Left
    { x: 1.2, y: 0.4, z: 1.3 },   // Front Right
    { x: -1.2, y: 0.4, z: -1.1 }, // Back Left
    { x: 1.2, y: 0.4, z: -1.1 }  // Back Right
  ];
  
  wheelOffsets.forEach(offset => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(offset.x, offset.y, offset.z);
    
    const tireMesh = new THREE.Mesh(wheelGeom, wheelMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);
    
    const capMesh = new THREE.Mesh(capGeom, capMat);
    wheelGroup.add(capMesh);
    
    wheelGroup.name = "wheel"; // tag wheels to spin in update
    group.add(wheelGroup);
  });

  // 3. Upgrades & Accessories
  // Spoilers (Rear Wing)
  if (upgrades.spoiler === 'wing') {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(0, 1.4, -1.5);
    
    // Vertical supports
    const supportGeom = new THREE.BoxGeometry(0.15, 1.0, 0.4);
    const supportMat = new THREE.MeshPhongMaterial({ color: '#1a1a1a' });
    
    const leftSupport = new THREE.Mesh(supportGeom, supportMat);
    leftSupport.position.x = -0.7;
    wingGroup.add(leftSupport);
    
    const rightSupport = leftSupport.clone();
    rightSupport.position.x = 0.7;
    wingGroup.add(rightSupport);
    
    // Horizontal main wing
    const mainWingGeom = new THREE.BoxGeometry(2.6, 0.15, 0.9);
    const mainWing = new THREE.Mesh(mainWingGeom, bodyMat);
    mainWing.position.y = 0.5;
    mainWing.rotation.x = -0.15; // angled downward slightly
    mainWing.castShadow = true;
    wingGroup.add(mainWing);
    
    group.add(wingGroup);
  }

  // Underglow neon light
  if (upgrades.underglow === 'glow') {
    const neonLight = new THREE.PointLight('#ff007f', 1.8, 12);
    neonLight.position.set(0, -0.3, 0);
    group.add(neonLight);
    
    // Glowing neon tube visualizer underneath
    const tubeGeom = new THREE.BoxGeometry(0.8, 0.1, 2.0);
    const tubeMat = new THREE.MeshBasicMaterial({ color: '#ff007f' });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    tube.position.y = -0.1;
    group.add(tube);
  }

  return group;
}

// --- PLAYER KART CONTROLLER CLASS ---
export class PlayerKart {
  constructor(scene, trackManager) {
    this.scene = scene;
    this.track = trackManager;
    
    // 3D Mesh
    this.mesh = null;
    this.colorPreset = '#e63946';
    this.upgrades = {};
    
    // Physics variables
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 0; // forward speed scalar
    this.heading = 0; // yaw direction angle in radians
    
    this.verticalVelocity = 0;
    this.isGrounded = true;
    
    // Upgraded base modifiers
    this.accelModifier = 1.0;
    this.maxSpeedModifier = 1.0;
    this.handlingModifier = 1.0;
    
    // Constants (Arcade feeling tuning)
    this.baseAccel = 16.0;
    this.baseMaxSpeed = 50.0;
    this.baseHandling = 2.4; // Steering turn rate
    this.gravity = 40.0;
    this.drag = 3.5;
    
    // Controls mapping
    this.keys = { forward: false, backward: false, left: false, right: false, drift: false };
    
    // Drifting variables
    this.isDrifting = false;
    this.driftDirection = 0; // -1 for left, 1 for right
    this.driftCharge = 0;
    this.boostTimer = 0;
    this.activeBoostLevel = 0; // 0 = none, 1, 2, 3 = hyper-boost
    
    // Game stats
    this.coinsCount = 0;
    this.activePowerUp = null;
    this.shieldActive = false;
    this.magnetActive = false;
    this.magnetTimer = 0;
    this.shieldMesh = null;
    this.spinTimer = 0; // hit obstacle spinning animation
    
    // Spline tracking
    this.closestT = 0;
    this.completedLaps = 0;
    
    // Particle system for drift smoke
    this.particles = [];
    this.setupParticles();
  }

  // Setup / Rebuild the Kart Visual Model
  init(color, upgrades) {
    if (this.mesh) this.scene.remove(this.mesh);
    
    this.colorPreset = color;
    this.upgrades = upgrades;
    
    // Recompute modifier stats based on upgrades
    this.accelModifier = upgrades.engine === 'v6' ? 1.25 : (upgrades.engine === 'turbo' ? 1.4 : 1.0);
    this.maxSpeedModifier = upgrades.engine === 'turbo' ? 1.3 : (upgrades.engine === 'v6' ? 1.1 : 1.0);
    this.handlingModifier = upgrades.tires === 'sport' ? 1.35 : (upgrades.tires === 'neon' ? 1.2 : 1.0);
    
    this.mesh = createKartMesh(this.colorPreset, this.upgrades);
    this.scene.add(this.mesh);
    
    this.reset();
  }

  reset() {
    this.position.set(0, 0.5, 0);
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.heading = 0;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.completedLaps = 0;
    this.closestT = 0;
    this.isDrifting = false;
    this.driftCharge = 0;
    this.boostTimer = 0;
    this.activeBoostLevel = 0;
    this.spinTimer = 0;
    
    this.deactivateShield();
    this.magnetActive = false;
    
    if (this.track && this.track.curve) {
      // Place at starting grid (slightly ahead of 0 to align lap triggers)
      const startPt = this.track.curve.getPointAt(0.04);
      const tangent = this.track.curve.getTangentAt(0.04);
      this.position.copy(startPt);
      this.position.y += 0.5;
      
      // Face starting direction
      this.heading = Math.atan2(tangent.x, tangent.z);
    }
    
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.set(0, this.heading, 0);
    }
  }

  setupParticles() {
    const particleGeom = new THREE.SphereGeometry(0.3, 4, 4);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.5
    });
    
    // Pool of reusable drift smoke meshes
    for (let i = 0; i < 40; i++) {
      const p = new THREE.Mesh(particleGeom, particleMat);
      p.visible = false;
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        life: 0,
        maxLife: 0.5,
        velocity: new THREE.Vector3()
      });
    }
  }

  spawnSmoke(pos, driftLevel) {
    const inactive = this.particles.find(p => !p.mesh.visible);
    if (!inactive) return;
    
    inactive.mesh.position.copy(pos);
    
    // Choose particle color based on drift boost level
    const colors = [0xcccccc, 0x00f2fe, 0xff007f, 0xffbe0b];
    const colVal = colors[Math.min(driftLevel, 3)];
    inactive.mesh.material.color.setHex(colVal);
    
    inactive.mesh.visible = true;
    inactive.life = 0;
    inactive.velocity.set(
      (Math.random() * 2 - 1) * 3,
      Math.random() * 2 + 1,
      (Math.random() * 2 - 1) * 3
    );
  }

  updateParticles(deltaTime) {
    this.particles.forEach(p => {
      if (!p.mesh.visible) return;
      
      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.velocity, deltaTime);
        p.mesh.scale.setScalar(1 - (p.life / p.maxLife));
      }
    });
  }

  // --- CONTROLS LISTENERS ---
  
  handleKeyDown(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.drift = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.useActivePowerUp();
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.drift = false;
        break;
    }
  }

  // --- POWER-UP TRIGGER LOGIC ---

  triggerPowerUpReward() {
    const powerUps = ['boost', 'banana', 'oil', 'magnet', 'shield', 'jump'];
    this.activePowerUp = powerUps[Math.floor(Math.random() * powerUps.length)];
  }

  useActivePowerUp() {
    if (!this.activePowerUp) return;
    
    const powerUp = this.activePowerUp;
    this.activePowerUp = null; // consume
    
    // Play powerup activation sound
    if (window.playUsePowerupSound) window.playUsePowerupSound();
    
    switch (powerUp) {
      case 'boost':
        this.applyNitroBoost(2.0, 1.2);
        break;
        
      case 'banana':
      case 'oil':
        // Place behind the kart
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
        const dropPos = this.position.clone().addScaledVector(forward, -4.5);
        this.track.dropHazard(powerUp, dropPos);
        break;
        
      case 'magnet':
        this.magnetActive = true;
        this.magnetTimer = 8.0; // 8 seconds coin magnet
        break;
        
      case 'shield':
        this.activateShield();
        break;
        
      case 'jump':
        if (this.isGrounded) {
          this.verticalVelocity = 14.0;
          this.isGrounded = false;
        }
        break;
    }
  }

  activateShield() {
    this.shieldActive = true;
    if (this.shieldMesh) this.scene.remove(this.shieldMesh);
    
    const sGeom = new THREE.SphereGeometry(2.4, 8, 8);
    const sMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    this.shieldMesh = new THREE.Mesh(sGeom, sMat);
    this.mesh.add(this.shieldMesh);
  }

  deactivateShield() {
    this.shieldActive = false;
    if (this.shieldMesh) {
      this.mesh.remove(this.shieldMesh);
      this.shieldMesh = null;
    }
  }

  applyNitroBoost(multiplier, duration) {
    this.activeBoostLevel = 3;
    this.boostTimer = duration;
    this.speed = this.baseMaxSpeed * this.maxSpeedModifier * multiplier;
    if (window.playBoostSound) window.playBoostSound();
  }

  hitHazard(type) {
    if (this.shieldActive) {
      this.deactivateShield();
      return; // Protected!
    }
    
    if (type === 'banana' || type === 'crate') {
      // 360 Spin obstacle spin
      this.spinTimer = 0.6; // spin 0.6s
      this.speed = 4; // crawl
      if (window.playSlipSound) window.playSlipSound();
    } else if (type === 'oil') {
      // Slip, cut traction
      this.speed = Math.max(this.speed - 15.0, 5.0);
      if (window.playSlipSound) window.playSlipSound();
    }
  }

  // --- PHYSICS ENGINE UPDATE LOOP ---

  update(deltaTime) {
    // 0. Tick Particle animations
    this.updateParticles(deltaTime);

    // 1. Tick powerup active timers
    if (this.spinTimer > 0) this.spinTimer -= deltaTime;
    if (this.boostTimer > 0) {
      this.boostTimer -= deltaTime;
      if (this.boostTimer <= 0) this.activeBoostLevel = 0;
    }
    if (this.magnetActive) {
      this.magnetTimer -= deltaTime;
      if (this.magnetTimer <= 0) this.magnetActive = false;
    }

    // Shield spinning rotation
    if (this.shieldMesh) {
      this.shieldMesh.rotation.y += deltaTime * 2.0;
    }

    // 2. Handle Inputs & Arcade Speed
    const currentMaxSpeed = (this.baseMaxSpeed * this.maxSpeedModifier) * (this.activeBoostLevel > 0 ? 1.4 : 1.0);
    const accelRate = this.baseAccel * this.accelModifier;
    
    if (this.spinTimer <= 0) {
      if (this.keys.forward) {
        this.speed += accelRate * deltaTime;
        if (this.speed > currentMaxSpeed) this.speed = currentMaxSpeed;
      } else if (this.keys.backward) {
        this.speed -= accelRate * 1.2 * deltaTime;
        if (this.speed < -currentMaxSpeed * 0.4) this.speed = -currentMaxSpeed * 0.4;
      } else {
        // Drag deceleration
        if (this.speed > 0) this.speed = Math.max(0, this.speed - this.drag * 8 * deltaTime);
        else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.drag * 8 * deltaTime);
      }
    }

    // 3. Steering & Drifting Math
    let steerStrength = this.baseHandling * this.handlingModifier;
    
    // Slow turns at high speeds, better handling at low speeds
    steerStrength *= (1.0 - Math.min(Math.abs(this.speed) / (currentMaxSpeed * 1.5), 0.5));
    
    let turnDir = 0;
    if (this.keys.left) turnDir = 1;
    if (this.keys.right) turnDir = -1;
    
    // Drift Mechanics (Hold space while steering at decent speed)
    if (this.keys.drift && turnDir !== 0 && Math.abs(this.speed) > 15.0 && this.isGrounded && this.spinTimer <= 0) {
      if (!this.isDrifting) {
        this.isDrifting = true;
        this.driftDirection = turnDir;
        this.driftCharge = 0;
      }
      
      // Drift steering boosts turn rate
      steerStrength *= 1.4;
      
      // Accrue drift level charge
      this.driftCharge += deltaTime;
      
      // Emit drift smoke/sparks
      const smokeOffset = new THREE.Vector3(0, 0, -1.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
      const smokePos = this.position.clone().add(smokeOffset);
      const driftLvl = this.getDriftBoostLevel();
      this.spawnSmoke(smokePos, driftLvl);
      
      // Play screech sounds
      if (window.playSkidSound) window.playSkidSound(this.driftCharge > 1.2 ? 1.0 : 0.6);
      
    } else {
      // Release drift to trigger mini turbo boost!
      if (this.isDrifting) {
        const driftLevel = this.getDriftBoostLevel();
        if (driftLevel > 0) {
          // Trigger nitro boost
          const boostDurations = [0, 0.4, 0.8, 1.4];
          const mult = [1.0, 1.3, 1.6, 2.0];
          this.applyNitroBoost(mult[driftLevel], boostDurations[driftLevel]);
        }
        this.isDrifting = false;
        this.driftCharge = 0;
      }
    }
    
    // Apply steering direction
    let actualSteer = turnDir;
    if (this.isDrifting) {
      // Locked drift angle slides
      actualSteer = this.driftDirection * 0.95;
    }
    
    this.heading += actualSteer * steerStrength * deltaTime;
    
    // 4. Calculate Velocity Vector
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    
    if (this.isDrifting) {
      // Add sliding lateral forces (skidding outwards)
      const slideAngle = this.driftDirection * -0.52; // ~30 degrees sideways slide
      const slideVec = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), slideAngle);
      this.velocity.copy(slideVec).multiplyScalar(this.speed);
    } else {
      this.velocity.copy(forward).multiplyScalar(this.speed);
    }

    // 5. Vertical Jump/Gravity updates
    if (!this.isGrounded) {
      this.position.y += this.verticalVelocity * deltaTime;
      this.verticalVelocity -= this.gravity * deltaTime;
    }

    // Apply horizontal velocity
    this.position.addScaledVector(this.velocity, deltaTime);

    // 6. Project and Snap to Spline track Heights
    if (this.track && this.track.curve) {
      this.closestT = this.getClosestT(this.position);
      const trackPt = this.track.curve.getPointAt(this.closestT);
      const trackTangent = this.track.curve.getTangentAt(this.closestT);
      const trackBinormal = new THREE.Vector3(-trackTangent.z, 0, trackTangent.x).normalize();
      
      // Calculate how far sideways from track center player is
      const trackToPlayer = this.position.clone().sub(trackPt);
      const lateralDist = trackToPlayer.dot(trackBinormal);
      
      // Track boundaries checking
      const halfWidth = this.track.roadWidth / 2;
      const onBridge = true; // For simple procedural levels, we assume players can stay on bridges
      
      if (Math.abs(lateralDist) < halfWidth + 2.0) {
        // Safe on road, snap height
        const targetRoadHeight = trackPt.y;
        
        if (this.position.y <= targetRoadHeight + 1.2 && this.verticalVelocity <= 0) {
          this.position.y = targetRoadHeight;
          this.verticalVelocity = 0;
          this.isGrounded = true;
        } else if (this.isGrounded && this.verticalVelocity === 0) {
          this.position.y = targetRoadHeight;
        }
      } else {
        // Off road! Falls under gravity
        this.isGrounded = false;
        
        // Respawn if fell into void/lava
        if (this.position.y < trackPt.y - 25) {
          this.respawnOnTrack();
        }
      }
    }

    // 7. Update visual mesh transformations
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      
      // Apply steering wheel offset rotation + body bank tilt
      this.mesh.rotation.set(0, this.heading, 0);
      
      if (this.isDrifting) {
        // Tilt kart body during drifts
        this.mesh.rotation.z = -this.driftDirection * 0.16;
        this.mesh.rotation.y = this.heading + (this.driftDirection * 0.28);
      }
      
      if (this.spinTimer > 0) {
        // Spin 360 degrees when hit hazard
        this.mesh.rotation.y += (this.spinTimer * Math.PI * 8);
      }
      
      // Spin wheels based on speed
      this.mesh.traverse(child => {
        if (child.name === "wheel") {
          child.rotation.x += this.speed * deltaTime * 0.25;
        }
      });
    }
  }

  getDriftBoostLevel() {
    if (this.driftCharge < 0.6) return 0; // standard drift
    if (this.driftCharge < 1.4) return 1; // Blue spark boost
    if (this.driftCharge < 2.3) return 2; // Red spark boost
    return 3; // Yellow hyper boost
  }

  getClosestT(position) {
    let bestT = 0;
    let minDist = Infinity;
    const samples = 150;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = this.track.curve.getPointAt(t);
      const dist = pt.distanceTo(position);
      if (dist < minDist) {
        minDist = dist;
        bestT = t;
      }
    }
    return bestT;
  }

  respawnOnTrack() {
    // Put player slightly back on the track spline
    let targetT = this.closestT - 0.02; // step back a bit
    if (targetT < 0) targetT += 1.0;
    
    const respawnPt = this.track.curve.getPointAt(targetT);
    const tangent = this.track.curve.getTangentAt(targetT);
    
    this.position.copy(respawnPt);
    this.position.y = respawnPt.y; // Spawn exactly on the road surface
    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.isGrounded = true; // Spawn grounded and stable
    
    this.heading = Math.atan2(tangent.x, tangent.z);
    this.isDrifting = false;
    this.driftCharge = 0;
  }
}

// --- AI RACER CONTROLLER CLASS ---
export class AiKart {
  constructor(scene, trackManager, index, color = '#ffbe0b') {
    this.scene = scene;
    this.track = trackManager;
    this.index = index; // 1, 2, or 3
    this.color = color;
    
    this.mesh = null;
    this.position = new THREE.Vector3();
    this.t = 0; // Spline progress [0, 1]
    
    // AI Parameters
    this.baseSpeed = 0.05; // Spline increment speed
    this.currentSpeed = 0.05;
    this.lateralOffset = 0; // steering variation
    this.lateralTarget = 0;
    this.spinTimer = 0;
    this.speedOffset = (Math.random() * 0.008) - 0.004; // variations in speed
    
    // Lap tracking
    this.completedLaps = 0;
  }

  init() {
    if (this.mesh) this.scene.remove(this.mesh);
    this.mesh = createKartMesh(this.color);
    
    // Standard scaling (slightly smaller than player)
    this.mesh.scale.set(0.95, 0.95, 0.95);
    this.scene.add(this.mesh);
    
    this.reset();
  }

  reset() {
    this.t = 0.04 - (this.index * 0.012); // Grid placement behind player but ahead of start line
    if (this.t < 0) this.t += 1.0;
    
    this.completedLaps = 0;
    this.spinTimer = 0;
    this.lateralOffset = (this.index - 2) * 4.0; // distribute on grid
    this.lateralTarget = this.lateralOffset;
    
    this.updatePosition(0);
  }

  hitHazard() {
    this.spinTimer = 0.6;
    this.currentSpeed = 0.005; // crawl speed
  }

  updatePosition(deltaTime) {
    if (!this.track || !this.track.curve) return;
    
    // Wrap activeT to [0, 1] range safely to prevent Three.js distanceToSquared out-of-bounds error
    let activeT = this.t % 1.0;
    if (activeT < 0) activeT += 1.0; 
    
    const centerPt = this.track.curve.getPointAt(activeT);
    const tangent = this.track.curve.getTangentAt(activeT);
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    
    // Compute 3D position
    this.position.copy(centerPt).addScaledVector(right, this.lateralOffset);
    this.position.y += 0.45; // wheel clearance
    
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      
      const heading = Math.atan2(tangent.x, tangent.z);
      this.mesh.rotation.set(0, heading, 0);
      
      if (this.spinTimer > 0) {
        this.mesh.rotation.y += (this.spinTimer * Math.PI * 8);
      }
      
      // Spin wheels
      this.mesh.traverse(child => {
        if (child.name === "wheel") {
          child.rotation.x += this.currentSpeed * 4000 * deltaTime;
        }
      });
    }
  }

  update(deltaTime, raceActive) {
    if (!raceActive) {
      this.updatePosition(deltaTime);
      return;
    }
    
    // Tick spin timer
    if (this.spinTimer > 0) {
      this.spinTimer -= deltaTime;
    }

    if (this.spinTimer <= 0) {
      // Normal driving logic along spline
      // Target speed fluctuates slightly for human feeling
      const targetSpeed = 0.05 + this.speedOffset + Math.sin(Date.now() * 0.001 + this.index) * 0.003;
      
      // Accelerate/Decelerate smoothly
      this.currentSpeed += (targetSpeed - this.currentSpeed) * deltaTime * 2.0;
      
      // Randomly change lateral targets to collect items/avoid obstacles
      if (Math.random() < 0.02) {
        this.lateralTarget = (Math.random() * 0.5 - 0.25) * this.track.roadWidth;
      }
      
      // Smoothly steer sideways
      this.lateralOffset += (this.lateralTarget - this.lateralOffset) * deltaTime * 1.5;
    }
    
    // Advance progress along spline
    const oldT = this.t;
    this.t += this.currentSpeed * deltaTime;
    
    // Robust wrap and lap counting
    const wrappedOld = (oldT % 1.0 + 1.0) % 1.0;
    const wrappedNew = (this.t % 1.0 + 1.0) % 1.0;
    
    if (wrappedOld > 0.8 && wrappedNew < 0.2) {
      this.completedLaps++;
    }
    
    this.t = wrappedNew;
    
    this.updatePosition(deltaTime);
  }
  
  clear() {
    if (this.mesh) this.scene.remove(this.mesh);
    this.mesh = null;
  }
}
export default PlayerKart;
