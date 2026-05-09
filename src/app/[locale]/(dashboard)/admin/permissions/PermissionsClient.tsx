"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { updateRolePermissions } from "@/app/actions/rbac";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { USER_ROLES } from "@/lib/auth/rbac";

interface Resource {
  path: string;
  label: string;
}

interface PermissionRecord {
  role_code: string;
  path: string;
}

export default function PermissionsClient({
  roles,
  resources,
  initialPermissions
}: {
  roles: string[];
  resources: Resource[];
  initialPermissions: PermissionRecord[];
}) {
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [currentAllowedPaths, setCurrentAllowedPaths] = useState<string[]>(
    initialPermissions
      .filter(p => p.role_code === selectedRole)
      .map(p => p.path)
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setCurrentAllowedPaths(
      initialPermissions
        .filter(p => p.role_code === role)
        .map(p => p.path)
    );
  };

  const togglePath = (path: string) => {
    setCurrentAllowedPaths(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateRolePermissions(selectedRole, currentAllowedPaths);
      if (result.success) {
        toast.success(`${selectedRole} 권한이 저장되었습니다.`);
      } else {
        toast.error(`저장 실패: ${result.error}`);
      }
    } catch (error) {
      toast.error("알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Role Selection */}
      <div className="md:col-span-1 space-y-2">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-2">역할 선택</h3>
        <div className="space-y-1">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3",
                selectedRole === role 
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-200" 
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Shield size={18} />
              <span className="font-medium">{role}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{selectedRole} 권한 설정</h3>
            <p className="text-sm text-slate-500">선택한 역할이 접근 가능한 리소스를 체크하세요.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || selectedRole === USER_ROLES.ZENITH_SUPER_ADMIN}
            className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            저장하기
          </button>
        </div>

        <div className="p-6">
          {selectedRole === USER_ROLES.ZENITH_SUPER_ADMIN ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle2 size={48} className="text-green-500 mb-4" />
              <p className="font-medium text-slate-600">Super Admin은 모든 권한을 가집니다.</p>
              <p className="text-sm">수정할 수 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resources.map((res) => (
                <div
                  key={res.path}
                  onClick={() => togglePath(res.path)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    currentAllowedPaths.includes(res.path)
                      ? "border-brand-500 bg-brand-50/50"
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                    currentAllowedPaths.includes(res.path)
                      ? "bg-brand-500 border-brand-500 text-white"
                      : "border-slate-300"
                  )}>
                    {currentAllowedPaths.includes(res.path) && <CheckCircle2 size={16} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{res.label}</p>
                    <p className="text-xs text-slate-500 font-mono">{res.path}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
