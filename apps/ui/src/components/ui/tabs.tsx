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
        "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] text-[var(--se-fg-3)] outline-none transition-colors",
        "hover:text-[var(--se-fg-2)]",
        "focus-visible:text-[var(--se-fg)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        "data-[selected]:text-[var(--se-fg)]",
        "data-[selected]:after:absolute data-[selected]:after:inset-x-2 data-[selected]:after:-bottom-px data-[selected]:after:h-[2px] data-[selected]:after:rounded-full data-[selected]:after:bg-[var(--se-accent)]",
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
