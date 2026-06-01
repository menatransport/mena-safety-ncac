'use client';
import { ANALYTICS_TABS } from "../../constant";
import { OverviewTab } from "./tabs/OverviewTab";
import { DrugTab } from "./tabs/DrugTab";
import { PpeTab } from "./tabs/PpeTab";
import { VehicleTab } from "./tabs/VehicleTab";
import type { TaskFilterResult } from "../../type";

interface AnalyticsTabsProps {
    activeTab: typeof ANALYTICS_TABS[number];
    filters: TaskFilterResult;
}

export const AnalyticsTabs = ({ activeTab, filters }: AnalyticsTabsProps) => {
    if (activeTab === "สรุปภาพรวม") return <OverviewTab filters={filters} />;
    if (activeTab === "สารเสพติด & แอลกอฮอล์") return <DrugTab filters={filters} />;
    if (activeTab === "PPE") return <PpeTab filters={filters} />;
    if (activeTab === "ตรวจสภาพรอบรถ") return <VehicleTab filters={filters} />;
    return null;
};
