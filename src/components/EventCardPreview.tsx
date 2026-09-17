"use client";

import React, { useState } from "react";
import { EventItem } from "@/types/database";
import { Eye, ExternalLink, Calendar, MapPin, Tag, Sparkles } from "lucide-react";

interface Props {
  event: Partial<EventItem>;
}

export default function EventCardPreview({ event }: Props) {
  const [simulateHover, setSimulateHover] = useState(false);

  const isPre = event.type === "pre_event";
  const activePoster = (simulateHover && event.completed_poster_url)
    ? event.completed_poster_url
    : event.poster_url;

  return (
    <div className="bg-[#0f111d] border border-[#1e2238] rounded-2xl p-4 sm:p-5 text-white shadow-xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#1e2238]/80 text-xs">
        <div className="flex items-center gap-2 font-semibold text-indigo-400">
          <Eye className="w-4 h-4 text-indigo-400" />
          <span>Live Visitor Preview</span>
        </div>
        <div className="flex items-center gap-2">
          {isPre && event.completed_poster_url && (
            <button
              type="button"
              onClick={() => setSimulateHover(!simulateHover)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                simulateHover
                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
              }`}
            >
              {simulateHover ? "Viewing Completed Poster" : "Test Hover State"}
            </button>
          )}
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isPre
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
          }`}>
            {isPre ? "Pre-Event" : "Main Event"}
          </span>
        </div>
      </div>

      {/* Preview Card Container */}
      <div className="max-w-[320px] sm:max-w-xs mx-auto">
        {isPre ? (
          /* Pre-Event Card (3:4 Ratio Matching Evolvia Flagship) */
          <div
            className="group relative cursor-pointer rounded-2xl bg-[#141726] border border-[#232742] p-3 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10"
            onMouseEnter={() => setSimulateHover(true)}
            onMouseLeave={() => setSimulateHover(false)}
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black/60 border border-white/5 mb-3">
              {/* Completed Badge */}
              {event.is_completed && (
                <div className="absolute z-20 top-2.5 left-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-md text-emerald-400 text-[11px] font-bold rounded-lg border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Completed
                </div>
              )}

              {/* Poster Image */}
              {activePoster ? (
                <img
                  src={activePoster}
                  alt={event.name || "Event poster"}
                  className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                    event.is_completed && !simulateHover ? "grayscale brightness-90" : ""
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                  <Sparkles className="w-8 h-8 mb-2 opacity-30 text-indigo-400" />
                  <span className="font-medium text-slate-400">3:4 Poster Image</span>
                  <span className="text-[10px] text-slate-600 mt-1">Upload primary poster</span>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
            </div>

            <div className="px-1 space-y-1">
              <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                {event.name || "Pre-Event Name"}
              </h4>
              {event.description ? (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {event.description}
                </p>
              ) : (
                <p className="text-xs text-slate-600 italic">No description provided</p>
              )}
            </div>
          </div>
        ) : (
          /* Main Event Card (16:9 Banner Ratio Matching Evolvia Flagship) */
          <div className="group relative rounded-2xl bg-[#141726] border border-[#232742] p-3.5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/5 mb-3.5">
              {/* Registration Status Badges */}
              {event.is_closed ? (
                <div className="absolute z-20 top-2.5 left-2.5 px-2.5 py-1 bg-rose-950/80 backdrop-blur-md text-rose-300 text-[11px] font-bold rounded-lg border border-rose-500/30 flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Registration Closed
                </div>
              ) : event.is_completed ? (
                <div className="absolute z-20 top-2.5 left-2.5 px-2.5 py-1 bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Completed
                </div>
              ) : (
                <div className="absolute z-20 top-2.5 left-2.5 px-2.5 py-1 bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Registration Live
                </div>
              )}

              {/* Main Poster Banner */}
              {event.poster_url ? (
                <img
                  src={event.poster_url}
                  alt={event.name || "Event banner"}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                  <Sparkles className="w-8 h-8 mb-2 opacity-30 text-indigo-400" />
                  <span className="font-medium text-slate-400">16:9 Banner Image</span>
                  <span className="text-[10px] text-slate-600 mt-1">Upload event banner</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <h4 className="text-base font-bold text-white tracking-tight line-clamp-1">
                  {event.name || "Event Name"}
                </h4>
                {event.spec && (
                  <p className="text-xs font-semibold text-indigo-400 mt-0.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>{event.spec}</span>
                  </p>
                )}
              </div>

              {/* Meta Details */}
              <div className="grid grid-cols-1 gap-1 pt-1 text-[11px] text-slate-400 border-t border-white/5">
                {event.date_time && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{event.date_time}</span>
                  </div>
                )}
                {event.venue && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3 h-3 text-violet-400 shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                )}
              </div>

              {/* Registration Link Button */}
              {event.link && (
                <div className="pt-2">
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
                  >
                    <span>Register Now</span>
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
