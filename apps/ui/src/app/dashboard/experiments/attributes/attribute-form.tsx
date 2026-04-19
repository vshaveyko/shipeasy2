"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAttributeAction } from "./actions";

export function AttributeForm() {
  const [attrType, setAttrType] = useState("string");

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle>New attribute</CardTitle>
        <CardDescription>Declare an attribute for use in targeting rules.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form action={createAttributeAction} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="attr-name">Name</Label>
            <Input
              id="attr-name"
              name="name"
              placeholder="country"
              className="font-mono"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="attr-type">Type</Label>
            <select
              id="attr-type"
              name="type"
              value={attrType}
              onChange={(e) => setAttrType(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="enum">enum</option>
              <option value="date">date</option>
            </select>
          </div>
          {attrType === "enum" && (
            <div className="grid gap-1.5">
              <Label htmlFor="attr-enum-values">Enum values</Label>
              <Input
                id="attr-enum-values"
                name="enum_values"
                placeholder="free,pro,enterprise"
                className="font-mono"
              />
            </div>
          )}
          <Button size="sm" type="submit">
            Add attribute
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
