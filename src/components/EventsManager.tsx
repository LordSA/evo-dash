"use client";

import React, { useState } from "react";
import { EventItem, EventType } from "@/types/database";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Loader2, 
  Sparkles, 
  Search,
  Filter,
  ExternalLink,
  Layers,
  Calendar,
  MapPin,
  Tag
} from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile } from "@/lib/supabase";
import EventCardPreview from "./EventCardPreview";

interface Props {
  events: EventItem[];
  onRefresh: () => void;
}

export default function EventsManager({ events, onRefresh }: Props) {
  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingCompletedPoster, setUploadingCompletedPoster] = useState(false);

  const [formData, setFormData] = useState<Partial<EventItem>>({
    name: "",
    slug: "",
    type: "main_event",
    description: "",
    spec: "",
    date_time: "",
    venue: "",
    link: "",
    poster_url: "",
    completed_poster_url: "",
    is_completed: false,
    is_closed: false,
    order_index: 0,
  });

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleOpenAddModal = (type: EventType = "main_event") => {
    setEditingEvent(null);
    setFormData({
      name: "",
      slug: "",
      type: type,
      description: "",
      spec: "",
      date_time: "",
      venue: "",
      link: "",
      poster_url: "",
      completed_poster_url: "",
      is_completed: false,
      is_closed: false,
      order_index: events.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setFormData({ ...event });
    setIsModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingEvent ? prev.slug : slugify(name),
    }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: "poster_url" | "completed_poster_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setLoader = targetField === "poster_url" 
      ? setUploadingPoster 
      : setUploadingCompletedPoster;

    try {
      setLoader(true);
      if (isSupabaseConfigured) {
        const publicUrl = await uploadMediaFile(file, "posters");
        setFormData(prev => ({ ...prev, [targetField]: publicUrl }));
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, [targetField]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      alert("Failed to upload image: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoader(false);
    }
  };

  const handleToggleComplete = async (event: EventItem) => {
    const nextState = !event.is_completed;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from("events")
        .update({ is_completed: nextState, updated_at: new Date().toISOString() })
        .eq("id", event.id);
      if (error) {
        alert("Failed to update status: " + error.message);
        return;
      }
    } else {
      const localEvents = JSON.parse(localStorage.getItem("evolvia_events") || "[]");
      const updated = localEvents.map((ev: EventItem) => 
        ev.id === event.id ? { ...ev, is_completed: nextState } : ev
      );
      localStorage.setItem("evolvia_events", JSON.stringify(updated));
    }
    onRefresh();
  };

  const handleToggleClosed = async (event: EventItem) => {
    const nextState = !event.is_closed;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from("events")
        .update({ is_closed: nextState, updated_at: new Date().toISOString() })
        .eq("id", event.id);
      if (error) {
        alert("Failed to update registration status: " + error.message);
        return;
      }
    } else {
      const localEvents = JSON.parse(localStorage.getItem("evolvia_events") || "[]");
      const updated = localEvents.map((ev: EventItem) => 
        ev.id === event.id ? { ...ev, is_closed: nextState } : ev
      );
      localStorage.setItem("evolvia_events", JSON.stringify(updated));
    }
    onRefresh();
  };

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) {
        alert("Failed to delete event: " + error.message);
        return;
      }
    } else {
      const localEvents = JSON.parse(localStorage.getItem("evolvia_events") || "[]");
      const updated = localEvents.filter((ev: EventItem) => ev.id !== id);
      localStorage.setItem("evolvia_events", JSON.stringify(updated));
    }
    onRefresh();
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.slug?.trim()) {
      alert("Name and Slug are required.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        type: formData.type || "main_event",
        description: formData.description || "",
        spec: formData.spec || "",
        date_time: formData.date_time || "",
        venue: formData.venue || "",
        link: formData.link || "",
        poster_url: formData.poster_url || "",
        completed_poster_url: formData.completed_poster_url || "",
        is_completed: Boolean(formData.is_completed),
        is_closed: Boolean(formData.is_closed),
        order_index: Number(formData.order_index || 0),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        if (editingEvent) {
          const { error } = await supabase
            .from("events")
            .update(payload)
            .eq("id", editingEvent.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("events")
            .insert([payload]);
          if (error) throw error;
        }
      } else {
        const localEvents: EventItem[] = JSON.parse(localStorage.getItem("evolvia_events") || "[]");
        if (editingEvent) {
          const updated = localEvents.map(ev => 
            ev.id === editingEvent.id ? ({ ...ev, ...payload } as EventItem) : ev
          );
          localStorage.setItem("evolvia_events", JSON.stringify(updated));
        } else {
          const newEvent: EventItem = {
            id: `evt-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
          } as EventItem;
          localStorage.setItem("evolvia_events", JSON.stringify([...localEvents, newEvent]));
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      alert("Save failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEvents = events
    .filter(ev => {
      if (filterType !== "all" && ev.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ev.name.toLowerCase().includes(q) ||
          ev.slug.toLowerCase().includes(q) ||
          (ev.venue && ev.venue.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11131f] border border-[#1e2238] p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" /> Events Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create and edit both Pre-events and Main Events, posters, completion statuses, and slugs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal("pre_event")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Pre-Event
          </button>
          <button
            onClick={() => handleOpenAddModal("main_event")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Add Main Event
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d0f1a] border border-[#1e2238] p-3 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by name, slug, venue..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#11131f] border border-[#1e2238] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white bg-[#11131f] border border-[#1e2238]"
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            onClick={() => setFilterType("main_event")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === "main_event"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white bg-[#11131f] border border-[#1e2238]"
            }`}
          >
            Main Events ({events.filter(e => e.type === "main_event").length})
          </button>
          <button
            onClick={() => setFilterType("pre_event")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === "pre_event"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white bg-[#11131f] border border-[#1e2238]"
            }`}
          >
            Pre-Events ({events.filter(e => e.type === "pre_event").length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map(event => (
          <div
            key={event.id}
            className="group bg-[#11131f] border border-[#1e2238] hover:border-[#2a3050] rounded-xl p-4 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    event.type === "pre_event"
                      ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                      : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  }`}
                >
                  {event.type === "pre_event" ? "Pre-Event" : "Main Event"}
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-mono">#{event.order_index}</span>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/40 border border-[#1e2238] shrink-0 relative">
                  {event.poster_url ? (
                    <img
                      src={event.poster_url}
                      alt={event.name}
                      className={`w-full h-full object-cover ${
                        event.is_completed ? "grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  )}
                  {event.is_completed && (
                    <div className="absolute top-1 left-1 bg-indigo-500/80 text-[8px] text-white px-1 rounded font-semibold">
                      Done
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate" title={event.name}>
                    {event.name}
                  </h3>
                  <p className="text-[11px] font-mono text-indigo-400 truncate">
                    /{event.slug}
                  </p>
                  {event.spec && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {event.spec}
                    </p>
                  )}
                  {event.venue && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {event.venue}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e2238] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleComplete(event)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    event.is_completed
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {event.is_completed ? "Completed" : "Mark Done"}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleClosed(event)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    event.is_closed
                      ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  }`}
                >
                  {event.is_closed ? (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Reg Closed
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reg Open
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  onClick={() => handleOpenEditModal(event)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Edit Event"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteEvent(event.id, event.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-16 bg-[#11131f] border border-[#1e2238] rounded-2xl">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-medium">No events found</p>
          <p className="text-xs text-slate-500 mt-1">Try changing the filter or create a new event.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl max-w-4xl w-full p-6 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2238] mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure event details, posters, completion status, and dynamic URLs.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ?
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleSaveForm} className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Event Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: "main_event" }))}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        formData.type === "main_event"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-[#0d0f1a] border-[#1e2238] text-slate-400 hover:text-white"
                      }`}
                    >
                      Main Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: "pre_event" }))}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        formData.type === "pre_event"
                          ? "bg-purple-600/20 border-purple-500 text-purple-300"
                          : "bg-[#0d0f1a] border-[#1e2238] text-slate-400 hover:text-white"
                      }`}
                    >
                      Pre-Event
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Event Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Confluence / BIT'BURST"
                      value={formData.name || ""}
                      onChange={handleNameChange}
                      className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. confluence"
                      value={formData.slug || ""}
                      onChange={e => setFormData(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                      className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief overview or description..."
                    value={formData.description || ""}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Specification / Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Only for CEV Students"
                      value={formData.spec || ""}
                      onChange={e => setFormData(prev => ({ ...prev, spec: e.target.value }))}
                      className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="text"
                      placeholder="Oct 08 2025 | 9 AM"
                      value={formData.date_time || ""}
                      onChange={e => setFormData(prev => ({ ...prev, date_time: e.target.value }))}
                      className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Venue
                    </label>
                    <input
                      type="text"
                      placeholder="Lyra | CEV"
                      value={formData.venue || ""}
                      onChange={e => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                      className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Registration Link
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={formData.link || ""}
                      onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                      className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Display Order Index
                    </label>
                    <input
                      type="number"
                      value={formData.order_index ?? 0}
                      onChange={e => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                      className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="bg-[#0d0f1a] border border-[#1e2238] p-3 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Primary Poster Image</span>
                      {uploadingPoster && (
                        <span className="text-indigo-400 flex items-center gap-1 text-[11px]">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Image URL (e.g. /events/poster.webp or https://...)"
                        value={formData.poster_url || ""}
                        onChange={e => setFormData(prev => ({ ...prev, poster_url: e.target.value }))}
                        className="flex-1 bg-[#11131f] border border-[#1e2238] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg flex items-center gap-1 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleFileUpload(e, "poster_url")}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-[#0d0f1a] border border-[#1e2238] p-3 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Completed Poster (Hover State)</span>
                      {uploadingCompletedPoster && (
                        <span className="text-indigo-400 flex items-center gap-1 text-[11px]">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Image URL for completed state"
                        value={formData.completed_poster_url || ""}
                        onChange={e => setFormData(prev => ({ ...prev, completed_poster_url: e.target.value }))}
                        className="flex-1 bg-[#11131f] border border-[#1e2238] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg flex items-center gap-1 font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleFileUpload(e, "completed_poster_url")}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 p-3 bg-[#0d0f1a] border border-[#1e2238] rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_completed)}
                      onChange={e => setFormData(prev => ({ ...prev, is_completed: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">Mark as Completed</span>
                      <span className="text-[10px] text-slate-400">Shows completed badge / state</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-[#0d0f1a] border border-[#1e2238] rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_closed)}
                      onChange={e => setFormData(prev => ({ ...prev, is_closed: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">Registration Closed</span>
                      <span className="text-[10px] text-slate-400">Disables registration cta</span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1e2238]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingEvent ? "Save Changes" : "Create Event"}
                  </button>
                </div>
              </form>

              <div className="lg:col-span-5 flex flex-col justify-start">
                <EventCardPreview event={formData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
