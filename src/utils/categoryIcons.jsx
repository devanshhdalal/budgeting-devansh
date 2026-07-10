import {
  ShoppingBag,
  Coffee,
  Car,
  HeartPulse,
  Home,
  MoreHorizontal,
  Plane,
  ShoppingCart,
} from 'lucide-react';

const ICON_MAP = {
  Coffee,
  Car,
  HeartPulse,
  Home,
  ShoppingBag,
  MoreHorizontal,
  Plane,
  ShoppingCart,
};

export const CATEGORY_ICON_OPTIONS = Object.keys(ICON_MAP);

export const CategoryIcon = ({ category, categories }) => {
  const cat = categories?.find((c) => c.value.toLowerCase() === category?.toLowerCase());
  const iconName = cat?.icon || 'MoreHorizontal';
  const IconComponent = ICON_MAP[iconName] || MoreHorizontal;
  return <IconComponent size={24} />;
};
