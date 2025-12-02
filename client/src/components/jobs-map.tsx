import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { JobWithRelations } from '@shared/schema';

interface JobsMapProps {
  jobs: JobWithRelations[];
  onJobClick?: (job: JobWithRelations) => void;
}

export function JobsMap({ jobs, onJobClick }: JobsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const defaultCenter: [number, number] = [-26.2041, 28.0473];
    let center = defaultCenter;
    let zoom = 10;

    const jobsWithCoords = jobs.filter(
      job => (job.pickupLat && job.pickupLng) || (job.deliveryLat && job.deliveryLng)
    );

    if (jobsWithCoords.length > 0) {
      const firstJob = jobsWithCoords[0];
      if (firstJob.deliveryLat && firstJob.deliveryLng) {
        center = [firstJob.deliveryLat, firstJob.deliveryLng];
      } else if (firstJob.pickupLat && firstJob.pickupLng) {
        center = [firstJob.pickupLat, firstJob.pickupLng];
      }
    }

    const map = L.map(containerRef.current).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const pickupIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(217, 91%, 60%);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const deliveryIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(173, 80%, 40%);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const urgentIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(0, 84%, 60%);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
      "><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      </style>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const bounds: [number, number][] = [];

    jobs.forEach((job) => {
      if (job.deliveryLat && job.deliveryLng) {
        const isUrgent = job.priority === 'urgent' || job.priority === 'high';
        const icon = isUrgent ? urgentIcon : deliveryIcon;
        
        const statusColor = {
          pending: '#94a3b8',
          assigned: '#60a5fa',
          in_progress: '#22c55e',
          completed: '#10b981',
          cancelled: '#ef4444',
        }[job.status] || '#94a3b8';

        const marker = L.marker([job.deliveryLat, job.deliveryLng], { icon })
          .bindPopup(`
            <div style="min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="
                  background-color: ${statusColor};
                  color: white;
                  padding: 2px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                  text-transform: uppercase;
                ">${job.status.replace(/_/g, ' ')}</span>
                ${job.priority === 'urgent' || job.priority === 'high' 
                  ? `<span style="background-color: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${job.priority}</span>` 
                  : ''}
              </div>
              <strong style="font-size: 14px;">${job.title}</strong>
              <p style="margin: 4px 0; color: #666; font-size: 12px;">${job.customerName}</p>
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="margin: 4px 0; font-size: 12px;"><strong>Client Location:</strong></p>
              <p style="margin: 0; font-size: 12px; color: #666;">${job.deliveryAddress}</p>
              ${job.customerPhone ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Phone:</strong> ${job.customerPhone}</p>` : ''}
              <button 
                onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${job.deliveryLat},${job.deliveryLng}', '_blank')"
                style="
                  margin-top: 8px;
                  width: 100%;
                  padding: 8px;
                  background-color: hsl(217, 91%, 60%);
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                "
              >Navigate to Client</button>
            </div>
          `)
          .addTo(map);

        if (onJobClick) {
          marker.on('click', () => onJobClick(job));
        }

        bounds.push([job.deliveryLat, job.deliveryLng]);
      }

      if (job.pickupLat && job.pickupLng) {
        L.marker([job.pickupLat, job.pickupLng], { icon: pickupIcon })
          .bindPopup(`
            <div style="min-width: 180px;">
              <strong>Pickup Point</strong>
              <p style="margin: 4px 0; color: #666; font-size: 12px;">${job.title}</p>
              <p style="margin: 4px 0; font-size: 12px;">${job.pickupAddress}</p>
              <button 
                onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${job.pickupLat},${job.pickupLng}', '_blank')"
                style="
                  margin-top: 8px;
                  width: 100%;
                  padding: 8px;
                  background-color: hsl(217, 91%, 60%);
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                "
              >Navigate to Pickup</button>
            </div>
          `)
          .addTo(map);
        bounds.push([job.pickupLat, job.pickupLng]);
      }
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [jobs, onJobClick]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg overflow-hidden"
      style={{ minHeight: '500px' }}
      data-testid="jobs-map"
    />
  );
}
