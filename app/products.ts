export type StoreCurrency = 'USD' | 'AUD' | 'GBP' | 'EUR' | 'CAD' | 'CHF';

export type Product = {
  id: string;
  tip4servProductId?: number;
  number: string;
  tag: string;
  name: string;
  description: string;
  details?: string[];
  price: string;
  priceCurrency: StoreCurrency;
  image: string;
  imageAlt: string;
  perk: string;
  billing: 'monthly' | 'once';
  group: 'subscription' | 'base' | 'credits' | 'support';
  customAmount?: boolean;
  categoryId?: number;
  categoryName?: string;
  stock?: number;
};

export const products: Product[] = [
  { id: 'building-shed', number: '01', tag: 'BASE BUILDING', name: 'BUILDING SHED', description: 'Essential supplies for starting or expanding your base.', details: ['Building materials', 'Base-construction supplies', 'Renews monthly until cancelled'], price: '7.99', priceCurrency: 'USD', image: '/products/building-shed-v2.webp', imageAlt: 'An open fortified supply shed neatly stocked with timber, sheet metal, tools and building materials', perk: 'BUILD FASTER', billing: 'monthly', group: 'subscription' },
  { id: 'weapon-workbench', number: '02', tag: 'CUSTOM LOADOUT', name: 'WEAPON WORKBENCH', description: 'Build your ideal weapon loadout with custom gear.', details: ['Custom weapons and optics', 'Magazines, ammunition and attachments', 'Renews monthly until cancelled'], price: '7.99', priceCurrency: 'USD', image: '/products/weapon-workbench-v2.webp', imageAlt: 'A red-lit tactical workbench displaying fictional modular survival equipment and accessories', perk: 'GEAR YOUR WAY', billing: 'monthly', group: 'subscription' },
  { id: 'priority-queue', number: '03', tag: 'SERVER ACCESS', name: 'PRIORITY QUEUE', description: 'Skip the queue and join the server faster.', details: ['Priority server access', 'Less waiting during busy periods', 'Renews monthly until cancelled'], price: '7.99', priceCurrency: 'USD', image: '/products/priority-queue-v2.webp', imageAlt: 'A rugged access token accepted by a checkpoint scanner as the security gate opens', perk: 'SKIP THE WAIT', billing: 'monthly', group: 'subscription' },
  { id: 'zone-alert', number: '04', tag: 'BASE SECURITY', name: '300M ZONE', description: 'Get alerts when players enter your 300-metre base zone.', details: ['300-metre detection zone', 'Alerts when players enter the zone', 'Renews monthly until cancelled'], price: '7.99', priceCurrency: 'USD', image: '/products/zone-alert-v2.webp', imageAlt: 'A rugged perimeter detector monitoring a fortified compound inside a red detection ring', perk: 'EARLY WARNING', billing: 'monthly', group: 'subscription' },
  { id: 'back-hatch', number: '05', tag: 'BASE ACCESS', name: 'BACK HATCH', description: 'Add a secure rear entrance to your base.', details: ['Secure rear base entrance', 'Faster access in and out', 'Renews monthly until cancelled'], price: '7.99', priceCurrency: 'USD', image: '/products/back-hatch-v2.webp', imageAlt: 'A reinforced low-profile back hatch opening into a red-lit survival compound', perk: 'MOVE UNSEEN', billing: 'monthly', group: 'subscription' },
  { id: 'prebuilt-base', number: '06', tag: 'BASE DESIGN', name: 'CUSTOM PREBUILT BASE', description: 'Start with a customizable fortress ready for expansion.', details: ['Customizable prebuilt fortress', 'Expansion-ready foundation', 'One-time purchase'], price: '29.99', priceCurrency: 'USD', image: '/products/prebuilt-base-v2.webp', imageAlt: 'A deploy-ready timber and metal compound with workshop, watch platform and secure courtyard', perk: 'DEPLOY READY', billing: 'once', group: 'base' },
  { id: 'custom-base', number: '07', tag: 'CUSTOM BUILD', name: 'FULLY CUSTOM BASE', description: 'Get a unique base built around your vision.', details: ['Designed around your vision', 'Built for your faction or team', 'One-time purchase'], price: '39.99', priceCurrency: 'USD', image: '/products/custom-base-v2.webp', imageAlt: 'A large grounded modular faction base with layered walls, workshops and watch platforms', perk: 'BUILT TO ORDER', billing: 'once', group: 'base' },
  { id: 'credits-75k', number: '08', tag: 'BLACKOUTZ CREDITS', name: '$75,000 CURRENCY PACK', description: 'Get 100,000 total BLACKOUTZ Credits, including the bonus.', details: ['75,000-credit pack', '25,000 bonus credits', '100,000 credits total'], price: '7.99', priceCurrency: 'USD', image: '/products/currency-75k.webp', imageAlt: 'A lightly filled rugged case with two small bundles of fictional BLACKOUTZ game-credit cards', perk: '100K TOTAL', billing: 'once', group: 'credits' },
  { id: 'credits-180k', number: '09', tag: 'BLACKOUTZ CREDITS', name: '$180,000 CURRENCY PACK', description: 'Get 250,000 total BLACKOUTZ Credits, including the bonus.', details: ['180,000-credit pack', '70,000 bonus credits', '250,000 credits total'], price: '11.99', priceCurrency: 'USD', image: '/products/currency-180k.webp', imageAlt: 'A substantially filled rugged case with several bundles of fictional BLACKOUTZ game-credit cards', perk: '250K TOTAL', billing: 'once', group: 'credits' },
  { id: 'credits-300k', number: '10', tag: 'BLACKOUTZ CREDITS', name: '$300,000 CURRENCY PACK', description: 'Get 450,000 total BLACKOUTZ Credits, including the bonus.', details: ['300,000-credit pack', '150,000 bonus credits', '450,000 credits total'], price: '19.99', priceCurrency: 'USD', image: '/products/currency-300k.webp', imageAlt: 'An overflowing rugged case packed with fictional BLACKOUTZ game-credit cards and tokens', perk: '450K TOTAL', billing: 'once', group: 'credits' },
  { id: 'donation', number: '11', tag: 'SUPPORT BLACKOUTZ', name: 'DONATION', description: 'Support server costs, events and future BLACKOUTZ improvements.', details: ['Choose your support amount', 'Supports server costs and events', 'Includes a BLACKOUTZ supporter role'], price: '1.00', priceCurrency: 'USD', image: '/products/donation.webp', imageAlt: 'A rugged donation jar filled with fictional BLACKOUTZ support tokens beside a red heart', perk: 'KEEP Z ALIVE', billing: 'once', group: 'support', customAmount: true },
];

export const productIds = new Set(products.map((product) => product.id));

