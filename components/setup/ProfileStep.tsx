"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import type { BusinessProfile } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";
import { toast } from "../ui/toast";

const INDUSTRIES = ["Digital & Design Services", "Retail & E-commerce", "Real Estate", "Education & Coaching", "Health & Wellness", "Food & Beverage", "Travel & Hospitality", "Interior & Architecture", "Other"];

export function ProfileStep({ business, onNext }: { business: BusinessProfile; onNext: () => void }) {
  const [b, setB] = useState(business);
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessProfile, string>>>({});
  const set = (k: keyof BusinessProfile) => (e: { target: { value: string } }) => setB({ ...b, [k]: e.target.value });

  const save = (next: boolean) => {
    const e: typeof errors = {};
    if (b.name.trim().length < 2) e.name = "Business name is required.";
    if (b.description.trim().length < 10) e.description = "Describe the business in at least 10 characters.";
    if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) e.email = "Enter a valid email address.";
    if (b.phone && !/^[+\d][\d\s-]{7,15}$/.test(b.phone.trim())) e.phone = "Enter a valid phone number.";
    if (b.website && !/^https?:\/\/\S+\.\S+/.test(b.website)) e.website = "Website must start with http:// or https://";
    if (!b.email && !b.phone) e.email = "Add an email or a phone number so customers can be contacted.";
    setErrors(e);
    if (Object.keys(e).length) {
      toast("Please fix the highlighted fields.", "error");
      return;
    }
    actions.updateBusiness(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.trim()])) as unknown as BusinessProfile);
    toast("Business profile saved");
    if (next) onNext();
  };

  const f = (k: keyof BusinessProfile, label: string, props: { required?: boolean; type?: string; placeholder?: string; className?: string } = {}) => (
    <Field label={label} htmlFor={`bp-${k}`} required={props.required} error={errors[k]} className={props.className}>
      <Input id={`bp-${k}`} type={props.type} value={b[k]} onChange={set(k)} placeholder={props.placeholder} aria-invalid={Boolean(errors[k])} />
    </Field>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {f("name", "Business name", { required: true, className: "sm:col-span-2" })}
        <Field label="Business description" htmlFor="bp-description" required error={errors.description} className="sm:col-span-2">
          <Textarea id="bp-description" value={b.description} onChange={set("description")} aria-invalid={Boolean(errors.description)} />
        </Field>
        <Field label="Industry" htmlFor="bp-industry">
          <Select id="bp-industry" value={b.industry} onChange={set("industry")}>
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
        </Field>
        {f("location", "Location", { placeholder: "City, State" })}
        {f("email", "Contact email", { type: "email" })}
        {f("phone", "Contact phone", { type: "tel", placeholder: "+91 98765 43210" })}
        {f("website", "Business website", { type: "url", placeholder: "https://" })}
        {f("workingHours", "Working hours", { placeholder: "Mon–Sat, 10 AM – 7 PM" })}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" onClick={() => save(false)}>
          Save
        </Button>
        <Button onClick={() => save(true)}>Save & continue</Button>
      </div>
    </div>
  );
}
