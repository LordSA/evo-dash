"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  Store, 
  Users, 
  ShieldCheck, 
  RefreshCw,
  Database,
  Radio,
  Download,
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles
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

        if (evRes.error) console.warn("Supabase events error:", evRes.error);
        if (stRes.error) console.warn("Supabase stalls error:", stRes.error);

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

      if (notify) {
        showToast("Dashboard synchronized successfully", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Error refreshing dashboard data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Export JSON backup
  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      events,
      stalls,
      speakers,
      sponsors,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolvia-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported successfully", "info");
  };

  // Compute metrics
  const preEventsCount = events.filter(e => e.type === "pre_event").length;
  const mainEventsCount = events.filter(e => e.type === "main_event").length;
  const completedEventsCount = events.filter(e => e.is_completed).length;
  const closedRegistrationsCount = events.filter(e => e.is_closed).length;

  return (
    <div className="min-h-screen bg-[#08090e] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#08090e]/85 backdrop-blur-xl border-b border-[#1a1e32]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo & Branding */}
            <div className="flex items-center gap-3.5">
              <div className="relative group">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105">
                  E
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#08090e] ring-2 ring-emerald-500/20 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-extrabold text-white tracking-tight">
                    Evolvia Admin Console
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isSupabaseConfigured 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    {isSupabaseConfigured ? "Supabase Live" : "LocalStorage Mode"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">IEDC CEV Flagship Platform Management</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExportBackup}
                title="Download JSON Backup"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#0f111d] hover:bg-[#151828] border border-[#1e2238] transition-all hover:border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => loadData(true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Sync Data</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 border-t border-[#1a1e32] overflow-x-auto py-2.5 scrollbar-none">
            <button
              onClick={() => setActiveTab("events")}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "events"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-white hover:bg-[#121424]"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Events & Pre-Events</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === "events" ? "bg-black/40 text-white" : "bg-[#181c30] text-slate-400"
              }`}>
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("stalls")}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "stalls"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-white hover:bg-[#121424]"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Stalls & Expos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === "stalls" ? "bg-black/40 text-white" : "bg-[#181c30] text-slate-400"
              }`}>
                {stalls.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("speakers")}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "speakers"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-white hover:bg-[#121424]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Keynote Speakers</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === "speakers" ? "bg-black/40 text-white" : "bg-[#181c30] text-slate-400"
              }`}>
                {speakers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sponsors")}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "sponsors"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-white hover:bg-[#121424]"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sponsors & Partners</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === "sponsors" ? "bg-black/40 text-white" : "bg-[#181c30] text-slate-400"
              }`}>
                {sponsors.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
        {/* KPI Metrics Banner */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mb-8">
          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Events</span>
              <Calendar className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {events.length}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                ({preEventsCount} Pre / {mainEventsCount} Main)
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {completedEventsCount} Done
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400 font-semibold">
                {closedRegistrationsCount} Closed
              </span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Stalls & Expos</span>
              <Store className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {stalls.length}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Showcase units</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 truncate">
              Robotics, startups & makers
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Keynote Speakers</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {speakers.length}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Distinguished guests</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 truncate">
              Tech leaders & entrepreneurs
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Brand Partners</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {sponsors.length}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Sponsors active</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 truncate">
              Title & Associate tiers
            </p>
          </div>
        </section>

        {/* Tab Content Components */}
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
