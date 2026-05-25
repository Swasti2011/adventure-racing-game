import * as THREE from 'three';

// World theme configurations
export const WORLDS = [
  {
    id: 'mushroom',
    name: 'Mushroom Valley',
    themeColor: '#06d6a0',
    fogColor: '#bde0fe',
    groundColor: '#70e000',
    accentColor: '#e63946',
    description: 'Race past giant red mushrooms and gentle green slopes.',
    locked: false
  },
  {
    id: 'lava',
    name: 'Lava Volcano',
    themeColor: '#e63946',
    fogColor: '#2b0909',
    groundColor: '#1c1a17',
    accentColor: '#ff5500',
    description: 'Hot ash, bubbling magma, and dark volcanic rock obstacles.',
    locked: true
  },
  {
    id: 'desert',
    name: 'Desert Oasis',
    themeColor: '#e9c46a',
    fogColor: '#f4a261',
    groundColor: '#e9c46a',
    accentColor: '#2a9d8f',
    description: 'Race through hot desert sands, saguaro cacti, and pyramids.',
    locked: true
  },
  {
    id: 'candy',
    name: 'Candy Kingdom',
    themeColor: '#ff007f',
    fogColor: '#ffccd5',
    groundColor: '#ff85a1',
    accentColor: '#ffeb3b',
    description: 'Sweet pink sugar plains decorated with spinning lollipops.',
    locked: true
  },
  {
    id: 'jungle',
    name: 'Jungle Ruins',
    themeColor: '#ffbe0b',
    fogColor: '#1a3020',
    groundColor: '#2d6a4f',
    accentColor: '#ff9f1c',
    description: 'Overgrown moss, ancient stone pillars, and leafy palms.',
    locked: true
  },
  {
    id: 'ice',
    name: 'Ice Mountain',
    themeColor: '#00f2fe',
    fogColor: '#e0f7fa',
    groundColor: '#ffffff',
    accentColor: '#80deea',
    description: 'Slippery snow fields, glaciers, and glowing ice crystals.',
    locked: true
  },
  {
    id: 'cyber',
    name: 'Neon Grid City',
    themeColor: '#00f2fe',
    fogColor: '#0c0714',
    groundColor: '#121020',
    accentColor: '#ff007f',
    description: 'A futuristic cyber grid surrounded by glowing digital skyscrapers.',
    locked: true
  },
  {
    id: 'ghost',
    name: 'Haunted Manor',
    themeColor: '#8338ec',
    fogColor: '#110a18',
    groundColor: '#211a28',
    accentColor: '#00ff66',
    description: 'Spooky purple valleys populated by floating green ghosts.',
    locked: true
  },
  {
    id: 'rainbow',
    name: 'Rainbow Sky Roads',
    themeColor: '#8338ec',
    fogColor: '#03001e',
    groundColor: '#000000', // Floats in void
    accentColor: '#ff007f',
    description: 'A glowing rainbow path floating in deep cosmic space.',
    locked: true
  }
];

export class TrackManager {
  constructor(scene) {
    this.scene = scene;
    
    // Spline reference
    this.curve = null;
    this.roadMesh = null;
    this.roadWidth = 16;
    this.segmentsCount = 220;
    
    // Track items
    this.coins = [];
    this.boosts = [];
    this.itemBoxes = [];
    this.hazards = []; // Banana peels, oil spills
    
    // Environment meshes
    this.decorations = [];
    this.skybox = null;
    this.groundMesh = null;
    this.lavaPlane = null;
    
    // Collision callbacks
    this.onCoinCollected = null;
    this.onBoostActivated = null;
    this.onItemBoxCollected = null;
    this.onHazardHit = null;
  }

