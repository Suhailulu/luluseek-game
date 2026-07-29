import { GameMap, Obstacle, SpecialHidingSpot } from './types';

export const MAP_WIDTH = 3600;
export const MAP_HEIGHT = 2800;
export const PLAYER_RADIUS = 16;

/**
 * UTILITY: Generate vertical and horizontal wall dividers with door openings.
 * This simplifies creating the interconnected room layout.
 */
function createRoomWalls(
  mapId: string,
  vWalls: { x: number; segments: [number, number][] }[],
  hWalls: { y: number; segments: [number, number][] }[]
): Obstacle[] {
  const walls: Obstacle[] = [];
  let idCounter = 1;

  vWalls.forEach((vw) => {
    vw.segments.forEach(([yStart, yEnd]) => {
      walls.push({
        id: `wall-${mapId}-v-${idCounter++}`,
        type: 'wall',
        x: vw.x - 15,
        y: yStart,
        width: 30,
        height: yEnd - yStart,
      });
    });
  });

  hWalls.forEach((hw) => {
    hw.segments.forEach(([xStart, xEnd]) => {
      walls.push({
        id: `wall-${mapId}-h-${idCounter++}`,
        type: 'wall',
        x: xStart,
        y: hw.y - 15,
        width: xEnd - xStart,
        height: 30,
      });
    });
  });

  return walls;
}

// ==========================================
// MAP 1: Cozy Mansion (Theme: Home / Mansion / Garden)
// ==========================================
const cozyMansionWalls = createRoomWalls(
  'cozy',
  [
    // Left Wing dividing wall (x = 750) with 3 door gaps
    {
      x: 750,
      segments: [
        [0, 200],
        [350, 750],
        [900, 1300],
        [1450, 1800],
      ],
    },
    // Right Wing dividing wall (x = 1650) with 3 door gaps
    {
      x: 1650,
      segments: [
        [0, 300],
        [450, 850],
        [1000, 1350],
        [1500, 1800],
      ],
    },
  ],
  [
    // Horizontal divider 1 (y = 600)
    {
      y: 600,
      segments: [
        [0, 300], // Door gap at 300-450 (Bathroom to Office)
        [450, 750],
        [750, 1100], // Wide arch at 1100-1300 (Kitchen to Dining/Hallway)
        [1300, 1650],
        [1650, 2000], // Door gap at 2000-2150 (Lab to Storage)
        [2150, 2400],
      ],
    },
    // Horizontal divider 2 (y = 1200)
    {
      y: 1200,
      segments: [
        [0, 250], // Door gap at 250-400 (Office to Bedroom)
        [400, 750],
        [750, 1150], // Door gap at 1150-1300 (Living to Hallway)
        [1300, 1650],
        [1650, 1950], // Door gap at 1950-2100 (Storage to Warehouse)
        [2100, 2400],
      ],
    },
  ]
);

export const sunnyMeadowSpecialHidingSpots: SpecialHidingSpot[] = [
  { id: 'spot-hollow-tree', type: 'hollow_tree', name: 'Ancient Hollow Tree', x: 450, y: 400, width: 64, height: 64 },
  { id: 'spot-cellar', type: 'cellar', name: 'Ruins Hidden Cellar', x: 3100, y: 450, width: 70, height: 70 },
  { id: 'spot-haystack', type: 'haystack', name: 'Giant Haystack', x: 550, y: 2300, width: 80, height: 80 },
  { id: 'spot-cave', type: 'cave', name: 'Canyon Cave Entrance', x: 3200, y: 2400, width: 90, height: 90 },
  { id: 'spot-locker', type: 'locker', name: 'Cabin Storage Locker', x: 3000, y: 1350, width: 60, height: 80 },
  { id: 'spot-barrel', type: 'barrel', name: 'Pond Oak Barrel', x: 400, y: 1400, width: 55, height: 55 },
];

