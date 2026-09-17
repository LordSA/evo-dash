"use client";

import React, { useState } from "react";
import { EventItem } from "@/types/database";
import { Eye, ExternalLink, Calendar, MapPin, Tag } from "lucide-react";

interface Props {
  event: Partial<EventItem>;
}

export default function EventCardPreview({ event }: Props) {
  const [isHovered, setIsHovered] = useState(false);

  const isPre = event.type === "pre_event";
  const activePoster = (isHovered && event.completed_poster_url)
    ? event.completed_poster_url
    : event.poster_url;

  return (
    <div className="bg-[#12141d] border border-[#1f2336] rounded-xl p-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1f2336] text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Card Preview</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-slate-300">
          {isPre ? "Pre-Event" : "Main Event"}
        </span>
      </div>

      {/* Preview Card (3:4 Ratio) */}
      <div className="max-w-xs mx-auto">
        {isPre ? (
          /* Pre-Event Card */
          <div
            className="group relative cursor-pointer rounded-xl bg-[#161925] border border-[#23283e] p-3 transition-colors hover:border-[#383f60]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-black/60 border border-white/5 mb-2.5">
              {event.is_completed && (
                <div className="absolute z-20 top-2 left-2 px-2 py-0.5 bg-black/80 text-emerald-400 text-[10px] font-semibold rounded">
                  Completed
                </div>
              )}

              {activePoster ? (
                <img
                  src={activePoster}
                  alt={event.name || "Event poster"}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    event.is_completed && !isHovered ? "grayscale opacity-90" : ""
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                  <span className="text-slate-400 font-medium">3:4 Poster</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">Upload image to preview</span>
                </div>
              )}
            </div>

            <div className="px-0.5 space-y-1">
              <h4 className="text-sm font-semibold text-white truncate">
                {event.name || "Event Name"}
              </h4>
              {event.description && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Main Event Card (3:4 Poster Ratio) */
          <div className="group relative rounded-xl bg-[#161925] border border-[#23283e] p-3 transition-colors hover:border-[#383f60]">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-black/60 border border-white/5 mb-2.5">
              {event.is_closed ? (
                <div className="absolute z-20 top-2 left-2 px-2 py-0.5 bg-rose-950/90 text-rose-300 text-[10px] font-semibold rounded">
                  Registration Closed
                </div>
              ) : event.is_completed ? (
                <div className="absolute z-20 top-2 left-2 px-2 py-0.5 bg-emerald-950/90 text-emerald-300 text-[10px] font-semibold rounded">
                  Completed
                </div>
              ) : null}

              {event.poster_url ? (
                <img
                  src={event.poster_url}
                  alt={event.name || "Event"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                  <span className="text-slate-400 font-medium">3:4 Poster</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">Upload image to preview</span>
                </div>
              )}
            </div>

            <div className="px-0.5 space-y-1.5">
              <div>
                <h4 className="text-sm font-semibold text-white truncate">
                  {event.name || "Event Name"}
                </h4>
                {event.spec && (
                  <p className="text-xs text-indigo-400 font-medium truncate">{event.spec}</p>
                )}
              </div>

              {(event.date_time || event.venue) && (
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-0.5">
                  {event.date_time && (
                    <div className="flex items-center gap-1.5 text-slate-300 truncate">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{event.date_time}</span>
                    </div>
                  )}
                  {event.venue && (
                    <div className="flex items-center gap-1.5 text-slate-400 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  )}
                </div>
              )}

              {event.link && (
                <div className="pt-1">
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
                  >
                    <span>View Registration Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