  generate(worldId) {
    this.clear();
    const config = WORLDS.find(w => w.id === worldId) || WORLDS[0];

    // Set scene fog
    this.scene.fog = new THREE.FogExp2(config.fogColor, worldId === 'rainbow' ? 0.002 : 0.005);
    
    // Create spline points
    const points = [];
    const numControlPoints = 12;
    const baseRadius = worldId === 'rainbow' ? 180 : 160;
    
    for (let i = 0; i < numControlPoints; i++) {
      const angle = (i / numControlPoints) * Math.PI * 2;
      
      // Start line straightaway (keep flat and perfectly circular)
      let radius = baseRadius;
      let yOffset = 0;
      
      if (i > 1 && i < numControlPoints - 1) {
        // Add random bumps and curves along the track
        radius += (Math.random() * 70) - 35;
        yOffset = (Math.random() * 26) - 13;
        
        // Lava levels have higher mountains, ice has smoother slopes
        if (worldId === 'lava') yOffset *= 1.8;
        if (worldId === 'ice') yOffset *= 0.7;
      }
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, yOffset, z));
    }
    
    // Create smooth closed spline
    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    // Create environment
    this.createEnvironment(config);
    
    // Create Road Ribbon Mesh
    this.createRoadMesh(config);
    
    // Populate items
    this.spawnTrackItems(config);
  }

  createRoadMesh(config) {
    const geom = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const indices = [];
    
    const count = this.segmentsCount;
    // Calculate Frenet frames along spline
    const frames = this.curve.computeFrenetFrames(count, false);
    
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const point = this.curve.getPointAt(t);
      const binormal = frames.binormals[i];
      
      // Compute left and right edge positions
      const leftPt = point.clone().addScaledVector(binormal, -this.roadWidth / 2);
      const rightPt = point.clone().addScaledVector(binormal, this.roadWidth / 2);
      
      vertices.push(leftPt.x, leftPt.y, leftPt.z);
      vertices.push(rightPt.x, rightPt.y, rightPt.z);
      
      // UV coordinates
      uvs.push(0, t * 25);
      uvs.push(1, t * 25);
    }
    
    // Build index list for triangles
    for (let i = 0; i < count; i++) {
      const i0 = i * 2;
      const i1 = i * 2 + 1;
      const i2 = (i + 1) * 2;
      const i3 = (i + 1) * 2 + 1;
      
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
    
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    // Create Procedural Canvas Road Texture
    const roadTexture = this.generateRoadTexture(config.id);
    
    const mat = new THREE.MeshPhongMaterial({
      map: roadTexture,
      shininess: config.id === 'lava' || config.id === 'rainbow' ? 80 : 15,
      side: THREE.DoubleSide,
      flatShading: true
    });
    
    this.roadMesh = new THREE.Mesh(geom, mat);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);
  }

  generateRoadTexture(worldId) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Asphalt color matching theme
    let roadColor = '#1f2022';
    let stripeColor = '#ffffff';
    let borderColor = '#ffbe0b';
    
    if (worldId === 'lava') {
      roadColor = '#121111';
      borderColor = '#ff3300';
    } else if (worldId === 'desert') {
      roadColor = '#3c2c1a'; // Dark sand brown
      borderColor = '#f4a261'; // Light sand orange
    } else if (worldId === 'candy') {
      roadColor = '#fff0f5';
      stripeColor = '#ff007f';
      borderColor = '#bde0fe';
    } else if (worldId === 'jungle') {
      roadColor = '#1a2b1f';
      borderColor = '#2a9d8f';
    } else if (worldId === 'ice') {
      roadColor = '#e0f7fa';
      borderColor = '#00e5ff';
    } else if (worldId === 'cyber') {
      roadColor = '#050308'; // Cyber black
      borderColor = '#00f2fe'; // Neon cyan
      stripeColor = '#ff007f'; // Neon pink dashes
    } else if (worldId === 'ghost') {
      roadColor = '#100a1d'; // Spooky purple
      borderColor = '#8338ec'; // Purple border
      stripeColor = '#00ff66'; // Slime green dashes
    } else if (worldId === 'rainbow') {
      // Draw horizontal rainbow gradient
      const grad = ctx.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0, '#ff0000');
      grad.addColorStop(0.16, '#ff7f00');
      grad.addColorStop(0.33, '#ffff00');
      grad.addColorStop(0.5, '#00ff00');
      grad.addColorStop(0.66, '#0000ff');
      grad.addColorStop(0.83, '#4b0082');
      grad.addColorStop(1, '#9400d3');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 512);
      
      // Star patterns overlay
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 20; i++) {
        ctx.fillRect(Math.random() * 256, Math.random() * 512, 3, 3);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }
    
    // Default Asphalt Fill
    ctx.fillStyle = roadColor;
    ctx.fillRect(0, 0, 256, 512);
    
    // Noise/Texture details
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < 2000; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
    }
    
    // Outer Borders
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, 16, 512);
    ctx.fillRect(240, 0, 16, 512);
    
    // Dashed Center Lane
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 8;
    ctx.setLineDash([40, 40]);
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 512);
    ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // --- ENVIRONMENT DECORATIONS CREATOR ---

  createEnvironment(config) {
    const isRainbow = config.id === 'rainbow';
    
    // 1. Skybox Sphere
    const skyGeom = new THREE.SphereGeometry(600, 32, 15);
    const skyMat = new THREE.MeshBasicMaterial({
      color: config.fogColor,
      side: THREE.BackSide
    });
    this.skybox = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.skybox);
    
    // If Space roads, generate stars
    if (isRainbow) {
      this.generateStars();
    } else {
      // 2. Ground Plane
      const groundGeom = new THREE.PlaneGeometry(1000, 1000, 10, 10);
      const groundMat = new THREE.MeshPhongMaterial({
        color: config.groundColor,
        flatShading: true
      });
      this.groundMesh = new THREE.Mesh(groundGeom, groundMat);
      this.groundMesh.rotation.x = -Math.PI / 2;
      this.groundMesh.position.y = -20; // Sit below the tracks
      this.groundMesh.receiveShadow = true;
      this.scene.add(this.groundMesh);
    }

    if (config.id === 'lava') {
      // Bubbling lava pool below road
      const lavaGeom = new THREE.PlaneGeometry(900, 900);
      const lavaMat = new THREE.MeshBasicMaterial({
        color: '#ff3300',
        transparent: true,
        opacity: 0.85
      });
      this.lavaPlane = new THREE.Mesh(lavaGeom, lavaMat);
      this.lavaPlane.rotation.x = -Math.PI / 2;
      this.lavaPlane.position.y = -19.5;
      this.scene.add(this.lavaPlane);
    }

    // Place environment items randomly around the track
    const itemsCount = 180;
    for (let i = 0; i < itemsCount; i++) {
      const t = i / itemsCount;
      const centerPt = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      
      // Pick a side (left or right of the track)
      const side = Math.random() < 0.5 ? -1 : 1;
      const distance = 20 + Math.random() * 45; // Place clear of the road ribbon
      
      // Calculate right vector
      const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = centerPt.clone().addScaledVector(right, side * distance);
      
      // Drop decoration height onto the virtual ground
      if (!isRainbow) {
        pos.y = -20;
      }
      
      const decoration = this.createDecorationMesh(config.id, pos);
      if (decoration) {
        this.scene.add(decoration);
        this.decorations.push(decoration);
      }
    }
  }

  generateStars() {
    const starsGeom = new THREE.BufferGeometry();
    const starsCount = 1000;
    const positions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const dist = 300 + Math.random() * 200;
      
      positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = dist * Math.cos(phi);
    }
    
    starsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: true
    });
    
    const starField = new THREE.Points(starsGeom, starsMat);
    this.scene.add(starField);
    this.decorations.push(starField);
  }

  // Create primitive-based low poly decoration meshes based on theme
  createDecorationMesh(worldId, position) {
    const group = new THREE.Group();
    group.position.copy(position);
    
    // Scale randomly
    const scale = 0.8 + Math.random() * 1.5;
    group.scale.set(scale, scale, scale);

    if (worldId === 'mushroom') {
      // Create a cute giant mushroom
      const stemGeom = new THREE.CylinderGeometry(1.5, 2, 8, 5);
      const stemMat = new THREE.MeshPhongMaterial({ color: '#f5f5f5', flatShading: true });
      const stem = new THREE.Mesh(stemGeom, stemMat);
      stem.position.y = 4;
      stem.castShadow = true;
      group.add(stem);
      
      const capGeom = new THREE.SphereGeometry(4, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const capMat = new THREE.MeshPhongMaterial({ color: '#e63946', flatShading: true });
      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.y = 7.5;
      cap.scale.y = 0.7;
      cap.castShadow = true;
      group.add(cap);

      // White spots on mushroom
      const spotGeom = new THREE.SphereGeometry(0.5, 4, 4);
      const spotMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      for (let j = 0; j < 5; j++) {
        const spot = new THREE.Mesh(spotGeom, spotMat);
        const theta = Math.random() * Math.PI * 2;
        const phi = 0.2 + Math.random() * 0.8;
        spot.position.set(
          Math.sin(phi) * Math.cos(theta) * 4,
          7.5 + Math.cos(phi) * 2.8,
          Math.sin(phi) * Math.sin(theta) * 4
        );
        group.add(spot);
      }
      return group;
      
    } else if (worldId === 'lava') {
      // Jagged volcanic stone pile
      const stoneMat = new THREE.MeshPhongMaterial({ color: '#2b2725', flatShading: true });
      const partsCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < partsCount; j++) {
        const size = 3 + Math.random() * 5;
        const stoneGeom = new THREE.BoxGeometry(size, size, size);
        const stone = new THREE.Mesh(stoneGeom, stoneMat);
        stone.position.set(
          (Math.random() * 4) - 2,
          size / 2,
          (Math.random() * 4) - 2
        );
        stone.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        stone.castShadow = true;
        group.add(stone);
      }
      return group;
      
    } else if (worldId === 'candy') {
      // Spinning Lollipop trees
      const stickGeom = new THREE.CylinderGeometry(0.4, 0.4, 10, 5);
      const stickMat = new THREE.MeshPhongMaterial({ color: '#d8b48f' });
      const stick = new THREE.Mesh(stickGeom, stickMat);
      stick.position.y = 5;
      group.add(stick);
      
      const headGeom = new THREE.SphereGeometry(3.5, 12, 12);
      const candyColors = ['#ff007f', '#ff70a6', '#ff9770', '#ffd670', '#e9ff70', '#70e000', '#00f2fe'];
      const headMat = new THREE.MeshPhongMaterial({ 
        color: candyColors[Math.floor(Math.random() * candyColors.length)], 
        flatShading: true 
      });
      const head = new THREE.Mesh(headGeom, headMat);
      head.position.y = 10;
      head.name = "lollipopHead"; // to rotate in render loop
      group.add(head);
      return group;
      
    } else if (worldId === 'jungle') {
      // Jungle Palm Tree
      const trunkGeom = new THREE.CylinderGeometry(0.8, 1.4, 12, 6);
      const trunkMat = new THREE.MeshPhongMaterial({ color: '#7f5539', flatShading: true });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 6;
      trunk.castShadow = true;
      group.add(trunk);
      
      // Palm leaves
      const leafMat = new THREE.MeshPhongMaterial({ color: '#38b000', flatShading: true });
      for (let j = 0; j < 5; j++) {
        const leafGeom = new THREE.BoxGeometry(7, 0.2, 2);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.set(0, 12, 0);
        leaf.rotation.y = (j / 5) * Math.PI * 2;
        leaf.rotation.z = 0.25; // tilt downwards
        group.add(leaf);
      }
      return group;
      
    } else if (worldId === 'ice') {
      // Spiky glowing cyan ice crystals
      const crystalGeom = new THREE.ConeGeometry(2, 8, 4);
      const crystalMat = new THREE.MeshPhongMaterial({
        color: '#00e5ff',
        emissive: '#006064',
        transparent: true,
        opacity: 0.8,
        flatShading: true
      });
      const crystal = new THREE.Mesh(crystalGeom, crystalMat);
      crystal.position.y = 4;
      crystal.rotation.x = 0.15;
      crystal.rotation.z = -0.15;
      group.add(crystal);
      
      const smallCrystal = new THREE.Mesh(crystalGeom, crystalMat);
      smallCrystal.scale.set(0.6, 0.6, 0.6);
      smallCrystal.position.set(1.5, 2.4, 1);
      smallCrystal.rotation.set(-0.3, 0, 0.3);
      group.add(smallCrystal);
      return group;
      
    } else if (worldId === 'desert') {
      // 1. Saguaro Cactus
      if (Math.random() < 0.6) {
        const cactMat = new THREE.MeshPhongMaterial({ color: '#2a9d8f', flatShading: true });
        const trunkGeom = new THREE.CylinderGeometry(0.6, 0.7, 7, 5);
        const trunk = new THREE.Mesh(trunkGeom, cactMat);
        trunk.position.y = 3.5;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Left branch arm
        const branchLGroup = new THREE.Group();
        branchLGroup.position.set(-0.9, 3.5, 0);
        const armHGeom = new THREE.CylinderGeometry(0.4, 0.4, 1.2);
        armHGeom.rotateZ(Math.PI / 2);
        const armH = new THREE.Mesh(armHGeom, cactMat);
        branchLGroup.add(armH);
        const armVGeom = new THREE.CylinderGeometry(0.4, 0.4, 2.5);
        const armV = new THREE.Mesh(armVGeom, cactMat);
        armV.position.set(-0.6, 1.0, 0);
        branchLGroup.add(armV);
        group.add(branchLGroup);
        
        // Right branch arm
        const branchRGroup = new THREE.Group();
        branchRGroup.position.set(0.9, 4.5, 0);
        const armHR = new THREE.Mesh(armHGeom, cactMat);
        branchRGroup.add(armHR);
        const armVR = new THREE.Mesh(armVGeom, cactMat);
        armVR.position.set(0.6, 1.0, 0);
        branchRGroup.add(armVR);
        group.add(branchRGroup);
      } else {
        // 2. Sandstone Pyramid cone
        const pyrGeom = new THREE.ConeGeometry(5, 7, 4);
        const pyrMat = new THREE.MeshPhongMaterial({ color: '#f4a261', flatShading: true });
        const pyr = new THREE.Mesh(pyrGeom, pyrMat);
        pyr.position.y = 3.5;
        pyr.rotation.y = Math.PI / 4;
        pyr.castShadow = true;
        group.add(pyr);
      }
      return group;
      
    } else if (worldId === 'cyber') {
      // Glowing Skyscraper
      const towerGeom = new THREE.BoxGeometry(4, 28, 4);
      const towerMat = new THREE.MeshPhongMaterial({ color: '#0b0a10', flatShading: true });
      const tower = new THREE.Mesh(towerGeom, towerMat);
      tower.position.y = 14;
      tower.castShadow = true;
      group.add(tower);
      
      // Neon lit windows on skyscraper
      const windowMat = new THREE.MeshBasicMaterial({ 
        color: Math.random() < 0.5 ? '#00f2fe' : '#ff007f' 
      });
      
      for (let j = 0; j < 5; j++) {
        const winGeom = new THREE.BoxGeometry(4.1, 0.8, 1.2);
        const win = new THREE.Mesh(winGeom, windowMat);
        win.position.set(0, 4 + j * 4.5, 1.5);
        group.add(win);
        
        const winBack = win.clone();
        winBack.position.z = -1.5;
        group.add(winBack);
      }
      return group;
      
    } else if (worldId === 'ghost') {
      if (Math.random() < 0.55) {
        // Floating green ghost
        const ghostGroup = new THREE.Group();
        const headGeom = new THREE.SphereGeometry(1.6, 6, 6);
        const ghostMat = new THREE.MeshPhongMaterial({
          color: '#ccff33',
          emissive: '#44aa00',
          transparent: true,
          opacity: 0.8,
          flatShading: true
        });
        const head = new THREE.Mesh(headGeom, ghostMat);
        head.position.y = 5.5;
        ghostGroup.add(head);
        
        // Ghost tail/body cone
        const tailGeom = new THREE.ConeGeometry(1.6, 3, 5);
        tailGeom.rotateX(Math.PI); // point down
        const tail = new THREE.Mesh(tailGeom, ghostMat);
        tail.position.y = 3.6;
        ghostGroup.add(tail);
        
        // Spooky black eyes
        const eyeGeom = new THREE.BoxGeometry(0.3, 0.3, 0.2);
        const eyeMat = new THREE.MeshBasicMaterial({ color: '#000000' });
        const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
        eyeL.position.set(-0.5, 5.7, 1.5);
        ghostGroup.add(eyeL);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.5;
        ghostGroup.add(eyeR);
        
        ghostGroup.name = "rainbowStar"; // hijack rotation anim to spin/wobble
        group.add(ghostGroup);
      } else {
        // Spooky twisted tree
        const woodMat = new THREE.MeshPhongMaterial({ color: '#130c0e', flatShading: true });
        const trunkGeom = new THREE.CylinderGeometry(0.4, 1.4, 9, 4);
        const trunk = new THREE.Mesh(trunkGeom, woodMat);
        trunk.position.y = 4.5;
        trunk.rotation.z = (Math.random() * 0.2) - 0.1;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Random branches
        for (let j = 0; j < 3; j++) {
          const branchGeom = new THREE.BoxGeometry(3.5, 0.4, 0.4);
          const branch = new THREE.Mesh(branchGeom, woodMat);
          branch.position.set((j - 1) * 1.5, 7 + j * 0.5, 0);
          branch.rotation.z = 0.4 * (j - 1);
          group.add(branch);
        }
      }
      return group;
      
    } else if (worldId === 'rainbow') {
      // Floating neon yellow stars
      const starGroup = new THREE.Group();
      const centerSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 6, 6),
        new THREE.MeshBasicMaterial({ color: '#ffbe0b' })
      );
      starGroup.add(centerSphere);
      
      const spikeGeom = new THREE.ConeGeometry(0.8, 3, 4);
      const spikeMat = new THREE.MeshPhongMaterial({ color: '#ffeb3b', emissive: '#ffd600', flatShading: true });
      
      for (let j = 0; j < 6; j++) {
        const spike = new THREE.Mesh(spikeGeom, spikeMat);
        spike.position.y = 0;
        
        if (j === 0) spike.rotation.x = Math.PI / 2;
        if (j === 1) spike.rotation.x = -Math.PI / 2;
        if (j === 2) spike.rotation.z = Math.PI / 2;
        if (j === 3) spike.rotation.z = -Math.PI / 2;
        if (j === 4) spike.rotation.y = 0;
        if (j === 5) spike.rotation.y = Math.PI;
        
        spike.translateY(1.5);
        starGroup.add(spike);
      }
      starGroup.name = "rainbowStar";
      // Position floating high above void
      group.position.y += 10 + Math.random() * 20;
      group.add(starGroup);
      return group;
    }
    
    return null;
  }

  // --- COLLECTIBLES & HAZARDS SPAWNER ---

  spawnTrackItems(config) {
    const isRainbow = config.id === 'rainbow';
    
    // Reset lists
    this.coins = [];
    this.boosts = [];
    this.itemBoxes = [];
    this.hazards = [];
    
    const count = 180;
    
    // We will place items at specific progress increments
    for (let i = 20; i < count - 10; i++) {
      const t = i / count;
      const centerPt = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      
      // Right/Binormal vector to offset horizontally on the track surface
      const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      // 1. Spawn Coin lines (every 8 segments, place a row of coins)
      if (i % 9 === 0) {
        const offsetSide = (Math.sin(t * Math.PI * 10) * 0.4) * this.roadWidth; // S-pattern
        const heightOffset = isRainbow ? 1.5 : 1.2;
        const pos = centerPt.clone().addScaledVector(right, offsetSide);
        pos.y += heightOffset;
        
        const coinGeom = new THREE.TorusGeometry(0.8, 0.25, 4, 8);
        const coinMat = new THREE.MeshPhongMaterial({
          color: '#ffbe0b',
          emissive: '#ff7000',
          shininess: 90,
          flatShading: true
        });
        const coin = new THREE.Mesh(coinGeom, coinMat);
        coin.position.copy(pos);
        coin.castShadow = true;
        this.scene.add(coin);
        this.coins.push(coin);
      }
      
      // 2. Spawn Speed Boost pads (spawns infrequently)
      if (i % 23 === 12) {
        const sideOffset = (Math.random() < 0.5 ? -0.25 : 0.25) * this.roadWidth;
        const pos = centerPt.clone().addScaledVector(right, sideOffset);
        // Place boost slightly above track surface to avoid Z-fighting
        pos.y += 0.05;
        
        const boostGeom = new THREE.PlaneGeometry(3.5, 4.5);
        
        // Custom boost texture canvas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#06d6a0';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(32, 10); ctx.lineTo(10, 45);
        ctx.moveTo(32, 10); ctx.lineTo(54, 45);
        ctx.moveTo(32, 25); ctx.lineTo(10, 60);
        ctx.moveTo(32, 25); ctx.lineTo(54, 60);
        ctx.stroke();
        
        const boostTex = new THREE.CanvasTexture(canvas);
        const boostMat = new THREE.MeshBasicMaterial({
          map: boostTex,
          side: THREE.DoubleSide
        });
        
        const pad = new THREE.Mesh(boostGeom, boostMat);
        pad.position.copy(pos);
        
        // Align orientation to face along the tangent
        const lookTarget = pos.clone().add(tangent);
        pad.lookAt(lookTarget);
        pad.rotation.x = Math.PI / 2; // Flat on road
        
        this.scene.add(pad);
        this.boosts.push(pad);
      }
      
      // 3. Spawn Item Boxes (Mystery power-ups)
      if (i % 31 === 6) {
        // Spawns columns of 3 across the road
        const offsets = [-0.3, 0, 0.3];
        const heightOffset = isRainbow ? 1.8 : 1.4;
        
        offsets.forEach(offset => {
          const pos = centerPt.clone().addScaledVector(right, offset * this.roadWidth);
          pos.y += heightOffset;
          
          const boxGeom = new THREE.BoxGeometry(1.6, 1.6, 1.6);
          const boxMat = new THREE.MeshPhongMaterial({
            color: '#00f2fe',
            emissive: '#004a7a',
            transparent: true,
            opacity: 0.7,
            flatShading: true
          });
          const box = new THREE.Mesh(boxGeom, boxMat);
          box.position.copy(pos);
          
          // Outer outline frame
          const wireframe = new THREE.BoxHelper(box, '#ffffff');
          box.add(wireframe);
          
          this.scene.add(box);
          this.itemBoxes.push(box);
        });
      }
      
      // 4. Spawn Obstacles/Hazards (e.g. Lava flows or static crates)
      if (i % 29 === 19 && config.id !== 'rainbow') {
        const sideOffset = ((Math.random() * 0.6) - 0.3) * this.roadWidth;
        const pos = centerPt.clone().addScaledVector(right, sideOffset);
        pos.y += 1.0;
        
        const hazardGeom = new THREE.BoxGeometry(2, 2, 2);
        const hazardMat = new THREE.MeshPhongMaterial({
          color: config.id === 'lava' ? '#ff3300' : '#8d6e63',
          flatShading: true
        });
        const crate = new THREE.Mesh(hazardGeom, hazardMat);
        crate.position.copy(pos);
        crate.castShadow = true;
        
        // Attach static hazard identification data
        crate.userData = { type: 'crate' };
        
        this.scene.add(crate);
        this.hazards.push(crate);
      }
    }
  }

  // Allow player/AI to spawn a banana/oil hazard dynamically
  dropHazard(type, position) {
    let geom, mat, color;
    let yOffset = 0.1;
    
    if (type === 'banana') {
      // Banana peel (yellow crescent box)
      geom = new THREE.BoxGeometry(1.6, 0.3, 1.6);
      color = '#ffeb3b';
    } else {
      // Oil spill (flat dark puddle disc)
      geom = new THREE.CylinderGeometry(2, 2, 0.05, 8);
      color = '#121111';
      yOffset = 0.03;
    }
    
    mat = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 90,
      flatShading: true
    });
    
    const hazard = new THREE.Mesh(geom, mat);
    hazard.position.copy(position);
    hazard.position.y += yOffset;
    hazard.userData = { type: type };
    
    this.scene.add(hazard);
    this.hazards.push(hazard);
  }

  // --- UPDATE ANIMATIONS & COLLISION CHECKING ---

  update(deltaTime) {
    const time = Date.now() * 0.003;
    
    // Rotate coins
    this.coins.forEach(coin => {
      coin.rotation.y += deltaTime * 2.5;
    });

    // Animate and float mystery item boxes
    this.itemBoxes.forEach((box, index) => {
      box.rotation.x += deltaTime * 0.8;
      box.rotation.y += deltaTime * 1.5;
      box.position.y += Math.sin(time + index) * 0.015;
    });

    // Animate specific environment elements
    this.decorations.forEach(decor => {
      if (decor.name === "rainbowStar") {
        decor.rotation.y += deltaTime * 1.0;
      }
      const lollipop = decor.getObjectByName("lollipopHead");
      if (lollipop) {
        lollipop.rotation.y += deltaTime * 0.8;
      }
    });

    // Lava slow boiling swell
    if (this.lavaPlane) {
      this.lavaPlane.position.y = -19.5 + Math.sin(time * 0.5) * 0.25;
    }
  }

  checkCollisions(kart) {
    const kartPos = kart.position;
    const kartRadius = 2.2;
    
    // 1. Coins Collection
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      const dist = kartPos.distanceTo(coin.position);
      if (dist < kartRadius + 1.0) {
        this.scene.remove(coin);
        this.coins.splice(i, 1);
        if (this.onCoinCollected) this.onCoinCollected();
      }
    }
    
    // 2. Speed Boost Pads
    this.boosts.forEach(pad => {
      const dist = kartPos.distanceTo(pad.position);
      if (dist < kartRadius + 1.8) {
        if (this.onBoostActivated) this.onBoostActivated();
      }
    });
    
    // 3. Item Mystery Boxes
    for (let i = this.itemBoxes.length - 1; i >= 0; i--) {
      const box = this.itemBoxes[i];
      const dist = kartPos.distanceTo(box.position);
      if (dist < kartRadius + 1.2) {
        // Collect, pop animation / remove, respawn timer
        this.scene.remove(box);
        this.itemBoxes.splice(i, 1);
        
        // Spawn pop particles later, trigger callback
        if (this.onItemBoxCollected) this.onItemBoxCollected();
        
        // Re-spawn box after 5 seconds
        const boxPos = box.position.clone();
        setTimeout(() => {
          if (this.scene) {
            const reBox = new THREE.Mesh(box.geometry, box.material);
            reBox.position.copy(boxPos);
            reBox.add(new THREE.BoxHelper(reBox, '#ffffff'));
            this.scene.add(reBox);
            this.itemBoxes.push(reBox);
          }
        }, 5000);
      }
    }
    
    // 4. Hazards & Obstacles
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hazard = this.hazards[i];
      const dist = kartPos.distanceTo(hazard.position);
      const hazardRadius = hazard.userData.type === 'crate' ? 2.0 : 1.6;
      
      if (dist < kartRadius + hazardRadius) {
        const hType = hazard.userData.type;
        
        // Remove banana peel upon slip, keep oil spills and crates static
        if (hType === 'banana') {
          this.scene.remove(hazard);
          this.hazards.splice(i, 1);
        }
        
        if (this.onHazardHit) this.onHazardHit(hType);
      }
    }
  }

  // Clear scene of all track assets
  clear() {
    if (this.roadMesh) this.scene.remove(this.roadMesh);
    if (this.skybox) this.scene.remove(this.skybox);
    if (this.groundMesh) this.scene.remove(this.groundMesh);
    if (this.lavaPlane) this.scene.remove(this.lavaPlane);
    
    this.coins.forEach(c => this.scene.remove(c));
    this.boosts.forEach(b => this.scene.remove(b));
    this.itemBoxes.forEach(ib => this.scene.remove(ib));
    this.hazards.forEach(h => this.scene.remove(h));
    this.decorations.forEach(d => this.scene.remove(d));
    
    this.coins = [];
    this.boosts = [];
    this.itemBoxes = [];
    this.hazards = [];
    this.decorations = [];
    
    this.roadMesh = null;
    this.skybox = null;
    this.groundMesh = null;
    this.lavaPlane = null;
  }
}
export default TrackManager;