export const sunnyMeadow: GameMap = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  specialHidingSpots: sunnyMeadowSpecialHidingSpots,
  obstacles: [
    // --- ZONE 1: CENTRAL OPEN MEADOW (x: 1200..2400, y: 933..1866)
    { id: 'm-fountain', type: 'rock', x: 1750, y: 1350, width: 100, height: 100 },
    { id: 'm-bench-1', type: 'crate', x: 1500, y: 1200, width: 90, height: 40 },
    { id: 'm-bench-2', type: 'crate', x: 2010, y: 1200, width: 90, height: 40 },
    { id: 'm-tower', type: 'tower', x: 1760, y: 1000, width: 80, height: 80 },
    { id: 'm-flower-1', type: 'bush', x: 1400, y: 1500, width: 110, height: 80 },
    { id: 'm-flower-2', type: 'bush', x: 2100, y: 1500, width: 110, height: 80 },
    { id: 'm-hay-1', type: 'haystack', x: 1350, y: 1050, width: 70, height: 70 },
    { id: 'm-hay-2', type: 'haystack', x: 2150, y: 1050, width: 70, height: 70 },

    // --- ZONE 2: DENSE FOREST (Top Left, x: 0..1200, y: 0..933)
    { id: 'f-tree-1', type: 'tree', x: 150, y: 150, width: 110, height: 110 },
    { id: 'f-tree-2', type: 'tree', x: 350, y: 120, width: 120, height: 120 },
    { id: 'f-tree-3', type: 'tree', x: 700, y: 180, width: 130, height: 130 },
    { id: 'f-tree-4', type: 'tree', x: 950, y: 150, width: 100, height: 100 },
    { id: 'f-tree-5', type: 'tree', x: 200, y: 650, width: 120, height: 120 },
    { id: 'f-tree-6', type: 'tree', x: 800, y: 600, width: 110, height: 110 },
    { id: 'f-log-1', type: 'log', x: 300, y: 320, width: 180, height: 50 },
    { id: 'f-log-2', type: 'log', x: 650, y: 480, width: 160, height: 50 },
    { id: 'f-bush-cluster-1', type: 'bush', x: 120, y: 350, width: 140, height: 140 },
    { id: 'f-bush-cluster-2', type: 'bush', x: 500, y: 600, width: 180, height: 120 },
    { id: 'f-bush-cluster-3', type: 'bush', x: 850, y: 350, width: 150, height: 110 },

    // --- ZONE 3: STONE RUINS (Top Right, x: 2400..3600, y: 0..933)
    { id: 'r-wall-1', type: 'wall', x: 2600, y: 150, width: 250, height: 40 },
    { id: 'r-wall-2', type: 'wall', x: 2600, y: 150, width: 40, height: 300 },
    { id: 'r-wall-3', type: 'wall', x: 3100, y: 200, width: 300, height: 40 },
    { id: 'r-wall-4', type: 'wall', x: 3360, y: 200, width: 40, height: 280 },
    { id: 'r-pillar-1', type: 'rock', x: 2700, y: 350, width: 60, height: 60 },
    { id: 'r-pillar-2', type: 'rock', x: 2950, y: 350, width: 60, height: 60 },
    { id: 'r-pillar-3', type: 'rock', x: 3200, y: 350, width: 60, height: 60 },
    { id: 'r-altar', type: 'rock', x: 2950, y: 150, width: 100, height: 80 },
    { id: 'r-bush-1', type: 'bush', x: 2520, y: 380, width: 120, height: 120 },
    { id: 'r-bush-2', type: 'bush', x: 3250, y: 550, width: 140, height: 100 },

    // --- ZONE 4: SMALL POND & REEDS (Mid Left, x: 0..1200, y: 933..1866)
    { id: 'p-water', type: 'water', x: 250, y: 1150, width: 450, height: 320 },
    { id: 'p-bridge', type: 'bridge', x: 420, y: 1100, width: 110, height: 420 },
    { id: 'p-reeds-1', type: 'bush', x: 180, y: 1120, width: 100, height: 180 },
    { id: 'p-reeds-2', type: 'bush', x: 680, y: 1300, width: 120, height: 160 },
    { id: 'p-rock-1', type: 'rock', x: 150, y: 1450, width: 80, height: 80 },
    { id: 'p-rock-2', type: 'rock', x: 750, y: 1100, width: 90, height: 90 },
    { id: 'p-tree-1', type: 'tree', x: 900, y: 1050, width: 110, height: 110 },
    { id: 'p-tree-2', type: 'tree', x: 900, y: 1550, width: 120, height: 120 },

    // --- ZONE 5: TALL GRASS FIELDS (Bottom Left, x: 0..1200, y: 1866..2800)
    { id: 'g-field-1', type: 'bush', x: 100, y: 2000, width: 350, height: 250 },
    { id: 'g-field-2', type: 'bush', x: 650, y: 2000, width: 400, height: 280 },
    { id: 'g-fence-1', type: 'fence', x: 100, y: 1950, width: 450, height: 30 },
    { id: 'g-fence-2', type: 'fence', x: 650, y: 1950, width: 450, height: 30 },
    { id: 'g-haystack-1', type: 'haystack', x: 200, y: 2450, width: 90, height: 90 },
    { id: 'g-cart-1', type: 'cart', x: 800, y: 2450, width: 120, height: 80 },
    { id: 'g-tree-1', type: 'tree', x: 1050, y: 2150, width: 100, height: 100 },

    // --- ZONE 6: WOODEN CABINS (Mid Right, x: 2400..3600, y: 933..1866)
    { id: 'c-cabin1-top', type: 'wall', x: 2600, y: 1050, width: 300, height: 30 },
    { id: 'c-cabin1-bot', type: 'wall', x: 2600, y: 1300, width: 180, height: 30 },
    { id: 'c-cabin1-left', type: 'wall', x: 2600, y: 1050, width: 30, height: 280 },
    { id: 'c-cabin1-right', type: 'wall', x: 2870, y: 1050, width: 30, height: 280 },
    { id: 'c-cabin2-top', type: 'wall', x: 3100, y: 1400, width: 320, height: 30 },
    { id: 'c-cabin2-left', type: 'wall', x: 3100, y: 1400, width: 30, height: 280 },
    { id: 'c-cabin2-right', type: 'wall', x: 3390, y: 1400, width: 30, height: 280 },
    { id: 'c-crates-1', type: 'crate', x: 2520, y: 1450, width: 70, height: 70 },
    { id: 'c-crates-2', type: 'crate', x: 2950, y: 1100, width: 80, height: 80 },
    { id: 'c-barrel-1', type: 'barrel', x: 3000, y: 1220, width: 50, height: 50 },

    // --- ZONE 7: MAZE-LIKE HEDGE SECTION (Bottom Center, x: 1200..2400, y: 1866..2800)
    { id: 'h-maze-1', type: 'bush', x: 1350, y: 1950, width: 400, height: 60 },
    { id: 'h-maze-2', type: 'bush', x: 1850, y: 1950, width: 400, height: 60 },
    { id: 'h-maze-3', type: 'bush', x: 1350, y: 2150, width: 60, height: 350 },
    { id: 'h-maze-4', type: 'bush', x: 1600, y: 2050, width: 60, height: 350 },
    { id: 'h-maze-5', type: 'bush', x: 1850, y: 2250, width: 60, height: 350 },
    { id: 'h-maze-6', type: 'bush', x: 2100, y: 2050, width: 60, height: 350 },
    { id: 'h-maze-7', type: 'bush', x: 1500, y: 2500, width: 500, height: 60 },
    { id: 'h-fence-m', type: 'fence', x: 1700, y: 2150, width: 200, height: 30 },

    // --- ZONE 8: ROCK CANYON (Bottom Right, x: 2400..3600, y: 1866..2800)
    { id: 'cy-wall-1', type: 'wall', x: 2500, y: 2000, width: 40, height: 600 },
    { id: 'cy-wall-2', type: 'wall', x: 2800, y: 1900, width: 400, height: 40 },
    { id: 'cy-wall-3', type: 'wall', x: 3000, y: 2150, width: 40, height: 500 },
    { id: 'cy-rock-1', type: 'rock', x: 2650, y: 2150, width: 120, height: 120 },
    { id: 'cy-rock-2', type: 'rock', x: 2650, y: 2450, width: 130, height: 130 },
    { id: 'cy-rock-3', type: 'rock', x: 3150, y: 2050, width: 140, height: 140 },
    { id: 'cy-bush-1', type: 'bush', x: 2850, y: 2400, width: 120, height: 120 },
  ],
};

