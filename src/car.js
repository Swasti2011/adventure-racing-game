import * as THREE from 'three';

// Procedurally builds a 3D Low-Poly Driver Character (e.g. Mario) sitting in the kart
function createDriverMesh(colorPreset) {
  const driverGroup = new THREE.Group();
  
  // Detect character theme based on color preset
  let shirtColor = '#e63946'; // Red
  let overallsColor = '#0033aa'; // Blue
  let capColor = '#e63946'; // Red
  let capWhiteCircle = true;
  let toadMushroomCap = false;
  let hairColor = '#5c4033'; // Brown
  
  const color = colorPreset.toLowerCase();
  
  if (color === '#06d6a0' || color === '#38b000' || color === '#70e000') {
    // Luigi
    shirtColor = '#06d6a0';
    overallsColor = '#0033aa';
    capColor = '#06d6a0';
  } else if (color === '#8338ec' || color === '#ff007f') {
    // Waluigi / Peach themed
    shirtColor = '#8338ec';
    overallsColor = '#111111'; // Dark/Black overalls
    capColor = '#8338ec';
    hairColor = '#4b2d12';
  } else if (color === '#ffbe0b' || color === '#e9c46a') {
    // Wario
    shirtColor = '#ffbe0b'; // Yellow
    overallsColor = '#8338ec'; // Purple
    capColor = '#ffbe0b';
  } else if (color === '#00f2fe' || color === '#ffffff') {
    // Toad
    shirtColor = '#ffffff';
    overallsColor = '#0033aa'; // blue vest/pants
    toadMushroomCap = true;
  }
  
  // 1. Torso
  // Upper body (Shirt)
  const torsoGeom = new THREE.BoxGeometry(0.8, 0.7, 0.6);
  const torsoMat = new THREE.MeshPhongMaterial({ color: shirtColor, flatShading: true });
  const torso = new THREE.Mesh(torsoGeom, torsoMat);
  torso.position.set(0, 1.25, -0.4);
  torso.castShadow = true;
  driverGroup.add(torso);
  
  // Overalls straps/pants
  if (!toadMushroomCap) {
    const pantsGeom = new THREE.BoxGeometry(0.82, 0.35, 0.62);
    const overallsMat = new THREE.MeshPhongMaterial({ color: overallsColor, flatShading: true });
    const pants = new THREE.Mesh(pantsGeom, overallsMat);
    pants.position.set(0, 1.05, -0.4);
    pants.castShadow = true;
    driverGroup.add(pants);
    
    // Left Strap
    const strapLGeom = new THREE.BoxGeometry(0.16, 0.75, 0.05);
    const strapL = new THREE.Mesh(strapLGeom, overallsMat);
    strapL.position.set(-0.25, 1.35, -0.1);
    driverGroup.add(strapL);
    
    // Right Strap
    const strapR = strapL.clone();
    strapR.position.x = 0.25;
    driverGroup.add(strapR);
    
    // Yellow Overall Buttons
    const btnGeom = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    const btnMat = new THREE.MeshBasicMaterial({ color: '#ffbe0b' });
    const btnL = new THREE.Mesh(btnGeom, btnMat);
    btnL.position.set(-0.25, 1.15, -0.07);
    driverGroup.add(btnL);
    
    const btnR = btnL.clone();
    btnR.position.x = 0.25;
    driverGroup.add(btnR);
  } else {
    // Toad Vest (Blue with Gold border)
    const vestGeom = new THREE.BoxGeometry(0.84, 0.5, 0.64);
    const vestMat = new THREE.MeshPhongMaterial({ color: overallsColor, flatShading: true });
    const vest = new THREE.Mesh(vestGeom, vestMat);
    vest.position.set(0, 1.3, -0.4);
    driverGroup.add(vest);
    
    const goldTrimGeom = new THREE.BoxGeometry(0.86, 0.1, 0.66);
    const goldTrimMat = new THREE.MeshBasicMaterial({ color: '#ffbe0b' });
    const trim = new THREE.Mesh(goldTrimGeom, goldTrimMat);
    trim.position.set(0, 1.1, -0.4);
    driverGroup.add(trim);
  }
  
  // 2. Head
  const headGeom = new THREE.SphereGeometry(0.35, 6, 6);
  const headMat = new THREE.MeshPhongMaterial({ color: '#ffcc99', flatShading: true });
  const head = new THREE.Mesh(headGeom, headMat);
  head.position.set(0, 1.78, -0.4);
  head.castShadow = true;
  driverGroup.add(head);
  
  // Hair (back of head)
  const hairGeom = new THREE.BoxGeometry(0.68, 0.35, 0.35);
  const hairMat = new THREE.MeshPhongMaterial({ color: hairColor, flatShading: true });
  const hair = new THREE.Mesh(hairGeom, hairMat);
  hair.position.set(0, 1.7, -0.55);
  driverGroup.add(hair);
  
  // Nose
  const noseGeom = new THREE.SphereGeometry(0.12, 4, 4);
  const nose = new THREE.Mesh(noseGeom, headMat);
  nose.position.set(0, 1.78, -0.07);
  driverGroup.add(nose);
  
  // Eyes
  const eyeGeom = new THREE.BoxGeometry(0.06, 0.08, 0.02);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#0000ff' });
  
  const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
  eyeL.position.set(-0.12, 1.83, -0.08);
  driverGroup.add(eyeL);
  
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  driverGroup.add(eyeR);
  
  // Mustache (only for Mario, Luigi, Waluigi, Wario - not Toad!)
  if (!toadMushroomCap) {
    const mustacheGeom = new THREE.BoxGeometry(0.35, 0.1, 0.08);
    const mustacheMat = new THREE.MeshPhongMaterial({ color: hairColor, flatShading: true });
    const mustache = new THREE.Mesh(mustacheGeom, mustacheMat);
    mustache.position.set(0, 1.66, -0.07);
    driverGroup.add(mustache);
  }
  
  // 3. Cap
  if (!toadMushroomCap) {
    // Red/Green/Purple Cap dome
    const capGeom = new THREE.SphereGeometry(0.38, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMat = new THREE.MeshPhongMaterial({ color: capColor, flatShading: true });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.set(0, 1.95, -0.4);
    cap.scale.y = 0.85;
    cap.castShadow = true;
    driverGroup.add(cap);
    
    // Visor/Brim
    const visorGeom = new THREE.BoxGeometry(0.62, 0.08, 0.25);
    const visor = new THREE.Mesh(visorGeom, capMat);
    visor.position.set(0, 1.96, -0.22);
    visor.rotation.x = 0.1;
    driverGroup.add(visor);
    
    // White Emblem circle
    if (capWhiteCircle) {
      const emblemCircleGeom = new THREE.BoxGeometry(0.18, 0.18, 0.02);
      const emblemCircleMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const emblem = new THREE.Mesh(emblemCircleGeom, emblemCircleMat);
      emblem.position.set(0, 2.05, -0.15);
      
      // Little 'M' / 'L' / 'W' symbol inside emblem
      let letterColor = '#e63946';
      if (color === '#06d6a0') letterColor = '#06d6a0'; // L
      if (color === '#ffbe0b') letterColor = '#8338ec'; // W
      if (color === '#8338ec') letterColor = '#ffeb3b'; // Waluigi yellow Γ
      
      const letterGeom = new THREE.BoxGeometry(0.08, 0.08, 0.03);
      const letterMat = new THREE.MeshBasicMaterial({ color: letterColor });
      const letter = new THREE.Mesh(letterGeom, letterMat);
      letter.position.set(0, 2.05, -0.14);
      
      driverGroup.add(emblem);
      driverGroup.add(letter);
    }
  } else {
    // Toad Mushroom Cap (large white dome with red spots)
    const mushroomCapGeom = new THREE.SphereGeometry(0.62, 8, 8);
    const mushroomCapMat = new THREE.MeshPhongMaterial({ color: '#ffffff', flatShading: true });
    const mushroomCap = new THREE.Mesh(mushroomCapGeom, mushroomCapMat);
    mushroomCap.position.set(0, 2.2, -0.4);
    mushroomCap.scale.set(1.1, 0.9, 1.1);
    mushroomCap.castShadow = true;
    driverGroup.add(mushroomCap);
    
    // Red spots
    const spotGeom = new THREE.SphereGeometry(0.2, 4, 4);
    const spotMat = new THREE.MeshBasicMaterial({ color: '#ff0000' });
    
    const spotOffsets = [
      { x: 0, y: 2.7, z: -0.4 },      // Top
      { x: 0.5, y: 2.3, z: -0.4 },    // Right
      { x: -0.5, y: 2.3, z: -0.4 },   // Left
      { x: 0, y: 2.3, z: 0.1 },       // Front
      { x: 0, y: 2.3, z: -0.9 }       // Back
    ];
    
    spotOffsets.forEach(offset => {
      const spot = new THREE.Mesh(spotGeom, spotMat);
      spot.position.set(offset.x, offset.y, offset.z);
      driverGroup.add(spot);
    });
  }
  
  // 4. Arms & Hands holding wheel
  const armGeom = new THREE.BoxGeometry(0.18, 0.18, 0.65);
  const gloveGeom = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const gloveMat = new THREE.MeshPhongMaterial({ color: '#ffffff', flatShading: true });
  
  // Left arm
  const armL = new THREE.Mesh(armGeom, torsoMat);
  armL.position.set(-0.35, 1.25, 0.05);
  armL.rotation.set(-0.2, 0.35, 0);
  driverGroup.add(armL);
  
  const gloveL = new THREE.Mesh(gloveGeom, gloveMat);
  gloveL.position.set(-0.25, 1.15, 0.38);
  driverGroup.add(gloveL);
  
  // Right arm
  const armR = new THREE.Mesh(armGeom, torsoMat);
  armR.position.set(0.35, 1.25, 0.05);
  armR.rotation.set(-0.2, -0.35, 0);
  driverGroup.add(armR);
  
  const gloveR = new THREE.Mesh(gloveGeom, gloveMat);
  gloveR.position.set(0.25, 1.15, 0.38);
  driverGroup.add(gloveR);
  
  // 5. Legs & Shoes
  const legGeom = new THREE.BoxGeometry(0.22, 0.22, 0.7);
  const legMat = new THREE.MeshPhongMaterial({ color: overallsColor, flatShading: true });
  const shoeGeom = new THREE.BoxGeometry(0.25, 0.2, 0.35);
  const shoeMat = new THREE.MeshPhongMaterial({ color: '#4e2f1d', flatShading: true });
  
  // Left Leg
  const legL = new THREE.Mesh(legGeom, legMat);
  legL.position.set(-0.25, 0.8, -0.1);
  legL.rotation.x = 0.2;
  driverGroup.add(legL);
  
  const shoeL = new THREE.Mesh(shoeGeom, shoeMat);
  shoeL.position.set(-0.25, 0.65, 0.28);
  driverGroup.add(shoeL);
  
  // Right Leg
  const legR = new THREE.Mesh(legGeom, legMat);
  legR.position.set(0.25, 0.8, -0.1);
  legR.rotation.x = 0.2;
  driverGroup.add(legR);
  
  const shoeR = new THREE.Mesh(shoeGeom, shoeMat);
  shoeR.position.set(0.25, 0.65, 0.28);
  driverGroup.add(shoeR);
  
  return driverGroup;
}

// Procedurally builds a 3D Low-Poly Kart Model with 7 custom car chassis designs
export function createKartMesh(colorPreset = '#e63946', upgrades = {}) {
  const group = new THREE.Group();
  const carModel = upgrades.car || 'standard';
  
  const bodyMat = new THREE.MeshPhongMaterial({
    color: colorPreset,
    flatShading: true,
    shininess: 80
  });
  
  const accentMat = new THREE.MeshPhongMaterial({ color: '#ffffff', flatShading: true });
  const seatMat = new THREE.MeshPhongMaterial({ color: '#1a1a1a', flatShading: true });
  const engMat = new THREE.MeshPhongMaterial({ color: '#555555', metalness: 0.8, shininess: 80 });
  const chromeMat = new THREE.MeshPhongMaterial({ color: '#dddddd', metalness: 0.9, shininess: 100 });
  const goldMat = new THREE.MeshPhongMaterial({ color: '#ffbe0b', metalness: 0.5, shininess: 90 });
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: '#00f2fe' });

  // Build chassis according to selected car model
  switch (carModel) {
    case 'speed_demon': {
      // 2. Speed Demon (Low-slung Aerodynamic Racer)
      const bodyGeom = new THREE.BoxGeometry(2.1, 0.45, 4.0);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.4;
      body.castShadow = true;
      group.add(body);

      const noseGeom = new THREE.BoxGeometry(1.4, 0.3, 1.6);
      const nose = new THREE.Mesh(noseGeom, bodyMat);
      nose.position.set(0, 0.35, 2.0);
      nose.castShadow = true;
      group.add(nose);

      // Dual front splitters
      const splitterGeom = new THREE.BoxGeometry(2.4, 0.08, 0.6);
      const splitter = new THREE.Mesh(splitterGeom, accentMat);
      splitter.position.set(0, 0.22, 2.3);
      group.add(splitter);

      // Side Air Scoops
      [-1.1, 1.1].forEach(x => {
        const scoopGeom = new THREE.BoxGeometry(0.4, 0.4, 1.4);
        const scoop = new THREE.Mesh(scoopGeom, accentMat);
        scoop.position.set(x, 0.5, 0.2);
        group.add(scoop);
      });

      const seatGeom = new THREE.BoxGeometry(1.3, 0.8, 0.8);
      const seat = new THREE.Mesh(seatGeom, seatMat);
      seat.position.set(0, 0.7, -0.4);
      group.add(seat);

      const engCoverGeom = new THREE.BoxGeometry(1.4, 0.6, 1.2);
      const engCover = new THREE.Mesh(engCoverGeom, engMat);
      engCover.position.set(0, 0.6, -1.4);
      group.add(engCover);

      // Dual Exhausts
      [-0.4, 0.4].forEach(x => {
        const exhaustGeom = new THREE.CylinderGeometry(0.18, 0.22, 1.0);
        exhaustGeom.rotateX(Math.PI / 2);
        const ex = new THREE.Mesh(exhaustGeom, engMat);
        ex.position.set(x, 0.45, -1.9);
        group.add(ex);
      });
      break;
    }

    case 'thunder': {
      // 3. Thunder Cruiser (Heavy Off-Road Monster)
      const bodyGeom = new THREE.BoxGeometry(2.3, 0.75, 4.0);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);

      // Front Tubular Bumper
      const bumperGeom = new THREE.BoxGeometry(2.5, 0.25, 0.4);
      const bumper = new THREE.Mesh(bumperGeom, chromeMat);
      bumper.position.set(0, 0.55, 2.1);
      group.add(bumper);

      // Side Armor Plates
      [-1.22, 1.22].forEach(x => {
        const armorGeom = new THREE.BoxGeometry(0.2, 0.6, 2.6);
        const armor = new THREE.Mesh(armorGeom, engMat);
        armor.position.set(x, 0.6, 0);
        group.add(armor);
      });

      const seatGeom = new THREE.BoxGeometry(1.5, 1.0, 1.0);
      const seat = new THREE.Mesh(seatGeom, seatMat);
      seat.position.set(0, 1.0, -0.4);
      group.add(seat);

      // Dual High Vertical Monster Exhaust Stacks
      [-0.6, 0.6].forEach(x => {
        const stackGeom = new THREE.CylinderGeometry(0.2, 0.2, 1.4);
        const stack = new THREE.Mesh(stackGeom, chromeMat);
        stack.position.set(x, 1.4, -1.6);
        stack.rotation.x = -0.2;
        group.add(stack);
      });
      break;
    }

    case 'cyber': {
      // 4. Cyber Blade (Sci-Fi Stealth Wedge Jet)
      const bodyGeom = new THREE.BoxGeometry(2.2, 0.4, 4.2);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.45;
      body.castShadow = true;
      group.add(body);

      const noseGeom = new THREE.BoxGeometry(1.2, 0.25, 1.8);
      const nose = new THREE.Mesh(noseGeom, bodyMat);
      nose.position.set(0, 0.35, 2.2);
      group.add(nose);

      // Dual Side Winglets
      [-1.4, 1.4].forEach(x => {
        const wingletGeom = new THREE.BoxGeometry(0.8, 0.08, 1.2);
        const winglet = new THREE.Mesh(wingletGeom, accentMat);
        winglet.position.set(x, 0.45, -0.8);
        winglet.rotation.z = x > 0 ? -0.2 : 0.2;
        group.add(winglet);
      });

      // Cyan Glowing Strip Lines
      [-1.05, 1.05].forEach(x => {
        const stripGeom = new THREE.BoxGeometry(0.1, 0.08, 3.6);
        const strip = new THREE.Mesh(stripGeom, cyanGlowMat);
        strip.position.set(x, 0.62, 0);
        group.add(strip);
      });

      const seatGeom = new THREE.BoxGeometry(1.2, 0.85, 0.8);
      const seat = new THREE.Mesh(seatGeom, seatMat);
      seat.position.set(0, 0.75, -0.4);
      group.add(seat);

      const intakeGeom = new THREE.BoxGeometry(1.1, 0.7, 1.1);
      const intake = new THREE.Mesh(intakeGeom, engMat);
      intake.position.set(0, 0.7, -1.4);
      group.add(intake);
      break;
    }

    case 'phantom': {
      // 5. Phantom Roadster (Vintage Open-Wheel Roadster)
      const bodyGeom = new THREE.BoxGeometry(1.8, 0.6, 4.4);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.55;
      body.castShadow = true;
      group.add(body);

      // Elongated Hood
      const hoodGeom = new THREE.BoxGeometry(1.5, 0.55, 2.2);
      const hood = new THREE.Mesh(hoodGeom, bodyMat);
      hood.position.set(0, 0.65, 1.3);
      group.add(hood);

      // Chrome Radiator Grill
      const grillGeom = new THREE.BoxGeometry(1.3, 0.6, 0.15);
      const grill = new THREE.Mesh(grillGeom, chromeMat);
      grill.position.set(0, 0.65, 2.4);
      group.add(grill);

      // Round Classic Headlights
      [-0.6, 0.6].forEach(x => {
        const hlGeom = new THREE.SphereGeometry(0.22, 8, 8);
        const hl = new THREE.Mesh(hlGeom, chromeMat);
        hl.position.set(x, 0.75, 2.4);
        group.add(hl);
      });

      // High Backrest Seat
      const seatGeom = new THREE.BoxGeometry(1.3, 1.2, 0.3);
      const seat = new THREE.Mesh(seatGeom, seatMat);
      seat.position.set(0, 1.1, -0.6);
      group.add(seat);

      // Chrome Side Exhaust Pipes
      [-1.0, 1.0].forEach(x => {
        const pipeGeom = new THREE.CylinderGeometry(0.12, 0.12, 2.4);
        pipeGeom.rotateX(Math.PI / 2);
        const pipe = new THREE.Mesh(pipeGeom, chromeMat);
        pipe.position.set(x, 0.4, 0.2);
        group.add(pipe);
      });
      break;
    }

    case 'formula': {
      // 6. Formula Hyper (F1 Open-Wheel Racer)
      const bodyGeom = new THREE.BoxGeometry(1.3, 0.5, 4.2);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);

      // Pointed F1 Nose
      const noseGeom = new THREE.BoxGeometry(0.9, 0.3, 2.2);
      const nose = new THREE.Mesh(noseGeom, bodyMat);
      nose.position.set(0, 0.4, 1.8);
      group.add(nose);

      // Wide F1 Front Wing Splitter
      const wingGeom = new THREE.BoxGeometry(2.6, 0.1, 0.7);
      const wing = new THREE.Mesh(wingGeom, accentMat);
      wing.position.set(0, 0.25, 2.6);
      group.add(wing);

      // Side Pods
      [-0.9, 0.9].forEach(x => {
        const podGeom = new THREE.BoxGeometry(0.5, 0.45, 1.8);
        const pod = new THREE.Mesh(podGeom, bodyMat);
        pod.position.set(x, 0.45, 0);
        group.add(pod);
      });

      // Overhead Air Intake Scoop
      const scoopGeom = new THREE.BoxGeometry(0.5, 0.5, 0.6);
      const scoop = new THREE.Mesh(scoopGeom, accentMat);
      scoop.position.set(0, 1.45, -0.7);
      group.add(scoop);

      const seatGeom = new THREE.BoxGeometry(1.1, 0.8, 0.8);
      const seat = new THREE.Mesh(seatGeom, seatMat);
      seat.position.set(0, 0.75, -0.4);
      group.add(seat);

      // Formula Rear Wing
      const rWingGroup = new THREE.Group();
      rWingGroup.position.set(0, 1.4, -1.8);
      const supGeom = new THREE.BoxGeometry(0.12, 0.9, 0.3);
      [-0.6, 0.6].forEach(x => {
        const sup = new THREE.Mesh(supGeom, seatMat);
        sup.position.x = x;
        rWingGroup.add(sup);
      });
      const rWingMain = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.8), bodyMat);
      rWingMain.position.y = 0.45;
      rWingGroup.add(rWingMain);
      group.add(rWingGroup);
      break;
    }

    case 'solaris': {
      // 7. Solaris Prime (Apex Hypercar)
      const bodyGeom = new THREE.BoxGeometry(2.4, 0.55, 4.4);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);

      // Sculpted Hood
      const hoodGeom = new THREE.BoxGeometry(1.8, 0.35, 1.8);
      const hood = new THREE.Mesh(hoodGeom, bodyMat);
      hood.position.set(0, 0.5, 1.6);
      group.add(hood);

      // Hyper Splitter with Gold Accents
      const splitterGeom = new THREE.BoxGeometry(2.6, 0.12, 0.8);
      const splitter = new THREE.Mesh(splitterGeom, goldMat);
      splitter.position.set(0, 0.28, 2.4);
      group.add(splitter);

      // Dual Canopy Roof Fins
      [-0.8, 0.8].forEach(x => {
        const finGeom = new THREE.BoxGeometry(0.1, 0.6, 1.4);
        const fin = new THREE.Mesh(finGeom, cyanGlowMat);
        fin.position.set(x, 1.1, -0.6);
        fin.rotation.z = x > 0 ? -0.15 : 0.15;
        group.add(fin);
      });

      const seatGeom = new THREE.BoxGeometry(1.4, 0.9, 0.9);
      const seat = new THREE.Mesh(seatGeom, seatMat);
      seat.position.set(0, 0.85, -0.4);
      group.add(seat);

      // Triple Rocket Turbine Exhausts
      [
        { x: -0.4, y: 0.6 },
        { x: 0.4, y: 0.6 },
        { x: 0.0, y: 0.95 }
      ].forEach(pos => {
        const turbineGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.0);
        turbineGeom.rotateX(Math.PI / 2);
        const turbine = new THREE.Mesh(turbineGeom, goldMat);
        turbine.position.set(pos.x, pos.y, -1.9);
        group.add(turbine);
      });
      break;
    }

    case 'standard':
    default: {
      // 1. Standard Kart (Classic All-Rounder)
      const bodyGeom = new THREE.BoxGeometry(2.0, 0.6, 3.8);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const noseGeom = new THREE.BoxGeometry(1.6, 0.4, 1.2);
      const nose = new THREE.Mesh(noseGeom, bodyMat);
      nose.position.set(0, 0.4, 1.8);
      nose.castShadow = true;
      group.add(nose);

      const seatGeom = new THREE.BoxGeometry(1.4, 0.9, 0.9);
      const seat = new THREE.Mesh(seatGeom, seatMat);
      seat.position.set(0, 0.9, -0.4);
      seat.castShadow = true;
      group.add(seat);

      const engGeom = new THREE.BoxGeometry(1.2, 1.0, 1.0);
      const engine = new THREE.Mesh(engGeom, engMat);
      engine.position.set(0, 0.8, -1.3);
      engine.castShadow = true;
      group.add(engine);

      const exhaustGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.2);
      exhaustGeom.rotateX(Math.PI / 2);
      const exhaust = new THREE.Mesh(exhaustGeom, engMat);
      exhaust.position.set(0.4, 0.5, -1.8);
      group.add(exhaust);
      break;
    }
  }

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

  // 4. Steering Wheel and Column
  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(0, 0.9, 0.45);
  
  const columnGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.1);
  columnGeom.rotateX(Math.PI / 3); // angled column
  const columnMat = new THREE.MeshPhongMaterial({ color: '#333333', flatShading: true });
  const column = new THREE.Mesh(columnGeom, columnMat);
  column.position.set(0, 0.15, -0.15);
  steeringGroup.add(column);
  
  const wheelRimGeom = new THREE.TorusGeometry(0.35, 0.08, 4, 8);
  const wheelRimMat = new THREE.MeshPhongMaterial({ color: '#111111', flatShading: true });
  const wheelRim = new THREE.Mesh(wheelRimGeom, wheelRimMat);
  wheelRim.position.set(0, 0.55, 0.15);
  wheelRim.rotation.x = Math.PI / 6; // tilted wheel
  steeringGroup.add(wheelRim);
  
  group.add(steeringGroup);

  // 5. Driver
  const driver = createDriverMesh(colorPreset);
  group.add(driver);

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
    this.onHazardDropped = null;
  }

  // Setup / Rebuild the Kart Visual Model
  init(color, upgrades = {}) {
    if (this.mesh) this.scene.remove(this.mesh);
    
    this.colorPreset = color;
    this.upgrades = upgrades;
    
    // All car bodies share fair, equal base performance physics (purely visual 3D body styles)
    const base = { speed: 1.00, accel: 1.00, handling: 1.00 };
    
    // Recompute modifier stats based on engine & tire upgrades
    this.accelModifier = base.accel * (upgrades.engine === 'v6' ? 1.25 : (upgrades.engine === 'turbo' ? 1.4 : 1.0));
    this.maxSpeedModifier = base.speed * (upgrades.engine === 'turbo' ? 1.3 : (upgrades.engine === 'v6' ? 1.1 : 1.0));
    this.handlingModifier = base.handling * (upgrades.tires === 'sport' ? 1.35 : (upgrades.tires === 'neon' ? 1.2 : 1.0));
    
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
      this.closestT = 0.04;
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
        if (this.onHazardDropped) this.onHazardDropped(powerUp, dropPos);
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
    
    // Pick random car model for AI opponents
    const carModels = ['standard', 'speed_demon', 'thunder', 'cyber', 'phantom', 'formula', 'solaris'];
    const randomCar = carModels[(this.index - 1) % carModels.length];
    
    this.mesh = createKartMesh(this.color, { car: randomCar });
    
    // Standard scaling (slightly smaller than player)
    this.mesh.scale.set(0.95, 0.95, 0.95);
    this.scene.add(this.mesh);
    
    this.reset();
  }

  reset() {
    // Staggered double-column grid layout
    const row = Math.floor((this.index + 1) / 2);
    this.t = 0.04 - (row * 0.012);
    if (this.t < 0) this.t += 1.0;
    
    this.completedLaps = this.t > 0.5 ? -1 : 0;
    this.spinTimer = 0;
    
    // Left/Right staggered positioning
    const side = (this.index % 2 === 1) ? -1 : 1;
    this.lateralOffset = side * 3.5;
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
export class RemotePlayerKart {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    
    // Position/rotation targets for interpolation (lerp)
    this.position = new THREE.Vector3(0, 0, 0);
    this.targetPosition = new THREE.Vector3(0, 0, 0);
    
    this.heading = 0;
    this.targetHeading = 0;
    
    this.speed = 0;
    this.isDrifting = false;
    this.driftDirection = 0;
    this.spinTimer = 0;
    this.color = '#ff007f';
    this.closestT = 0;
  }

  init(color = '#ff007f', upgrades = {}) {
    if (this.mesh) this.scene.remove(this.mesh);
    this.color = color;
    this.mesh = createKartMesh(this.color, upgrades);
    this.scene.add(this.mesh);
  }

  updateState(state) {
    if (state.position) {
      this.targetPosition.set(state.position.x, state.position.y, state.position.z);
    }
    if (state.heading !== undefined) {
      this.targetHeading = state.heading;
    }
    if (state.speed !== undefined) {
      this.speed = state.speed;
    }
    if (state.isDrifting !== undefined) {
      this.isDrifting = state.isDrifting;
    }
    if (state.driftDirection !== undefined) {
      this.driftDirection = state.driftDirection;
    }
    if (state.spinTimer !== undefined) {
      this.spinTimer = state.spinTimer;
    }
    if (state.closestT !== undefined) {
      this.closestT = state.closestT;
    }
  }

  update(deltaTime) {
    if (!this.mesh) return;

    // Linear interpolation (lerp) for smooth movements
    const lerpFactor = Math.min(deltaTime * 15.0, 1.0);
    this.position.lerp(this.targetPosition, lerpFactor);

    // Angle interpolation (handling wrap around)
    let diff = this.targetHeading - this.heading;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.heading += diff * lerpFactor;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, this.heading, 0);

    // Drift visuals
    if (this.isDrifting) {
      this.mesh.rotation.z = -this.driftDirection * 0.16;
      this.mesh.rotation.y = this.heading + (this.driftDirection * 0.28);
    }

    if (this.spinTimer > 0) {
      this.mesh.rotation.y += (this.spinTimer * Math.PI * 8);
    }

    // Spin wheels based on speed
    this.mesh.traverse(child => {
      if (child.name === "wheel") {
        child.rotation.x += this.speed * deltaTime * 0.25;
      }
    });
  }

  clear() {
    if (this.mesh) this.scene.remove(this.mesh);
    this.mesh = null;
  }
}

export default PlayerKart;
