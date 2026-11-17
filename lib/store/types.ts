import type { Folder, Project, ProjectPatch, Ref } from "../types";

export interface Store {
  kind: "supabase" | "local";
  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<void>;
  deleteFolder(id: string): Promise<void>;

  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(input: { name?: string; folderId?: string | null }): Promise<Project>;
  updateProject(id: string, patch: ProjectPatch): Promise<Project | null>;
  deleteProject(id: string): Promise<void>;

  listRefs(projectId: string): Promise<Ref[]>;
  addRef(projectId: string, image: { bytes: Uint8Array; type: string; w: number; h: number }): Promise<Ref>;
  deleteRef(projectId: string, refId: string): Promise<void>;
  getImage(imageId: string): Promise<{ bytes: Uint8Array; type: string } | null>;
}

export const newId = () =>
  Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