// ==========================================
// MAP 2: Spooky Graveyard (Theme: Haunted Crypt / Dungeon / Maze)
// ==========================================
const spookyMansionWalls = createRoomWalls(
  'spooky',
  [
    // Left dividing walls (x = 800)
    {
      x: 800,
      segments: [
        [0, 300],
        [550, 950],
        [1150, 1800],
      ],
    },
    // Right dividing walls (x = 1600)
    {
      x: 1600,
      segments: [
        [0, 400],
        [650, 1200],
        [1400, 1800],
      ],
    },
  ],
  [
    // Horizontal divider 1 (y = 550)
    {
      y: 550,
      segments: [
        [0, 350],
        [500, 800],
        [800, 1200],
        [1400, 1600],
        [1750, 2400],
      ],
    },
    // Horizontal divider 2 (y = 1150)
    {
      y: 1150,
      segments: [
        [0, 250],
        [400, 800],
        [800, 1100],
        [1300, 1600],
        [1600, 2100],
        [2250, 2400],
      ],
    },
  ]
);

export const spookyGraveyard: GameMap = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  obstacles: [
    ...spookyMansionWalls,

    // --- AREA 1: Dark Crypt Room (Top Left)
    { id: 'spooky-crypt-tomb', type: 'rock', x: 150, y: 150, width: 160, height: 80 },
    { id: 'spooky-crypt-wall1', type: 'wall', x: 450, y: 80, width: 140, height: 50 },
    { id: 'spooky-crypt-coffin', type: 'crate', x: 500, y: 280, width: 70, height: 120 },
    { id: 'spooky-crypt-bush1', type: 'bush', x: 100, y: 380, width: 140, height: 70 },
    { id: 'spooky-crypt-barrel', type: 'barrel', x: 620, y: 100, width: 45, height: 45 },

    // --- AREA 2: Pumpkin Patch Cellar (Mid Left)
    { id: 'spooky-cellar-pump1', type: 'barrel', x: 120, y: 720, width: 50, height: 50 },
    { id: 'spooky-cellar-pump2', type: 'barrel', x: 180, y: 720, width: 50, height: 50 },
    { id: 'spooky-cellar-shrub', type: 'bush', x: 100, y: 850, width: 150, height: 100 },
    { id: 'spooky-cellar-table', type: 'crate', x: 450, y: 750, width: 120, height: 75 },
    { id: 'spooky-cellar-tree', type: 'tree', x: 580, y: 950, width: 65, height: 65 },

    // --- AREA 3: Haunted Garden Maze (Bottom Left)
    { id: 'spooky-garden-hedge1', type: 'bush', x: 120, y: 1300, width: 280, height: 80 },
    { id: 'spooky-garden-hedge2', type: 'bush', x: 400, y: 1450, width: 80, height: 260 },
    { id: 'spooky-garden-fountain', type: 'rock', x: 200, y: 1500, width: 90, height: 90 },
    { id: 'spooky-garden-dead-tree', type: 'tree', x: 600, y: 1350, width: 75, height: 75 },
    { id: 'spooky-garden-urn', type: 'barrel', x: 610, y: 1600, width: 40, height: 40 },

    // --- AREA 4: Haunted Hall (Top Center)
    { id: 'spooky-hall-carpet', type: 'bush', x: 1050, y: 180, width: 300, height: 80 }, // creepy hideable rug
    { id: 'spooky-hall-armor1', type: 'wall', x: 900, y: 80, width: 50, height: 50 },
    { id: 'spooky-hall-armor2', type: 'wall', x: 1450, y: 80, width: 50, height: 50 },
    { id: 'spooky-hall-chandelier', type: 'rock', x: 1175, y: 380, width: 50, height: 50 },

    // --- AREA 5: Grand Dining Ballroom (Center Bottom)
    { id: 'spooky-ball-table', type: 'wall', x: 1050, y: 850, width: 300, height: 110 },
    { id: 'spooky-ball-piano', type: 'wall', x: 1420, y: 1400, width: 110, height: 130 },
    { id: 'spooky-ball-curtain-l', type: 'bush', x: 820, y: 1100, width: 60, height: 160 },
    { id: 'spooky-ball-curtain-r', type: 'bush', x: 1520, y: 1100, width: 60, height: 160 },
    { id: 'spooky-ball-plant1', type: 'tree', x: 830, y: 1650, width: 60, height: 60 },
    { id: 'spooky-ball-plant2', type: 'tree', x: 1510, y: 1650, width: 60, height: 60 },

    // --- AREA 6: Laboratory & Prison Cell (Top Right)
    { id: 'spooky-lab-rack', type: 'wall', x: 1800, y: 120, width: 220, height: 50 },
    { id: 'spooky-lab-tubes', type: 'wall', x: 2180, y: 200, width: 60, height: 150 },
    { id: 'spooky-lab-hay', type: 'bush', x: 1720, y: 380, width: 110, height: 110 },
    { id: 'spooky-lab-cask', type: 'barrel', x: 2180, y: 80, width: 45, height: 45 },
    { id: 'spooky-lab-iron', type: 'crate', x: 1950, y: 440, width: 70, height: 70 },

    // --- AREA 7: Storage Basement (Mid Right)
    { id: 'spooky-bas-chest1', type: 'crate', x: 1850, y: 700, width: 80, height: 80 },
    { id: 'spooky-bas-chest2', type: 'crate', x: 2100, y: 700, width: 75, height: 75 },
    { id: 'spooky-bas-shelves', type: 'wall', x: 1850, y: 950, width: 200, height: 50 },
    { id: 'spooky-bas-barrel-stack', type: 'barrel', x: 1720, y: 880, width: 55, height: 55 },

    // --- AREA 8: Boiler / Dungeon Core (Bottom Right)
    { id: 'spooky-core-boiler', type: 'wall', x: 1900, y: 1350, width: 160, height: 160 },
    { id: 'spooky-core-coal', type: 'rock', x: 1720, y: 1350, width: 60, height: 60 },
    { id: 'spooky-core-pipes', type: 'wall', x: 1750, y: 1680, width: 250, height: 40 },
    { id: 'spooky-core-web', type: 'bush', x: 2150, y: 1550, width: 110, height: 110 }, // Hide inside giant web!
  ],
};

