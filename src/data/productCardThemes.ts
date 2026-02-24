import type { ProductCardVariant } from "../types/productCard";

export const categoryThemes: Record<string, ProductCardVariant> = {
  Juguetes: {
    cardClass: "border-pink-200 hover:border-pink-300",
    mediaClass: "bg-pink-50",
    buttonClass: "bg-pink-200 hover:bg-pink-300",
    iconClass: "text-pink-900",
  },
  Lubricantes: {
    cardClass: "border-sky-200 hover:border-sky-300",
    mediaClass: "bg-sky-50",
    buttonClass: "bg-sky-200 hover:bg-sky-300",
    iconClass: "text-sky-900",
  },
  Lencería: {
    cardClass: "border-rose-200 hover:border-rose-300",
    mediaClass: "bg-rose-50",
    buttonClass: "bg-rose-200 hover:bg-rose-300",
    iconClass: "text-rose-900",
  },
  Masculino: {
    cardClass: "border-green-200 hover:border-green-300",
    mediaClass: "bg-green-50",
    buttonClass: "bg-green-200 hover:bg-green-300",
    iconClass: "text-green-900",
  },
  Bondaje: {
    cardClass: "border-purple-200 hover:border-purple-300",
    mediaClass: "bg-purple-50",
    buttonClass: "bg-purple-200 hover:bg-purple-300",
    iconClass: "text-purple-900",
  },
  "Bienestar íntimo": {
    cardClass: "border-emerald-200 hover:border-emerald-300",
    mediaClass: "bg-emerald-50",
    buttonClass: "bg-emerald-200 hover:bg-emerald-300",
    iconClass: "text-emerald-900",
  },
  Ofertas: {
    cardClass: "border-amber-200 hover:border-amber-300",
    mediaClass: "bg-amber-50",
    buttonClass: "bg-amber-200 hover:bg-amber-300",
    iconClass: "text-amber-900",
  },
};
