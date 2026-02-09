import { User, Event, Photo, BibNumber } from "@prisma/client";

export type { User, Event, Photo, BibNumber };

// Backward compatibility alias
export type Photographer = User;

export interface EventWithPhotos extends Event {
  photos: Photo[];
  _count?: {
    photos: number;
  };
}

export interface PhotoWithBibNumbers extends Photo {
  bibNumbers: BibNumber[];
}

export interface EventWithStats extends Event {
  _count: {
    photos: number;
  };
  user?: User;
}

export interface UserWithStats extends User {
  _count: {
    events: number;
  };
}

export interface SearchResult {
  photo: PhotoWithBibNumbers;
  event: Event;
}

export interface UploadResult {
  success: boolean;
  photo?: Photo;
  error?: string;
}

export interface OCRResult {
  bibNumbers: string[];
  confidence: number;
  rawText: string;
}