// ==========================================
// MAP 3: Toy Sandbox (Theme: Toy Factory / Play Center)
// ==========================================
const toyFactoryWalls = createRoomWalls(
  'toy',
  [
    // Left Wing (x = 700)
    {
      x: 700,
      segments: [
        [0, 250],
        [400, 800],
        [950, 1400],
        [1550, 1800],
      ],
    },
    // Right Wing (x = 1700)
    {
      x: 1700,
      segments: [
        [0, 300],
        [500, 900],
        [1050, 1350],
        [1500, 1800],
      ],
    },
  ],
  [
    // Horizontal divider 1 (y = 650)
    {
      y: 650,
      segments: [
        [0, 250],
        [400, 700],
        [700, 1100],
        [1300, 1700],
        [1700, 2100],
        [2200, 2400],
      ],
    },
    // Horizontal divider 2 (y = 1250)
    {
      y: 1250,
      segments: [
        [0, 300],
        [450, 700],
        [700, 1200],
        [1350, 1700],
        [1700, 2050],
        [2200, 2400],
      ],
    },
  ]
);

export const toySandbox: GameMap = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  obstacles: [
    ...toyFactoryWalls,

    // --- ROOM 1: Toddler Ballpit Room (Top Left)
    { id: 'toy-ball-pit', type: 'bush', x: 100, y: 100, width: 280, height: 280 }, // Huge hideable ballpit!
    { id: 'toy-ball-shelf', type: 'wall', x: 450, y: 80, width: 180, height: 50 },
    { id: 'toy-ball-block1', type: 'crate', x: 480, y: 220, width: 60, height: 60 },
    { id: 'toy-ball-block2', type: 'crate', x: 550, y: 220, width: 60, height: 60 },
    { id: 'toy-ball-can', type: 'barrel', x: 100, y: 480, width: 45, height: 45 },

    // --- ROOM 2: Sandbox & Slide (Mid Left)
    { id: 'toy-sand-slide', type: 'wall', x: 150, y: 800, width: 220, height: 80 },
    { id: 'toy-sand-castle', type: 'rock', x: 480, y: 750, width: 100, height: 100 },
    { id: 'toy-sand-tire', type: 'barrel', x: 200, y: 980, width: 55, height: 55 },
    { id: 'toy-sand-foam1', type: 'bush', x: 80, y: 1050, width: 120, height: 80 },
    { id: 'toy-sand-palm', type: 'tree', x: 550, y: 1050, width: 70, height: 70 },

    // --- ROOM 3: Crayon Storage & Art (Bottom Left)
    { id: 'toy-crayon-shelf1', type: 'wall', x: 80, y: 1350, width: 160, height: 50 },
    { id: 'toy-crayon-shelf2', type: 'wall', x: 300, y: 1350, width: 160, height: 50 },
    { id: 'toy-crayon-box1', type: 'crate', x: 120, y: 1550, width: 75, height: 75 },
    { id: 'toy-crayon-box2', type: 'crate', x: 210, y: 1550, width: 75, height: 75 },
    { id: 'toy-crayon-waste', type: 'barrel', x: 550, y: 1600, width: 45, height: 45 },
    { id: 'toy-crayon-bean', type: 'bush', x: 450, y: 1450, width: 90, height: 90 },

    // --- ROOM 4: Assembly Lines (Top Center)
    { id: 'toy-assem-convey', type: 'wall', x: 850, y: 200, width: 400, height: 80 },
    { id: 'toy-assem-robot', type: 'wall', x: 1350, y: 150, width: 110, height: 110 },
    { id: 'toy-assem-crate1', type: 'crate', x: 850, y: 440, width: 85, height: 85 },
    { id: 'toy-assem-crate2', type: 'crate', x: 960, y: 440, width: 80, height: 80 },
    { id: 'toy-assem-drum', type: 'barrel', x: 1450, y: 450, width: 50, height: 50 },

    // --- ROOM 5: Giant Play Maze & Blocks (Center Bottom)
    { id: 'toy-maze-blockA', type: 'crate', x: 900, y: 850, width: 120, height: 120 }, // Block A
    { id: 'toy-maze-blockB', type: 'crate', x: 1300, y: 850, width: 120, height: 120 }, // Block B
    { id: 'toy-maze-lego1', type: 'wall', x: 1100, y: 700, width: 140, height: 50 },
    { id: 'toy-maze-lego2', type: 'wall', x: 1100, y: 1050, width: 140, height: 50 },
    { id: 'toy-maze-tunnel', type: 'bush', x: 1080, y: 860, width: 180, height: 100 }, // Tube Tunnel!
    { id: 'toy-maze-balloon1', type: 'tree', x: 800, y: 1600, width: 60, height: 60 },
    { id: 'toy-maze-balloon2', type: 'tree', x: 1550, y: 1600, width: 60, height: 60 },

    // --- ROOM 6: Quality Assurance Lab (Top Right)
    { id: 'toy-qa-desk1', type: 'wall', x: 1850, y: 120, width: 220, height: 60 },
    { id: 'toy-qa-desk2', type: 'wall', x: 1850, y: 350, width: 220, height: 60 },
    { id: 'toy-qa-tester', type: 'wall', x: 2180, y: 180, width: 60, height: 180 },
    { id: 'toy-qa-foam', type: 'bush', x: 1750, y: 480, width: 110, height: 90 },
    { id: 'toy-qa-cylinder', type: 'barrel', x: 2180, y: 80, width: 45, height: 45 },

    // --- ROOM 7: Storage Racks (Mid Right)
    { id: 'toy-store-shelf1', type: 'wall', x: 1900, y: 700, width: 180, height: 55 },
    { id: 'toy-store-shelf2', type: 'wall', x: 1900, y: 1100, width: 180, height: 55 },
    { id: 'toy-store-crate1', type: 'crate', x: 1750, y: 850, width: 75, height: 75 },
    { id: 'toy-store-crate2', type: 'crate', x: 2180, y: 850, width: 75, height: 75 },
    { id: 'toy-store-barrel', type: 'barrel', x: 2050, y: 880, width: 50, height: 50 },

    // --- ROOM 8: Warehouse Shipping Dock (Bottom Right)
    { id: 'toy-ship-convey', type: 'wall', x: 1850, y: 1400, width: 250, height: 75 },
    { id: 'toy-ship-stack1', type: 'crate', x: 1750, y: 1600, width: 110, height: 110 },
    { id: 'toy-ship-stack2', type: 'crate', x: 2100, y: 1600, width: 110, height: 110 },
    { id: 'toy-ship-pile', type: 'bush', x: 1950, y: 1550, width: 100, height: 100 },
  ],
};

