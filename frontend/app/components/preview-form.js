"use client";

import { useEffect, useState } from "react";
import { Field, PreviewNotice } from "./ui";
import { signIn } from "../lib/auth-api";

export function PreviewForm({ fields, submitLabel = "Submit", title, note, columns = 2 }) {
  const [message, setMessage] = useState("");
  function handleSubmit(event) { event.preventDefault(); setMessage("Preview only: nothing was saved. Connect the backend to submit this form."); }
  return <form className="form-panel" onSubmit={handleSubmit}>{title && <div className="form-panel-heading"><h2>{title}</h2>{note && <p>{note}</p>}</div>}<div className={`form-grid form-grid-${columns}`}>{fields.map((field) => <Field key={field.name} {...field} />)}</div>{message && <div className="form-feedback" role="status">{message}</div>}<div className="form-actions"><span className="required-note">* Required fields</span><button className="button button-primary" type="submit">{submitLabel}<span aria-hidden="true">→</span></button></div><PreviewNotice /></form>;
}

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has("email") || query.has("password")) {
      query.delete("email");
      query.delete("password");
      const suffix = query.size ? `?${query}` : "";
      window.history.replaceState(window.history.state, "", `/login${suffix}`);
    }
    setHydrated(true);
  }, []);
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await signIn(String(form.get("email")).trim(), String(form.get("password")));
      const next = new URLSearchParams(window.location.search).get("next");
      const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      window.location.assign(destination);
    } catch (error) {
      setMessage(error.code === "INVALID_CREDENTIALS" ? "Email or password is incorrect." : error.message);
    } finally {
      setSubmitting(false);
    }
  }
  return <form className="login-form" method="post" action="/login" onSubmit={handleSubmit}><label className="field" htmlFor="email"><span className="field-label">Email address</span><input id="email" name="email" type="email" autoComplete="username" maxLength={254} placeholder="you@store.com" required /></label><label className="field" htmlFor="password"><span className="field-label">Password</span><input id="password" name="password" type="password" autoComplete="current-password" maxLength={256} placeholder="Enter your password" required /></label>{message && <div className="form-feedback form-feedback-error" role="alert">{message}</div>}<button className="button button-primary login-submit" type="submit" disabled={!hydrated || submitting}>{submitting ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span></button><p className="login-security-note">Secure session · Credentials are never stored in this browser</p></form>;
}