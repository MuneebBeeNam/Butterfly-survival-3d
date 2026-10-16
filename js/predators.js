// 3D Wild Animal Predators (Red Fox, Giant Bullfrog, Peregrine Hawk, Forest Lynx)
(function () {
  function createAlertSprite(symbol, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 74px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, 64, 68);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 1.5, 1);
    sprite.visible = false;
    return sprite;
  }

  class PredatorManager {
    constructor(scene, world, particles, sound) {
      this.scene = scene;
      this.world = world;
      this.particles = particles;
      this.sound = sound;
      this.predators = [];
    }

    reset() {
      this.predators.forEach((p) => {
        this.scene.remove(p.group);
        if (p.aimLine) this.scene.remove(p.aimLine);
      });
      this.predators = [];

      // Spawn initial wild animal predators across the sanctuary
      this.spawnFox(new THREE.Vector3(-20, 0, -14));
      this.spawnFox(new THREE.Vector3(22, 0, 18));
      this.spawnLynx(new THREE.Vector3(-24, 0, 20));
      this.spawnLynx(new THREE.Vector3(25, 0, -20));
      this.spawnFrog(0);
      this.spawnFrog(3);
      this.spawnHawk(0);
      this.spawnHawk(Math.PI);
    }

    buildFoxMesh() {
      const group = new THREE.Group();
      const orangeMat = new THREE.MeshStandardMaterial({ color: 0xd9480f, roughness: 0.75 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.8 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.6 });

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 2.15), orangeMat);
      body.position.y = 0.95;
      body.castShadow = true;
      group.add(body);

      // White chest fur
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.7), whiteMat);
      chest.position.set(0, 0.85, -0.85);
      group.add(chest);

      // Head & Snout
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.48, -1.05);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.82), orangeMat);
      headGroup.add(head);

      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.75, 6), orangeMat);
      snout.rotation.x = -Math.PI / 2;
      snout.position.set(0, -0.1, -0.62);
      headGroup.add(snout);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), darkMat);
      nose.position.set(0, -0.08, -0.98);
      headGroup.add(nose);

      // Pointed Fox Ears
      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.52, 4), orangeMat);
        ear.position.set(s * 0.28, 0.52, -0.05);
        headGroup.add(ear);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), darkMat);
        eye.position.set(s * 0.24, 0.08, -0.42);
        headGroup.add(eye);
      });
      group.add(headGroup);

      // Bushy Tail
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, 1.05, 1.05);
      const tailMain = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 7), orangeMat);
      tailMain.rotation.x = Math.PI * 0.65;
      tailMain.position.set(0, 0.15, 0.55);
      tailGroup.add(tailMain);

      const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 7), whiteMat);
      tailTip.rotation.x = Math.PI * 0.65;
      tailTip.position.set(0, 0.35, 1.15);
      tailGroup.add(tailTip);
      group.add(tailGroup);

      // 4 Articulated Legs
      const legs = [];
      const legCoords = [
        [-0.32, 0.5, -0.72],
        [0.32, 0.5, -0.72],
        [-0.32, 0.5, 0.72],
        [0.32, 0.5, 0.72]
      ];
      legCoords.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), darkMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        group.add(leg);
        legs.push(leg);
      });

      const alertSprite = createAlertSprite('!', '#ef4444');
      alertSprite.position.set(0, 2.75, 0);
      group.add(alertSprite);

      return { group, legs, tailGroup, headGroup, alertSprite };
    }

    buildLynxMesh() {
      const group = new THREE.Group();
      const tawnyMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.75 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x221f1d, roughness: 0.6 });
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xffbe0b,
        emissive: 0xb45309,
        emissiveIntensity: 0.5
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.82, 2.05), tawnyMat);
      body.position.y = 0.92;
      body.castShadow = true;
      group.add(body);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.48, -0.98);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 10), tawnyMat);
      headGroup.add(head);

      // Lynx ear tufts
      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), tawnyMat);
        ear.position.set(s * 0.28, 0.48, 0);
        headGroup.add(ear);

        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), darkMat);
        tuft.position.set(s * 0.28, 0.76, 0);
        headGroup.add(tuft);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
        eye.position.set(s * 0.19, 0.08, -0.41);
        headGroup.add(eye);
      });
      group.add(headGroup);

      const legs = [];
      [
        [-0.32, 0.48, -0.68],
        [0.32, 0.48, -0.68],
        [-0.32, 0.48, 0.68],
        [0.32, 0.48, 0.68]
      ].forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.92, 0.24), tawnyMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        group.add(leg);
        legs.push(leg);
      });

      const alertSprite = createAlertSprite('!', '#f97316');
      alertSprite.position.set(0, 2.75, 0);
      group.add(alertSprite);

      return { group, legs, headGroup, alertSprite };
    }

    buildFrogMesh() {
      const group = new THREE.Group();
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.45 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xc8e6c9, roughness: 0.6 });
      const tongueMat = new THREE.MeshStandardMaterial({
        color: 0xff4d88,
        emissive: 0x881337,
        emissiveIntensity: 0.35,
        roughness: 0.3
      });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 12), greenMat);
      body.scale.set(1.15, 0.78, 1.3);
      body.position.y = 0.62;
      body.castShadow = true;
      group.add(body);

      // Inflatable vocal throat sac
      const throat = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 12), bellyMat);
      throat.position.set(0, 0.55, -0.78);
      group.add(throat);

      // Bulging Frog Eyes
      [-1, 1].forEach((s) => {
        const eyeBulge = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), eyeMat);
        eyeBulge.position.set(s * 0.42, 1.12, -0.58);
        group.add(eyeBulge);

        const pupil = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        pupil.position.set(s * 0.44, 1.14, -0.76);
        group.add(pupil);
      });

      // Extendable sticky tongue mesh
      const tongueGeo = new THREE.CylinderGeometry(0.09, 0.14, 1.0, 8);
      tongueGeo.rotateX(Math.PI / 2);
      tongueGeo.translate(0, 0, -0.5);
      const tongue = new THREE.Mesh(tongueGeo, tongueMat);
      tongue.position.set(0, 0.72, -0.82);
      tongue.scale.set(1, 1, 0.01);
      tongue.visible = false;
      group.add(tongue);

      const alertSprite = createAlertSprite('!', '#ef4444');
      alertSprite.position.set(0, 2.25, 0);
      group.add(alertSprite);

      return { group, throat, tongue, alertSprite };
    }

    buildHawkMesh() {
      const group = new THREE.Group();
      const featherMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x3d281d,
        roughness: 0.7,
        side: THREE.DoubleSide
      });
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.52, 2.1, 8), featherMat);
      body.rotation.x = -Math.PI / 2;
      body.castShadow = true;
      group.add(body);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), beakMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.set(0, -0.05, -1.25);
      group.add(beak);

      // Articulated Left & Right Hawk Wings
      const leftWing = new THREE.Group();
      const rightWing = new THREE.Group();

      const wGeoL = new THREE.BoxGeometry(2.35, 0.08, 0.95);
      wGeoL.translate(-1.15, 0, 0);
      const wMeshL = new THREE.Mesh(wGeoL, wingMat);
      wMeshL.castShadow = true;
      leftWing.add(wMeshL);

      const wGeoR = new THREE.BoxGeometry(2.35, 0.08, 0.95);
      wGeoR.translate(1.15, 0, 0);
      const wMeshR = new THREE.Mesh(wGeoR, wingMat);
      wMeshR.castShadow = true;
      rightWing.add(wMeshR);

      group.add(leftWing, rightWing);

      const alertSprite = createAlertSprite('!', '#dc2626');
      alertSprite.position.set(0, 1.65, 0);
      group.add(alertSprite);

      return { group, leftWing, rightWing, alertSprite };
    }

    spawnFox(startPos) {
      const built = this.buildFoxMesh();
      startPos.y = this.world.getTerrainHeight(startPos.x, startPos.z);
      built.group.position.copy(startPos);
      this.scene.add(built.group);

      this.predators.push({
        type: 'fox',
        name: 'Red Fox',
        ...built,
        position: startPos.clone(),
        velocity: new THREE.Vector3(),
        heading: Math.random() * Math.PI * 2,
        state: 'PATROL',
        stateTimer: 2.0,
        waypoint: this.getRandomGroundPoint(16, 46),
        hitRadius: 1.75
      });
    }

    spawnLynx(startPos) {
      const built = this.buildLynxMesh();
      startPos.y = this.world.getTerrainHeight(startPos.x, startPos.z);
      built.group.position.copy(startPos);
      this.scene.add(built.group);

      this.predators.push({
        type: 'lynx',
        name: 'Wild Lynx',
        ...built,
        position: startPos.clone(),
        velocity: new THREE.Vector3(),
        heading: Math.random() * Math.PI * 2,
        state: 'PATROL',
        stateTimer: 1.5,
        waypoint: this.getRandomGroundPoint(18, 48),
        hitRadius: 1.75
      });
    }

    spawnFrog(padIndex) {
      const built = this.buildFrogMesh();
      const padPos =
        this.world.pondSpots[padIndex % this.world.pondSpots.length] ||
        new THREE.Vector3(4, 0, 4);
      built.group.position.copy(padPos);
      this.scene.add(built.group);

      // Red telegraph line for frog tongue strike
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 1, -1)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xff2a55,
        transparent: true,
        opacity: 0.75
      });
      const aimLine = new THREE.Line(lineGeo, lineMat);
      aimLine.visible = false;
      this.scene.add(aimLine);

      this.predators.push({
        type: 'frog',
        name: 'Giant Bullfrog',
        ...built,
        aimLine,
        padIndex,
        position: padPos.clone(),
        velocity: new THREE.Vector3(),
        heading: 0,
        state: 'PATROL',
        stateTimer: 2.0,
        targetPoint: new THREE.Vector3(),
        hitRadius: 1.45
      });
    }

    spawnHawk(orbitAngle) {
      const built = this.buildHawkMesh();
      const r = 28;
      const startPos = new THREE.Vector3(
        Math.cos(orbitAngle) * r,
        17.5,
        Math.sin(orbitAngle) * r
      );
      built.group.position.copy(startPos);
      this.scene.add(built.group);

      this.predators.push({
        type: 'hawk',
        name: 'Peregrine Hawk',
        ...built,
        orbitAngle,
        orbitRadius: r,
        position: startPos.clone(),
        velocity: new THREE.Vector3(),
        heading: orbitAngle + Math.PI / 2,
        state: 'PATROL',
        stateTimer: 3.0,
        diveTarget: new THREE.Vector3(),
        hitRadius: 1.85
      });
    }

    getRandomGroundPoint(minR, maxR) {
      const angle = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      return new THREE.Vector3(x, this.world.getTerrainHeight(x, z), z);
    }

    faceTarget(p, targetX, targetZ, dt, turnSpeed = 7) {
      const dx = targetX - p.position.x;
      const dz = targetZ - p.position.z;
      const desired = Math.atan2(-dx, -dz);
      let diff = desired - p.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.heading += diff * Math.min(1, dt * turnSpeed);
      p.group.rotation.y = p.heading;
    }

    update(dt, elapsed, butterfly, difficultyScale, onPlayerCaught) {
      for (const p of this.predators) {
        if (p.type === 'fox' || p.type === 'lynx') {
          this.updateGroundHunter(p, dt, elapsed, butterfly, difficultyScale, onPlayerCaught);
        } else if (p.type === 'frog') {
          this.updateFrog(p, dt, elapsed, butterfly, difficultyScale, onPlayerCaught);
        } else if (p.type === 'hawk') {
          this.updateHawk(p, dt, elapsed, butterfly, difficultyScale, onPlayerCaught);
        }
      }
    }

    updateGroundHunter(p, dt, elapsed, butterfly, difficultyScale, onPlayerCaught) {
      const isLynx = p.type === 'lynx';
      const distXZ = Math.hypot(
        butterfly.position.x - p.position.x,
        butterfly.position.z - p.position.z
      );
      const dist3D = p.position.distanceTo(butterfly.position);
      const groundY = this.world.getTerrainHeight(p.position.x, p.position.z);

      if (p.state === 'PATROL') {
        p.alertSprite.visible = false;
        const wpDist = Math.hypot(p.waypoint.x - p.position.x, p.waypoint.z - p.position.z);
        if (wpDist < 2.5) {
          p.waypoint = this.getRandomGroundPoint(15, 48);
        }

        this.faceTarget(p, p.waypoint.x, p.waypoint.z, dt, 4.5);
        const speed = (isLynx ? 6.5 : 5.8) * difficultyScale;
        p.position.x += -Math.sin(p.heading) * speed * dt;
        p.position.z += -Math.cos(p.heading) * speed * dt;
        p.position.y = groundY;
        p.group.rotation.x = 0;

        // Detect butterfly if flying low/mid-altitude within hunting range
        const detectRange = isLynx ? 25 : 23;
        if (distXZ < detectRange && butterfly.position.y < 13.5 && butterfly.invulnerableTimer <= 0) {
          p.state = 'CHASE';
          p.stateTimer = 4.5;
          this.sound.playPredatorAlert(p.type);
        }
      } else if (p.state === 'CHASE') {
        p.alertSprite.visible = true;
        p.stateTimer -= dt;
        this.faceTarget(p, butterfly.position.x, butterfly.position.z, dt, 9.0);

        const chaseSpeed = (isLynx ? 12.2 : 11.4) * difficultyScale;
        const nextX = p.position.x - Math.sin(p.heading) * chaseSpeed * dt;
        const nextZ = p.position.z - Math.cos(p.heading) * chaseSpeed * dt;

        // Avoid running deep into the pond
        if (Math.hypot(nextX, nextZ) > this.world.pondRadius - 1.5) {
          p.position.x = nextX;
          p.position.z = nextZ;
        }
        p.position.y = this.world.getTerrainHeight(p.position.x, p.position.z);

        // When close enough, crouch to wind up an aerial leap!
        const pounceRange = isLynx ? 8.8 : 7.2;
        if (distXZ < pounceRange && butterfly.position.y < 10.5) {
          p.state = 'WINDUP';
          p.stateTimer = 0.42;
        } else if (p.stateTimer <= 0 || distXZ > 32 || butterfly.position.y > 16) {
          p.state = 'PATROL';
          p.waypoint = this.getRandomGroundPoint(15, 48);
        }
      } else if (p.state === 'WINDUP') {
        p.alertSprite.visible = true;
        p.stateTimer -= dt;
        this.faceTarget(p, butterfly.position.x, butterfly.position.z, dt, 12.0);
        // Crouch down before pouncing
        p.group.scale.y = 0.72 + Math.sin(elapsed * 35) * 0.05;
        p.position.y = groundY;

        if (p.stateTimer <= 0) {
          p.group.scale.y = 1.0;
          p.state = 'LUNGE';
          p.stateTimer = 0.85;

          // Compute ballistic pounce velocity toward the butterfly!
          const toTarget = new THREE.Vector3().subVectors(butterfly.position, p.position);
          const horizDir = new THREE.Vector3(toTarget.x, 0, toTarget.z).normalize();
          const lungeSpeed = (isLynx ? 19.5 : 17.5) * difficultyScale;
          const jumpUp = Math.min(14.5, Math.max(8.5, toTarget.y * 1.65 + 5.5));
          p.velocity.set(horizDir.x * lungeSpeed, jumpUp, horizDir.z * lungeSpeed);
          this.particles.spawnBurst(p.position, 0xc2b280, 10, 4.5, 0.7);
        }
      } else if (p.state === 'LUNGE') {
        p.alertSprite.visible = true;
        p.velocity.y -= 18.5 * dt; // Gravity
        p.position.addScaledVector(p.velocity, dt);
        p.group.rotation.x = THREE.MathUtils.clamp(p.velocity.y * 0.05, -0.5, 0.6);

        if (dist3D < p.hitRadius && butterfly.invulnerableTimer <= 0) {
          onPlayerCaught(p.name);
          p.state = 'COOLDOWN';
          p.stateTimer = 1.8;
        } else if (p.position.y <= groundY && p.velocity.y < 0) {
          p.position.y = groundY;
          p.group.rotation.x = 0;
          p.state = 'COOLDOWN';
          p.stateTimer = 1.1;
        }
      } else if (p.state === 'COOLDOWN') {
        p.alertSprite.visible = false;
        p.group.scale.y = 1.0;
        p.group.rotation.x = 0;
        p.position.y = groundY;
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          p.state = 'PATROL';
          p.waypoint = this.getRandomGroundPoint(15, 48);
        }
      }

      // Animate legs & tail
      const walkFreq = p.state === 'CHASE' ? 20 : 11;
      const legAmp = p.state === 'WINDUP' || p.state === 'COOLDOWN' ? 0.05 : 0.55;
      p.legs.forEach((leg, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        leg.rotation.x = Math.sin(elapsed * walkFreq + i) * legAmp * sign;
      });
      if (p.tailGroup) {
        p.tailGroup.rotation.y = Math.sin(elapsed * 8) * 0.3;
      }

      p.group.position.copy(p.position);
    }

    updateFrog(p, dt, elapsed, butterfly, difficultyScale, onPlayerCaught) {
      const dist3D = p.position.distanceTo(butterfly.position);

      // Pulse throat sac
      const sacScale = 1 + Math.sin(elapsed * (p.state === 'WINDUP' ? 22 : 5)) * 0.25;
      p.throat.scale.set(sacScale, sacScale, sacScale);

      if (p.state === 'PATROL') {
        p.alertSprite.visible = false;
        p.aimLine.visible = false;
        p.tongue.visible = false;
        p.stateTimer -= dt;

        // Periodically hop to another lily pad
        if (p.stateTimer <= 0) {
          p.padIndex = (p.padIndex + 1 + Math.floor(Math.random() * 2)) % this.world.pondSpots.length;
          p.targetPoint.copy(this.world.pondSpots[p.padIndex]);
          p.state = 'HOP';
          p.stateTimer = 0.65;
          p.startHopPos = p.position.clone();
        } else if (dist3D < 17.5 && butterfly.position.y < 10.5 && butterfly.invulnerableTimer <= 0) {
          p.state = 'WINDUP';
          p.stateTimer = 0.68;
          this.sound.playPredatorAlert('frog');
        }
      } else if (p.state === 'HOP') {
        p.stateTimer -= dt;
        const progress = 1 - Math.max(0, p.stateTimer / 0.65);
        p.position.lerpVectors(p.startHopPos, p.targetPoint, progress);
        p.position.y += Math.sin(progress * Math.PI) * 2.6;
        this.faceTarget(p, p.targetPoint.x, p.targetPoint.z, dt, 10);

        if (p.stateTimer <= 0) {
          p.position.copy(p.targetPoint);
          p.state = 'PATROL';
          p.stateTimer = 2.4 + Math.random() * 1.5;
        }
      } else if (p.state === 'WINDUP') {
        p.alertSprite.visible = true;
        p.stateTimer -= dt;
        this.faceTarget(p, butterfly.position.x, butterfly.position.z, dt, 10);
        p.targetPoint.copy(butterfly.position);

        // Update red aim telegraph line
        p.aimLine.visible = true;
        const mouthPos = p.position.clone().add(new THREE.Vector3(0, 0.72, 0));
        p.aimLine.geometry.setFromPoints([mouthPos, p.targetPoint]);

        if (p.stateTimer <= 0) {
          p.aimLine.visible = false;
          p.state = 'STRIKE';
          p.stateTimer = 0.28;
          p.tongue.visible = true;
        }
      } else if (p.state === 'STRIKE') {
        p.alertSprite.visible = true;
        p.stateTimer -= dt;
        const mouthPos = p.position.clone().add(new THREE.Vector3(0, 0.72, 0));
        const strikeLen = mouthPos.distanceTo(p.targetPoint);
        const progress = Math.sin((1 - p.stateTimer / 0.28) * Math.PI);
        const currentLen = Math.max(0.1, strikeLen * progress);

        p.tongue.scale.set(1, 1, currentLen);
        p.group.lookAt(p.targetPoint.x, p.position.y, p.targetPoint.z);
        p.group.rotateY(Math.PI);

        // Check if butterfly is hit by the extending tongue tip
        const tongueTip = mouthPos.clone().lerp(p.targetPoint, progress);
        if (
          tongueTip.distanceTo(butterfly.position) < 1.85 &&
          butterfly.invulnerableTimer <= 0
        ) {
          onPlayerCaught(p.name);
          p.state = 'COOLDOWN';
          p.stateTimer = 1.8;
          p.tongue.visible = false;
        } else if (p.stateTimer <= 0) {
          p.tongue.visible = false;
          p.state = 'COOLDOWN';
          p.stateTimer = 1.4;
        }
      } else if (p.state === 'COOLDOWN') {
        p.alertSprite.visible = false;
        p.aimLine.visible = false;
        p.tongue.visible = false;
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          p.state = 'PATROL';
          p.stateTimer = 2.0;
        }
      }

      p.group.position.copy(p.position);
    }

    updateHawk(p, dt, elapsed, butterfly, difficultyScale, onPlayerCaught) {
      const dist3D = p.position.distanceTo(butterfly.position);

      // Flap hawk wings
      const flapFreq = p.state === 'DIVE' ? 4 : 11;
      const flapAmp = p.state === 'DIVE' ? 0.15 : 0.55;
      const wingAngle = Math.sin(elapsed * flapFreq + p.orbitAngle) * flapAmp;
      p.leftWing.rotation.z = -wingAngle;
      p.rightWing.rotation.z = wingAngle;

      if (p.state === 'PATROL') {
        p.alertSprite.visible = false;
        p.stateTimer -= dt;
        p.orbitAngle += dt * 0.42 * difficultyScale;

        const targetX = Math.cos(p.orbitAngle) * p.orbitRadius;
        const targetZ = Math.sin(p.orbitAngle) * p.orbitRadius;
        const targetY = 16.5 + Math.sin(elapsed * 1.5 + p.orbitAngle) * 2.0;

        this.faceTarget(p, targetX, targetZ, dt, 5);
        p.position.x = THREE.MathUtils.lerp(p.position.x, targetX, dt * 3);
        p.position.y = THREE.MathUtils.lerp(p.position.y, targetY, dt * 3);
        p.position.z = THREE.MathUtils.lerp(p.position.z, targetZ, dt * 3);
        p.group.rotation.x = 0;

        // Dive if butterfly flies high OR comes near the hawk's patrol cone
        const canSpot =
          (butterfly.position.y > 10.5 && dist3D < 34) || dist3D < 21;
        if (p.stateTimer <= 0 && canSpot && butterfly.invulnerableTimer <= 0) {
          p.state = 'WINDUP';
          p.stateTimer = 0.62;
          this.sound.playPredatorAlert('hawk');
        }
      } else if (p.state === 'WINDUP') {
        p.alertSprite.visible = true;
        p.stateTimer -= dt;
        this.faceTarget(p, butterfly.position.x, butterfly.position.z, dt, 10);
        p.position.y += 2.5 * dt; // Climb slightly before stoop dive
        p.diveTarget.copy(butterfly.position);

        if (p.stateTimer <= 0) {
          p.state = 'DIVE';
          p.stateTimer = 1.25;
          const dir = new THREE.Vector3().subVectors(p.diveTarget, p.position).normalize();
          const diveSpeed = 24.5 * difficultyScale;
          p.velocity.copy(dir.multiplyScalar(diveSpeed));
        }
      } else if (p.state === 'DIVE') {
        p.alertSprite.visible = true;
        p.stateTimer -= dt;

        // Slight homing correction in first half of dive
        if (p.stateTimer > 0.65) {
          const toB = new THREE.Vector3().subVectors(butterfly.position, p.position).normalize();
          p.velocity.lerp(toB.multiplyScalar(24.5 * difficultyScale), dt * 3.0);
        }

        p.position.addScaledVector(p.velocity, dt);
        this.faceTarget(
          p,
          p.position.x + p.velocity.x,
          p.position.z + p.velocity.z,
          dt,
          12
        );
        p.group.rotation.x = -0.35;

        const minGround = this.world.getTerrainHeight(p.position.x, p.position.z) + 1.4;
        if (dist3D < p.hitRadius && butterfly.invulnerableTimer <= 0) {
          onPlayerCaught(p.name);
          p.state = 'CLIMB';
          p.stateTimer = 2.2;
        } else if (p.position.y <= minGround || p.stateTimer <= 0) {
          p.position.y = Math.max(p.position.y, minGround);
          p.state = 'CLIMB';
          p.stateTimer = 2.0;
        }
      } else if (p.state === 'CLIMB') {
        p.alertSprite.visible = false;
        p.stateTimer -= dt;
        p.position.y += 7.5 * dt;
        p.orbitAngle += dt * 0.35;
        const tx = Math.cos(p.orbitAngle) * p.orbitRadius;
        const tz = Math.sin(p.orbitAngle) * p.orbitRadius;
        this.faceTarget(p, tx, tz, dt, 4);
        p.position.x = THREE.MathUtils.lerp(p.position.x, tx, dt * 1.5);
        p.position.z = THREE.MathUtils.lerp(p.position.z, tz, dt * 1.5);
        p.group.rotation.x = 0.25;

        if (p.stateTimer <= 0) {
          p.state = 'PATROL';
          p.stateTimer = 3.2;
        }
      }

      p.group.position.copy(p.position);
    }
  }

  window.ButterflyGame = window.ButterflyGame || {};
  window.ButterflyGame.PredatorManager = PredatorManager;
})();