export const defaultMap = sunnyMeadow;

// Dynamic map getter
export function getMapById(mapId?: string): GameMap {
  if (mapId === 'graveyard') return spookyGraveyard;
  if (mapId === 'toybox') return toySandbox;
  return sunnyMeadow;
}

// Check if a point is inside a rectangle
export function isPointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// Circle to AABB (Axis-Aligned Bounding Box) collision check
export function circleCollidesWithRect(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));

  const distanceX = cx - closestX;
  const distanceY = cy - closestY;
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;

  return distanceSquared < radius * radius;
}

interface SpatialGrid {
  cellSize: number;
  cols: number;
  rows: number;
  solidCells: Obstacle[][][];
  bushCells: Obstacle[][][];
}

const mapGrids = new Map<string, SpatialGrid>();

function getMapGrid(map: GameMap): SpatialGrid {
  const cacheKey = map.obstacles.length > 0 ? (map.obstacles[0].id + '_' + map.obstacles.length) : 'empty';
  
  let grid = mapGrids.get(cacheKey);
  if (!grid) {
    const cellSize = 120;
    const cols = Math.ceil(map.width / cellSize);
    const rows = Math.ceil(map.height / cellSize);
    
    const solidCells: Obstacle[][][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => [])
    );
    const bushCells: Obstacle[][][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => [])
    );
    
    for (const obs of map.obstacles) {
      const minX = obs.x;
      const maxX = obs.x + obs.width;
      const minY = obs.y;
      const maxY = obs.y + obs.height;
      
      const colStart = Math.max(0, Math.floor(minX / cellSize));
      const colEnd = Math.min(cols - 1, Math.floor(maxX / cellSize));
      const rowStart = Math.max(0, Math.floor(minY / cellSize));
      const rowEnd = Math.min(rows - 1, Math.floor(maxY / cellSize));
      
      for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
          if (obs.type === 'bush') {
            bushCells[r][c].push(obs);
          } else {
            solidCells[r][c].push(obs);
          }
        }
      }
    }
    
    grid = { cellSize, cols, rows, solidCells, bushCells };
    mapGrids.set(cacheKey, grid);
  }
  return grid;
}

