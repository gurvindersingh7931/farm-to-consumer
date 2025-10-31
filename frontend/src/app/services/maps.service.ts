import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window { google: any }
}

@Injectable({ providedIn: 'root' })
export class MapsService {
  private loaderPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (window.google && window.google.maps) return Promise.resolve();
    if (this.loaderPromise) return this.loaderPromise;

    const apiKey = environment.googleMapsApiKey;
    if (!apiKey) {
      // No key configured; resolve so callers can fallback
      return Promise.resolve();
    }

    this.loaderPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });

    return this.loaderPromise;
  }

  initMap(container: HTMLElement, lat: number, lng: number, zoom: number = 13): any | null {
    if (!(window.google && window.google.maps)) return null;
    const center = { lat, lng };
    const map = new window.google.maps.Map(container, { center, zoom, mapTypeControl: false });
    new window.google.maps.Marker({ position: center, map });
    return map;
  }

  // Haversine distance in kilometers
  distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(h));
    return Math.round(R * c * 10) / 10; // 0.1 km precision
  }
}


