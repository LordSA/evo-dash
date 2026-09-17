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
  Search,
  ExternalLink,
  Calendar,
  MapPin,
  Tag,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
  AlertTriangle
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
        showToast("Image uploaded", "success");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, [targetField]: reader.result as string }));
          showToast("Image loaded", "info");
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
      showToast("Title is required", "error");
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
          showToast("Event updated", "success");
        } else {
          const { error } = await supabase.from("events").insert([payload]);
          if (error) throw error;
          showToast("Event created", "success");
        }
      } else {
        const stored = localStorage.getItem("evolvia_events");
        const list: EventItem[] = stored ? JSON.parse(stored) : [];
        if (editingEvent) {
          const updated = list.map(item =>
            item.id === editingEvent.id ? ({ ...item, ...payload } as EventItem) : item
          );
          localStorage.setItem("evolvia_events", JSON.stringify(updated));
          showToast("Event updated", "success");
        } else {
          const newItem: EventItem = {
            id: `evt-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as EventItem;
          list.push(newItem);
          localStorage.setItem("evolvia_events", JSON.stringify(list));
          showToast("Event created", "success");
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      showToast("Error saving: " + getErrorMessage(err), "error");
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
          ? `${event.name}: ${nextVal ? "Marked completed" : "Marked incomplete"}`
          : `${event.name}: ${nextVal ? "Registration closed" : "Registration opened"}`,
        "info"
      );
      onRefresh();
    } catch (err: unknown) {
      showToast("Error updating status: " + getErrorMessage(err), "error");
    }
  };

  const handleOrderChange = async (event: EventItem, direction: "up" | "down") => {
    const currIndex = events.findIndex(e => e.id === event.id);
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= events.length) return;

    const targetEvent = events[targetIndex];
    const newCurrOrder = targetEvent.order_index;
    const newTargetOrder = event.order_index;

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
      showToast("Error updating order: " + getErrorMessage(err), "error");
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
    showToast("Link copied", "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#12141d] p-3.5 rounded-xl border border-[#1f2336]">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg admin-input"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#0e1017] p-1 rounded-lg border border-[#1f2336]">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === "all" ? "bg-[#1e2338] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("main_event")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === "main_event" ? "bg-[#1e2338] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Main
            </button>
            <button
              onClick={() => setFilterType("pre_event")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === "pre_event" ? "bg-[#1e2338] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Pre-Events
            </button>
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as unknown as "all" | "live" | "closed" | "completed")}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium admin-input"
          >
            <option value="all">All Status</option>
            <option value="live">Registration Live</option>
            <option value="closed">Registration Closed</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* View Toggle & Add Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-[#0e1017] p-1 rounded-lg border border-[#1f2336]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded transition-colors ${
                viewMode === "grid" ? "bg-[#1e2338] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1 rounded transition-colors ${
                viewMode === "table" ? "bg-[#1e2338] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => handleOpenAddModal("pre_event")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Pre-Event</span>
          </button>

          <button
            onClick={() => handleOpenAddModal("main_event")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Main Event</span>
          </button>
        </div>
      </div>

      {/* Events List / Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-[#12141d] rounded-xl p-12 text-center border border-[#1f2336]">
          <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <h3 className="text-sm font-semibold text-white mb-1">No Events Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            {searchQuery || filterType !== "all" || filterStatus !== "all"
              ? "No events match the selected filters."
              : "No events added yet."}
          </p>
          <button
            onClick={() => handleOpenAddModal("main_event")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Add Main Event
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => {
            const isPre = event.type === "pre_event";
            return (
              <div
                key={event.id}
                className="bg-[#12141d] border border-[#1f2336] hover:border-[#2b314a] rounded-xl p-3.5 flex flex-col justify-between transition-colors"
              >
                <div>
                  {/* Top Badges & Reorder */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isPre
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {isPre ? "Pre-Event" : "Main Event"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#0e1017] border border-[#1f2336]">
                        #{event.order_index}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 bg-[#0e1017] rounded border border-[#1f2336]">
                      <button
                        onClick={() => handleOrderChange(event, "up")}
                        title="Move Up"
                        className="p-1 hover:text-white text-slate-400 transition-colors"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleOrderChange(event, "down")}
                        title="Move Down"
                        className="p-1 hover:text-white text-slate-400 transition-colors"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Poster Thumbnail */}
                  <div className={`relative rounded-lg overflow-hidden bg-black/50 border border-white/5 mb-3 ${
                    isPre ? "aspect-[3/4] max-h-44 mx-auto" : "aspect-video"
                  }`}>
                    {event.poster_url ? (
                      <img
                        src={event.poster_url}
                        alt={event.name}
                        className={`w-full h-full object-cover ${
                          event.is_completed ? "grayscale opacity-80" : ""
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                        <span>No Image</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {event.is_completed && (
                        <span className="px-1.5 py-0.5 rounded bg-black/80 text-emerald-400 text-[10px] font-medium">
                          Completed
                        </span>
                      )}
                      {event.is_closed && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[10px] font-medium">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Info */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {event.name}
                    </h4>
                    {event.spec && (
                      <p className="text-xs text-indigo-400 font-medium truncate">
                        {event.spec}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  {(event.date_time || event.venue) && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#1f2336] text-[11px] text-slate-400 space-y-0.5">
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
                </div>

                {/* Bottom Inline Toggles & Actions */}
                <div className="mt-3.5 pt-2.5 border-t border-[#1f2336] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleInlineToggle(event, "is_completed")}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        event.is_completed
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-[#0e1017] text-slate-400 border-[#1f2336] hover:text-white"
                      }`}
                    >
                      {event.is_completed ? "Completed" : "Mark Done"}
                    </button>

                    <button
                      onClick={() => handleInlineToggle(event, "is_closed")}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        event.is_closed
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : "bg-[#0e1017] text-slate-400 border-[#1f2336] hover:text-white"
                      }`}
                    >
                      {event.is_closed ? "Closed" : "Live"}
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {event.link && (
                      <button
                        onClick={() => copyToClipboard(event.link!, event.id)}
                        title="Copy Link"
                        className="p-1 rounded text-slate-400 hover:text-white"
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
                      title="Edit"
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => confirmDelete(event)}
                      title="Delete"
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
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
        /* Table View */
        <div className="bg-[#12141d] rounded-xl overflow-hidden border border-[#1f2336]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0e1017] text-slate-400 text-[11px] font-medium border-b border-[#1f2336]">
                <tr>
                  <th className="py-2.5 px-3.5 w-16">Order</th>
                  <th className="py-2.5 px-3.5">Title</th>
                  <th className="py-2.5 px-3.5">Type</th>
                  <th className="py-2.5 px-3.5">Date & Venue</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2336]">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-slate-400">
                      #{event.order_index}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <p className="font-semibold text-white">{event.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{event.slug}</p>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="text-[11px] text-slate-300">
                        {event.type === "pre_event" ? "Pre-Event" : "Main Event"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">
                      {event.date_time || "—"} {event.venue ? `(${event.venue})` : ""}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          event.is_completed ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500"
                        }`}>
                          {event.is_completed ? "Completed" : "Active"}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          event.is_closed ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {event.is_closed ? "Closed" : "Live"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(event)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(event)}
                          className="p-1 text-slate-400 hover:text-rose-400"
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

      {/* Delete Modal */}
      {isDeleteModalOpen && deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#12141d] border border-[#1f2336] rounded-xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-white">Delete Event</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete <strong>"{deletingEvent.name}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#12141d] border border-[#1f2336] rounded-2xl max-w-4xl w-full overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#1f2336] flex items-center justify-between bg-[#0e1017]">
              <h3 className="text-sm font-bold text-white">
                {editingEvent ? "Edit Event" : "New Event"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Form */}
              <form onSubmit={handleSave} className="lg:col-span-7 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Event Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: "main_event" }))}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                        formData.type === "main_event"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-[#0e1017] border-[#1f2336] text-slate-400 hover:text-white"
                      }`}
                    >
                      Main Event (16:9 Banner)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: "pre_event" }))}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                        formData.type === "pre_event"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-[#0e1017] border-[#1f2336] text-slate-400 hover:text-white"
                      }`}
                    >
                      Pre-Event (3:4 Poster)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Event title"
                      value={formData.name || ""}
                      onChange={handleNameChange}
                      className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      placeholder="event-slug"
                      value={formData.slug || ""}
                      onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg admin-input font-mono text-indigo-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Specification / Subtitle
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24-Hour Hackathon"
                    value={formData.spec || ""}
                    onChange={e => setFormData(prev => ({ ...prev, spec: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Event description..."
                    value={formData.description || ""}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg admin-input resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Oct 12, 10:00 AM"
                      value={formData.date_time || ""}
                      onChange={e => setFormData(prev => ({ ...prev, date_time: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Venue
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Auditorium"
                      value={formData.venue || ""}
                      onChange={e => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Registration Link URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.link || ""}
                    onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                  />
                </div>

                {/* Poster */}
                <div className="p-3 rounded-lg bg-[#0e1017] border border-[#1f2336] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Poster Image ({formData.type === "pre_event" ? "3:4" : "16:9"})
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
                      placeholder="Image URL..."
                      value={formData.poster_url || ""}
                      onChange={e => setFormData(prev => ({ ...prev, poster_url: e.target.value }))}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg admin-input"
                    />
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f2336] hover:bg-[#2a3048] text-slate-200 flex items-center gap-1 shrink-0 transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleFileUpload(e, "poster_url")}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {formData.type === "pre_event" && (
                    <div className="pt-2 border-t border-[#1f2336] space-y-1.5">
                      <span className="text-[11px] font-medium text-slate-400">
                        Completed Poster (Hover State)
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Completed poster URL..."
                          value={formData.completed_poster_url || ""}
                          onChange={e => setFormData(prev => ({ ...prev, completed_poster_url: e.target.value }))}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg admin-input"
                        />
                        <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f2336] hover:bg-[#2a3048] text-slate-200 flex items-center gap-1 shrink-0 transition-colors">
                          <Upload className="w-3 h-3" />
                          <span>Upload</span>
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

                {/* Status & Order */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0e1017] border border-[#1f2336] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_completed)}
                      onChange={e => setFormData(prev => ({ ...prev, is_completed: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-xs font-medium text-slate-300">Completed</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0e1017] border border-[#1f2336] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_closed)}
                      onChange={e => setFormData(prev => ({ ...prev, is_closed: e.target.checked }))}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                    <span className="text-xs font-medium text-slate-300">Reg. Closed</span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.order_index ?? 0}
                      onChange={e => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg admin-input font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1f2336] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingEvent ? "Save" : "Create"}</span>
                  </button>
                </div>
              </form>

              {/* Preview */}
              <div className="lg:col-span-5">
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
