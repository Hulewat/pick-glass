export type Folder = { id: string; name: string; createdAt: string };

export type PaletteColor = { name: string; hex: string };
export type RoomPieces = { room: string; items: string[] };
export type Adjacent = { style: string; why: string };

export type Direction = {
  style: string;
  influence: string | null;
  not: string;
  summary: string;
  materials: string[];
  palette: PaletteColor[];
  pieces: RoomPieces[];
  searchTerms: string[];
  adjacent: Adjacent[];
  /** true when made without a Claude key, so it's clearly a stand-in */
  sample?: boolean;
};

export type DirectionStatus = "none" | "draft" | "approved";

export type Project = {
  id: string;
  name: string;
  folderId: string | null;
  brief: string;
  siteUrls: string[];
  direction: Direction | null;
  directionStatus: DirectionStatus;
  stretch: number;
  covers: string[];
  refCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Ref = {
  id: string;
  projectId: string;
  imageId: string;
  w: number;
  h: number;
  createdAt: string;
};

export type ProjectPatch = Partial<
  Pick<Project, "name" | "folderId" | "brief" | "siteUrls" | "direction" | "directionStatus" | "stretch">
>;
