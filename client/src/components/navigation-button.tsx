import { useState } from 'react';
import { Navigation, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavigationButtonProps {
  latitude: number;
  longitude: number;
  address?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function NavigationButton({
  latitude,
  longitude,
  address,
  label = 'Navigate',
  variant = 'default',
  size = 'default',
}: NavigationButtonProps) {
  const destination = address
    ? encodeURIComponent(address)
    : `${latitude},${longitude}`;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;

  const openInApp = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} data-testid="button-navigate">
          <Navigation className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openInApp(googleMapsUrl)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in Google Maps
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openInApp(wazeUrl)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in Waze
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openInApp(appleMapsUrl)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in Apple Maps
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NavigationLink({
  latitude,
  longitude,
  address,
  className,
}: {
  latitude: number;
  longitude: number;
  address?: string;
  className?: string;
}) {
  const googleMapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <ExternalLink className="h-3 w-3 ml-1 inline" />
    </a>
  );
}
