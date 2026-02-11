import { BottomTabs } from "@/components/layout/BottomTabs";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="relative min-h-screen bg-background">
      <Outlet />
      <BottomTabs />
    </div>
  );
}
