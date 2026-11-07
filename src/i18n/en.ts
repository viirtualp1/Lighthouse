export default {
  resources: {
    oil: 'Oil',
    fish: 'Fish',
    wood: 'Wood',
    iron: 'Iron'
  },
  buildings: {
    lighthouse: { name: 'Lighthouse', hint: 'Without two keepers its light is shorter' },
    hut: { name: 'Hut', hint: 'Shelter for 5 people' },
    dock: { name: 'Dock', hint: '+1 fish per hour per worker. Shore only' },
    renderer: { name: 'Rendery', hint: '2 fish → 1 oil per hour per worker' },
    oilCollector: { name: 'Oil Collector', hint: '+0.5 oil per hour per worker. Oil pools only' },
    driftwood: { name: 'Driftwood Yard', hint: '+1 wood per hour per worker. Shore only' },
    salvage: { name: 'Salvage', hint: '+0.5 iron per hour per worker. Wrecks only' },
    infirmary: { name: 'Infirmary', hint: 'Heals one sick person every 6 hours' },
    chapel: { name: 'Chapel', hint: '−1 Fear per hour, day and night' },
    lantern: { name: 'Lantern', hint: 'A small circle of light, 0.2 oil per hour at night' }
  },
  modes: {
    circle: { name: 'Circle', hint: 'Even light over three rings around the Lighthouse' },
    beam: { name: 'Beam', hint: 'A narrow far-reaching beam; only one ring stays lit near the Lighthouse' },
    boost: { name: 'Boost', hint: 'Light over five rings, but oil burns three times faster' },
    off: { name: 'Off', hint: 'Saves oil; everything goes dark' }
  },
  phase: {
    day: 'Day',
    dusk: 'Dusk',
    night: 'Night'
  },
  top: {
    clock: 'Time of day: the black arc is night, the grey one is dusk',
    of: 'of {total}',
    untilNight: '{h}h until night',
    untilDawn: '{h}h until dawn',
    nightLength: 'night {h}h',
    pause: 'Pause · Space',
    speed: 'Speed ×{n} · key {n}'
  },
  fear: {
    rising: 'rising {n}/h',
    falling: 'easing {n}/h',
    title: 'Fear',
    calm: 'Calm',
    uneasy: 'Uneasy',
    strike: 'Work falters',
    flee: 'People flee',
    tooltip: 'Fear: at 50 people work worse, at 75 they walk into the dark, at 100 the town is lost'
  },
  lighthouse: {
    title: 'Lighthouse',
    oilPerHour: 'oil/h',
    aim: 'Aim',
    rotateLeft: 'Rotate left · Q',
    rotateRight: 'Rotate right · E',
    nightsAhead: 'Nights ahead · oil needed',
    forecast: 'Day {day}: {h}h night, needs {oil} oil',
    keepers: 'Keepers',
    reachFull: 'Light at full strength',
    reachShort: 'Light 40% shorter',
    lens: 'Lens · {n} iron',
    lensHint: 'The light reaches one ring further for the same oil'
  },
  supplies: {
    sourceBeam: 'Lighthouse',
    sourceLanterns: 'Lanterns',
    eaten: 'Eaten at dawn',
    steady: 'Not changing right now',
    title: 'Supplies',
    town: 'Town',
    people: 'Residents',
    beds: 'Beds',
    sick: 'Sick',
    idle: '{n} idle',
    outside: '{n} outside',
    perHour: '/h'
  },
  build: {
    groups: {
      home: 'Shelter',
      food: 'Food & oil',
      materials: 'Materials',
      care: 'Light & care'
    },
    upTo: 'up to {n} workers'
  },
  card: {
    residents: 'Residents',
    inShadowHome: 'In the Shadow — residents are being taken',
    dimHome: 'Dim light — residents are afraid',
    output: 'Output now',
    efficiency: 'Efficiency',
    effLight: 'light',
    effFear: 'fear',
    healing: 'Heals the sick: {n} waiting',
    calming: 'Calms the town: −1 Fear per hour',
    calmingIdle: 'Needs a worker to calm the town',
    nothing: 'Idle — no workers',
    workers: 'Workers',
    free: '{n} free',
    close: 'Close',
    inShadow: 'In the Shadow — work stops, people are taken',
    dim: 'Dim light — work at half speed',
    wreckLeft: 'Iron left in the wreck: {n}',
    demolish: 'Demolish'
  },
  alerts: {
    oil: 'Not enough oil for the night: need {need}, have {have}',
    oilAction: 'Oil',
    fish: 'Not enough fish by dawn: need {n}',
    fishAction: 'Dock',
    keepers: 'The Lighthouse lacks two keepers — light is shorter',
    keepersAction: 'Assign',
    exposed: 'People working in the Shadow: {n}',
    exposedAction: 'Show',
    homeless: 'Sleeping outside: {n} — they fear the most',
    homelessAction: 'Hut',
    idle: 'Idle: {n}',
    idleAction: 'Assign',
    sick: 'Sick without an infirmary: {n}',
    sickAction: 'Infirmary',
    fear: 'Fear is high — people work worse',
    fearAction: 'Chapel'
  },
  map: {
    noWorkers: 'No workers — not producing',
    aimHint: 'Click where the beam should point · Q / E to rotate · RMB to cancel',
    placeHint: 'Pick a spot for the {building} — suitable spots are marked with dots · RMB to cancel',
    freeSpot: 'Empty spot',
    oilPool: 'Oil pool',
    oilPoolHint: 'An oil collector can stand here',
    wreck: 'Shipwreck',
    wreckHint: 'Iron: {n} · for salvage',
    shore: 'Shore — fits a dock or a driftwood yard',
    workers: 'Workers {n} of {max}',
    inShadow: 'In the Shadow — not working',
    dim: 'Dim — half speed',
    manage: 'Click to manage',
    shadowHere: 'The Shadow stands here',
    lit: 'In the Lighthouse light',
    dimNow: 'Dim',
    dark: 'Dark',
    clickToBuild: 'Click to build'
  },
  risk: {
    dimHome: 'At night: dim — residents will be afraid',
    darkHome: 'At night the Shadow will stand here — residents will be taken',
    lit: 'At night: in the Lighthouse light — safe',
    dim: 'At night: dim — work at half speed, residents are afraid',
    dark: 'At night the Shadow will stand here — work stops, people get taken'
  },
  place: {
    invalid: 'You can’t build here',
    taken: 'The spot is taken',
    shoreOnly: 'Shore only',
    oilOnly: 'Oil pools only',
    wreckOnly: 'Wrecks only',
    landOnly: 'This spot is for extraction only',
    limit: 'Only one can be built',
    cost: 'Not enough resources'
  },
  log: {
    built: 'Built: {building}',
    demolished: 'Demolished: {building}',
    lens: 'The Lens is on: the light reaches further',
    oilOut: 'Oil ran out. The Lighthouse went dark',
    takenOne: 'The Shadow took a person',
    takenMany: 'The Shadow took {n} people',
    died: 'Died of hunger and sickness: {n}',
    deserted: 'Walked into the dark from fear: {n}',
    dusk: 'Dusk. The night lasts {h}h — the Shadow creeps in from the edges',
    night: 'Night. The Shadow stands wherever there is no light'
  },
  banner: {
    duskTitle: 'Dusk',
    duskText: 'Night {day} lasts {h}h. The Shadow creeps in',
    nightTitle: 'Night {day}',
    nightText: 'The Shadow stands wherever there is no light',
    oilOutTitle: 'The Lighthouse is out',
    oilOutText: 'The oil has run dry',
    dayTitle: 'Day {day}',
    dayText: 'Nights left: {n}'
  },
  dawn: {
    behind: 'Night {n} is over',
    title: 'Dawn',
    town: 'People in town: {n}',
    eaten: 'Fish eaten',
    hungry: 'Went hungry',
    gotSick: 'Fell sick',
    recovered: 'Recovered',
    vanished: 'Taken by the Shadow',
    deserted: 'Fled in fear',
    died: 'Died',
    nextNight: 'Next night',
    oilNeeded: 'Oil the Lighthouse needs',
    hours: '{h}h',
    button: 'Greet the day'
  },
  end: {
    day: 'Day {n}',
    won: 'The light held',
    lost: 'Darkness won',
    wonReason: 'You saw the dawn of day {day}. {n} people survived.',
    fearReason: 'Fear reached its peak. People scattered, and the Shadow took the town.',
    popReason: 'Fewer than {n} people are left in town.',
    restart: 'Start over'
  },
  menu: {
    label: 'Menu',
    open: 'Menu · Esc',
    title: 'Paused',
    day: 'Day {day} of {total}',
    resume: 'Resume',
    tutorial: 'Tutorial',
    controls: 'Controls',
    volume: 'Volume',
    language: 'Language',
    restart: 'Start over',
    confirmRestart: 'Sure? Progress will be lost',
    back: 'Back',
    sound: 'Sound',
    keys: {
      pause: 'Pause',
      speed: 'Speed',
      rotate: 'Rotate the beam',
      zoom: 'Zoom the map',
      pan: 'Move the map',
      cancel: 'Cancel building',
      escape: 'Back · menu'
    },
    keyNames: {
      space: 'Space',
      wheel: 'Wheel',
      drag: 'Drag',
      rmb: 'RMB'
    }
  },
  tutorial: {
    label: 'Tutorial · {n}/{total}',
    skip: 'Skip',
    next: 'Next',
    play: 'Play',
    waiting: 'Waiting for you…',
    steps: {
      intro: {
        title: 'The Long Night',
        text: 'The sun no longer rises as it used to. The last people gathered at the old Lighthouse. Your task is to hold out for 20 nights.'
      },
      lighthouse: {
        title: 'The Lighthouse',
        text: 'The Lighthouse is the only light. At night the Shadow comes from the edges and fills everything its light can’t reach. It takes anyone left inside. The light burns oil.'
      },
      clock: {
        title: 'Time',
        text: 'The clock shows the time of day. The black arc is night, the grey one is dusk. Every day the night grows longer.'
      },
      workers: {
        title: 'People',
        text: 'The dots under a building are its workplaces; a crossed-out figure above it means nobody works there. Click the dock and add workers: fish feeds the town every morning.',
        task: 'Put 5 workers on the dock'
      },
      hut: {
        title: 'Shelter',
        text: 'Not everyone found a place in the huts. Those sleeping outside are the most afraid at night. Build a hut close to the Lighthouse — it’s brighter there.',
        task: 'Build a hut'
      },
      renderer: {
        title: 'Oil',
        text: 'The rendery turns fish into oil. Build one and give it workers — without oil the Lighthouse goes dark.',
        task: 'Build a rendery and staff it'
      },
      forecast: {
        title: 'Forecast',
        text: 'The bars are the coming nights. The number above each is how much oil the Lighthouse will burn. A red number means you won’t have enough.'
      },
      modes: {
        title: 'Light modes',
        text: 'Circle lights the town evenly. Beam reaches far, but in one direction. Boost lights wider but burns oil three times faster. By day the map shows where tonight’s light will reach, and a moon above a building warns it will be in the dark.'
      },
      fear: {
        title: 'Fear',
        text: 'Fear grows when people sit in the dark at night. From 50 they work worse, from 75 they walk into the dark, at 100 the town is lost. Fear eases by day.'
      },
      alerts: {
        title: 'Advice',
        text: 'Problems that need attention appear on the right. Click any of them and the game shows what to do.'
      },
      done: {
        title: 'Good luck',
        text: 'Space pauses, 1–3 set the speed, the wheel zooms, dragging moves the map, Esc opens the menu. The first night starts at 23:00.'
      }
    }
  }
};
