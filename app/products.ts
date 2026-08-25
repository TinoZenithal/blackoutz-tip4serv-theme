export type StoreCurrency = 'USD' | 'AUD' | 'GBP' | 'EUR' | 'CAD' | 'NZD' | 'JPY' | 'SGD';

export type Product = {
  id: string;
  tip4servProductId?: number;
  number: string;
  tag: string;
  name: string;
  description: string;
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
  { id: 'building-shed', number: '01', tag: 'BASE BUILDING', name: 'BUILDING SHED', description: 'A dedicated shed stocked with building materials and essential base-construction supplies.', price: '7.99', priceCurrency: 'USD', image: '/products/building-shed-v2.webp', imageAlt: 'An open fortified supply shed neatly stocked with timber, sheet metal, tools and building materials', perk: 'BUILD FASTER', billing: 'monthly', group: 'subscription' },
  { id: 'weapon-workbench', number: '02', tag: 'CUSTOM LOADOUT', name: 'WEAPON WORKBENCH', description: 'Create a combat loadout with tailored weapons, optics, magazines, ammunition and attachments.', price: '7.99', priceCurrency: 'USD', image: '/products/weapon-workbench-v2.webp', imageAlt: 'A red-lit tactical workbench displaying fictional modular survival equipment and accessories', perk: 'GEAR YOUR WAY', billing: 'monthly', group: 'subscription' },
  { id: 'priority-queue', number: '03', tag: 'SERVER ACCESS', name: 'PRIORITY QUEUE', description: 'Skip the standard queue and get back into the action faster during peak server hours.', price: '7.99', priceCurrency: 'USD', image: '/products/priority-queue-v2.webp', imageAlt: 'A rugged access token accepted by a checkpoint scanner as the security gate opens', perk: 'SKIP THE WAIT', billing: 'monthly', group: 'subscription' },
  { id: 'zone-alert', number: '04', tag: 'BASE SECURITY', name: '300M ZONE', description: 'Protect your base with a 300-metre detection zone, configurable alerts and intruder location intelligence.', price: '7.99', priceCurrency: 'USD', image: '/products/zone-alert-v2.webp', imageAlt: 'A rugged perimeter detector monitoring a fortified compound inside a red detection ring', perk: 'EARLY WARNING', billing: 'monthly', group: 'subscription' },
  { id: 'back-hatch', number: '05', tag: 'BASE ACCESS', name: 'BACK HATCH', description: 'Add a secure rear entrance for faster movement in and out of your compound without weakening the perimeter.', price: '7.99', priceCurrency: 'USD', image: '/products/back-hatch-v2.webp', imageAlt: 'A reinforced low-profile back hatch opening into a red-lit survival compound', perk: 'MOVE UNSEEN', billing: 'monthly', group: 'subscription' },
  { id: 'prebuilt-base', number: '06', tag: 'BASE DESIGN', name: 'CUSTOM PREBUILT BASE', description: 'Claim a fully customizable BLACKOUTZ fortress with a strong foundation ready for expansion.', price: '29.99', priceCurrency: 'USD', image: '/products/prebuilt-base-v2.webp', imageAlt: 'A deploy-ready timber and metal compound with workshop, watch platform and secure courtyard', perk: 'DEPLOY READY', billing: 'once', group: 'base' },
  { id: 'custom-base', number: '07', tag: 'CUSTOM BUILD', name: 'FULLY CUSTOM BASE', description: 'Bring your vision to life with a unique stronghold designed around your faction, team and play style.', price: '39.99', priceCurrency: 'USD', image: '/products/custom-base-v2.webp', imageAlt: 'A large grounded modular faction base with layered walls, workshops and watch platforms', perk: 'BUILT TO ORDER', billing: 'once', group: 'base' },
  { id: 'credits-75k', number: '08', tag: 'BLACKOUTZ CREDITS', name: '$75,000 CURRENCY PACK', description: 'Receive 75,000 closed-loop BLACKOUTZ credits plus a 25,000-credit package bonus for in-game use.', price: '7.99', priceCurrency: 'USD', image: '/products/currency-75k.webp', imageAlt: 'A lightly filled rugged case with two small bundles of fictional BLACKOUTZ game-credit cards', perk: '100K TOTAL', billing: 'once', group: 'credits' },
  { id: 'credits-180k', number: '09', tag: 'BLACKOUTZ CREDITS', name: '$180,000 CURRENCY PACK', description: 'Receive 180,000 closed-loop BLACKOUTZ credits plus a 70,000-credit package bonus for in-game use.', price: '11.99', priceCurrency: 'USD', image: '/products/currency-180k.webp', imageAlt: 'A substantially filled rugged case with several bundles of fictional BLACKOUTZ game-credit cards', perk: '250K TOTAL', billing: 'once', group: 'credits' },
  { id: 'credits-300k', number: '10', tag: 'BLACKOUTZ CREDITS', name: '$300,000 CURRENCY PACK', description: 'Receive 300,000 closed-loop BLACKOUTZ credits plus a 150,000-credit package bonus for in-game use.', price: '19.99', priceCurrency: 'USD', image: '/products/currency-300k.webp', imageAlt: 'An overflowing rugged case packed with fictional BLACKOUTZ game-credit cards and tokens', perk: '450K TOTAL', billing: 'once', group: 'credits' },
  { id: 'donation', number: '11', tag: 'SUPPORT BLACKOUTZ', name: 'DONATION', description: 'Help keep BLACKOUTZ running with a contribution towards server costs, development, events and future improvements.', price: '1.00', priceCurrency: 'USD', image: '/products/donation.webp', imageAlt: 'A rugged donation jar filled with fictional BLACKOUTZ support tokens beside a red heart', perk: 'KEEP Z ALIVE', billing: 'once', group: 'support', customAmount: true },
];

export const productIds = new Set(products.map((product) => product.id));