// Check player collision with any solid obstacles on the map
export function checkCollision(x: number, y: number, radius: number = PLAYER_RADIUS, map: GameMap = defaultMap): { collided: boolean, normalX?: number, normalY?: number } {
  // Screen boundary checks
  if (x - radius < 0) return { collided: true, normalX: 1, normalY: 0 };
  if (x + radius > map.width) return { collided: true, normalX: -1, normalY: 0 };
  if (y - radius < 0) return { collided: true, normalX: 0, normalY: 1 };
  if (y + radius > map.height) return { collided: true, normalX: 0, normalY: -1 };

  const grid = getMapGrid(map);
  const minX = x - radius;
  const maxX = x + radius;
  const minY = y - radius;
  const maxY = y + radius;

  const colStart = Math.max(0, Math.floor(minX / grid.cellSize));
  const colEnd = Math.min(grid.cols - 1, Math.floor(maxX / grid.cellSize));
  const rowStart = Math.max(0, Math.floor(minY / grid.cellSize));
  const rowEnd = Math.min(grid.rows - 1, Math.floor(maxY / grid.cellSize));

  const checkedIds: string[] = [];

  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      const obstacles = grid.solidCells[r][c];
      for (const obs of obstacles) {
        if (checkedIds.includes(obs.id)) continue;
        checkedIds.push(obs.id);

        if (
          obs.type === 'wall' ||
          obs.type === 'crate' ||
          obs.type === 'fence' ||
          obs.type === 'cart' ||
          obs.type === 'haystack'
        ) {
          if (circleCollidesWithRect(x, y, radius, obs.x, obs.y, obs.width, obs.height)) {
            const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
            const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));
            const normalX = x - closestX;
            const normalY = y - closestY;
            const distSq = normalX * normalX + normalY * normalY;
            const dist = distSq > 0 ? Math.sqrt(distSq) : 0;
            return { 
              collided: true, 
              normalX: dist > 0 ? normalX / dist : 0, 
              normalY: dist > 0 ? normalY / dist : 0 
            };
          }
        } else if (
          obs.type === 'tree' ||
          obs.type === 'rock' ||
          obs.type === 'barrel' ||
          obs.type === 'log' ||
          obs.type === 'tower'
        ) {
          const treeCenterX = obs.x + obs.width / 2;
          const treeCenterY = obs.y + obs.height / 2;
          const treeRadius = obs.width / 2;

          const dx = x - treeCenterX;
          const dy = y - treeCenterY;
          const distSq = dx * dx + dy * dy;
          const sumRadius = radius + treeRadius;

          if (distSq < sumRadius * sumRadius) {
            const distance = distSq > 0 ? Math.sqrt(distSq) : 0;
            return {
              collided: true,
              normalX: distance > 0 ? dx / distance : 0,
              normalY: distance > 0 ? dy / distance : 0
            };
          }
        }
      }
    }
  }

  return { collided: false };
}

