"use client";

import { createContext } from "react";

/**
 * What a page of its own (Cinema Studio) adds to its tiles: where "Use as
 * reference" sends a picture, a Trash in place of deleting, the folders a
 * piece can be moved into, and the last piece looked at.
 */
export interface TileExtrasValue {
  onReference?: (url: string) => void;
  /** Delete puts it in the Trash, to restore later. */
  trash?: boolean;
  folders?: Array<{ id: string; name: string }>;
  onFolder?: (url: string, folderId: string | undefined) => void;
  lastViewed?: string;
  onOpened?: (url: string) => void;
}
export const TileExtras = createContext<TileExtrasValue | null>(null);
