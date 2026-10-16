// 3D Meadow & Woodland Sanctuary Map Generator
(function () {
  class World {
    constructor(scene) {
      this.scene = scene;
      this.mapRadius = 56;
      this.pondRadius = 13.5;
      this.fruitSpawnSpots = [];
      this.rockPerches = [];
      this.pondSpots = [];
      this.treeColliders = [];
      this.waterRings = [];
      this.lilyPads = [];

      this.buildSkyAndLights();
      this.buildTerrain();
      this.buildPond();
      this.buildTreesAndBushes();
      this.buildRocksAndLogs();
      this.buildFlowersAndMushrooms();
      this.buildBoundaryMarkers();
    }

    getTerrainHeight(x, z) {
      const distFromCenter = Math.hypot(x, z);
      // Central pond depression
      if (distFromCenter < this.pondRadius + 3) {
        const t = Math.max(0, Math.min(1, (distFromCenter - 7) / 9.5));
        const smooth = t * t * (3 - 2 * t);
        return -1.35 * (1 - smooth) + smooth * 0.4;
      }

      // Gentle rolling hills across the meadow
      let h =
        Math.sin(x * 0.08) * Math.cos(z * 0.08) * 1.45 +
        Math.sin(x * 0.17 + z * 0.13) * 0.55;

      // Rise into natural ridge around map edge
      if (distFromCenter > this.mapRadius - 8) {
        const edgeFactor = (distFromCenter - (this.mapRadius - 8)) / 12;
        h += edgeFactor * edgeFactor * 6.5;
      }
      return Math.max(-0.3, h);
    }

    buildSkyAndLights() {
      this.scene.background = new THREE.Color(0x88d4f7);
      this.scene.fog = new THREE.FogExp2(0x9be0fa, 0.0075);

      const hemiLight = new THREE.HemisphereLight(0xdff6ff, 0x3b6e2c, 0.85);
      hemiLight.position.set(0, 60, 0);
      this.scene.add(hemiLight);

      const sunLight = new THREE.DirectionalLight(0xfff4d2, 1.35);
      sunLight.position.set(42, 68, 34);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 160;
      const d = 62;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      this.scene.add(sunLight);

      // Decorative sun disc in sky
      const sunGeo = new THREE.SphereGeometry(5.5, 24, 24);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff8b8 });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.position.set(85, 110, 68);
      this.scene.add(sunMesh);
    }

    buildTerrain() {
      const size = 150;
      const segments = 110;
      const geo = new THREE.PlaneGeometry(size, size, segments, segments);
      geo.rotateX(-Math.PI / 2);

      const pos = geo.attributes.position;
      const colors = [];
      const color = new THREE.Color();

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = this.getTerrainHeight(x, z);
        pos.setY(i, y);

        const dist = Math.hypot(x, z);
        if (dist < this.pondRadius + 1.2) {
          // Sandy pond bed / shore
          color.setHSL(0.11, 0.42, 0.48 + Math.random() * 0.04);
        } else if (dist > this.mapRadius - 4) {
          // Rocky highland rim
          color.setHSL(0.26, 0.28, 0.34 + Math.random() * 0.05);
        } else {
          // Lush meadow grass variations
          const noise = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.04;
          color.setHSL(0.29 + noise, 0.62, 0.36 + y * 0.03 + Math.random() * 0.03);
        }
        colors.push(color.r, color.g, color.b);
      }

      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.02,
        flatShading: true
      });

      const terrain = new THREE.Mesh(geo, mat);
      terrain.receiveShadow = true;
      this.scene.add(terrain);
    }

    buildPond() {
      // Translucent water surface
      const waterGeo = new THREE.CircleGeometry(this.pondRadius + 1.2, 40);
      waterGeo.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x25a6d9,
        roughness: 0.18,
        metalness: 0.25,
        transparent: true,
        opacity: 0.84
      });
      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.position.y = -0.25;
      this.waterMesh.receiveShadow = true;
      this.scene.add(this.waterMesh);

      // Animated water ripple rings
      for (let i = 0; i < 3; i++) {
        const ringGeo = new THREE.RingGeometry(1.5 + i * 2.5, 1.68 + i * 2.5, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xb8f2ff,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, -0.21, 0);
        this.scene.add(ring);
        this.waterRings.push({ mesh: ring, phase: i * 2.1 });
      }

      // Lily pads & lotus blooms (also frog perches & low fruit spots)
      const padPositions = [
        { x: -4.5, z: -3.2 },
        { x: 5.2, z: -2.8 },
        { x: -2.8, z: 5.4 },
        { x: 4.4, z: 4.6 },
        { x: -7.5, z: 1.5 },
        { x: 7.8, z: -0.8 },
        { x: 0.5, z: -7.2 }
      ];

      padPositions.forEach((p, idx) => {
        const padGroup = new THREE.Group();
        const padGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.08, 18, 1, false, 0, Math.PI * 1.85);
        const padMat = new THREE.MeshStandardMaterial({
          color: 0x2f8f3a,
          roughness: 0.8
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.castShadow = true;
        pad.receiveShadow = true;
        padGroup.add(pad);

        // Add lotus flower on alternate pads
        if (idx % 2 === 0) {
          const flowerGeo = new THREE.ConeGeometry(0.45, 0.5, 7);
          const flowerMat = new THREE.MeshStandardMaterial({
            color: 0xff85c0,
            roughness: 0.4
          });
          const flower = new THREE.Mesh(flowerGeo, flowerMat);
          flower.position.y = 0.25;
          padGroup.add(flower);
        }

        padGroup.position.set(p.x, -0.2, p.z);
        padGroup.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(padGroup);
        this.lilyPads.push(padGroup);
        this.pondSpots.push(new THREE.Vector3(p.x, 0.0, p.z));

        // Pond-skimming fruit spot just above the lily pad
        this.fruitSpawnSpots.push({
          pos: new THREE.Vector3(p.x, 1.35, p.z),
          zone: 'pond'
        });
      });
    }

    buildTreesAndBushes() {
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.95 });
      const leafMats = [
        new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: 0.8, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x55a630, roughness: 0.8, flatShading: true })
      ];

      // 18 interior woodland trees
      const treeCoords = [
        [-22, -18], [20, -22], [-26, 14], [24, 18],
        [-14, -32], [15, -35], [-34, -4], [35, -6],
        [-18, 30], [19, 32], [-36, 24], [34, 28],
        [0, 24], [-38, -26], [36, -26], [2, -26],
        [-12, 16], [16, -12]
      ];

      treeCoords.forEach(([x, z], idx) => {
        const groundY = this.getTerrainHeight(x, z);
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, groundY, z);

        const scale = 0.85 + (idx % 4) * 0.16;
        const trunkHeight = 5.5 * scale;

        const trunkGeo = new THREE.CylinderGeometry(0.45 * scale, 0.78 * scale, trunkHeight, 8);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);

        // Layered canopy clusters
        const leafMat = leafMats[idx % leafMats.length];
        for (let c = 0; c < 3; c++) {
          const canopyGeo = new THREE.DodecahedronGeometry((3.2 - c * 0.55) * scale, 1);
          const canopy = new THREE.Mesh(canopyGeo, leafMat);
          canopy.position.set(
            (c === 1 ? 1.1 : c === 2 ? -1.0 : 0) * scale,
            trunkHeight + (0.8 + c * 1.45) * scale,
            (c === 1 ? 0.7 : c === 2 ? -0.8 : 0) * scale
          );
          canopy.castShadow = true;
          canopy.receiveShadow = true;
          treeGroup.add(canopy);
        }

        // Side branch with fruit spawn spot
        const branchAngle = (idx * 2.1) % (Math.PI * 2);
        const branchLen = 2.8 * scale;
        const branchGeo = new THREE.CylinderGeometry(0.14 * scale, 0.25 * scale, branchLen, 6);
        branchGeo.rotateZ(Math.PI / 2.4);
        const branch = new THREE.Mesh(branchGeo, trunkMat);
        const branchY = trunkHeight * 0.72;
        branch.position.set(
          Math.cos(branchAngle) * (branchLen * 0.45),
          branchY,
          Math.sin(branchAngle) * (branchLen * 0.45)
        );
        branch.rotation.y = -branchAngle;
        treeGroup.add(branch);

        this.scene.add(treeGroup);

        // Register tree trunk collider
        this.treeColliders.push({
          x,
          z,
          radius: 1.0 * scale,
          canopyY: groundY + trunkHeight + 2.0 * scale,
          canopyRadius: 3.4 * scale
        });

        // Register mid-air branch fruit spawn spot
        this.fruitSpawnSpots.push({
          pos: new THREE.Vector3(
            x + Math.cos(branchAngle) * (branchLen * 0.95),
            groundY + branchY + 0.65,
            z + Math.sin(branchAngle) * (branchLen * 0.95)
          ),
          zone: 'canopy'
        });
      });

      // Outer perimeter pine trees around the rim of the map
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        const r = this.mapRadius + 2 + (i % 3) * 2.5;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = this.getTerrainHeight(x, z);

        const pine = new THREE.Group();
        pine.position.set(x, y, z);
        const tGeo = new THREE.CylinderGeometry(0.4, 0.7, 4.5, 6);
        const tMesh = new THREE.Mesh(tGeo, trunkMat);
        tMesh.position.y = 2.25;
        pine.add(tMesh);

        for (let k = 0; k < 3; k++) {
          const coneGeo = new THREE.ConeGeometry(3.4 - k * 0.75, 4.5, 7);
          const cone = new THREE.Mesh(coneGeo, leafMats[k % leafMats.length]);
          cone.position.y = 4.5 + k * 2.5;
          cone.castShadow = true;
          pine.add(cone);
        }
        this.scene.add(pine);
      }

      // 24 Berry Bushes scattered across the meadow (prime low-altitude fruit spots!)
      const bushMat = new THREE.MeshStandardMaterial({
        color: 0x2b7a3d,
        roughness: 0.85,
        flatShading: true
      });

      for (let i = 0; i < 24; i++) {
        const angle = i * 0.78 + 0.3;
        const dist = 16 + (i % 5) * 7.2;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = this.getTerrainHeight(x, z);

        const bush = new THREE.Group();
        bush.position.set(x, y, z);

        for (let b = 0; b < 3; b++) {
          const r = 1.05 - b * 0.15;
          const bGeo = new THREE.DodecahedronGeometry(r, 1);
          const bMesh = new THREE.Mesh(bGeo, bushMat);
          bMesh.position.set(
            (b - 1) * 0.55,
            r * 0.75,
            (b % 2 === 0 ? 0.3 : -0.3)
          );
          bMesh.castShadow = true;
          bMesh.receiveShadow = true;
          bush.add(bMesh);
        }

        this.scene.add(bush);

        // Fruit spawns just above each berry bush
        this.fruitSpawnSpots.push({
          pos: new THREE.Vector3(x, y + 1.85, z),
          zone: 'bush'
        });
      }
    }

    buildRocksAndLogs() {
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x7b858e,
        roughness: 0.9,
        flatShading: true
      });

      const rockLocations = [
        [-15, -14], [17, 13], [-28, -16], [28, -14],
        [-22, 22], [23, -27], [-9, 29], [11, -19],
        [-31, 8], [31, 9]
      ];

      rockLocations.forEach(([x, z], idx) => {
        const y = this.getTerrainHeight(x, z);
        const scale = 1.3 + (idx % 3) * 0.45;
        const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.scale.set(1.2, 0.78, 1.05);
        rock.position.set(x, y + scale * 0.45, z);
        rock.rotation.set(idx * 0.4, idx * 1.1, 0);
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);

        const topPos = new THREE.Vector3(x, y + scale * 1.05, z);
        this.rockPerches.push(topPos);

        if (idx % 2 === 0) {
          this.fruitSpawnSpots.push({
            pos: new THREE.Vector3(x, y + scale * 1.55, z),
            zone: 'rock'
          });
        }
      });
    }

    buildFlowersAndMushrooms() {
      const petalColors = [0xff5d8f, 0xffd166, 0xb565f7, 0x4cc9f0, 0xff9f1c];
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c });

      for (let i = 0; i < 85; i++) {
        const r = 15 + Math.random() * (this.mapRadius - 18);
        const theta = Math.random() * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = this.getTerrainHeight(x, z);

        const flower = new THREE.Group();
        flower.position.set(x, y, z);

        const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.45, 5);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.22;
        flower.add(stem);

        const headGeo = new THREE.OctahedronGeometry(0.22, 0);
        const headMat = new THREE.MeshStandardMaterial({
          color: petalColors[i % petalColors.length],
          roughness: 0.4
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.scale.y = 0.55;
        head.position.y = 0.46;
        flower.add(head);

        this.scene.add(flower);
      }
    }

    buildBoundaryMarkers() {
      // Subtle glowing wind-ring boundary so the player sees the sanctuary perimeter
      const ringGeo = new THREE.RingGeometry(this.mapRadius - 0.3, this.mapRadius, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7ae582,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide
      });
      const boundaryRing = new THREE.Mesh(ringGeo, ringMat);
      boundaryRing.position.y = 1.2;
      this.scene.add(boundaryRing);
    }

    update(dt, elapsed) {
      // Animate pond ripples
      this.waterRings.forEach((r) => {
        const cycle = ((elapsed * 0.45 + r.phase) % 3.0) / 3.0;
        const s = 0.4 + cycle * 2.4;
        r.mesh.scale.set(s, 1, s);
        r.mesh.material.opacity = (1 - cycle) * 0.35;
      });
    }
  }

  window.ButterflyGame = window.ButterflyGame || {};
  window.ButterflyGame.World = World;
})();
