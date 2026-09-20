"use client";

import { useEffect, useState } from "react";

/** True below the `md` breakpoint — the layout's own idea of a phone. */
export function usePhone() {
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return phone;
}
