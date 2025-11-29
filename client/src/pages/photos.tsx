import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Image as ImageIcon,
  Calendar,
  MapPin,
  User,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TripEvent, TripWithRelations } from '@shared/schema';

interface PhotoEvent extends TripEvent {
  trip?: TripWithRelations;
}

function PhotoCard({
  event,
  onClick,
}: {
  event: PhotoEvent;
  onClick: () => void;
}) {
  return (
    <Card className="overflow-hidden hover-elevate cursor-pointer group" onClick={onClick}>
      <div className="aspect-[4/3] relative bg-muted">
        {event.photoUrl ? (
          <img
            src={event.photoUrl}
            alt={event.description || 'Trip photo'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <p className="text-sm font-medium truncate">{event.description || 'Photo'}</p>
            <p className="text-xs opacity-80">
              {format(new Date(event.timestamp), 'PPp')}
            </p>
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs">
            {event.eventType.replace(/_/g, ' ')}
          </Badge>
          {event.latitude && event.longitude && (
            <MapPin className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PhotoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-3">
        <Skeleton className="h-5 w-20" />
      </CardContent>
    </Card>
  );
}

function PhotoLightbox({
  events,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  events: PhotoEvent[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const event = events[currentIndex];
  if (!event) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {event.description || 'Photo'}
            </DialogTitle>
            <Badge variant="outline">
              {currentIndex + 1} / {events.length}
            </Badge>
          </div>
        </DialogHeader>
        <div className="relative">
          <div className="aspect-video bg-black flex items-center justify-center">
            {event.photoUrl ? (
              <img
                src={event.photoUrl}
                alt={event.description || 'Trip photo'}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/60">
                <Camera className="h-16 w-16" />
                <p>No image available</p>
              </div>
            )}
          </div>

          {events.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
                data-testid="button-previous-photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                data-testid="button-next-photo"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
        <div className="p-4 border-t bg-muted/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Event Type</p>
              <p className="font-medium capitalize">{event.eventType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date & Time</p>
              <p className="font-medium">{format(new Date(event.timestamp), 'PPp')}</p>
            </div>
            {event.latitude && event.longitude && (
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">
                  {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                </p>
              </div>
            )}
            {event.address && (
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium truncate">{event.address}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PhotosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const { data: trips, isLoading } = useQuery<TripWithRelations[]>({
    queryKey: ['/api/trips'],
  });

  const allPhotoEvents: PhotoEvent[] = trips?.flatMap((trip) =>
    (trip.events || [])
      .filter((event) => event.eventType === 'photo' || event.eventType === 'incident' || event.eventType === 'inspection')
      .map((event) => ({ ...event, trip }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];

  const filteredEvents = allPhotoEvents.filter((event) => {
    const matchesSearch =
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const handlePreviousPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else if (selectedPhotoIndex === 0) {
      setSelectedPhotoIndex(filteredEvents.length - 1);
    }
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < filteredEvents.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    } else if (selectedPhotoIndex === filteredEvents.length - 1) {
      setSelectedPhotoIndex(0);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-photos-title">Photo Gallery</h1>
          <p className="text-muted-foreground">Browse photos from trip events and inspections</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-photos"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-event-type-filter">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="photo">Photos</SelectItem>
            <SelectItem value="incident">Incidents</SelectItem>
            <SelectItem value="inspection">Inspections</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <PhotoCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredEvents.map((event, index) => (
            <PhotoCard
              key={event.id}
              event={event}
              onClick={() => setSelectedPhotoIndex(index)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No photos found</h3>
            <p className="text-muted-foreground">
              {searchQuery || eventTypeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Photos from trip events will appear here'}
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPhotoIndex !== null && (
        <PhotoLightbox
          events={filteredEvents}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onPrevious={handlePreviousPhoto}
          onNext={handleNextPhoto}
        />
      )}
    </div>
  );
}
