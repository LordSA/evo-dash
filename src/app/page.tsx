"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  Store, 
  Users, 
  ShieldCheck, 
  RefreshCw
} from "lucide-react";
import { EventItem, Speaker, Sponsor, StallExpo } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import EventsManager from "@/components/EventsManager";
import StallsManager from "@/components/StallsManager";
import SpeakersManager from "@/components/SpeakersManager";
import SponsorsManager from "@/components/SponsorsManager";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"events" | "stalls" | "speakers" | "sponsors">("events");
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [stalls, setStalls] = useState<StallExpo[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const [evRes, stRes, spRes, spoRes] = await Promise.all([
          supabase.from("events").select("*").order("order_index", { ascending: true }),
          supabase.from("stalls_and_expos").select("*").order("order_index", { ascending: true }),
          supabase.from("speakers").select("*").order("order_index", { ascending: true }),
          supabase.from("sponsors").select("*").order("order_index", { ascending: true }),
        ]);

        setEvents(evRes.data || []);
        setStalls(stRes.data || []);
        setSpeakers(spRes.data || []);
        setSponsors(spoRes.data || []);
      } else {
        const storedEvents = localStorage.getItem("evolvia_events");
        const storedStalls = localStorage.getItem("evolvia_stalls");
        const storedSpeakers = localStorage.getItem("evolvia_speakers");
        const storedSponsors = localStorage.getItem("evolvia_sponsors");

        setEvents(storedEvents ? JSON.parse(storedEvents) : []);
        setStalls(storedStalls ? JSON.parse(storedStalls) : []);
        setSpeakers(storedSpeakers ? JSON.parse(storedSpeakers) : []);
        setSponsors(storedSponsors ? JSON.parse(storedSponsors) : []);
      }
    } catch (err) {
      console.error(err);
      setEvents([]);
      setStalls([]);
      setSpeakers([]);
      setSponsors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#1e2238]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-indigo-500/20">
                E
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Evolvia Dashboard
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Live
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">IEDC CEV Event Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#11131f] border border-[#1e2238] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex space-x-1 border-t border-[#1e2238]/60 overflow-x-auto py-2">
            <button
              onClick={() => setActiveTab("events")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "events"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Events & Pre-Events</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("stalls")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "stalls"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Stalls & Expos</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
                {stalls.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("speakers")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "speakers"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Speakers</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
                {speakers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sponsors")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "sponsors"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sponsors</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
                {sponsors.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === "events" && (
          <EventsManager events={events} onRefresh={loadData} />
        )}
        {activeTab === "stalls" && (
          <StallsManager stalls={stalls} onRefresh={loadData} />
        )}
        {activeTab === "speakers" && (
          <SpeakersManager speakers={speakers} onRefresh={loadData} />
        )}
        {activeTab === "sponsors" && (
          <SponsorsManager sponsors={sponsors} onRefresh={loadData} />
        )}
      </main>
    </div>
  );
}
