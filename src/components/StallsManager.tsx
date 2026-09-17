"use client";

import React, { useState, useMemo } from "react";
import { StallExpo } from "@/types/database";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  Loader2, 
  Store, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  AlertTriangle 
} from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile, getErrorMessage } from "@/lib/supabase";
import { useToast } from "./ToastContext";

interface Props {
  stalls: StallExpo[];
  onRefresh: () => void;
}

export default function StallsManager({ stalls, onRefresh }: Props) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingStall, setDeletingStall] = useState<StallExpo | null>(null);
  const [editingStall, setEditingStall] = useState<StallExpo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<Partial<StallExpo>>({
    name: "",
    image_url: "",
    description: "",
    order_index: 0,
  });

  const handleOpenAddModal = () => {
    setEditingStall(null);
    setFormData({
      name: "",
      image_url: "",
      description: "",
      order_index: stalls.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (stall: StallExpo) => {
    setEditingStall(stall);
    setFormData({ ...stall });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      if (isSupabaseConfigured) {
        const publicUrl = await uploadMediaFile(file, "stalls");
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
        showToast("Stall image uploaded successfully", "success");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result as string }));
          showToast("Image loaded (LocalStorage)", "info");
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
      showToast("Stall name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        image_url: formData.image_url || "",
        description: formData.description?.trim() || "",
        order_index: Number(formData.order_index) || 0,
      };

      if (isSupabaseConfigured) {
        if (editingStall) {
          const { error } = await supabase
            .from("stalls_and_expos")
            .update(payload)
            .eq("id", editingStall.id);
          if (error) throw error;
          showToast(`Updated "${formData.name}"`, "success");
        } else {
          const { error } = await supabase.from("stalls_and_expos").insert([payload]);
          if (error) throw error;
          showToast(`Added "${formData.name}"`, "success");
        }
      } else {
        const stored = localStorage.getItem("evolvia_stalls");
        const list: StallExpo[] = stored ? JSON.parse(stored) : [];
        if (editingStall) {
          const updated = list.map(item =>
            item.id === editingStall.id ? ({ ...item, ...payload } as StallExpo) : item
          );
          localStorage.setItem("evolvia_stalls", JSON.stringify(updated));
          showToast(`Updated "${formData.name}" (LocalStorage)`, "success");
        } else {
          const newItem: StallExpo = {
            id: `stall-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as StallExpo;
          list.push(newItem);
          localStorage.setItem("evolvia_stalls", JSON.stringify(list));
          showToast(`Added "${formData.name}" (LocalStorage)`, "success");
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

  const handleOrderChange = async (stall: StallExpo, direction: "up" | "down") => {
    const currIndex = stalls.findIndex(s => s.id === stall.id);
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= stalls.length) return;

    const targetStall = stalls[targetIndex];
    const newCurrOrder = targetStall.order_index;
    const newTargetOrder = stall.order_index;

    try {
      if (isSupabaseConfigured) {
        await Promise.all([
          supabase.from("stalls_and_expos").update({ order_index: newCurrOrder }).eq("id", stall.id),
          supabase.from("stalls_and_expos").update({ order_index: newTargetOrder }).eq("id", targetStall.id),
        ]);
      } else {
        const stored = localStorage.getItem("evolvia_stalls");
        const list: StallExpo[] = stored ? JSON.parse(stored) : [];
        const updated = list.map(item => {
          if (item.id === stall.id) return { ...item, order_index: newCurrOrder };
          if (item.id === targetStall.id) return { ...item, order_index: newTargetOrder };
          return item;
        });
        localStorage.setItem("evolvia_stalls", JSON.stringify(updated));
      }
      showToast("Order updated", "info");
      onRefresh();
    } catch (err: unknown) {
      showToast("Order update error: " + getErrorMessage(err), "error");
    }
  };

  const confirmDelete = (stall: StallExpo) => {
    setDeletingStall(stall);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingStall) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("stalls_and_expos").delete().eq("id", deletingStall.id);
        if (error) throw error;
      } else {
        const stored = localStorage.getItem("evolvia_stalls");
        const list: StallExpo[] = stored ? JSON.parse(stored) : [];
        const updated = list.filter(item => item.id !== deletingStall.id);
        localStorage.setItem("evolvia_stalls", JSON.stringify(updated));
      }
      showToast(`Deleted "${deletingStall.name}"`, "info");
      setIsDeleteModalOpen(false);
      setDeletingStall(null);
      onRefresh();
    } catch (err: unknown) {
      showToast("Delete failed: " + getErrorMessage(err), "error");
    }
  };

  const filteredStalls = useMemo(() => {
    return stalls
      .filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [stalls, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search stalls and exhibitions..."
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
          <span>Add Stall / Expo</span>
        </button>
      </div>

      {/* Grid Display */}
      {filteredStalls.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Store className="w-12 h-12 mx-auto mb-3 text-slate-600 animate-pulse" />
          <h3 className="text-base font-bold text-white mb-1">No Stalls Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery
              ? "No stalls match your search query."
              : "No stalls or innovation expos configured yet. Add interactive exhibits to showcase."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Add First Stall
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStalls.map(stall => (
            <div
              key={stall.id}
              className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col justify-between group overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-[#0d0f1a] border border-[#1e2238]">
                    Order #{stall.order_index}
                  </span>

                  <div className="flex items-center gap-0.5 bg-[#0d0f1a] rounded-lg border border-[#1e2238] p-0.5">
                    <button
                      onClick={() => handleOrderChange(stall, "up")}
                      className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleOrderChange(stall, "down")}
                      className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/5 mb-3.5">
                  {stall.image_url ? (
                    <img
                      src={stall.image_url}
                      alt={stall.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs">
                      <Sparkles className="w-6 h-6 mb-1 opacity-30 text-violet-400" />
                      <span>No Stall Banner</span>
                    </div>
                  )}
                </div>

                <h4 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  {stall.name}
                </h4>

                {stall.description && (
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                    {stall.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e2238] flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(stall)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                  title="Edit Stall"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => confirmDelete(stall)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                  title="Delete Stall"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingStall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f111d] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Stall</h3>
                <p className="text-xs text-slate-400">This item will be removed immediately.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#08090e] p-3 rounded-xl border border-[#1e2238]">
              Are you sure you want to delete <strong className="text-white">"{deletingStall.name}"</strong>?
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
                  {editingStall ? "Edit Stall / Expo" : "Add Stall / Expo"}
                </h3>
                <p className="text-xs text-slate-400">Configure exhibition details and media</p>
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
                  Stall / Expo Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robo Soccer Tournament"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Details about the exhibit or organizers..."
                  value={formData.description || ""}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input resize-none"
                />
              </div>

              {/* Image Upload */}
              <div className="p-4 rounded-2xl bg-[#08090e] border border-[#1e2238] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-violet-400" />
                    Stall Banner Image
                  </span>
                  {uploadingImage && (
                    <span className="text-[11px] text-violet-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste banner image URL..."
                    value={formData.image_url || ""}
                    onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="flex-1 px-3 py-2 text-xs rounded-xl glass-input"
                  />
                  <label className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 shrink-0 transition-colors">
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
                  <span>{editingStall ? "Save Changes" : "Add Stall"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
