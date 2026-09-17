"use client";

import React, { useState, useMemo } from "react";
import { Speaker } from "@/types/database";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  Loader2, 
  Users, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  AlertTriangle,
  Briefcase,
  GraduationCap
} from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile, getErrorMessage } from "@/lib/supabase";
import { useToast } from "./ToastContext";

interface Props {
  speakers: Speaker[];
  onRefresh: () => void;
}

export default function SpeakersManager({ speakers, onRefresh }: Props) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSpeaker, setDeletingSpeaker] = useState<Speaker | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<Partial<Speaker>>({
    name: "",
    designation: "",
    expertise: "",
    image_url: "",
    order_index: 0,
  });

  const handleOpenAddModal = () => {
    setEditingSpeaker(null);
    setFormData({
      name: "",
      designation: "",
      expertise: "",
      image_url: "",
      order_index: speakers.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setFormData({ ...speaker });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      if (isSupabaseConfigured) {
        const publicUrl = await uploadMediaFile(file, "speakers");
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
        showToast("Speaker portrait uploaded successfully", "success");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result as string }));
          showToast("Portrait loaded (LocalStorage)", "info");
        };
        reader.readAsDataURL(file);
      }
    } catch (err: unknown) {
      showToast("Upload failed: " + getErrorMessage(err), "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast("Speaker name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        designation: formData.designation?.trim() || "",
        expertise: formData.expertise?.trim() || "",
        image_url: formData.image_url || "",
        order_index: Number(formData.order_index) || 0,
      };

      if (isSupabaseConfigured) {
        if (editingSpeaker) {
          const { error } = await supabase
            .from("speakers")
            .update(payload)
            .eq("id", editingSpeaker.id);
          if (error) throw error;
          showToast(`Updated speaker "${formData.name}"`, "success");
        } else {
          const { error } = await supabase.from("speakers").insert([payload]);
          if (error) throw error;
          showToast(`Added speaker "${formData.name}"`, "success");
        }
      } else {
        const stored = localStorage.getItem("evolvia_speakers");
        const list: Speaker[] = stored ? JSON.parse(stored) : [];
        if (editingSpeaker) {
          const updated = list.map(item =>
            item.id === editingSpeaker.id ? ({ ...item, ...payload } as Speaker) : item
          );
          localStorage.setItem("evolvia_speakers", JSON.stringify(updated));
          showToast(`Updated speaker "${formData.name}" (LocalStorage)`, "success");
        } else {
          const newItem: Speaker = {
            id: `speaker-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as Speaker;
          list.push(newItem);
          localStorage.setItem("evolvia_speakers", JSON.stringify(list));
          showToast(`Added speaker "${formData.name}" (LocalStorage)`, "success");
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      showToast("Save error: " + getErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderChange = async (speaker: Speaker, direction: "up" | "down") => {
    const currIndex = speakers.findIndex(s => s.id === speaker.id);
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= speakers.length) return;

    const targetSpeaker = speakers[targetIndex];
    const newCurrOrder = targetSpeaker.order_index;
    const newTargetOrder = speaker.order_index;

    try {
      if (isSupabaseConfigured) {
        await Promise.all([
          supabase.from("speakers").update({ order_index: newCurrOrder }).eq("id", speaker.id),
          supabase.from("speakers").update({ order_index: newTargetOrder }).eq("id", targetSpeaker.id),
        ]);
      } else {
        const stored = localStorage.getItem("evolvia_speakers");
        const list: Speaker[] = stored ? JSON.parse(stored) : [];
        const updated = list.map(item => {
          if (item.id === speaker.id) return { ...item, order_index: newCurrOrder };
          if (item.id === targetSpeaker.id) return { ...item, order_index: newTargetOrder };
          return item;
        });
        localStorage.setItem("evolvia_speakers", JSON.stringify(updated));
      }
      showToast("Speaker order updated", "info");
      onRefresh();
    } catch (err: unknown) {
      showToast("Order update error: " + getErrorMessage(err), "error");
    }
  };

  const confirmDelete = (speaker: Speaker) => {
    setDeletingSpeaker(speaker);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSpeaker) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("speakers").delete().eq("id", deletingSpeaker.id);
        if (error) throw error;
      } else {
        const stored = localStorage.getItem("evolvia_speakers");
        const list: Speaker[] = stored ? JSON.parse(stored) : [];
        const updated = list.filter(item => item.id !== deletingSpeaker.id);
        localStorage.setItem("evolvia_speakers", JSON.stringify(updated));
      }
      showToast(`Deleted "${deletingSpeaker.name}"`, "info");
      setIsDeleteModalOpen(false);
      setDeletingSpeaker(null);
      onRefresh();
    } catch (err: unknown) {
      showToast("Delete failed: " + getErrorMessage(err), "error");
    }
  };

  const filteredSpeakers = useMemo(() => {
    return speakers
      .filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.designation?.toLowerCase().includes(q) ||
          s.expertise?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [speakers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search keynote speakers and designations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl glass-input"
          />
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 shadow-lg shadow-indigo-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Speaker</span>
        </button>
      </div>

      {/* Grid Display */}
      {filteredSpeakers.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-600 animate-pulse" />
          <h3 className="text-base font-bold text-white mb-1">No Speakers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery
              ? "No speakers match your search query."
              : "No keynote speakers or distinguished guests listed yet. Add speakers for the Evolvia lineup."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Add First Speaker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSpeakers.map(speaker => (
            <div
              key={speaker.id}
              className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col justify-between group overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-[#0d0f1a] border border-[#1e2238]">
                    Order #{speaker.order_index}
                  </span>

                  <div className="flex items-center gap-0.5 bg-[#0d0f1a] rounded-lg border border-[#1e2238] p-0.5">
                    <button
                      onClick={() => handleOrderChange(speaker, "up")}
                      className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleOrderChange(speaker, "down")}
                      className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Portrait */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/60 border border-white/5 mb-3.5">
                  {speaker.image_url ? (
                    <img
                      src={speaker.image_url}
                      alt={speaker.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs">
                      <Sparkles className="w-6 h-6 mb-1 opacity-30 text-emerald-400" />
                      <span>No Portrait</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <h4 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  {speaker.name}
                </h4>

                {speaker.designation && (
                  <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-1.5 line-clamp-1">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{speaker.designation}</span>
                  </p>
                )}

                {speaker.expertise && (
                  <div className="mt-2.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <GraduationCap className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{speaker.expertise}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e2238] flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(speaker)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                  title="Edit Speaker"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => confirmDelete(speaker)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                  title="Delete Speaker"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && deletingSpeaker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f111d] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Speaker</h3>
                <p className="text-xs text-slate-400">Remove from keynote speaker roster.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#08090e] p-3 rounded-xl border border-[#1e2238]">
              Are you sure you want to remove <strong className="text-white">"{deletingSpeaker.name}"</strong>?
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f111d] border border-[#1e2238] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto flex flex-col">
            <div className="px-6 py-4 border-b border-[#1e2238] flex items-center justify-between bg-[#0b0d18]">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingSpeaker ? "Edit Keynote Speaker" : "Add Keynote Speaker"}
                </h3>
                <p className="text-xs text-slate-400">Configure speaker biography and profile</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Doe"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Founder & CEO @ TechCorp"
                  value={formData.designation || ""}
                  onChange={e => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Domain / Expertise Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Generative AI & Robotics"
                  value={formData.expertise || ""}
                  onChange={e => setFormData(prev => ({ ...prev, expertise: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              {/* Portrait Upload */}
              <div className="p-4 rounded-2xl bg-[#08090e] border border-[#1e2238] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Speaker Portrait Photo
                  </span>
                  {uploadingImage && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL..."
                    value={formData.image_url || ""}
                    onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="flex-1 px-3 py-2 text-xs rounded-xl glass-input"
                  />
                  <label className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shrink-0 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.order_index ?? 0}
                  onChange={e => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-mono"
                />
              </div>

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
                  <span>{editingSpeaker ? "Save Changes" : "Add Speaker"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
