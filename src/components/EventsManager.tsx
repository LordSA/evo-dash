"use client";

import React, { useState, useMemo } from "react";
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
  Tag,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
  Eye,
  AlertTriangle,
  Flame
} from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile, getErrorMessage } from "@/lib/supabase";
import { useToast } from "./ToastContext";
import EventCardPreview from "./EventCardPreview";

interface Props {
  events: EventItem[];
  onRefresh: () => void;
}

export default function EventsManager({ events, onRefresh }: Props) {
  const { showToast } = useToast();
  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "live" | "closed" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingCompletedPoster, setUploadingCompletedPoster] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        showToast("Poster image uploaded to Supabase", "success");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, [targetField]: reader.result as string }));
          showToast("Poster loaded (LocalStorage mode)", "info");
        };
        reader.readAsDataURL(file);
      }
    } catch (err: unknown) {
      showToast("Upload failed: " + getErrorMessage(err), "error");
    } finally {
      setLoader(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast("Event title is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const cleanSlug = formData.slug?.trim() || slugify(formData.name || "");
      const payload = {
        name: formData.name?.trim(),
        slug: cleanSlug,
        type: formData.type || "main_event",
        description: formData.description?.trim() || "",
        spec: formData.spec?.trim() || "",
        date_time: formData.date_time?.trim() || "",
        venue: formData.venue?.trim() || "",
        link: formData.link?.trim() || "",
        poster_url: formData.poster_url || "",
        completed_poster_url: formData.completed_poster_url || "",
        is_completed: Boolean(formData.is_completed),
        is_closed: Boolean(formData.is_closed),
        order_index: Number(formData.order_index) || 0,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        if (editingEvent) {
          const { error } = await supabase
            .from("events")
            .update(payload)
            .eq("id", editingEvent.id);
          if (error) throw error;
          showToast(`Updated "${formData.name}" successfully`, "success");
        } else {
          const { error } = await supabase.from("events").insert([payload]);
          if (error) throw error;
          showToast(`Created "${formData.name}" successfully`, "success");
        }
      } else {
        const stored = localStorage.getItem("evolvia_events");
        const list: EventItem[] = stored ? JSON.parse(stored) : [];
        if (editingEvent) {
          const updated = list.map(item =>
            item.id === editingEvent.id ? ({ ...item, ...payload } as EventItem) : item
          );
          localStorage.setItem("evolvia_events", JSON.stringify(updated));
          showToast(`Updated "${formData.name}" (LocalStorage)`, "success");
        } else {
          const newItem: EventItem = {
            id: `evt-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as EventItem;
          list.push(newItem);
          localStorage.setItem("evolvia_events", JSON.stringify(list));
          showToast(`Created "${formData.name}" (LocalStorage)`, "success");
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      showToast("Error saving event: " + getErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineToggle = async (event: EventItem, field: "is_completed" | "is_closed") => {
    const nextVal = !event[field];
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("events")
          .update({ [field]: nextVal, updated_at: new Date().toISOString() })
          .eq("id", event.id);
        if (error) throw error;
      } else {
        const stored = localStorage.getItem("evolvia_events");
        const list: EventItem[] = stored ? JSON.parse(stored) : [];
        const updated = list.map(item =>
          item.id === event.id ? { ...item, [field]: nextVal } : item
        );
        localStorage.setItem("evolvia_events", JSON.stringify(updated));
      }
      showToast(
        field === "is_completed"
          ? `${event.name}: ${nextVal ? "Marked as Completed" : "Marked as Incomplete"}`
          : `${event.name}: ${nextVal ? "Registration Closed" : "Registration Opened"}`,
        "info"
      );
      onRefresh();
    } catch (err: unknown) {
      showToast("Toggle error: " + getErrorMessage(err), "error");
    }
  };

  const handleOrderChange = async (event: EventItem, direction: "up" | "down") => {
    const currIndex = events.findIndex(e => e.id === event.id);
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= events.length) return;

    const targetEvent = events[targetIndex];
    const newCurrOrder = targetEvent.order_index;
    const newTargetOrder = event.order_index === targetEvent.order_index 
      ? (direction === "up" ? targetEvent.order_index + 1 : targetEvent.order_index - 1)
      : event.order_index;

    try {
      if (isSupabaseConfigured) {
        await Promise.all([
          supabase.from("events").update({ order_index: newCurrOrder }).eq("id", event.id),
          supabase.from("events").update({ order_index: newTargetOrder }).eq("id", targetEvent.id),
        ]);
      } else {
        const stored = localStorage.getItem("evolvia_events");
        const list: EventItem[] = stored ? JSON.parse(stored) : [];
        const updated = list.map(item => {
          if (item.id === event.id) return { ...item, order_index: newCurrOrder };
          if (item.id === targetEvent.id) return { ...item, order_index: newTargetOrder };
          return item;
        });
        localStorage.setItem("evolvia_events", JSON.stringify(updated));
      }
      showToast("Order updated", "info");
      onRefresh();
    } catch (err: unknown) {
      showToast("Order error: " + getErrorMessage(err), "error");
    }
  };

  const confirmDelete = (event: EventItem) => {
    setDeletingEvent(event);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("events").delete().eq("id", deletingEvent.id);
        if (error) throw error;
      } else {
        const stored = localStorage.getItem("evolvia_events");
        const list: EventItem[] = stored ? JSON.parse(stored) : [];
        const updated = list.filter(item => item.id !== deletingEvent.id);
        localStorage.setItem("evolvia_events", JSON.stringify(updated));
      }
      showToast(`Deleted "${deletingEvent.name}"`, "info");
      setIsDeleteModalOpen(false);
      setDeletingEvent(null);
      onRefresh();
    } catch (err: unknown) {
      showToast("Delete failed: " + getErrorMessage(err), "error");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Copied to clipboard", "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered & Sorted events
  const filteredEvents = useMemo(() => {
    return events
      .filter(item => {
        if (filterType !== "all" && item.type !== filterType) return false;
        if (filterStatus === "live" && (item.is_closed || item.is_completed)) return false;
        if (filterStatus === "closed" && !item.is_closed) return false;
        if (filterStatus === "completed" && !item.is_completed) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.slug?.toLowerCase().includes(q) ||
            item.venue?.toLowerCase().includes(q) ||
            item.spec?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [events, filterType, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, spec, venue or slug..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl glass-input placeholder:text-slate-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-[#0d0f1a] p-1 rounded-xl border border-[#1e2238]">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType("main_event")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === "main_event" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Main Events
            </button>
            <button
              onClick={() => setFilterType("pre_event")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === "pre_event" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Pre-Events
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as unknown as "all" | "live" | "closed" | "completed")}
            className="px-3 py-2 rounded-xl text-xs font-medium glass-input"
          >
            <option value="all">All Statuses</option>
            <option value="live">Registration Live</option>
            <option value="closed">Registration Closed</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* View Toggle & Add Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center bg-[#0d0f1a] p-1 rounded-xl border border-[#1e2238]">
            <button
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Compact Table View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleOpenAddModal("pre_event")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Pre-Event</span>
          </button>

          <button
            onClick={() => handleOpenAddModal("main_event")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Main Event</span>
          </button>
        </div>
      </div>

      {/* Events Display */}
      {filteredEvents.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600 animate-pulse" />
          <h3 className="text-base font-bold text-white mb-1">No Events Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery || filterType !== "all" || filterStatus !== "all"
              ? "No events match the current search or filter criteria. Try resetting filters."
              : "No events have been added yet. Create your first pre-event or main event to showcase on Evolvia."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleOpenAddModal("main_event")}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all"
            >
              Create Main Event
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(event => {
            const isPre = event.type === "pre_event";
            return (
              <div
                key={event.id}
                className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Top Badges & Reorder Controls */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPre
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25"
                      }`}>
                        {isPre ? "Pre-Event" : "Main Event"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-[#0d0f1a] border border-[#1e2238]">
                        #{event.order_index}
                      </span>
                    </div>

                    {/* Order Up / Down */}
                    <div className="flex items-center gap-0.5 bg-[#0d0f1a] rounded-lg border border-[#1e2238] p-0.5">
                      <button
                        onClick={() => handleOrderChange(event, "up")}
                        title="Move Up"
                        className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleOrderChange(event, "down")}
                        title="Move Down"
                        className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Poster Preview */}
                  <div className={`relative rounded-xl overflow-hidden bg-black/60 border border-white/5 mb-3.5 ${
                    isPre ? "aspect-[3/4] max-h-48 mx-auto" : "aspect-video"
                  }`}>
                    {event.poster_url ? (
                      <img
                        src={event.poster_url}
                        alt={event.name}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          event.is_completed ? "grayscale brightness-90" : ""
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs">
                        <Sparkles className="w-6 h-6 mb-1 opacity-30 text-indigo-400" />
                        <span>No Poster</span>
                      </div>
                    )}

                    {/* Overlay Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {event.is_completed && (
                        <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Completed
                        </span>
                      )}
                      {event.is_closed && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-950/80 backdrop-blur-md text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Closed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Specs */}
                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {event.name}
                    </h4>

                    {event.spec && (
                      <p className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{event.spec}</span>
                      </p>
                    )}

                    {event.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Meta Details */}
                  <div className="mt-3 pt-3 border-t border-[#1e2238] space-y-1 text-[11px] text-slate-400">
                    {event.date_time && (
                      <div className="flex items-center gap-1.5 text-slate-300 truncate">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{event.date_time}</span>
                      </div>
                    )}
                    {event.venue && (
                      <div className="flex items-center gap-1.5 text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Inline Toggles & Actions */}
                <div className="mt-4 pt-3 border-t border-[#1e2238] flex items-center justify-between gap-2">
                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleInlineToggle(event, "is_completed")}
                      title={event.is_completed ? "Mark as Incomplete" : "Mark as Completed"}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                        event.is_completed
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-[#0d0f1a] text-slate-400 border-[#1e2238] hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{event.is_completed ? "Done" : "Mark Done"}</span>
                    </button>

                    <button
                      onClick={() => handleInlineToggle(event, "is_closed")}
                      title={event.is_closed ? "Open Registration" : "Close Registration"}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                        event.is_closed
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-[#0d0f1a] text-slate-400 border-[#1e2238] hover:text-white"
                      }`}
                    >
                      <XCircle className="w-3 h-3" />
                      <span>{event.is_closed ? "Closed" : "Live"}</span>
                    </button>
                  </div>

                  {/* Actions (Edit, Delete, Copy Link) */}
                  <div className="flex items-center gap-1">
                    {event.link && (
                      <button
                        onClick={() => copyToClipboard(event.link!, event.id)}
                        title="Copy Registration Link"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                      >
                        {copiedId === event.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(event)}
                      title="Edit Event"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => confirmDelete(event)}
                      title="Delete Event"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="glass-panel rounded-2xl overflow-hidden border border-[#1e2238]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0d0f1a] text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-[#1e2238]">
                <tr>
                  <th className="py-3 px-4 w-16">Order</th>
                  <th className="py-3 px-4">Event Name & Spec</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date & Venue</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2238]/60">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-400">#{event.order_index}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleOrderChange(event, "up")}
                            className="text-slate-500 hover:text-indigo-400"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOrderChange(event, "down")}
                            className="text-slate-500 hover:text-indigo-400"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {event.poster_url && (
                          <img
                            src={event.poster_url}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover bg-black/40 border border-white/10 shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-bold text-white text-sm">{event.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{event.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        event.type === "pre_event"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {event.type === "pre_event" ? "Pre-Event" : "Main Event"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-200">{event.date_time || "—"}</p>
                      <p className="text-slate-500 text-[11px]">{event.venue || "—"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleInlineToggle(event, "is_completed")}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            event.is_completed
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-white/5 text-slate-400 border-white/10"
                          }`}
                        >
                          {event.is_completed ? "Completed" : "Active"}
                        </button>
                        <button
                          onClick={() => handleInlineToggle(event, "is_closed")}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            event.is_closed
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {event.is_closed ? "Closed" : "Live"}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(event)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-white/5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(event)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f111d] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Event</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#08090e] p-3 rounded-xl border border-[#1e2238]">
              Are you sure you want to delete <strong className="text-white">"{deletingEvent.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal with Split-View Live Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="bg-[#0f111d] border border-[#1e2238] rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#1e2238] flex items-center justify-between bg-[#0b0d18]">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h3>
                <p className="text-xs text-slate-400">Configure event details and view live changes</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Modal Body (2 Columns: Form + Live Preview) */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Column */}
              <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
                {/* Event Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Event Classification
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: "main_event" }))}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        formData.type === "main_event"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/10"
                          : "bg-[#0d0f1a] border-[#1e2238] text-slate-400 hover:text-white"
                      }`}
                    >
                      Main Event (16:9 Banner)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: "pre_event" }))}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        formData.type === "pre_event"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-600/10"
                          : "bg-[#0d0f1a] border-[#1e2238] text-slate-400 hover:text-white"
                      }`}
                    >
                      Pre-Event (3:4 Poster)
                    </button>
                  </div>
                </div>

                {/* Name & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Event Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI Hackathon 2026"
                      value={formData.name || ""}
                      onChange={handleNameChange}
                      className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Slug identifier
                    </label>
                    <input
                      type="text"
                      placeholder="ai-hackathon"
                      value={formData.slug || ""}
                      onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-mono text-indigo-300"
                    />
                  </div>
                </div>

                {/* Spec Tagline */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Specification / Subtitle
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24-Hour National Hackathon"
                    value={formData.spec || ""}
                    onChange={e => setFormData(prev => ({ ...prev, spec: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detailed event overview..."
                    value={formData.description || ""}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl glass-input resize-none"
                  />
                </div>

                {/* Date/Time & Venue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Oct 12, 10:00 AM"
                      value={formData.date_time || ""}
                      onChange={e => setFormData(prev => ({ ...prev, date_time: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Venue / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Auditorium"
                      value={formData.venue || ""}
                      onChange={e => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                    />
                  </div>
                </div>

                {/* Registration Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Registration Link URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://makemypass.com/..."
                    value={formData.link || ""}
                    onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                  />
                </div>

                {/* Poster Upload Section */}
                <div className="p-4 rounded-2xl bg-[#08090e] border border-[#1e2238] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      Primary Poster ({formData.type === "pre_event" ? "3:4 Ratio" : "16:9 Banner"})
                    </span>
                    {uploadingPoster && (
                      <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste image URL or upload below..."
                      value={formData.poster_url || ""}
                      onChange={e => setFormData(prev => ({ ...prev, poster_url: e.target.value }))}
                      className="flex-1 px-3 py-2 text-xs rounded-xl glass-input"
                    />
                    <label className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e, "poster_url")}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Completed Poster for Pre-Events */}
                  {formData.type === "pre_event" && (
                    <div className="pt-2 border-t border-[#1e2238] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300">
                          Completed Poster (Hover State)
                        </span>
                        {uploadingCompletedPoster && (
                          <span className="text-[11px] text-amber-400 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Paste completed poster URL..."
                          value={formData.completed_poster_url || ""}
                          onChange={e => setFormData(prev => ({ ...prev, completed_poster_url: e.target.value }))}
                          className="flex-1 px-3 py-2 text-xs rounded-xl glass-input"
                        />
                        <label className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shrink-0 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Browse</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleFileUpload(e, "completed_poster_url")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Checkboxes & Order Index */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-[#08090e] border border-[#1e2238] cursor-pointer hover:border-indigo-500/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_completed)}
                      onChange={e => setFormData(prev => ({ ...prev, is_completed: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-xs font-semibold text-slate-300">Completed</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl bg-[#08090e] border border-[#1e2238] cursor-pointer hover:border-indigo-500/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_closed)}
                      onChange={e => setFormData(prev => ({ ...prev, is_closed: e.target.checked }))}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                    <span className="text-xs font-semibold text-slate-300">Reg. Closed</span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Display Sequence
                    </label>
                    <input
                      type="number"
                      value={formData.order_index ?? 0}
                      onChange={e => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input font-mono"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-[#1e2238] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingEvent ? "Save Changes" : "Create Event"}</span>
                  </button>
                </div>
              </form>

              {/* Live Card Preview Column */}
              <div className="lg:col-span-5 flex flex-col justify-start">
                <div className="sticky top-0">
                  <EventCardPreview event={formData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
