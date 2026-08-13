/**
 * Builder Title Generator — HH Goa 2026
 * Deterministic keyword → title mapping.
 * Same input always produces the same title (hash-based selection).
 */

const KEYWORD_TITLES = [
  // Multi-word keywords first (longest match wins)
  ['machine learning', ['Neural Pioneer', 'ML Maven', 'Pattern Prophet']],
  ['deep learning',    ['Deep Learning Voyager', 'Neural Network Whisperer']],
  ['data science',     ['Data Sage', 'Insight Architect', 'Analytics Ace']],
  ['react native',     ['Bridge Builder', 'Cross-Platform Crusader']],
  ['full-stack',       ['Full-Stack Maverick', 'Polyglot Builder', 'End-to-End Engineer']],
  ['fullstack',        ['Full-Stack Maverick', 'Polyglot Builder', 'End-to-End Engineer']],
  ['full stack',       ['Full-Stack Maverick', 'Polyglot Builder', 'End-to-End Engineer']],
  ['smart contract',   ['Smart Contract Sage', 'On-Chain Architect']],
  ['game dev',         ['Game Engine Guru', 'Virtual World Builder']],
  ['open source',      ['Open Source Champion', 'Community Builder']],
  ['cyber security',   ['Security Sentinel', 'Cyber Shield']],
  ['computer vision',  ['Vision Engineer', 'Pixel Prophet']],

  // Single keywords
  ['react',      ['Interface Alchemist', 'Component Architect', 'React Ronin']],
  ['vue',        ['Reactive Virtuoso', 'Vue Voyager', 'Frontend Artisan']],
  ['angular',    ['Angular Ace', 'TypeScript Titan']],
  ['svelte',     ['Svelte Surgeon', 'Lean UI Builder']],
  ['nextjs',     ['SSR Sorcerer', 'Next-Gen Builder']],
  ['next.js',    ['SSR Sorcerer', 'Next-Gen Builder']],
  ['frontend',   ['Pixel Architect', 'Interface Alchemist', 'UI Engineer']],
  ['front-end',  ['Pixel Architect', 'Interface Alchemist']],

  ['node',       ['Backend Forge Master', 'Node Ninja', 'Server-Side Striker']],
  ['express',    ['API Artisan', 'Route Runner']],
  ['backend',    ['Backend Forge Master', 'Server Sage']],
  ['back-end',   ['Backend Forge Master', 'Server Sage']],
  ['api',        ['API Artisan', 'Endpoint Engineer']],
  ['graphql',    ['Graph Guru', 'Query Architect']],

  ['python',     ['Pythonic Engineer', 'Script Sorcerer', 'Snake Charmer']],
  ['django',     ['Django Dynamo', 'Pythonic Engineer']],
  ['flask',      ['Flask Forger', 'Micro-Service Maverick']],
  ['fastapi',    ['Async Architect', 'API Speedster']],

  ['java',       ['Native Systems Builder', 'Java Juggernaut']],
  ['android',    ['Droid Architect', 'Native Systems Builder', 'Mobile Maverick']],
  ['kotlin',     ['Kotlin Knight', 'Android Artisan']],
  ['ios',        ['Cupertino Craftsman', 'Swift Striker']],
  ['swift',      ['Swift Striker', 'Cupertino Craftsman']],
  ['flutter',    ['Cross-Platform Crusader', 'Widget Wizard']],
  ['mobile',     ['Mobile Maverick', 'App Architect']],

  ['ml',         ['Neural Pioneer', 'Data Sage', 'ML Maven']],
  ['ai',         ['AI Architect', 'Neural Pioneer', 'Intelligence Engineer']],
  ['nlp',        ['Language Model Artisan', 'NLP Navigator']],
  ['llm',        ['LLM Whisperer', 'Prompt Architect']],
  ['genai',      ['Generative AI Pioneer', 'Creation Engine Builder']],

  ['blockchain', ['Chain Architect', 'Decentralized Builder']],
  ['web3',       ['Web3 Weaver', 'Chain Architect']],
  ['solidity',   ['Smart Contract Sage', 'Solidity Sorcerer']],
  ['crypto',     ['Decentralized Builder', 'Crypto Constructor']],
  ['defi',       ['DeFi Architect', 'Protocol Pioneer']],

  ['devops',     ['Cloud Wrangler', 'Pipeline Pioneer']],
  ['cloud',      ['Cloud Wrangler', 'Infra Architect']],
  ['aws',        ['Cloud Wrangler', 'AWS Ace']],
  ['docker',     ['Container Captain', 'Infra Architect']],
  ['kubernetes', ['Orchestration Oracle', 'K8s Commander']],
  ['infra',      ['Infra Architect', 'Platform Pioneer']],

  ['design',     ['Experience Designer', 'Visual Systems Thinker']],
  ['ui',         ['Interface Artisan', 'Visual Systems Thinker']],
  ['ux',         ['Experience Architect', 'Human-Centered Builder']],
  ['figma',      ['Design Systems Thinker', 'Pixel Perfectionist']],
  ['product',    ['Product Architect', 'Builder-PM Hybrid']],

  ['rust',       ['Rust Revolutionary', 'Memory-Safe Maverick']],
  ['golang',     ['Gopher Guru', 'Concurrent Commander']],
  ['c++',        ['Systems Sage', 'Low-Level Legend']],
  ['embedded',   ['Embedded Engineer', 'Hardware Whisperer']],
  ['iot',        ['IoT Innovator', 'Connected Systems Builder']],
  ['security',   ['Security Sentinel', 'Cyber Shield']],
  ['game',       ['Game Engine Guru', 'Virtual World Builder']],
  ['robotics',   ['Robotics Engineer', 'Mech-Code Hybrid']],
  ['hardware',   ['Hardware Hacker', 'Silicon Whisperer']],
  ['ar',         ['Reality Architect', 'Spatial Computing Pioneer']],
  ['vr',         ['Virtual Reality Builder', 'Immersive Engineer']],
];

const FALLBACK_TITLES = [
  'Builder Extraordinaire',
  'Code Voyager',
  'Digital Craftsman',
  'Tech Trailblazer',
  'Innovation Architect',
  'Hackathon Warrior',
  'Systems Thinker',
];

/**
 * Simple deterministic hash for strings.
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a builder title from a stack/role string.
 * Deterministic: same input → same output.
 */
function generateBuilderTitle(stackRole) {
  if (!stackRole || !stackRole.trim()) return 'Builder Extraordinaire';
  const input = stackRole.toLowerCase().trim();

  for (const [keyword, titles] of KEYWORD_TITLES) {
    if (input.includes(keyword)) {
      return titles[hashString(input) % titles.length];
    }
  }

  return FALLBACK_TITLES[hashString(input) % FALLBACK_TITLES.length];
}
