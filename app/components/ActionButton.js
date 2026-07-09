"use client";

export default function ActionButton({ children, className, message }) {
  return (
    <button className={className} type="button" onClick={() => alert(message)}>
      {children}
    </button>
  );
}
