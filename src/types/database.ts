export type EventType = "pre_event" | "main_event";

export interface EventItem {
  id: string;
  slug: string;
  name: string;
  type: EventType;
  description?: string;
  spec?: string;
  date_time?: string;
  venue?: string;
  link?: string;
  poster_url?: string;
  completed_poster_url?: string;
  is_completed: boolean;
  is_closed: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface StallExpo {
  id: string;
  name: string;
  image_url: string;
  description: string;
  order_index: number;
  created_at?: string;
}

export interface Speaker {
  id: string;
  name: string;
  designation: string;
  expertise: string;
  image_url: string;
  order_index: number;
  created_at?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  image_url: string;
  category: string;
  order_index: number;
  created_at?: string;
}
