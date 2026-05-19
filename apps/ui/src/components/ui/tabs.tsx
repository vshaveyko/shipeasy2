"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs(props: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex items-center gap-1 border-b border-[var(--se-line)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[var(--se-fg-3)] outline-none transition-colors",
        "hover:text-[var(--se-fg-2)]",
        "focus-visible:text-[var(--se-fg)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        // Active tab — Base UI exposes `data-active` (empty attr) on the selected tab.
        "data-[active]:text-[var(--se-accent)]",
        "data-[active]:after:absolute data-[active]:after:inset-x-2 data-[active]:after:-bottom-px data-[active]:after:h-[2px] data-[active]:after:rounded-full data-[active]:after:bg-[var(--se-accent)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("mt-4 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
