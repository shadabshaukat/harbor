export type MenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: "Coffee" | "Brunch" | "Bakery" | "Cold Drinks";
  image: string;
};

export const MENU_CATALOG: MenuItem[] = [
  {
    id: "flat-white",
    name: "Flat White",
    description: "Double shot espresso with silky microfoam.",
    priceCents: 520,
    category: "Coffee",
    image: "/menu/flat-white.svg"
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    description: "18-hour steeped single-origin beans.",
    priceCents: 580,
    category: "Cold Drinks",
    image: "/menu/cold-brew.svg"
  },
  {
    id: "avo-toast",
    name: "Avo Toast",
    description: "Sourdough, smashed avo, feta and chili oil.",
    priceCents: 1450,
    category: "Brunch",
    image: "/menu/avo-toast.svg"
  },
  {
    id: "eggs-benny",
    name: "Eggs Benny",
    description: "Poached eggs, smoked ham, hollandaise.",
    priceCents: 1750,
    category: "Brunch",
    image: "/menu/eggs-benny.svg"
  },
  {
    id: "croissant",
    name: "Butter Croissant",
    description: "House-baked laminated pastry.",
    priceCents: 640,
    category: "Bakery",
    image: "/menu/croissant.svg"
  },
  {
    id: "berry-soda",
    name: "Berry Soda",
    description: "Sparkling berry cooler with lime.",
    priceCents: 690,
    category: "Cold Drinks",
    image: "/menu/berry-soda.svg"
  }
];

export function centsToCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(cents / 100);
}
