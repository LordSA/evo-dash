"use client";

import React, { useState } from "react";
import { EventItem } from "@/types/database";
import { Eye, ExternalLink, Sparkles } from "lucide-react";

interface Props {
  event: Partial<EventItem>;
}

export default function EventCardPreview({ event }: Props) {
  const [isHovered, setIsHovered] = useState(false);

  const isPre = event.type === "pre_event";
  const poster = isHovered && event.completed_poster_url
    ? event.completed_poster_url
    : event.poster_url || "/placeholder.webp";

  return (
    <div className="bg-[#11131f] border border-[#1e2238] rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-3 text-xs text-indigo-400 font-medium tracking-wide uppercase">
        <span className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Live Card Preview
        </span>
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          {isPre ? "Pre-Event" : "Main Event"}
        </span>
      </div>

      {isPre ? (
        <div 
          className="group relative cursor-pointer max-w-sm mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-white/10 bg-black/40 mb-3">
            {event.is_completed && (
              <div className="absolute z-20 left-3 top-3 px-2 py-1 bg-white/10 text-white text-[10px] font-semibold rounded backdrop-blur-sm">
                Completed
              </div>
            )}
            {event.poster_url ? (
              <img
                src={poster}
                alt={event.name || "Event poster"}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  event.is_completed && !isHovered ? "grayscale" : ""
                }`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Sparkles className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                <span>Upload Poster</span>
              </div>
            )}
          </div>
          <h4 className="text-base font-semibold text-white">
            {event.name || "Event Title"}
          </h4>
          {event.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      ) : (
        <div className="group relative rounded-xl border border-white/10 bg-white/5 p-4 max-w-sm mx-auto">
          <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40 mb-3">
            {event.is_closed && (
              <div className="absolute z-20 left-2 top-2 px-2 py-0.5 bg-rose-500/80 text-white text-[10px] font-semibold rounded">
                Registration Closed
              </div>
            )}
            {event.poster_url ? (
              <img
                src={event.poster_url}
                alt={event.name || "Event"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Sparkles className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                <span>Upload Poster</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-semibold text-white">
              {event.name || "Event Name"}
            </h4>
            {event.spec && (
              <p className="text-xs text-indigo-300 font-medium">{event.spec}</p>
            )}
            {event.date_time && (
              <p className="text-[11px] text-slate-400">{event.date_time}</p>
            )}
            {event.venue && (
              <p className="text-[11px] text-slate-500">{event.venue}</p>
            )}
            {event.link && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline">
                  View details <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
