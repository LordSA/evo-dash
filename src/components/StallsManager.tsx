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
  ChevronDown
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
        showToast("Image uploaded", "success");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result as string }));
          showToast("Image loaded", "info");
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
      showToast("Name is required", "error");
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
          showToast("Stall updated", "success");
        } else {
          const { error } = await supabase.from("stalls_and_expos").insert([payload]);
          if (error) throw error;
          showToast("Stall added", "success");
        }
      } else {
        const stored = localStorage.getItem("evolvia_stalls");
        const list: StallExpo[] = stored ? JSON.parse(stored) : [];
        if (editingStall) {
          const updated = list.map(item =>
            item.id === editingStall.id ? ({ ...item, ...payload } as StallExpo) : item
          );
          localStorage.setItem("evolvia_stalls", JSON.stringify(updated));
          showToast("Stall updated", "success");
        } else {
          const newItem: StallExpo = {
            id: `stall-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as StallExpo;
          list.push(newItem);
          localStorage.setItem("evolvia_stalls", JSON.stringify(list));
          showToast("Stall added", "success");
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
      showToast("Error updating order: " + getErrorMessage(err), "error");
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
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12141d] p-3.5 rounded-xl border border-[#1f2336]">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search stalls..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg admin-input"
          />
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Stall</span>
        </button>
      </div>

      {/* Grid */}
      {filteredStalls.length === 0 ? (
        <div className="bg-[#12141d] rounded-xl p-12 text-center border border-[#1f2336]">
          <Store className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <h3 className="text-sm font-semibold text-white mb-1">No Stalls Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            {searchQuery ? "No stalls match your query." : "No stalls configured yet."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Add Stall
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStalls.map(stall => (
            <div
              key={stall.id}
              className="bg-[#12141d] border border-[#1f2336] hover:border-[#2b314a] rounded-xl p-3.5 flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#0e1017] border border-[#1f2336]">
                    #{stall.order_index}
                  </span>

                  <div className="flex items-center gap-0.5 bg-[#0e1017] rounded border border-[#1f2336]">
                    <button
                      onClick={() => handleOrderChange(stall, "up")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleOrderChange(stall, "down")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-white/5 mb-3">
                  {stall.image_url ? (
                    <img
                      src={stall.image_url}
                      alt={stall.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      <span>No Banner</span>
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-white truncate">
                  {stall.name}
                </h4>

                {stall.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                    {stall.description}
                  </p>
                )}
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-[#1f2336] flex items-center justify-end gap-1">
                <button
                  onClick={() => handleOpenEditModal(stall)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => confirmDelete(stall)}
                  className="p-1 rounded text-slate-400 hover:text-rose-400"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && deletingStall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#12141d] border border-[#1f2336] rounded-xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-white">Delete Stall</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete <strong>"{deletingStall.name}"</strong>?
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#12141d] border border-[#1f2336] rounded-2xl max-w-md w-full overflow-hidden my-auto flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#1f2336] flex items-center justify-between bg-[#0e1017]">
              <h3 className="text-sm font-bold text-white">
                {editingStall ? "Edit Stall" : "Add Stall"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Stall title"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Exhibition overview..."
                  value={formData.description || ""}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg admin-input resize-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#0e1017] border border-[#1f2336] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Banner Image
                  </span>
                  {uploadingImage && (
                    <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Image URL..."
                    value={formData.image_url || ""}
                    onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg admin-input"
                  />
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f2336] hover:bg-[#2a3048] text-slate-200 flex items-center gap-1 shrink-0 transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.order_index ?? 0}
                  onChange={e => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg admin-input font-mono"
                />
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
                  <span>{editingStall ? "Save" : "Add"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
