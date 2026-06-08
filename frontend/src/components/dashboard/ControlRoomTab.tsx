"use client";

import { BodyAnalysisSection } from "@/components/dashboard/BodyAnalysisSection";
import { BodyGoalsPanel } from "@/components/dashboard/BodyGoalsPanel";
import { BodyMetrics } from "@/components/ui/BodyMetrics";
import { BodyTypeBadge } from "@/components/ui/BodyTypeBadge";
import { Card } from "@/components/ui/Card";
import { XPBar } from "@/components/ui/XPBar";
import { bodyTypeFromRecord } from "@/lib/body-type";
import type { BodyGoals, UserProfile } from "@/lib/types";

interface ControlRoomTabProps {
  profile: UserProfile;
  goals: BodyGoals;
  onGoalsChange: (g: BodyGoals) => void;
  xpPop: number | null;
  levelPulse: boolean;
}

export function ControlRoomTab({
  profile,
  goals,
  onGoalsChange,
  xpPop,
  levelPulse,
}: ControlRoomTabProps) {
  const latest = profile.inbodyHistory.at(-1);
  const bodyType = bodyTypeFromRecord(latest);

  return (
    <div className="space-y-4 pb-2">
      <div className="pixel-card pixel-card--hero !p-3">
        <div className="relative">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-base font-bold leading-tight text-text">
              {profile.displayName}
            </p>
            <BodyTypeBadge bodyType={bodyType} inline />
          </div>
          <XPBar
            level={profile.level}
            xp={profile.xp}
            xpToNext={profile.xpToNext}
            pulse={levelPulse}
            compact
            className="mt-1.5"
          />
          {xpPop != null && (
            <span className="animate-xp-pop absolute right-0 top-0 text-[10px] font-bold text-accent-light">
              +{xpPop}
            </span>
          )}
        </div>

        <div className="mt-2.5 border-t-[2px] border-dashed border-border-pixel pt-2.5">
          <BodyMetrics latest={latest} compact />
          {latest?.recorded_at ? (
            <p className="mt-1.5 text-center text-[10px] text-text-muted">
              更新 {latest.recorded_at.slice(0, 10)}
            </p>
          ) : (
            <p className="mt-1.5 text-center text-[10px] text-text-muted">
              上傳 InBody 或輸入數據後顯示
            </p>
          )}
        </div>
      </div>

      <BodyGoalsPanel
        goals={goals}
        latest={latest}
        history={profile.inbodyHistory}
        onSave={onGoalsChange}
      />

      <BodyAnalysisSection history={profile.inbodyHistory} />
    </div>
  );
}
