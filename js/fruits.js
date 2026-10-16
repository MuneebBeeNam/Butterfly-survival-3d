// 3D Small Fruits System (Wild Berries, Dew Blueberries, and Golden Sun-Berries)
(function () {
  const FRUIT_TYPES = {
    raspberry: {
      name: 'Wild Berry',
      color: 0xff2a55,
      emissive: 0x7a001e,
      fuel: 25,
      score: 100,
      isGolden: false
    },
    blueberry: {
      name: 'Dewberry Cluster',
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      fuel: 32,
      score: 150,
      isGolden: false
    },
    golden: {
      name: 'Golden Sun-Berry',
      color: 0xffd700,
      emissive: 0xb45309,
      fuel: 55,
      score: 300,
      isGolden: true
    }
  };

  class FruitManager {
    constructor(scene, world, particles) {
      this.scene = scene;
      this.world = world;
      this.particles = particles;
      this.fruits = [];
      this.maxActiveFruits = 18;
      this.spawnTimer = 0;

      this.leafMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.5
      });
    }

    reset() {
      this.fruits.forEach((f) => this.scene.remove(f.group));
      this.fruits = [];
      for (let i = 0; i < this.maxActiveFruits; i++) {
        this.spawnFruit();
      }
    }

    createFruitMesh(typeKey) {
      const spec = FRUIT_TYPES[typeKey];
      const group = new THREE.Group();

      const bodyMat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.emissive,
        emissiveIntensity: spec.isGolden ? 0.65 : 0.35,
        roughness: 0.25,
        metalness: spec.isGolden ? 0.5 : 0.1
      });

      if (typeKey === 'raspberry') {
        // Multi-drupelet berry shape
        const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), bodyMat);
        core.scale.set(1, 1.2, 1);
        group.add(core);
      } else if (typeKey === 'blueberry') {
        // Trio of plump small blueberries
        const offsets = [
          [0, 0.08, 0],
          [-0.22, -0.1, 0.16],
          [0.22, -0.1, -0.14]
        ];
        offsets.forEach(([ox, oy, oz]) => {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), bodyMat);
          b.position.set(ox, oy, oz);
          group.add(b);
        });
      } else {
        // Golden Star-Berry with glowing halo ring
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 1), bodyMat);
        group.add(star);

        const ringGeo = new THREE.RingGeometry(0.62, 0.74, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfff3a1,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);
      }

      // Little green calyx leaf crown on top
      const crownGeo = new THREE.ConeGeometry(0.28, 0.22, 5);
      const crown = new THREE.Mesh(crownGeo, this.leafMat);
      crown.position.y = 0.45;
      crown.rotation.x = Math.PI;
      group.add(crown);

      // Subtle vertical beacon beam so fruits are visible across bushes & branches
      const beamGeo = new THREE.CylinderGeometry(0.06, 0.26, 3.2, 8, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: spec.isGolden ? 0.28 : 0.15,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 1.4;
      group.add(beam);

      return group;
    }

    spawnFruit() {
      if (this.fruits.length >= this.maxActiveFruits) return;

      // Find unoccupied spawn spots from world bushes, branches, rocks, and pond pads
      const usedSpots = new Set(this.fruits.map((f) => f.spotIndex));
      const availableIndices = [];
      for (let i = 0; i < this.world.fruitSpawnSpots.length; i++) {
        if (!usedSpots.has(i)) availableIndices.push(i);
      }
      if (availableIndices.length === 0) return;

      const spotIndex =
        availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const spot = this.world.fruitSpawnSpots[spotIndex];

      // Determine fruit type based on zone & rarity
      const roll = Math.random();
      let typeKey = 'raspberry';
      if (roll < 0.13) {
        typeKey = 'golden';
      } else if (roll < 0.48 || spot.zone === 'pond') {
        typeKey = 'blueberry';
      }

      const group = this.createFruitMesh(typeKey);
      group.position.copy(spot.pos);
      this.scene.add(group);

      this.fruits.push({
        typeKey,
        spec: FRUIT_TYPES[typeKey],
        group,
        basePos: spot.pos.clone(),
        spotIndex,
        phase: Math.random() * Math.PI * 2
      });
    }

    update(dt, elapsed, butterfly, onCollectCallback) {
      // Periodically replenish eaten fruits
      this.spawnTimer += dt;
      if (this.spawnTimer > 1.8 && this.fruits.length < this.maxActiveFruits) {
        this.spawnTimer = 0;
        this.spawnFruit();
      }

      const magnetRadius = butterfly.nectarRushTimer > 0 ? 6.5 : 3.1;
      const eatRadius = 1.55;

      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const f = this.fruits[i];

        // Gentle bobbing & spinning
        f.group.rotation.y += dt * (f.spec.isGolden ? 2.6 : 1.5);
        const bobOffset = Math.sin(elapsed * 3.0 + f.phase) * 0.22;

        const dist = f.group.position.distanceTo(butterfly.position);

        if (dist < magnetRadius) {
          // Pull fruit smoothly toward the butterfly's proboscis!
          const pullStrength = (1 - dist / magnetRadius) * 14 * dt;
          f.group.position.lerp(butterfly.position, Math.min(1, pullStrength));
        } else {
          f.group.position.x = THREE.MathUtils.lerp(f.group.position.x, f.basePos.x, dt * 4);
          f.group.position.y = THREE.MathUtils.lerp(
            f.group.position.y,
            f.basePos.y + bobOffset,
            dt * 4
          );
          f.group.position.z = THREE.MathUtils.lerp(f.group.position.z, f.basePos.z, dt * 4);
        }

        if (dist < eatRadius) {
          // Butterfly eats the fruit!
          butterfly.eatFruit(f.spec.fuel, f.spec.isGolden);
          this.particles.spawnBurst(
            f.group.position,
            f.spec.color,
            f.spec.isGolden ? 28 : 16,
            6.5,
            0.9
          );
          this.scene.remove(f.group);
          this.fruits.splice(i, 1);

          if (onCollectCallback) {
            onCollectCallback(f.spec);
          }
        }
      }
    }
  }

  window.ButterflyGame = window.ButterflyGame || {};
  window.ButterflyGame.FruitManager = FruitManager;
})();
