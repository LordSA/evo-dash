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
import { ToastProvider, useToast } from "@/components/ToastContext";

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<"events" | "stalls" | "speakers" | "sponsors">("events");
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [stalls, setStalls] = useState<StallExpo[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const { showToast } = useToast();

  const loadData = useCallback(async (notify = false) => {
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
        const storedEvents = typeof window !== "undefined" ? localStorage.getItem("evolvia_events") : null;
        const storedStalls = typeof window !== "undefined" ? localStorage.getItem("evolvia_stalls") : null;
        const storedSpeakers = typeof window !== "undefined" ? localStorage.getItem("evolvia_speakers") : null;
        const storedSponsors = typeof window !== "undefined" ? localStorage.getItem("evolvia_sponsors") : null;

        setEvents(storedEvents ? JSON.parse(storedEvents) : []);
        setStalls(storedStalls ? JSON.parse(storedStalls) : []);
        setSpeakers(storedSpeakers ? JSON.parse(storedSpeakers) : []);
        setSponsors(storedSponsors ? JSON.parse(storedSponsors) : []);
      }

      if (notify) {
        showToast("Data refreshed", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to refresh data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col">
        <header className="sticky top-0 z-40 bg-[#0e1017] border-b border-[#1f2336]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">
                  Evolvia Admin
                </h1>
                <p className="text-xs text-slate-400">Event and Content Manager</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col">
      {/* Simple, Standard Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0e1017] border-b border-[#1f2336]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                Evolvia Admin
              </h1>
              <p className="text-xs text-slate-400">Event and Content Manager</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(true)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#151824] hover:bg-[#1a1e2e] border border-[#1f2336] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Simple Tab Bar */}
          <nav className="flex space-x-1 border-t border-[#1f2336] overflow-x-auto py-2">
            <button
              onClick={() => setActiveTab("events")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                activeTab === "events"
                  ? "bg-[#1e2338] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Events</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/40 text-slate-400">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("stalls")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                activeTab === "stalls"
                  ? "bg-[#1e2338] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Stalls</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/40 text-slate-400">
                {stalls.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("speakers")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                activeTab === "speakers"
                  ? "bg-[#1e2338] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Speakers</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/40 text-slate-400">
                {speakers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sponsors")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                activeTab === "sponsors"
                  ? "bg-[#1e2338] text-white font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sponsors</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/40 text-slate-400">
                {sponsors.length}
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === "events" && (
          <EventsManager events={events} onRefresh={() => loadData(false)} />
        )}
        {activeTab === "stalls" && (
          <StallsManager stalls={stalls} onRefresh={() => loadData(false)} />
        )}
        {activeTab === "speakers" && (
          <SpeakersManager speakers={speakers} onRefresh={() => loadData(false)} />
        )}
        {activeTab === "sponsors" && (
          <SponsorsManager sponsors={sponsors} onRefresh={() => loadData(false)} />
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
