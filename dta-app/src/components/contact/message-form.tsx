"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GRADE_LEVELS, SUBJECTS } from "@/lib/contact-fields";
import { CONTACT_EMAIL } from "@/lib/contact";
import { withBasePath } from "@/lib/base-path";
import { isStaticExport } from "@/lib/static-export";
import { cn } from "@/lib/utils";

export function MessageForm() {
  const [grade, setGrade] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!grade || !subject) {
      setStatus("error");
      setErrorMessage("Choose a grade level and a subject.");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const website = String(fd.get("website") ?? "").trim();

    if (isStaticExport) {
      setStatus("error");
      setErrorMessage(
        `This static preview cannot send the form. Email us at ${CONTACT_EMAIL} instead.`,
      );
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch(withBasePath("/api/contact"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          grade,
          subject,
          message,
          website,
        }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (res.ok && payload?.ok !== false) {
        setStatus("success");
        form.reset();
        setGrade(null);
        setSubject(null);
        return;
      }

      setStatus("error");
      setErrorMessage(
        typeof payload?.error === "string"
          ? payload.error
          : "Something went wrong. Try email or phone instead.",
      );
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Try again in a moment.");
    }
  }

  if (status === "success") {
    return (
      <p className="max-w-[65ch] text-base leading-relaxed text-dta-text-secondary">
        Thanks! We&apos;ll be in touch soon.
      </p>
    );
  }

  return (
    <form className="space-y-dta-lg" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-dta-lg sm:grid-cols-2">
        <div className="space-y-dta-sm">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="!h-11 rounded-dta-md border-dta-border bg-transparent px-dta-md text-sm text-dta-text-primary"
          />
        </div>
        <div className="space-y-dta-sm">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className="!h-11 rounded-dta-md border-dta-border bg-transparent px-dta-md text-sm text-dta-text-primary"
          />
        </div>
      </div>

      <div className="grid gap-dta-lg sm:grid-cols-2">
        <div className="space-y-dta-sm">
          <Label htmlFor="contact-grade">Grade level</Label>
          <Select value={grade} onValueChange={(v) => setGrade(v)}>
            <SelectTrigger
              id="contact-grade"
              size="default"
              className={cn(
                "!h-11 w-full rounded-dta-md border-dta-border bg-transparent px-dta-md text-sm text-dta-text-primary",
              )}
            >
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent className="rounded-dta-md border-dta-border bg-popover shadow-sm">
              {GRADE_LEVELS.map((g) => (
                <SelectItem key={g} value={g} className="py-2 text-sm">
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-dta-sm">
          <Label htmlFor="contact-subject">Subject</Label>
          <Select value={subject} onValueChange={(v) => setSubject(v)}>
            <SelectTrigger
              id="contact-subject"
              size="default"
              className={cn(
                "!h-11 w-full rounded-dta-md border-dta-border bg-transparent px-dta-md text-sm text-dta-text-primary",
              )}
            >
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent className="rounded-dta-md border-dta-border bg-popover shadow-sm">
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s} className="py-2 text-sm">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-dta-sm">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          className="min-h-[140px] rounded-dta-md border-dta-border bg-transparent text-dta-text-primary"
        />
      </div>

      <div className="sr-only">
        <label htmlFor="contact-website">Company website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={status === "submitting"}
        className="rounded-pill px-[22px] py-6 text-base font-semibold sm:h-12"
      >
        Send Message →
      </Button>
    </form>
  );
}
