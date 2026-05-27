import {
  ShoppingBag,
  Coffee,
  Car,
  HeartPulse,
  Home,
  MoreHorizontal,
  Plane,
} from 'lucide-react';

const ICON_MAP = {
  Coffee,
  Car,
  HeartPulse,
  Home,
  ShoppingBag,
  MoreHorizontal,
  Plane,
};

export const CategoryIcon = ({ category, categories }) => {
  const cat = categories?.find((c) => c.value.toLowerCase() === category?.toLowerCase());
  const iconName = cat?.icon || 'MoreHorizontal';
  const IconComponent = ICON_MAP[iconName] || MoreHorizontal;
  return <IconComponent size={24} />;
};
