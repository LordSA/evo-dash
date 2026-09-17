"use client";

import React, { useState, useMemo } from "react";
import { Sponsor } from "@/types/database";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  Loader2, 
  ShieldCheck, 
  Search, 
  ChevronUp, 
  ChevronDown
} from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile, getErrorMessage } from "@/lib/supabase";
import { useToast } from "./ToastContext";

interface Props {
  sponsors: Sponsor[];
  onRefresh: () => void;
}

const COMMON_TIERS = [
  "Title Sponsor",
  "Platinum Partner",
  "Gold Partner",
  "Silver Partner",
  "Innovation Partner",
  "Media Partner",
  "Community Partner",
  "Food & Beverage Partner",
];

export default function SponsorsManager({ sponsors, onRefresh }: Props) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSponsor, setDeletingSponsor] = useState<Sponsor | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<Partial<Sponsor>>({
    name: "",
    category: "Title Sponsor",
    image_url: "",
    order_index: 0,
  });

  const handleOpenAddModal = () => {
    setEditingSponsor(null);
    setFormData({
      name: "",
      category: "Title Sponsor",
      image_url: "",
      order_index: sponsors.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({ ...sponsor });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      if (isSupabaseConfigured) {
        const publicUrl = await uploadMediaFile(file, "sponsors");
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
        showToast("Logo uploaded", "success");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result as string }));
          showToast("Logo loaded (LocalStorage)", "info");
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
        category: formData.category?.trim() || "Partner",
        image_url: formData.image_url || "",
        order_index: Number(formData.order_index) || 0,
      };

      if (isSupabaseConfigured) {
        if (editingSponsor) {
          const { error } = await supabase
            .from("sponsors")
            .update(payload)
            .eq("id", editingSponsor.id);
          if (error) throw error;
          showToast("Sponsor updated", "success");
        } else {
          const { error } = await supabase.from("sponsors").insert([payload]);
          if (error) throw error;
          showToast("Sponsor added", "success");
        }
      } else {
        const stored = localStorage.getItem("evolvia_sponsors");
        const list: Sponsor[] = stored ? JSON.parse(stored) : [];
        if (editingSponsor) {
          const updated = list.map(item =>
            item.id === editingSponsor.id ? ({ ...item, ...payload } as Sponsor) : item
          );
          localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
          showToast("Sponsor updated", "success");
        } else {
          const newItem: Sponsor = {
            id: `sponsor-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as Sponsor;
          list.push(newItem);
          localStorage.setItem("evolvia_sponsors", JSON.stringify(list));
          showToast("Sponsor added", "success");
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

  const handleOrderChange = async (sponsor: Sponsor, direction: "up" | "down") => {
    const currIndex = sponsors.findIndex(s => s.id === sponsor.id);
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= sponsors.length) return;

    const targetSponsor = sponsors[targetIndex];
    const newCurrOrder = targetSponsor.order_index;
    const newTargetOrder = sponsor.order_index;

    try {
      if (isSupabaseConfigured) {
        await Promise.all([
          supabase.from("sponsors").update({ order_index: newCurrOrder }).eq("id", sponsor.id),
          supabase.from("sponsors").update({ order_index: newTargetOrder }).eq("id", targetSponsor.id),
        ]);
      } else {
        const stored = localStorage.getItem("evolvia_sponsors");
        const list: Sponsor[] = stored ? JSON.parse(stored) : [];
        const updated = list.map(item => {
          if (item.id === sponsor.id) return { ...item, order_index: newCurrOrder };
          if (item.id === targetSponsor.id) return { ...item, order_index: newTargetOrder };
          return item;
        });
        localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
      }
      showToast("Order updated", "info");
      onRefresh();
    } catch (err: unknown) {
      showToast("Error updating order: " + getErrorMessage(err), "error");
    }
  };

  const confirmDelete = (sponsor: Sponsor) => {
    setDeletingSponsor(sponsor);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSponsor) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("sponsors").delete().eq("id", deletingSponsor.id);
        if (error) throw error;
      } else {
        const stored = localStorage.getItem("evolvia_sponsors");
        const list: Sponsor[] = stored ? JSON.parse(stored) : [];
        const updated = list.filter(item => item.id !== deletingSponsor.id);
        localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
      }
      showToast(`Deleted "${deletingSponsor.name}"`, "info");
      setIsDeleteModalOpen(false);
      setDeletingSponsor(null);
      onRefresh();
    } catch (err: unknown) {
      showToast("Delete failed: " + getErrorMessage(err), "error");
    }
  };

  const filteredSponsors = useMemo(() => {
    return sponsors
      .filter(s => {
        if (selectedTier !== "all" && s.category !== selectedTier) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [sponsors, selectedTier, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12141d] p-3.5 rounded-xl border border-[#1f2336]">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sponsors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg admin-input"
            />
          </div>

          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium admin-input"
          >
            <option value="all">All Tiers</option>
            {COMMON_TIERS.map(tier => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Sponsor</span>
        </button>
      </div>

      {/* Grid */}
      {filteredSponsors.length === 0 ? (
        <div className="bg-[#12141d] rounded-xl p-12 text-center border border-[#1f2336]">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <h3 className="text-sm font-semibold text-white mb-1">No Sponsors Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            {searchQuery || selectedTier !== "all"
              ? "No sponsors match your filter."
              : "No sponsors listed yet."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Add Sponsor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSponsors.map(sponsor => (
            <div
              key={sponsor.id}
              className="bg-[#12141d] border border-[#1f2336] hover:border-[#2b314a] rounded-xl p-3.5 flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#0e1017] border border-[#1f2336]">
                    #{sponsor.order_index}
                  </span>

                  <div className="flex items-center gap-0.5 bg-[#0e1017] rounded border border-[#1f2336]">
                    <button
                      onClick={() => handleOrderChange(sponsor, "up")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleOrderChange(sponsor, "down")}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black/50 border border-white/5 p-3 flex items-center justify-center mb-3">
                  {sponsor.image_url ? (
                    <img
                      src={sponsor.image_url}
                      alt={sponsor.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs">
                      <span>No Logo</span>
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-white truncate">
                  {sponsor.name}
                </h4>

                <div className="mt-1.5">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-white/5 text-amber-300 border border-amber-500/20 truncate max-w-full">
                    {sponsor.category || "Partner"}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-[#1f2336] flex items-center justify-end gap-1">
                <button
                  onClick={() => handleOpenEditModal(sponsor)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => confirmDelete(sponsor)}
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
      {isDeleteModalOpen && deletingSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#12141d] border border-[#1f2336] rounded-xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-white">Delete Sponsor</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete <strong>"{deletingSponsor.name}"</strong>?
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
                {editingSponsor ? "Edit Sponsor" : "Add Sponsor"}
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
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sponsor name"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tier / Category
                </label>
                <input
                  type="text"
                  list="tier-options-clean"
                  placeholder="e.g. Title Sponsor"
                  value={formData.category || ""}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg admin-input"
                />
                <datalist id="tier-options-clean">
                  {COMMON_TIERS.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div className="p-3 rounded-lg bg-[#0e1017] border border-[#1f2336] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Brand Logo
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
                    placeholder="Logo URL..."
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
                  <span>{editingSponsor ? "Save" : "Add"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
