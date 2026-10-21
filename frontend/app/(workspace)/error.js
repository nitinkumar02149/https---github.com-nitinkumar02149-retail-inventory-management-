"use client";

export default function WorkspaceError({ reset }) {
  return (
    <section className="route-error" role="alert">
      <span className="error-mark" aria-hidden="true">!</span>
      <p className="eyebrow">PAGE UNAVAILABLE</p>
      <h1>This page couldn’t be displayed.</h1>
      <p>Try loading it again. No store data has been changed.</p>
      <button className="button button-primary" type="button" onClick={() => reset()}>Try again <span aria-hidden="true">↻</span></button>
    </section>
  );
}