// Check if a player is hiding in any bush
export function getHidingBushId(x: number, y: number, radius: number = PLAYER_RADIUS, map: GameMap = defaultMap): string | null {
  const grid = getMapGrid(map);
  const minX = x - radius;
  const maxX = x + radius;
  const minY = y - radius;
  const maxY = y + radius;

  const colStart = Math.max(0, Math.floor(minX / grid.cellSize));
  const colEnd = Math.min(grid.cols - 1, Math.floor(maxX / grid.cellSize));
  const rowStart = Math.max(0, Math.floor(minY / grid.cellSize));
  const rowEnd = Math.min(grid.rows - 1, Math.floor(maxY / grid.cellSize));

  const checkedIds: string[] = [];

  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      const obstacles = grid.bushCells[r][c];
      for (const obs of obstacles) {
        if (checkedIds.includes(obs.id)) continue;
        checkedIds.push(obs.id);

        if (circleCollidesWithRect(x, y, radius - 4, obs.x, obs.y, obs.width, obs.height)) {
          return obs.id;
        }
      }
    }
  }
  return null;
}

// Slide player movement when colliding
export function moveWithCollision(
  currX: number,
  currY: number,
  dx: number,
  dy: number,
  radius: number = PLAYER_RADIUS,
  map: GameMap = defaultMap
): { x: number; y: number } {
  const targetX = currX + dx;
  const targetY = currY + dy;

  // Try moving fully
  const fullCollision = checkCollision(targetX, targetY, radius, map);
  if (!fullCollision.collided) {
    return { x: targetX, y: targetY };
  }

  // If collided, try moving along X axis only
  const xCollision = checkCollision(targetX, currY, radius, map);
  if (!xCollision.collided) {
    return { x: targetX, y: currY };
  }

  // Try moving along Y axis only
  const yCollision = checkCollision(currX, targetY, radius, map);
  if (!yCollision.collided) {
    return { x: currX, y: targetY };
  }

  // If both blocked, stay in place
  return { x: currX, y: currY };
}
