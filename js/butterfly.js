// 3D Butterfly Player Model, Procedural Wing Texture, Flight Physics & Fuel System
(function () {
  const WING_THEMES = {
    monarch: {
      name: 'Monarch Blaze',
      primary: '#ff6b00',
      secondary: '#ffb703',
      accent: '#ffffff',
      trailColor: 0xff9e00
    },
    morpho: {
      name: 'Blue Morpho',
      primary: '#0077ff',
      secondary: '#00f0ff',
      accent: '#b8f3ff',
      trailColor: 0x00e5ff
    },
    emerald: {
      name: 'Emerald Swallowtail',
      primary: '#10b981',
      secondary: '#a7f3d0',
      accent: '#fef08a',
      trailColor: 0x34d399
    },
    sunset: {
      name: 'Crimson Empress',
      primary: '#e11d48',
      secondary: '#f472b6',
      accent: '#fde047',
      trailColor: 0xf43f5e
    }
  };

  class Butterfly {
    constructor(scene, world, particles, sound) {
      this.scene = scene;
      this.world = world;
      this.particles = particles;
      this.sound = sound;

      this.themeKey = 'monarch';
      this.group = new THREE.Group();
      this.bodyGroup = new THREE.Group();
      this.group.add(this.bodyGroup);

      this.leftWingPivot = new THREE.Group();
      this.rightWingPivot = new THREE.Group();
      this.bodyGroup.add(this.leftWingPivot);
      this.bodyGroup.add(this.rightWingPivot);

      this.buildModel();
      this.scene.add(this.group);

      this.resetState();
    }

    resetState() {
      this.position = new THREE.Vector3(0, 7.5, 16);
      this.velocity = new THREE.Vector3(0, 0, 0);
      this.heading = Math.PI; // Facing toward the center meadow
      this.pitch = 0;
      this.roll = 0;

      this.fuel = 100;
      this.maxFuel = 100;
      this.lives = 2; // Strictly 2 lives as requested!
      this.invulnerableTimer = 2.5;
      this.nectarRushTimer = 0;
      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.starvationTimer = 0;
      this.wingPhase = 0;

      this.group.position.copy(this.position);
      this.updateShieldVisual(0);
    }

    createWingTexture(theme) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, 256, 256);

      // Draw butterfly wing silhouette with rich gradient
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(8, 128);
      ctx.bezierCurveTo(35, 18, 195, 8, 244, 52);
      ctx.bezierCurveTo(254, 96, 210, 138, 175, 148);
      ctx.bezierCurveTo(212, 165, 224, 218, 168, 245);
      ctx.bezierCurveTo(105, 252, 32, 204, 8, 142);
      ctx.closePath();

      // Dark outer border
      ctx.fillStyle = '#141118';
      ctx.fill();

      // Inner vibrant gradient
      ctx.save();
      ctx.clip();
      const grad = ctx.createRadialGradient(40, 128, 15, 150, 128, 185);
      grad.addColorStop(0, theme.secondary);
      grad.addColorStop(0.55, theme.primary);
      grad.addColorStop(0.86, '#18141c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Dark wing veins
      ctx.strokeStyle = '#141118';
      ctx.lineWidth = 5;
      const veins = [
        [[10, 128], [130, 75], [230, 48]],
        [[80, 95], [170, 90], [235, 95]],
        [[10, 128], [140, 132], [205, 136]],
        [[10, 134], [125, 175], [195, 195]],
        [[75, 160], [120, 210], [155, 238]]
      ];
      veins.forEach((v) => {
        ctx.beginPath();
        ctx.moveTo(v[0][0], v[0][1]);
        ctx.quadraticCurveTo(v[1][0], v[1][1], v[2][0], v[2][1]);
        ctx.stroke();
      });

      // Marginal glowing spots along the outer edge
      ctx.fillStyle = theme.accent;
      const spots = [
        [226, 42, 6], [234, 65, 7], [228, 90, 6], [212, 114, 5],
        [198, 172, 6], [196, 196, 6], [180, 218, 6], [156, 233, 5]
      ];
      spots.forEach(([sx, sy, sr]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      ctx.restore();

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    buildModel() {
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x1d1a22,
        roughness: 0.6,
        metalness: 0.15
      });

      // Thorax
      const thoraxGeo = new THREE.SphereGeometry(0.24, 12, 12);
      thoraxGeo.scale(0.85, 0.85, 1.45);
      const thorax = new THREE.Mesh(thoraxGeo, darkMat);
      thorax.castShadow = true;
      this.bodyGroup.add(thorax);

      // Abdomen
      const abdomenGeo = new THREE.SphereGeometry(0.18, 12, 12);
      abdomenGeo.scale(0.75, 0.75, 2.5);
      const abdomen = new THREE.Mesh(abdomenGeo, darkMat);
      abdomen.position.set(0, -0.04, 0.68);
      abdomen.castShadow = true;
      this.bodyGroup.add(abdomen);

      // Head
      const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const head = new THREE.Mesh(headGeo, darkMat);
      head.position.set(0, 0.05, -0.42);
      this.bodyGroup.add(head);

      // Compound Eyes
      const eyeGeo = new THREE.SphereGeometry(0.075, 8, 8);
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.15,
        metalness: 0.7
      });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.13, 0.08, -0.52);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.13, 0.08, -0.52);
      this.bodyGroup.add(leftEye, rightEye);

      // Antennae
      [-1, 1].forEach((side) => {
        const antGroup = new THREE.Group();
        const stalkGeo = new THREE.CylinderGeometry(0.014, 0.02, 0.55, 6);
        const stalk = new THREE.Mesh(stalkGeo, darkMat);
        stalk.position.y = 0.27;
        antGroup.add(stalk);

        const tipGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const tip = new THREE.Mesh(tipGeo, darkMat);
        tip.position.y = 0.55;
        antGroup.add(tip);

        antGroup.position.set(side * 0.08, 0.14, -0.5);
        antGroup.rotation.x = -0.65;
        antGroup.rotation.z = side * -0.38;
        this.bodyGroup.add(antGroup);
      });

      // Wings
      const theme = WING_THEMES[this.themeKey];
      const wingTex = this.createWingTexture(theme);
      this.wingMat = new THREE.MeshStandardMaterial({
        map: wingTex,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.1,
        emissive: new THREE.Color(theme.primary),
        emissiveIntensity: 0.18
      });

      const wingWidth = 1.65;
      const wingDepth = 1.85;
      const rightGeo = new THREE.PlaneGeometry(wingWidth, wingDepth, 4, 4);
      rightGeo.rotateX(-Math.PI / 2);
      rightGeo.translate(wingWidth / 2 + 0.1, 0, 0.05);

      const leftGeo = new THREE.PlaneGeometry(wingWidth, wingDepth, 4, 4);
      leftGeo.rotateX(-Math.PI / 2);
      leftGeo.scale(-1, 1, 1);
      leftGeo.translate(-(wingWidth / 2 + 0.1), 0, 0.05);

      this.rightWingMesh = new THREE.Mesh(rightGeo, this.wingMat);
      this.leftWingMesh = new THREE.Mesh(leftGeo, this.wingMat);
      this.rightWingMesh.castShadow = true;
      this.leftWingMesh.castShadow = true;

      this.rightWingPivot.add(this.rightWingMesh);
      this.leftWingPivot.add(this.leftWingMesh);

      // Protective Invulnerability / Nectar Rush Aura Sphere
      const shieldGeo = new THREE.SphereGeometry(1.45, 20, 20);
      this.shieldMat = new THREE.MeshBasicMaterial({
        color: 0xffe066,
        transparent: true,
        opacity: 0.0,
        wireframe: true
      });
      this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
      this.group.add(this.shieldMesh);
    }

    setTheme(themeKey) {
      if (!WING_THEMES[themeKey]) return;
      this.themeKey = themeKey;
      const theme = WING_THEMES[themeKey];
      const tex = this.createWingTexture(theme);
      this.wingMat.map = tex;
      this.wingMat.emissive.set(theme.primary);
      this.wingMat.needsUpdate = true;
    }

    triggerDash() {
      if (this.dashCooldown > 0 || this.dashTimer > 0) return false;
      const fuelCost = this.nectarRushTimer > 0 ? 0 : 8.5;
      if (this.fuel < fuelCost + 2) return false;

      this.fuel = Math.max(0, this.fuel - fuelCost);
      this.dashTimer = 0.34;
      this.dashCooldown = 0.9;
      this.sound.playDash();
      this.particles.spawnBurst(
        this.position,
        WING_THEMES[this.themeKey].trailColor,
        14,
        7.5,
        0.75
      );
      return true;
    }

    eatFruit(fuelAmount, isGolden = false) {
      this.fuel = Math.min(this.maxFuel, this.fuel + fuelAmount);
      this.starvationTimer = 0;
      if (isGolden) {
        this.nectarRushTimer = 5.5;
      }
      this.sound.playEatFruit(isGolden);
    }

    takeHit() {
      if (this.invulnerableTimer > 0) return false;
      this.lives = Math.max(0, this.lives - 1);
      this.sound.playLoseLife();

      // Scatter glowing butterfly scales on hit
      this.particles.spawnBurst(
        this.position,
        WING_THEMES[this.themeKey].trailColor,
        34,
        11,
        1.15
      );

      if (this.lives > 0) {
        // Grant temporary respawn invulnerability & lift butterfly into safer mid-air
        this.invulnerableTimer = 3.5;
        this.fuel = Math.max(this.fuel, 75);
        this.starvationTimer = 0;
        this.position.y = Math.max(this.position.y + 4.5, 8.5);
        this.velocity.set(0, 3.0, 0);
      }
      return true;
    }

    updateShieldVisual(elapsed) {
      if (this.invulnerableTimer > 0) {
        this.shieldMesh.visible = true;
        this.shieldMat.color.setHex(0x66e0ff);
        this.shieldMat.opacity = 0.25 + Math.sin(elapsed * 18) * 0.15;
        this.shieldMesh.rotation.y = elapsed * 2.5;
      } else if (this.nectarRushTimer > 0) {
        this.shieldMesh.visible = true;
        this.shieldMat.color.setHex(0xffd700);
        this.shieldMat.opacity = 0.22 + Math.sin(elapsed * 12) * 0.1;
        this.shieldMesh.rotation.y = -elapsed * 3.0;
      } else {
        this.shieldMesh.visible = false;
      }
    }

    update(dt, elapsed, input, cameraYaw) {
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
      }
      if (this.nectarRushTimer > 0) {
        this.nectarRushTimer = Math.max(0, this.nectarRushTimer - dt);
      }
      if (this.dashTimer > 0) {
        this.dashTimer = Math.max(0, this.dashTimer - dt);
      }
      if (this.dashCooldown > 0) {
        this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      }

      // Compute desired horizontal movement vector relative to cameraYaw
      let moveForward = 0;
      let moveRight = 0;
      if (input.forward) moveForward += 1;
      if (input.backward) moveForward -= 1;
      if (input.right) moveRight += 1;
      if (input.left) moveRight -= 1;

      const hasHorizontalInput = moveForward !== 0 || moveRight !== 0;
      const forwardVec = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
      const rightVec = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

      const desiredDir = new THREE.Vector3();
      desiredDir.addScaledVector(forwardVec, moveForward);
      desiredDir.addScaledVector(rightVec, moveRight);
      if (desiredDir.lengthSq() > 0) desiredDir.normalize();

      // Speed multipliers
      const hasFuel = this.fuel > 0.2;
      let baseSpeed = hasFuel ? 13.5 : 5.5;
      if (this.nectarRushTimer > 0) baseSpeed *= 1.32;
      if (this.dashTimer > 0) baseSpeed *= 2.15;

      if (hasHorizontalInput) {
        const targetHeading = Math.atan2(-desiredDir.x, -desiredDir.z);
        // Smooth shortest-angle interpolation
        let angleDiff = targetHeading - this.heading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.heading += angleDiff * Math.min(1, dt * 9.5);
        this.roll = THREE.MathUtils.lerp(this.roll, -angleDiff * 0.45, dt * 8);

        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, desiredDir.x * baseSpeed, dt * 6.5);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, desiredDir.z * baseSpeed, dt * 6.5);
      } else if (this.dashTimer > 0) {
        const dashDirX = -Math.sin(this.heading);
        const dashDirZ = -Math.cos(this.heading);
        this.velocity.x = dashDirX * baseSpeed;
        this.velocity.z = dashDirZ * baseSpeed;
        this.roll = THREE.MathUtils.lerp(this.roll, 0, dt * 8);
      } else {
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, dt * 4.5);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, dt * 4.5);
        this.roll = THREE.MathUtils.lerp(this.roll, 0, dt * 7);
      }

      // Vertical flight controls (Space to ascend, Shift/C to swoop down)
      let targetVy = Math.sin(elapsed * 2.8) * 0.55; // Gentle natural hover bob
      if (hasFuel) {
        if (input.up) {
          targetVy = 7.8;
        } else if (input.down) {
          targetVy = -8.5;
        }
      } else {
        // Out of fuel! Butterfly wings sputter and sink toward ground
        targetVy = -3.8;
      }

      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, targetVy, dt * 6.5);

      // Apply velocity
      this.position.addScaledVector(this.velocity, dt);

      // Tree trunk soft collision push-out
      for (const tree of this.world.treeColliders) {
        const dx = this.position.x - tree.x;
        const dz = this.position.z - tree.z;
        const dist = Math.hypot(dx, dz);
        if (dist < tree.radius + 0.75 && this.position.y < tree.canopyY) {
          const push = (tree.radius + 0.75 - dist);
          const nx = dist > 0.001 ? dx / dist : 1;
          const nz = dist > 0.001 ? dz / dist : 0;
          this.position.x += nx * push;
          this.position.z += nz * push;
        }
      }

      // Clamp altitude to terrain floor and sky ceiling
      const groundY = Math.max(-0.05, this.world.getTerrainHeight(this.position.x, this.position.z));
      const minAltitude = groundY + 0.65;
      const maxAltitude = 23.0;

      if (this.position.y < minAltitude) {
        this.position.y = minAltitude;
        if (this.velocity.y < 0) this.velocity.y = 0;
      } else if (this.position.y > maxAltitude) {
        this.position.y = maxAltitude;
        if (this.velocity.y > 0) this.velocity.y = 0;
      }

      // Keep inside map sanctuary radius with gentle wind pushback
      const distFromOrigin = Math.hypot(this.position.x, this.position.z);
      this.isNearBoundary = distFromOrigin > this.world.mapRadius - 5;
      if (distFromOrigin > this.world.mapRadius - 1.2) {
        const angle = Math.atan2(this.position.z, this.position.x);
        this.position.x = Math.cos(angle) * (this.world.mapRadius - 1.2);
        this.position.z = Math.sin(angle) * (this.world.mapRadius - 1.2);
      }

      // Fuel Consumption Logic
      if (this.nectarRushTimer <= 0) {
        let burnRate = 2.15; // Base hovering/flying metabolism
        if (hasHorizontalInput) burnRate += 0.95;
        if (input.up) burnRate += 1.65;
        this.fuel = Math.max(0, this.fuel - burnRate * dt);
      }

      // Starvation tracking when Fuel is 0%
      if (this.fuel <= 0.01) {
        this.starvationTimer += dt;
      } else {
        this.starvationTimer = Math.max(0, this.starvationTimer - dt * 2);
      }

      // Pitch body forward with speed and vertical climb
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const targetPitch =
        -horizSpeed * 0.025 + THREE.MathUtils.clamp(this.velocity.y * 0.04, -0.35, 0.35);
      this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, dt * 8);

      // Wing flapping animation
      let flapSpeed = 13.5;
      if (input.up) flapSpeed = 22.0;
      else if (this.dashTimer > 0) flapSpeed = 28.0;
      else if (input.down && !hasHorizontalInput) flapSpeed = 6.0; // Gliding dive
      else if (!hasFuel) flapSpeed = 5.0;

      this.wingPhase += flapSpeed * dt;
      const wingAngle = Math.sin(this.wingPhase) * 0.92 + 0.12;
      this.leftWingPivot.rotation.z = -wingAngle;
      this.rightWingPivot.rotation.z = wingAngle;

      if (Math.sin(this.wingPhase) > 0.85 && hasFuel) {
        this.sound.playFlap(flapSpeed / 18);
      }

      // Spawn wing shimmer particles
      const theme = WING_THEMES[this.themeKey];
      this.particles.spawnWingTrail(
        this.position,
        this.nectarRushTimer > 0 ? 0xffd700 : theme.trailColor,
        this.dashTimer > 0 || this.nectarRushTimer > 0
      );

      // Apply transform to butterfly mesh group
      this.group.position.copy(this.position);
      this.group.rotation.order = 'YXZ';
      this.group.rotation.y = this.heading;
      this.group.rotation.x = this.pitch;
      this.group.rotation.z = this.roll;

      this.updateShieldVisual(elapsed);
    }
  }

  window.ButterflyGame = window.ButterflyGame || {};
  window.ButterflyGame.Butterfly = Butterfly;
  window.ButterflyGame.WING_THEMES = WING_THEMES;
})();
